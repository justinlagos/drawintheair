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

interface StudentResult {
  student_id: string
  student_name: string
  total_stars: number
  completed: number
  accuracy: number
}

const ACTIVITIES = [
  { id: 'calibration', name: 'Bubble Pop', emoji: '🫧' },
  { id: 'pre-writing', name: 'Tracing', emoji: '✏️' },
  { id: 'sort-and-place', name: 'Sort & Place', emoji: '📦' },
  { id: 'word-search', name: 'Word Search', emoji: '🔤' },
  { id: 'colour-builder', name: 'Colour Builder', emoji: '🎨' },
  { id: 'balloon-math', name: 'Balloon Math', emoji: '🎈' },
  { id: 'rainbow-bridge', name: 'Rainbow Bridge', emoji: '🌈' },
  { id: 'gesture-spelling', name: 'Gesture Spelling', emoji: '🖐️' },
  { id: 'free-paint', name: 'Free Paint', emoji: '🎪' },
]

export default function ClassroomResultsPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const supabase = createClient()

  const [session, setSession] = useState<SessionRow | null>(null)
  const [results, setResults] = useState<StudentResult[]>([])
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)

  // Load session and results
  useEffect(() => {
    const loadResults = async () => {
      try {
        // Get current user
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession()
        if (!authSession) {
          router.push('/auth/login')
          return
        }
        setUser({ id: authSession.user.id })

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

        // Fetch scores
        const { data: roundScores } = await supabase
          .from('round_scores')
          .select('*')
          .eq('session_id', sessionId)
          .eq('round_number', sessionData.metadata?.round_number || 1)

        // Fetch students
        const { data: students } = await supabase
          .from('session_students')
          .select('*')
          .eq('session_id', sessionId)

        if (roundScores && students) {
          // Aggregate results
          const resultMap = new Map<string, StudentResult>()

          students.forEach((student) => {
            resultMap.set(student.id, {
              student_id: student.id,
              student_name: student.student_name,
              total_stars: 0,
              completed: 0,
              accuracy: 0,
            })
          })

          let totalAccuracy = 0
          roundScores.forEach((score) => {
            const existing = resultMap.get(score.session_student_id)
            if (existing) {
              existing.total_stars += Math.ceil(score.score / 20)
              if (score.completed) existing.completed += 1
              existing.accuracy += score.accuracy
              totalAccuracy += score.accuracy
            }
          })

          // Calculate average accuracy
          if (roundScores.length > 0) {
            const avgAccuracy = totalAccuracy / roundScores.length
            Array.from(resultMap.values()).forEach((result) => {
              result.accuracy = Math.round(avgAccuracy)
            })
          }

          // Sort by stars descending
          const sorted = Array.from(resultMap.values()).sort((a, b) => b.total_stars - a.total_stars)
          setResults(sorted)
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error loading results:', error)
        setIsLoading(false)
      }
    }

    loadResults()
  }, [sessionId, supabase, router])

  const handleNextRound = async () => {
    if (!session || !user) return

    setIsProcessing(true)
    try {
      const newRoundNumber = (session.metadata?.round_number || 1) + 1

      // Update session
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'active',
          metadata: {
            ...session.metadata,
            round_number: newRoundNumber,
          },
        })
        .eq('id', sessionId)

      if (error) {
        console.error('Failed to start next round:', error)
        alert('Failed to start next round. Please try again.')
        setIsProcessing(false)
        return
      }

      router.push(`/classroom/${sessionId}/lobby`)
    } catch (error) {
      console.error('Unexpected error:', error)
      setIsProcessing(false)
    }
  }

  const handleChangeActivity = async (activityId: string) => {
    if (!session || !user) return

    setIsProcessing(true)
    try {
      const activity = ACTIVITIES.find((a) => a.id === activityId)

      // Reset round to 1 and update activity
      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'active',
          metadata: {
            ...session.metadata,
            activity_id: activityId,
            activity_name: activity?.name,
            activity_emoji: activity?.emoji,
            round_number: 1,
          },
        })
        .eq('id', sessionId)

      if (error) {
        console.error('Failed to change activity:', error)
        alert('Failed to change activity. Please try again.')
        setIsProcessing(false)
        return
      }

      setShowActivityModal(false)
      router.push(`/classroom/${sessionId}/lobby`)
    } catch (error) {
      console.error('Unexpected error:', error)
      setIsProcessing(false)
    }
  }

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this session?')) return

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (error) {
        console.error('Failed to end session:', error)
        alert('Failed to end session. Please try again.')
        return
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Unexpected error:', error)
    }
  }

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  const activityName = session.metadata?.activity_name || 'Activity'
  const activityEmoji = session.metadata?.activity_emoji || '🎮'
  const topThree = results.slice(0, 3)
  const medals = ['🥇', '🥈', '🥉']

  // Calculate stats
  const totalCompleted = results.reduce((sum, r) => sum + r.completed, 0)
  const avgAccuracy = Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / (results.length || 1))
  const starDistribution = [0, 0, 0, 0, 0, 0]
  results.forEach((r) => {
    if (r.total_stars < starDistribution.length) {
      starDistribution[r.total_stars]++
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Round Complete! 🎉</h1>
          <p className="text-slate-400">{activityEmoji} {activityName}</p>
        </div>

        {/* Podium */}
        {topThree.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {topThree.map((result, idx) => (
                <Card key={result.student_id} className="bg-slate-900 border-slate-700">
                  <CardContent className="p-6 text-center">
                    <div className="text-5xl mb-3">{medals[idx]}</div>
                    <p className="text-lg font-semibold text-white mb-2">{result.student_name}</p>
                    <div className="text-2xl mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < Math.min(result.total_stars, 5) ? '⭐' : '☆'}>
                          {' '}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-slate-400">{result.total_stars} Stars</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <Card className="bg-slate-900 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Round Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 p-4 rounded-lg text-center">
                <p className="text-slate-400 text-sm">Participants</p>
                <p className="text-2xl font-bold text-white mt-1">{results.length}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg text-center">
                <p className="text-slate-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-white mt-1">{totalCompleted}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg text-center">
                <p className="text-slate-400 text-sm">Avg Accuracy</p>
                <p className="text-2xl font-bold text-white mt-1">{avgAccuracy}%</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg text-center">
                <p className="text-slate-400 text-sm">Completion Rate</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {Math.round((totalCompleted / (results.length || 1)) * 100)}%
                </p>
              </div>
            </div>

            {/* Star Distribution */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-white mb-3">Star Distribution</p>
              {starDistribution.map((count, stars) => (
                <div key={stars} className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 w-12">{stars} Stars:</span>
                  <div className="flex-1 h-6 bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all"
                      style={{ width: `${Math.max(5, (count / results.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-400 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Full Results Table */}
        {results.length > 3 && (
          <Card className="bg-slate-900 border-slate-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white">All Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div
                    key={result.student_id}
                    className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg"
                  >
                    <div className="text-sm font-bold text-indigo-400 w-6">{idx + 1}</div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{result.student_name}</p>
                    </div>
                    <div className="text-lg">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < Math.min(result.total_stars, 5) ? '⭐' : '☆'}>
                          {' '}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={handleNextRound}
            disabled={isProcessing}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Next Round
          </Button>

          <Button
            onClick={() => setShowActivityModal(true)}
            disabled={isProcessing}
            variant="outline"
            className="px-6 py-3 border-slate-600 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Change Activity
          </Button>

          <Button
            onClick={handleEndSession}
            variant="destructive"
            className="px-6 py-3 text-white font-semibold"
          >
            End Session
          </Button>
        </div>
      </div>

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <Card className="bg-slate-900 border-slate-700 max-w-3xl w-full">
            <CardHeader>
              <CardTitle className="text-white">Choose New Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {ACTIVITIES.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => handleChangeActivity(activity.id)}
                    disabled={isProcessing}
                    className="p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/50 transition-all text-center disabled:opacity-50"
                  >
                    <div className="text-4xl mb-2">{activity.emoji}</div>
                    <p className="font-semibold text-white text-sm">{activity.name}</p>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setShowActivityModal(false)}
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-800"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
