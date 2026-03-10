
import { redirect } from 'next/navigation';
import { Brain, Zap, FileText } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

async function Intelligence() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/');
  }

  const supabase = createClient();

  // Get activity performance data
  const { data: activityPerformance } = await supabase
    .from('v_activity_performance')
    .select('*')
    .order('total_attempts', { ascending: false })
    .limit(20);

  // Get platform insights
  const { data: platformInsights } = await supabase
    .from('platform_insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Build activity table
  const activityTableRows = (activityPerformance || []).map((activity) => [
    <span key="gesture" className="font-medium text-slate-100">
      {activity.gesture_name}
    </span>,
    <span key="attempts" className="text-slate-400 text-sm">
      {activity.total_attempts}
    </span>,
    <span key="accuracy" className="text-slate-400 text-sm">
      {(activity.avg_accuracy || 0).toFixed(1)}%
    </span>,
    <span key="completion" className="text-slate-400 text-sm">
      {(activity.completion_rate || 0).toFixed(1)}%
    </span>,
    <span key="lastUsed" className="text-slate-400 text-sm">
      {activity.last_used_at
        ? new Date(activity.last_used_at).toLocaleDateString()
        : 'N/A'}
    </span>,
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Layer 3: Intelligence</h1>
        <p className="text-slate-400 mt-1">
          Activity performance and AI-generated platform insights
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-slate-400">Total Activities</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {activityPerformance?.length || 0}
              </p>
              <p className="text-xs text-slate-400 mt-2">Available gestures</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-slate-400">Avg Accuracy</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {activityPerformance && activityPerformance.length > 0
                  ? (
                      activityPerformance.reduce(
                        (sum, a) => sum + (a.avg_accuracy || 0),
                        0
                      ) / activityPerformance.length
                    ).toFixed(1)
                  : 0}
                %
              </p>
              <p className="text-xs text-slate-400 mt-2">All activities</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-slate-400">Platform Insights</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {platformInsights?.length || 0}
              </p>
              <p className="text-xs text-slate-400 mt-2">Generated reports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Performance Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Performance Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Activity', 'Sessions', 'Avg Accuracy', 'Completion %', 'Last Used']}
            rows={activityTableRows}
            emptyMessage="No activity data available"
          />
        </CardContent>
      </Card>

      {/* Platform AI Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-400" />
              Platform Insights
            </CardTitle>
            <Button variant="secondary" size="sm">
              <Zap className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!platformInsights || platformInsights.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No platform insights generated yet</p>
              <p className="text-sm text-slate-500 mt-2">
                Run a generation to analyze platform trends
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {platformInsights.map((insight) => {
                // Parse metric name as title if available
                const title = insight.metric || `Insight from ${new Date(insight.recorded_at).toLocaleDateString()}`;
                const value = insight.value;
                const period = insight.period;

                return (
                  <div
                    key={insight.id}
                    className="p-4 rounded-lg border border-slate-700 bg-slate-800/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-100">{title}</h4>
                        <p className="text-sm text-slate-400 mt-2">
                          {title === insight.metric
                            ? `Current value: ${value}`
                            : `Period: ${period}`}
                        </p>
                        <p className="text-xs text-slate-500 mt-3">
                          Generated{' '}
                          {new Date(insight.recorded_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="success">{value}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-slate-800/30 border-l-4 border-l-violet-500">
        <CardHeader>
          <CardTitle className="text-lg">AI Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="text-violet-400 flex-shrink-0 mt-0.5">→</span>
              <span className="text-slate-300">
                Activities with accuracy below 60% may need tutorial improvements
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-violet-400 flex-shrink-0 mt-0.5">→</span>
              <span className="text-slate-300">
                Consider promoting high-completion activities in recommendations
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-violet-400 flex-shrink-0 mt-0.5">→</span>
              <span className="text-slate-300">
                Inactive activities (not used in 30+ days) may need refreshing
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default Intelligence;
