import { requireAuth, getTeacher } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { BlurOverlay } from '@/components/ui/blur-overlay'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isTrial } from '@/lib/auth/tier'
import { Lock } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Session History | Draw in the Air',
  description: 'View your classroom session history',
}

export default async function SessionsPage() {
  // Require authentication
  await requireAuth()

  // Get teacher profile
  const teacher = await getTeacher()
  if (!teacher) {
    return null
  }

  const supabase = await createClient()
  const isTrialUser = isTrial(teacher)

  // Fetch all sessions
  const { data: sessions } = await supabase
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
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  // If trial user, only show first 5 sessions in UI
  const displayedSessions = isTrialUser && sessions ? sessions.slice(0, 5) : sessions || []
  const hiddenSessionCount = isTrialUser && sessions ? Math.max(0, sessions.length - 5) : 0

  // Build table rows
  const rows = displayedSessions.map((session) => {
    const date = new Date(session.started_at)
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    const studentCount = (session.session_students as any)?.length || 0

    const duration = session.ended_at
      ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
      : 0

    let statusVariant: 'default' | 'warning' | 'danger' | 'success' = 'default'
    if (session.status === 'active') statusVariant = 'warning'
    if (session.status === 'completed') statusVariant = 'success'

    return [
      <span key="date">{dateStr} {timeStr}</span>,
      <span key="activity">Classroom Session</span>,
      <span key="students">{studentCount}</span>,
      <span key="rounds">—</span>,
      <span key="stars">—</span>,
      <span key="duration">{duration}m</span>,
      <Badge key="status" variant={statusVariant === 'success' ? 'success' : statusVariant === 'warning' ? 'warning' : 'default'}>
        {session.status}
      </Badge>,
    ]
  })

  const content = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Session History</h1>
        <p className="mt-1 text-slate-400">Review all your classroom sessions and student performance</p>
      </div>

      <DataTable
        headers={['Date', 'Activity', 'Students', 'Rounds', 'Avg Stars', 'Duration', 'Status']}
        rows={rows}
        emptyMessage="No sessions yet. Start a classroom session to get started!"
      />

      {hiddenSessionCount > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-sm text-slate-400">
            Showing 5 of {displayedSessions.length + hiddenSessionCount} sessions
          </p>
        </div>
      )}
    </div>
  )

  return (
    <BlurOverlay
      isLocked={isTrialUser && hiddenSessionCount > 0}
      upgradeMessage="Upgrade to Pro to see your full session history"
    >
      {content}
    </BlurOverlay>
  )
}
