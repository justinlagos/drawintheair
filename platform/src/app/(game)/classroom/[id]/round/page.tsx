'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type SessionRow = Database['public']['Tables']['sessions']['Row']
type RoundScore = Database['public']['Tables']['round_scores']['Row']

interface StudentScore {
  student_id: string
  student_name: string
  total_stars: number
  completed: boolean
}

export default function ClassroomRoundPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const supabase = createClient()

  const [session, setSession] = useState<SessionRow | null>(null)
  const [scores, setScores] = useState<StudentScore[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [isEnding, setIsEnding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load session and set up subscriptions
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Get current user
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession()
        if (!authSession) {
          router.push('/auth/login')
          return
        }

        // Fetch session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessionError) {
          console.error('Session fetch failed:', sessionError)
          router.push('/classroom/start')
          return
        }

        setSession(sessionData)

        // Set timer
        const timerSeconds = sessionData.metadata?.timer_seconds || 90
        setTimeLeft(timerSeconds)

        // Fetch initial scores
        await loadScores(sessionData)

        // Subscribe to score updates
        const channel = supabase
          .channel(`session:${sessionId}:scores`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'round_scores',
              filter: `session_id=eq.${sessionId}`,
            },
            () => {
              loadScores(sessionData)
            }
          )
          .subscribe()

        setIsLoading(false)

        return () => {
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.error('Error loading session:', error)
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionId, supabase, router])

  // Load and aggregate scores
  const loadScores = async (sessionData: SessionRow) => {
    try {
      // Fetch round scores
      const { data: roundScores } = await supabase
        .from('round_scores')
        .select('*')
        .eq('session_id', sessionId)
        .eq('round_number', sessionData.metadata?.round_number || 1)

      // Fetch students for names
      const { data: students } = await supabase
        .from('session_students')
        .select('*')
        .eq('session_id', sessionId)

      if (roundScores && students) {
        // Aggregate scores by student
        const scoreMap = new Map<string, StudentScore>()

        students.forEach((student) => {
          scoreMap.set(student.id, {
            student_id: student.id,
            student_name: student.student_name,
            total_stars: 0,
            completed: false,
          })
        })

        roundScores.forEach((score) => {
          const existing = scoreMap.get(score.session_student_id)
          if (existing) {
            existing.total_stars += Math.ceil(score.score / 20) // Convert score to stars
            existing.completed = score.completed
          }
        })

        // Sort by stars descending
        const sortedScores = Array.from(scoreMap.values()).sort((a, b) => b.total_stars - a.total_stars)
        setScores(sortedScores)
      }
    } catch (error) {
      console.error('Error loading scores:', error)
    }
  }

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      handleEndRound()
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft])

  const handleEndRound = async () => {
    setIsEnding(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'results' })
        .eq('id', sessionId)

      if (error) {
        console.error('Failed to end round:', error)
        alert('Failed to end round. Please try again.')
        setIsEnding(false)
        return
      }

      router.push(`/classroom/${sessionId}/results`)
    } catch (error) {
      console.error('Unexpected error:', error)
      setIsEnding(false)
    }
  }

  // Get timer color based on remaining time
  const getTimerColor = () => {
    if (timeLeft <= 10) return 'text-red-500'
    if (timeLeft <= 30) return 'text-amber-500'
    return 'text-green-500'
  }

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

  const scoreboardMode = session.metadata?.scoreboard_mode || 'personal stars only'
  const activityName = session.metadata?.activity_name || 'Activity'
  const activityEmoji = session.metadata?.activity_emoji || '🎮'

  // Render different scoreboard modes
  const renderScoreboard = () => {
    if (scoreboardMode === 'full leaderboard') {
      // Show full leaderboard
      return (
        <div className="space-y-2">
          {scores.map((student, idx) => (
            <div
              key={student.student_id}
              className="flex items-center gap-4 p-4 bg-slate-100 rounded-lg border border-slate-300"
            >
              <div className="text-2xl font-bold text-orange-500 w-8 text-center">{idx + 1}</div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">{student.student_name}</p>
              </div>
              <div className="text-xl">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.min(student.total_stars, 5) ? '⭐' : '☆'}>
                    {' '}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    } else if (scoreboardMode === 'top 3 only') {
      // Show only top 3 with medals
      const medals = ['🥇', '🥈', '🥉']
      return (
        <div className="space-y-2">
          {scores.slice(0, 3).map((student, idx) => (
            <div
              key={student.student_id}
              className="flex items-center gap-4 p-4 bg-slate-100 rounded-lg border border-slate-300"
            >
              <div className="text-3xl w-8 text-center">{medals[idx]}</div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">{student.student_name}</p>
              </div>
              <div className="text-xl">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.min(student.total_stars, 5) ? '⭐' : '☆'}>
                    {' '}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    } else if (scoreboardMode === 'personal stars only') {
      // Show only personal scores, no ranking
      return (
        <div className="text-center">
          <div className="inline-block bg-slate-100 border border-slate-300 rounded-lg p-8">
            <p className="text-slate-600 text-lg mb-4">Round in progress...</p>
            <p className="text-slate-900 text-2xl font-semibold">{scores.length} Student{scores.length !== 1 ? 's' : ''} Playing</p>
          </div>
        </div>
      )
    } else {
      // Class score mode
      const totalStars = scores.reduce((sum, s) => sum + s.total_stars, 0)
      return (
        <div className="text-center">
          <div className="inline-block bg-slate-100 border border-slate-300 rounded-lg p-8">
            <p className="text-slate-600 text-lg mb-4">Class Total</p>
            <p className="text-5xl font-bold text-orange-500 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < Math.min(totalStars, 5) ? '⭐' : '☆'}>
                  {' '}
                </span>
              ))}
            </p>
            <p className="text-slate-900 text-xl">{totalStars} Total Stars</p>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Timer */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{activityEmoji} {activityName}</h1>
            <p className="text-slate-600 mt-1">Round in progress</p>
          </div>

          {/* Timer */}
          <div className="text-right">
            <p className={`text-5xl font-bold font-mono ${getTimerColor()}`}>{formatTime(timeLeft)}</p>
            <p className="text-slate-600 text-sm mt-1">
              {timeLeft <= 10 ? '⏰ Time running out!' : 'Time remaining'}
            </p>
          </div>
        </div>

        {/* Scoreboard */}
        <Card className="bg-white border-slate-200 mb-8">
          <CardHeader>
            <CardTitle className="text-slate-900">Live Scores</CardTitle>
          </CardHeader>
          <CardContent>{renderScoreboard()}</CardContent>
        </Card>

        {/* End Round Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleEndRound}
            disabled={isEnding}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
          >
            {isEnding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            End Round
          </Button>
        </div>
      </div>
    </div>
  )
}
