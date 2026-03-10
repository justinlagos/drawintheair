'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type SessionRow = Database['public']['Tables']['sessions']['Row']
type RoundScore = Database['public']['Tables']['round_scores']['Row']

export default function JoinResultsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [session, setSession] = useState<SessionRow | null>(null)
  const [studentName, setStudentName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [myStars, setMyStars] = useState(0)
  const [myRank, setMyRank] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [classTotal, setClassTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Load session and results
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

      // Load results
      const loadResults = async () => {
        // Fetch session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', storedSessionId)
          .single()

        if (sessionError || !sessionData) {
          console.error('Failed to load session:', sessionError)
          router.push('/join')
          return
        }

        setSession(sessionData)

        // Fetch my scores
        const { data: myScores } = await supabase
          .from('round_scores')
          .select('*')
          .eq('session_id', storedSessionId)
          .eq('session_student_id', storedStudentId)
          .eq('round_number', sessionData.metadata?.round_number || 1)

        let myTotal = 0
        if (myScores) {
          myTotal = myScores.reduce((sum, score) => sum + Math.ceil(score.score / 20), 0)
          setMyStars(myTotal)
        }

        // Fetch all scores for ranking and class total
        const { data: allScores } = await supabase
          .from('round_scores')
          .select('*')
          .eq('session_id', storedSessionId)
          .eq('round_number', sessionData.metadata?.round_number || 1)

        if (allScores) {
          // Calculate class total
          const total = allScores.reduce((sum, score) => sum + Math.ceil(score.score / 20), 0)
          setClassTotal(total)

          // Calculate ranking
          const scoreMap = new Map<string, number>()
          allScores.forEach((score) => {
            const current = scoreMap.get(score.session_student_id) || 0
            scoreMap.set(score.session_student_id, current + Math.ceil(score.score / 20))
          })

          const sorted = Array.from(scoreMap.entries()).sort((a, b) => b[1] - a[1])
          const myRankIndex = sorted.findIndex((entry) => entry[0] === storedStudentId)
          setMyRank(myRankIndex >= 0 ? myRankIndex + 1 : 0)
        }

        // Fetch student count
        const { data: students } = await supabase
          .from('session_students')
          .select('*')
          .eq('session_id', storedSessionId)
          .eq('is_active', true)

        setTotalStudents(students?.length || 0)
        setIsLoading(false)
      }

      loadResults()
    } catch (err) {
      console.error('Error in initialization:', err)
      router.push('/join')
    }
  }, [supabase, router])

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

          if (updatedSession.status === 'active') {
            // Next round is starting (status changes back to active)
            router.push('/join')
          } else if (updatedSession.status === 'completed') {
            // Session ended
            router.push('/join')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase, router])

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  const scoreboardMode = session.metadata?.scoreboard_mode || 'personal stars only'

  // Render based on scoreboard mode
  const renderResults = () => {
    if (scoreboardMode === 'full leaderboard') {
      return (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Your Rank</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-5xl font-bold text-indigo-400">#{myRank}</div>
            <p className="text-slate-400">Out of {totalStudents} students</p>
          </CardContent>
        </Card>
      )
    } else if (scoreboardMode === 'top 3 only') {
      const medals = ['🥇', '🥈', '🥉']
      const inTopThree = myRank > 0 && myRank <= 3

      return (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">{inTopThree ? 'You Made Top 3! 🎉' : 'Top 3'}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {inTopThree && (
              <div className="text-5xl mb-4">{medals[myRank - 1]}</div>
            )}
            <p className="text-slate-400">
              {inTopThree ? `You're #${myRank}!` : 'Keep trying to reach the top 3!'}
            </p>
          </CardContent>
        </Card>
      )
    } else if (scoreboardMode === 'class score') {
      return (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Class Contribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-slate-400 mb-2">Class Total</p>
              <div className="text-2xl mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.min(classTotal, 5) ? '⭐' : '☆'}>
                    {' '}
                  </span>
                ))}
              </div>
              <p className="text-white font-semibold">{classTotal} Stars</p>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <p className="text-slate-400 mb-2">Your Contribution</p>
              <div className="text-2xl">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.min(myStars, 5) ? '⭐' : '☆'}>
                    {' '}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )
    } else {
      // Personal stars only (default)
      return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Main Result */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Awesome Work, {studentName}! 🎉</h1>
          <p className="text-slate-400">Here's how you did</p>
        </div>

        {/* Large Star Display */}
        <Card className="bg-slate-900 border-slate-700 mb-8">
          <CardContent className="text-center py-16">
            <p className="text-slate-400 text-lg mb-4">You earned</p>
            <div className="text-7xl mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < Math.min(myStars, 5) ? '⭐' : '☆'}>
                  {' '}
                </span>
              ))}
            </div>
            <p className="text-white text-3xl font-bold">{myStars} Stars</p>
          </CardContent>
        </Card>

        {/* Mode-specific results */}
        {renderResults() && (
          <div className="mb-8">
            {renderResults()}
          </div>
        )}

        {/* Waiting Message */}
        <Card className="bg-slate-900 border-slate-700 mb-8">
          <CardContent className="text-center py-8">
            <p className="text-slate-400 text-lg">⏳ Waiting for the next round...</p>
            <p className="text-slate-500 text-sm mt-2">Your teacher will start a new round when everyone is ready</p>

            <div className="flex justify-center gap-1 mt-6">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </CardContent>
        </Card>

        {/* Go Back Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => router.push('/join')}
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-800"
          >
            Return to Lobby
          </Button>
        </div>
      </div>
    </div>
  )
}
