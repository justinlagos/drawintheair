import { requireAuth, getTeacher } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { isPro, getTierDescription } from '@/lib/auth/tier'
import {
  BookOpen,
  Users,
  Star,
  Clock,
  Play,
  Activity,
} from 'lucide-react'

export const metadata = {
  title: 'Dashboard | Draw in the Air',
  description: 'Teacher dashboard overview',
}

export default async function DashboardPage() {
  // Require authentication
  await requireAuth()

  // Get teacher profile
  const teacher = await getTeacher()
  if (!teacher) {
    return null
  }

  const supabase = await createClient()
  const isProTier = isPro(teacher)

  // Fetch session stats
  const { data: stats } = await supabase
    .from('v_teacher_session_stats')
    .select('*')
    .eq('teacher_id', teacher.id)
    .single()

  // Fetch last 5 sessions
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
    .limit(5)

  // Calculate avg stars from sessions
  let avgStars = 0
  if (sessions && sessions.length > 0) {
    const totalStars = sessions.reduce((acc) => acc + 1, 0) // Placeholder
    avgStars = totalStars / sessions.length
  }

  // Calculate avg duration
  let avgDuration = 0
  if (stats?.avg_session_duration) {
    avgDuration = Math.round(stats.avg_session_duration)
  }

  const totalSessions = stats?.total_sessions || 0
  const totalStudents = stats?.total_students || 0

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {teacher.name || 'Teacher'}
          </h1>
          <p className="mt-1 text-slate-600">Here's what's been happening with your classroom sessions.</p>
        </div>
        <Badge variant={isProTier ? 'pro' : 'trial'}>
          {getTierDescription(teacher)}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard
          title="Total Sessions"
          value={totalSessions}
          icon={BookOpen}
        />
        <StatCard
          title="Students Engaged"
          value={totalStudents}
          icon={Users}
        />
        <StatCard
          title="Avg Rating"
          value={avgStars.toFixed(1)}
          icon={Star}
        />
        <StatCard
          title="Avg Duration"
          value={`${avgDuration}m`}
          icon={Clock}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with your next classroom session</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button
            variant="primary"
            href="/classroom/start"
            disabled={!isProTier}
            title={!isProTier ? 'Upgrade to Pro to start a classroom session' : ''}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Classroom
          </Button>
          <Button
            variant="secondary"
            href="/play"
          >
            <Activity className="mr-2 h-4 w-4" />
            Play Activities
          </Button>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {!sessions || sessions.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Run your first classroom session"
          description="Create an engaging learning experience with your students"
          actionLabel={isProTier ? 'Start Classroom' : 'Upgrade to Pro'}
          actionHref={isProTier ? '/classroom/start' : '/dashboard/upgrade'}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Your 5 most recent classroom sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session) => {
                const date = new Date(session.started_at)
                const dateStr = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                const studentCount = (session.session_students as any)?.length || 0

                let statusVariant: 'default' | 'warning' | 'danger' | 'success' = 'default'
                if (session.status === 'active') statusVariant = 'warning'
                if (session.status === 'completed') statusVariant = 'success'

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">Session #{session.id.slice(0, 8)}</p>
                      <p className="text-sm text-slate-600">
                        {dateStr} • {studentCount} student{studentCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant={statusVariant === 'success' ? 'success' : statusVariant === 'warning' ? 'warning' : 'default'}>
                      {session.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
