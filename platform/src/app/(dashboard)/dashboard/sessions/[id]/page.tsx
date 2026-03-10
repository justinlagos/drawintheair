import { requireTier, getTeacher } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Session Details | Draw in the Air',
  description: 'View detailed session information',
}

interface PageProps {
  params: {
    id: string
  }
}

export default async function SessionDetailPage({ params }: PageProps) {
  // Require Pro tier
  const teacher = await requireTier('pro')

  const supabase = await createClient()

  // Fetch session
  const { data: session } = await supabase
    .from('sessions')
    .select(
      `
      id,
      status,
      started_at,
      ended_at,
      scoreboard_mode,
      session_students(count)
    `
    )
    .eq('id', params.id)
    .eq('teacher_id', teacher.id)
    .single()

  if (!session) {
    notFound()
  }

  // Fetch round scores with student names
  const { data: roundScores } = await supabase
    .from('round_scores')
    .select(
      `
      id,
      round_number,
      gesture_name,
      accuracy,
      score,
      session_student_id,
      session_students!inner(student_name)
    `
    )
    .eq('session_id', params.id)
    .order('round_number', { ascending: true })

  // Fetch session students
  const { data: sessionStudents } = await supabase
    .from('session_students')
    .select('*')
    .eq('session_id', params.id)

  // Calculate statistics
  const startDate = new Date(session.started_at)
  const endDate = session.ended_at ? new Date(session.ended_at) : new Date()
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)

  const studentCount = sessionStudents?.length || 0
  const totalRounds = roundScores ? Math.max(...roundScores.map((r) => r.round_number), 0) : 0

  // Group round scores by student
  const studentStats: Record<string, { totalScore: number; rounds: number }> = {}
  if (roundScores) {
    roundScores.forEach((score) => {
      const studentName = (score.session_students as any)?.student_name || 'Unknown'
      if (!studentStats[studentName]) {
        studentStats[studentName] = { totalScore: 0, rounds: 0 }
      }
      studentStats[studentName].totalScore += score.score
      studentStats[studentName].rounds += 1
    })
  }

  // Calculate average stars
  let avgStars = 0
  if (roundScores && roundScores.length > 0) {
    const totalAccuracy = roundScores.reduce((sum, r) => sum + r.accuracy, 0)
    avgStars = (totalAccuracy / roundScores.length) * 5 // Convert accuracy percentage to 5-star scale
  }

  // Build student table rows
  const studentRows = Object.entries(studentStats).map(([name, stats]) => {
    const avgScore = Math.round(stats.totalScore / Math.max(stats.rounds, 1))
    return [
      <span key="name" className="font-medium">{name}</span>,
      <span key="total">{stats.totalScore}</span>,
      <span key="avg">{avgScore}</span>,
      <span key="rounds">{stats.rounds}</span>,
    ]
  })

  // Group rounds by round number
  const roundsByNumber: Record<number, typeof roundScores> = {}
  if (roundScores) {
    roundScores.forEach((score) => {
      if (!roundsByNumber[score.round_number]) {
        roundsByNumber[score.round_number] = []
      }
      roundsByNumber[score.round_number].push(score)
    })
  }

  const statusVariantMap: Record<string, 'default' | 'warning' | 'success'> = {
    active: 'warning',
    completed: 'success',
    paused: 'default',
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link href="/dashboard/sessions" className="flex items-center gap-2 text-violet-400 hover:text-violet-300">
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </Link>

      {/* Session Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            Session #{params.id.slice(0, 8)}
          </h1>
          <p className="mt-1 text-slate-400">
            {startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {' at '}
            {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
        <Badge variant={statusVariantMap[session.status] || 'default'}>
          {session.status}
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-400">Total Students</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{studentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-400">Total Rounds</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{totalRounds}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-400">Avg Rating</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{avgStars.toFixed(1)}/5</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-400">Duration</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{durationMinutes}m</p>
          </CardContent>
        </Card>
      </div>

      {/* Round Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Round Breakdown</CardTitle>
          <CardDescription>Performance for each round in this session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(roundsByNumber)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([roundNum, scores]) => (
              <div key={roundNum} className="rounded-lg border border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-100">Round {roundNum}</h3>
                  <span className="text-sm text-slate-400">
                    {scores.length} student{scores.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {scores.map((score) => (
                    <div key={score.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">
                        {(score.session_students as any)?.student_name || 'Unknown'} - {score.gesture_name}
                      </span>
                      <span className="font-medium text-slate-100">
                        {Math.round(score.accuracy * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Student Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
          <CardDescription>Individual student scores and completion</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Student', 'Total Score', 'Avg Score', 'Rounds']}
            rows={studentRows}
            emptyMessage="No student performance data available"
          />
        </CardContent>
      </Card>
    </div>
  )
}
