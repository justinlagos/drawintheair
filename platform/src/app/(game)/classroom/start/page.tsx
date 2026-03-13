'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface Activity {
  id: string
  name: string
  description: string
  emoji: string
  type: string
}

const ACTIVITIES: Activity[] = [
  {
    id: 'calibration',
    name: 'Bubble Pop',
    description: 'Pop bubbles with hand gestures',
    emoji: '🫧',
    type: 'calibration',
  },
  {
    id: 'pre-writing',
    name: 'Tracing',
    description: 'Trace lines and shapes in the air',
    emoji: '✏️',
    type: 'pre-writing',
  },
  {
    id: 'sort-and-place',
    name: 'Sort & Place',
    description: 'Sort and organize objects by categories',
    emoji: '📦',
    type: 'sort-and-place',
  },
  {
    id: 'word-search',
    name: 'Word Search',
    description: 'Find hidden words in the grid',
    emoji: '🔤',
    type: 'word-search',
  },
  {
    id: 'colour-builder',
    name: 'Colour Builder',
    description: 'Mix and match colors to complete patterns',
    emoji: '🎨',
    type: 'colour-builder',
  },
  {
    id: 'balloon-math',
    name: 'Balloon Math',
    description: 'Pop balloons to solve math problems',
    emoji: '🎈',
    type: 'balloon-math',
  },
  {
    id: 'rainbow-bridge',
    name: 'Rainbow Bridge',
    description: 'Build bridges with rainbow colors',
    emoji: '🌈',
    type: 'rainbow-bridge',
  },
  {
    id: 'gesture-spelling',
    name: 'Gesture Spelling',
    description: 'Spell words with hand gestures',
    emoji: '🖐️',
    type: 'gesture-spelling',
  },
  {
    id: 'free-paint',
    name: 'Free Paint',
    description: 'Draw and paint freely in the air',
    emoji: '🎪',
    type: 'free',
  },
]

interface SessionConfig {
  activity_id: string
  timer_seconds: number
  max_students: number
  scoreboard_mode: 'full leaderboard' | 'top 3 only' | 'personal stars only' | 'class score'
}

export default function ClassroomStartPage() {
  const router = useRouter()
  const supabase = createClient()

  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(90)
  const [maxStudents, setMaxStudents] = useState(30)
  const [scoreboardMode, setScoreboardMode] = useState<
    'full leaderboard' | 'top 3 only' | 'personal stars only' | 'class score'
  >('personal stars only')
  const [isLoading, setIsLoading] = useState(false)
  const [session, setSession] = useState<{ user: { id: string } | null }>({ user: null })
  const [isChecking, setIsChecking] = useState(true)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession()
        setSession(authSession ? { user: { id: authSession.user.id } } : { user: null })
      } catch (error) {
        console.error('Auth check failed:', error)
        setSession({ user: null })
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [supabase])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isChecking && !session.user) {
      router.push('/auth/login')
    }
  }, [isChecking, session.user, router])

  const generateSessionCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const handleStartSession = async () => {
    if (!selectedActivity || !session.user) return

    setIsLoading(true)
    try {
      const sessionCode = generateSessionCode()
      const activity = ACTIVITIES.find((a) => a.id === selectedActivity)

      // Create session in Supabase
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          teacher_id: session.user.id,
          session_code: sessionCode,
          status: 'active',
          scoreboard_mode: scoreboardMode === 'personal stars only' ? 'individual' : 'team',
          metadata: {
            activity_id: selectedActivity,
            activity_name: activity?.name,
            activity_emoji: activity?.emoji,
            timer_seconds: timerSeconds,
            max_students: maxStudents,
            scoreboard_mode: scoreboardMode,
            round_number: 1,
          },
        })
        .select()
        .single()

      if (error) {
        console.error('Session creation failed:', error)
        alert('Failed to create session. Please try again.')
        setIsLoading(false)
        return
      }

      if (data) {
        // Redirect to lobby
        router.push(`/classroom/${data.id}/lobby`)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  if (isChecking || !session.user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Start a Classroom Session</h1>
          <p className="text-slate-600">Select an activity and configure your session</p>
        </div>

        {/* Activity Grid */}
        {!selectedActivity ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {ACTIVITIES.map((activity) => (
              <Card
                key={activity.id}
                className="cursor-pointer hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/50 transition-all bg-white border-slate-200"
                onClick={() => setSelectedActivity(activity.id)}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-5xl mb-3">{activity.emoji}</div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{activity.name}</h3>
                  <p className="text-sm text-slate-600">{activity.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Configuration Panel */}
            <Card className="bg-white border-slate-200 mb-8">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{ACTIVITIES.find((a) => a.id === selectedActivity)?.emoji}</div>
                  <div>
                    <CardTitle className="text-slate-900">{ACTIVITIES.find((a) => a.id === selectedActivity)?.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedActivity(null)} className="ml-auto text-slate-600">
                    Choose Different Activity
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Timer Configuration */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-3">Session Duration</label>
                  <div className="flex gap-3">
                    {[60, 90, 120].map((seconds) => (
                      <Button
                        key={seconds}
                        variant={timerSeconds === seconds ? 'default' : 'outline'}
                        className={timerSeconds === seconds ? 'bg-orange-600 hover:bg-orange-700' : 'text-slate-900 border-slate-300'}
                        onClick={() => setTimerSeconds(seconds)}
                      >
                        {seconds}s
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Max Students */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Maximum Students</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maxStudents}
                    onChange={(e) => setMaxStudents(Math.max(1, parseInt(e.target.value) || 30))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Scoreboard Mode */}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Scoreboard Mode</label>
                  <select
                    value={scoreboardMode}
                    onChange={(e) =>
                      setScoreboardMode(
                        e.target.value as 'full leaderboard' | 'top 3 only' | 'personal stars only' | 'class score'
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="full leaderboard">Full Leaderboard</option>
                    <option value="top 3 only">Top 3 Only</option>
                    <option value="personal stars only">Personal Stars Only</option>
                    <option value="class score">Class Score</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Start Button */}
            <div className="flex gap-4">
              <Button
                onClick={handleStartSession}
                disabled={isLoading}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Session
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
