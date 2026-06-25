'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

type Step = 'code' | 'name' | 'waiting'

interface JoinValidationResult {
  valid: boolean;
  code: string;
  session?: {
    id: string;
    code: string;
    activity: string | null;
    class_state: string;
    current_activity_id: string | null;
    timer_seconds: number;
  };
  retry_after_seconds?: number;
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: "We couldn't find that class. Check the code and try again.",
  CODE_EXPIRED: 'This class session has ended. Ask your teacher for a new code.',
  SESSION_INACTIVE: 'This class session is no longer active. Ask your teacher for a new code.',
  NETWORK_MISMATCH: 'Connect to the same school Wi-Fi as your teacher, then try again.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
};

export default function JoinPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<{ id: string; code: string; timer_seconds?: number } | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentCount, setStudentCount] = useState(0)

  const validateCode = useCallback(async (rawCode: string) => {
    const trimmed = rawCode.trim()
    if (!/^\d{4}$/.test(trimmed)) return

    setIsValidating(true)
    setError('')

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/class_validate_join`,
        {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ in_code: trimmed }),
        }
      )
      const result: JoinValidationResult = await res.json()

      if (!result.valid || !result.session) {
        setError(ERROR_MESSAGES[result.code] || 'Invalid code. Please check and try again.')
        setCode('')
        setIsValidating(false)
        return
      }

      setSession(result.session)
      setStep('name')
      setIsValidating(false)
    } catch (err) {
      console.error('Validation error:', err)
      setError('An error occurred. Please try again.')
      setCode('')
      setIsValidating(false)
    }
  }, [])

  // Validate code on 4th digit
  useEffect(() => {
    if (code.length !== 4) return
    const timer = setTimeout(() => validateCode(code), 300)
    return () => clearTimeout(timer)
  }, [code, validateCode])

  const handleCodeInput = (digit: string) => {
    if (code.length < 4 && /^\d$/.test(digit)) {
      setCode(code + digit)
      setError('')
    }
  }

  const handleCodeBackspace = () => {
    setCode(code.slice(0, -1))
  }

  const handleNameSubmit = async () => {
    if (!name.trim() || !session) return

    setIsValidating(true)
    setError('')

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/class_join_with_network`,
        {
          method: 'POST',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            in_session_id: session.id,
            in_name: name.trim(),
          }),
        }
      )

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        const msg = errBody?.message || 'Failed to join. Please try again.'
        if (msg.includes('network') || msg.includes('NETWORK')) {
          setError('Connect to the same school Wi-Fi as your teacher, then try again.')
        } else {
          setError(msg)
        }
        setIsValidating(false)
        return
      }

      const data = await res.json()
      setStudentId(data.id)

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('session_id', session.id)
        sessionStorage.setItem('student_id', data.id)
        sessionStorage.setItem('student_name', name.trim())
      }

      const { data: studentsData } = await supabase
        .from('session_students')
        .select('*')
        .eq('session_id', session.id)
        .eq('is_active', true)

      setStudentCount(studentsData?.length || 0)
      setStep('waiting')
      setIsValidating(false)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsValidating(false)
    }
  }

  // Subscribe to session status changes while waiting
  useEffect(() => {
    if (step !== 'waiting' || !session) return

    const channel = supabase
      .channel(`session:${session.id}:status`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updated = payload.new as { status?: string; class_state?: string }
          if (updated.status === 'playing' || updated.class_state === 'in_activity') {
            router.push('/join/play')
          }
        }
      )
      .subscribe()

    const studentChannel = supabase
      .channel(`session:${session.id}:students`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_students',
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          const { data: studentsData } = await supabase
            .from('session_students')
            .select('*')
            .eq('session_id', session.id)
            .eq('is_active', true)

          setStudentCount(studentsData?.length || 0)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(studentChannel)
    }
  }, [step, session, supabase, router])

  if (step === 'code') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="bg-white border-slate-200 w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-slate-900">Join a Session</CardTitle>
            <p className="text-slate-600 text-sm mt-2">Ask your teacher for the 4-digit code</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-slate-100 p-6 rounded-lg border border-slate-200 text-center">
              <div className="text-5xl font-bold text-orange-500 font-mono tracking-widest">
                {code.padEnd(4, '\u2022')}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <Button
                  key={digit}
                  onClick={() => handleCodeInput(digit)}
                  disabled={code.length >= 4 || isValidating}
                  className="h-16 text-2xl font-bold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  {digit}
                </Button>
              ))}

              <Button
                onClick={() => handleCodeInput('0')}
                disabled={code.length >= 4 || isValidating}
                className="col-span-2 h-16 text-2xl font-bold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                0
              </Button>

              <Button
                onClick={handleCodeBackspace}
                disabled={code.length === 0 || isValidating}
                variant="outline"
                className="h-16 text-xl font-bold border-slate-300 text-slate-900 hover:bg-slate-100 disabled:opacity-50"
              >
                ⌫
              </Button>
            </div>

            {error && <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{error}</div>}

            {isValidating && code.length === 4 && (
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Checking code...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'name') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="bg-white border-slate-200 w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-slate-900">What's your name?</CardTitle>
            <p className="text-slate-600 text-sm mt-2">Tell us so we can track your score!</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <input
              type="text"
              placeholder="Enter your name"
              maxLength={20}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleNameSubmit()
                }
              }}
              autoFocus
              className="w-full px-4 py-4 bg-slate-50 border border-slate-300 rounded text-slate-900 text-lg focus:border-orange-500 focus:outline-none placeholder-slate-500"
            />

            {error && <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{error}</div>}

            <Button
              onClick={handleNameSubmit}
              disabled={!name.trim() || isValidating}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-lg disabled:opacity-50"
            >
              {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Let's Go!
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="bg-white border-slate-200 w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">{name}!</CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="text-5xl mb-4">
                <span className="inline-block animate-bounce" style={{ animationDelay: '0s' }}>
                  ⏳
                </span>
              </div>

              <div className="text-xl font-semibold text-slate-900">Waiting for your teacher...</div>

              <div className="flex justify-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>

            <div className="bg-slate-100 p-6 rounded-lg border border-slate-200">
              <p className="text-slate-600 text-sm mb-2">Students ready</p>
              <p className="text-4xl font-bold text-orange-500">{studentCount}</p>
            </div>

            <p className="text-sm text-slate-600">
              Once everyone is ready, your teacher will start the activity. Get ready!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
