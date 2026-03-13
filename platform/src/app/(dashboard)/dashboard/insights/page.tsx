import { requireAuth, getTeacher } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BlurOverlay } from '@/components/ui/blur-overlay'
import { EmptyState } from '@/components/ui/empty-state'
import { isTrial, isPro } from '@/lib/auth/tier'
import { Sparkles, AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Insights | Draw in the Air',
  description: 'AI insights about your classroom performance',
}

export default async function InsightsPage() {
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

  // Fetch teacher insights
  const { data: insights } = await supabase
    .from('teacher_insights')
    .select('*')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  // For demo purposes, if no real insights, create mock ones
  const displayedInsights = insights && insights.length > 0 ? insights : [
    {
      id: '1',
      teacher_id: teacher.id,
      metric: 'engagement_trend',
      value: 85,
      period: 'week' as const,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ]

  // If trial user, only show first insight fully
  const fullInsight = displayedInsights[0]
  const hiddenInsightCount = isTrialUser && displayedInsights.length > 1 ? displayedInsights.length - 1 : 0

  // Map insights to friendly titles and descriptions
  const insightMap: Record<string, { title: string; description: string; variant: 'default' | 'warning' | 'danger' }> = {
    engagement_trend: {
      title: 'Engagement Trend',
      description: 'Your students are showing strong engagement this week. Keep up the interactive activities!',
      variant: 'default',
    },
    low_accuracy_gesture: {
      title: 'Challenging Gesture Detected',
      description: 'Students are struggling with the wave gesture. Consider breaking it down into smaller steps.',
      variant: 'warning',
    },
    session_completion: {
      title: 'Completion Rate Improving',
      description: 'Your session completion rate has improved 15% compared to last month.',
      variant: 'default',
    },
  }

  const currentInsight = insightMap[fullInsight?.metric] || {
    title: 'Classroom Insight',
    description: 'Run a few more sessions for personalized insights about your teaching.',
    variant: 'default' as const,
  }

  const insightsContent = (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Insights</h1>
          <p className="mt-1 text-slate-600">Personalized recommendations to improve your classroom</p>
        </div>
        {isProUser && (
          <Button variant="primary" href="/api/insights/generate">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Insights Now
          </Button>
        )}
      </div>

      {!displayedInsights || displayedInsights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No insights yet"
          description="Run a few classroom sessions and we'll analyze your data"
          actionLabel="Start Classroom"
          actionHref="/classroom/start"
        />
      ) : (
        <div className="space-y-4">
          {/* Full Insight */}
          {fullInsight && (
            <Card accentBorder>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{currentInsight.title}</CardTitle>
                    <p className="mt-2 text-slate-600">{currentInsight.description}</p>
                  </div>
                  <Badge
                    variant={
                      currentInsight.variant === 'warning'
                        ? 'warning'
                        : currentInsight.variant === 'danger'
                          ? 'danger'
                          : 'default'
                    }
                  >
                    {fullInsight.period}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-600">
                  Generated {new Date(fullInsight.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Hidden Insights (if trial) */}
          {hiddenInsightCount > 0 && (
            <div className="space-y-4">
              {displayedInsights.slice(1).map((insight) => (
                <Card key={insight.id} className="opacity-50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-700">Locked Insight</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Upgrade to Pro to see this and other insights
                        </p>
                      </div>
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {/* Insights Summary */}
          {displayedInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Insights Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Showing {isTrialUser ? 1 : displayedInsights.length} of {displayedInsights.length} insight{displayedInsights.length !== 1 ? 's' : ''}
                </p>
                {isTrialUser && displayedInsights.length > 1 && (
                  <p className="mt-2 text-sm text-orange-500">
                    <Button
                      variant="secondary"
                      size="sm"
                      href="/dashboard/upgrade"
                      className="mt-2"
                    >
                      Unlock Full Insights
                    </Button>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )

  return (
    <BlurOverlay
      isLocked={isTrialUser && hiddenInsightCount > 0}
      upgradeMessage="Upgrade to Pro to see all AI insights"
    >
      {insightsContent}
    </BlurOverlay>
  )
}
