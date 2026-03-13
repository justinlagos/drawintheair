'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type SessionRow = Database['public']['Tables']['sessions']['Row']

type Step = 'code' | 'name' | 'waiting'

export default function JoinPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<SessionRow | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentCount, setStudentCount] = useState(0)

  // Validate code on 4th digit
  useEffect(() => {
    if (code.length !== 4) return

    const validateCode = async () => {
      setIsValidating(true)
      setError('')

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('session_code', code)
          .eq('status', 'active')
          .single()

        if (sessionError || !sessionData) {
          setError('Invalid session code. Please check and try again.')
          setCode('')
          setIsValidating(false)
          return
        }

        setSession(sessionData)
        setStep('name')
        setIsValidating(false)
      } catch (err) {
        console.error('Validation error:', err)
        setError('An error occurred. Please try again.')
        setCode('')
        setIsValidating(false)
      }
    }

    const timer = setTimeout(validateCode, 300)
    return () => clearTimeout(timer)
  }, [code, supabase])

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
      // Insert student into session
      const { data: studentData, error: studentError } = await supabase
        .from('session_students')
        .insert({
          session_id: session.id,
          student_name: name.trim(),
          is_active: true,
        })
        .select()
        .single()

      if (studentError || !studentData) {
        console.error('Student creation failed:', studentError)
        setError('Failed to join session. Please try again.')
        setIsValidating(false)
        return
      }

      setStudentId(studentData.id)

      // Store in sessionStorage for later use
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('session_id', session.id)
        sessionStorage.setItem('student_id', studentData.id)
        sessionStorage.setItem('student_name', name.trim())
        sessionStorage.setItem('activity_id', session.metadata?.activity_id || '')
      }

      // Fetch initial student count
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
          const updatedSession = payload.new as SessionRow
          if (updatedSession.status === 'playing') {
            router.push('/join/play')
          }
        }
      )
      .subscribe()

    // Also subscribe to student count updates
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
            {/* Code Display */}
            <div className="bg-slate-100 p-6 rounded-lg border border-slate-200 text-center">
              <div className="text-5xl font-bold text-orange-500 font-mono tracking-widest">
                {code.padEnd(4, '•')}
              </div>
            </div>

            {/* Number Pad */}
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

            {/* Error Message */}
            {error && <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">{error}</div>}

            {/* Validation Status */}
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
            {/* Waiting Animation */}
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

            {/* Student Count */}
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
