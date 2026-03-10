import { requireAuth, getTeacher } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BlurOverlay } from '@/components/ui/blur-overlay'
import { isTrial, isPro } from '@/lib/auth/tier'

export const metadata = {
  title: 'Analytics | Draw in the Air',
  description: 'View your classroom analytics and insights',
}

export default async function AnalyticsPage() {
  // Require authentication
  await requireAuth()

  // Get teacher profile
  const teacher = await getTeacher()
  if (!teacher) {
    return null
  }

  const supabase = await createClient()
  const isTrialUser = isTrial(teacher)
  const isProUser = isPro(teacher)

  // Fetch all sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select(
      `
      id,
      started_at,
      ended_at,
      session_students(count)
    `
    )
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  // Calculate statistics
  const totalSessions = sessions?.length || 0
  const totalStudents = new Set(
    sessions?.flatMap((s) => (s.session_students as any)?.map((st: any) => st.id) || []) || []
  ).size

  // Calculate this month vs last month
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const thisMonthSessions = sessions?.filter((s) => {
    const date = new Date(s.started_at)
    return date >= thisMonthStart
  }).length || 0

  const lastMonthSessions = sessions?.filter((s) => {
    const date = new Date(s.started_at)
    return date >= lastMonthStart && date <= lastMonthEnd
  }).length || 0

  // Calculate average duration
  let avgDuration = 0
  if (sessions && sessions.length > 0) {
    const totalDuration = sessions.reduce((sum, s) => {
      if (s.ended_at && s.started_at) {
        return sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime())
      }
      return sum
    }, 0)
    avgDuration = Math.round(totalDuration / sessions.length / 60000)
  }

  // Group by date (weekly view)
  const weeklyData: Record<string, number> = {}
  if (sessions) {
    sessions.forEach((s) => {
      const date = new Date(s.started_at)
      const weekStart = new Date(date)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1
    })
  }

  const analyticsContent = (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Analytics</h1>
        <p className="mt-1 text-slate-400">Track your classroom performance and student engagement</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-100">{totalSessions}</p>
            <p className="mt-2 text-sm text-slate-400">{thisMonthSessions} this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-100">{totalStudents}</p>
            <p className="mt-2 text-sm text-slate-400">Across all sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-100">{avgDuration}m</p>
            <p className="mt-2 text-sm text-slate-400">Per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Session Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Session Trend</CardTitle>
          <CardDescription>Number of sessions per week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(weeklyData)
            .slice(0, 8)
            .map(([week, count]) => (
              <div key={week} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{week}</span>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 bg-slate-800 rounded flex items-center justify-center">
                    <div
                      className="h-full bg-violet-500 rounded transition-all"
                      style={{
                        width: `${Math.min((count / Math.max(...Object.values(weeklyData))) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-100">{count}</span>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Engagement Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Summary</CardTitle>
          <CardDescription>Monthly comparison and trends</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-slate-100 mb-3">This Month vs Last Month</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-800/50 p-4">
                <p className="text-sm text-slate-400">This Month</p>
                <p className="mt-1 text-2xl font-bold text-slate-100">{thisMonthSessions}</p>
              </div>
              <div className="rounded-lg bg-slate-800/50 p-4">
                <p className="text-sm text-slate-400">Last Month</p>
                <p className="mt-1 text-2xl font-bold text-slate-100">{lastMonthSessions}</p>
              </div>
            </div>
          </div>

          {thisMonthSessions > 0 && (
            <div>
              <p className="text-sm text-emerald-400">
                +{Math.round(((thisMonthSessions - lastMonthSessions) / Math.max(lastMonthSessions, 1)) * 100)}% growth from last month
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <BlurOverlay
      isLocked={isTrialUser && !isProUser}
      upgradeMessage="Upgrade to Pro to access full analytics"
    >
      {analyticsContent}
    </BlurOverlay>
  )
}
