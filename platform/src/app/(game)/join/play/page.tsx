'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type SessionRow = Database['public']['Tables']['sessions']['Row']

export default function JoinPlayPage() {
  const router = useRouter()
  const supabase = createClient()

  const [session, setSession] = useState<SessionRow | null>(null)
  const [studentName, setStudentName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [stars, setStars] = useState(0)

  // Load session and data from sessionStorage
  useEffect(() => {
    try {
      const storedSessionId = sessionStorage.getItem('session_id')
      const storedStudentId = sessionStorage.getItem('student_id')
      const storedName = sessionStorage.getItem('student_name')

      if (!storedSessionId || !storedStudentId || !storedName) {
        router.push('/join')
        return
      }

      setSessionId(storedSessionId)
      setStudentId(storedStudentId)
      setStudentName(storedName)

      // Fetch session
      const loadSession = async () => {
        const { data: sessionData, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', storedSessionId)
          .single()

        if (error || !sessionData) {
          console.error('Failed to load session:', error)
          router.push('/join')
          return
        }

        setSession(sessionData)
        const timerSeconds = sessionData.metadata?.timer_seconds || 90
        setTimeLeft(timerSeconds)
        setIsLoading(false)
      }

      loadSession()
    } catch (err) {
      console.error('Error in initialization:', err)
      router.push('/join')
    }
  }, [supabase, router])

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || isLoading) return

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft, isLoading])

  // Subscribe to session status
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`session:${sessionId}:status`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedSession = payload.new as SessionRow
          if (updatedSession.status === 'results') {
            router.push('/join/results')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, router])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  const activityName = session.metadata?.activity_name || 'Activity'
  const activityEmoji = session.metadata?.activity_emoji || '🎮'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Timer and Score */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm text-slate-600">Playing as</p>
            <h1 className="text-2xl font-bold text-slate-900">{studentName}</h1>
          </div>

          {/* Timer */}
          <div className="text-right">
            <p className="text-4xl font-bold font-mono text-orange-500">{formatTime(timeLeft)}</p>
            <p className="text-slate-600 text-sm mt-1">Time remaining</p>
          </div>

          {/* Score */}
          <div className="text-right">
            <p className="text-sm text-slate-600">Your Score</p>
            <div className="text-2xl mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < Math.min(stars, 5) ? '⭐' : '☆'}>
                  {' '}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Game Area */}
        <Card className="bg-white border-slate-200 min-h-96 flex flex-col items-center justify-center">
          <CardContent className="text-center space-y-6 py-20">
            <div className="text-7xl">{activityEmoji}</div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{activityName}</h2>
              <p className="text-slate-600">
                The game engine will be integrated here with MediaPipe gesture detection
              </p>
            </div>

            {/* Placeholder for Game Canvas */}
            <div className="w-full h-64 bg-slate-200 border-2 border-dashed border-slate-400 rounded-lg flex items-center justify-center mt-8">
              <div className="text-center">
                <p className="text-slate-600 text-lg">Game Canvas Placeholder</p>
                <p className="text-slate-500 text-sm mt-2">Camera feed and gesture detection will appear here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Instructions */}
        <Card className="bg-white border-slate-200 mt-8">
          <CardHeader>
            <CardTitle className="text-slate-900">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-700">
              <li className="flex gap-3">
                <span className="text-orange-500">•</span>
                <span>Watch the timer - you have {session.metadata?.timer_seconds || 90} seconds</span>
              </li>
              <li className="flex gap-3">
                <span className="text-orange-500">•</span>
                <span>Follow the prompts and use your hand gestures</span>
              </li>
              <li className="flex gap-3">
                <span className="text-orange-500">•</span>
                <span>Try to earn as many stars as possible</span>
              </li>
              <li className="flex gap-3">
                <span className="text-orange-500">•</span>
                <span>When the timer ends, you'll see your results</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
