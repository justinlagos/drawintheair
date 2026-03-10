
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

async function Operations() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/');
  }

  const supabase = createClient();

  // Get active sessions count
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('id')
    .neq('status', 'ended');

  // Get recent errors from last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentErrors } = await supabase
    .from('client_errors')
    .select('*')
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false });

  // Group errors by type
  const errorMap = new Map<string, { count: number; lastSeen: string; sample: string }>();
  recentErrors?.forEach((error) => {
    const current = errorMap.get(error.error_message) || {
      count: 0,
      lastSeen: error.created_at,
      sample: error.error_message,
    };
    errorMap.set(error.error_message, {
      count: current.count + 1,
      lastSeen: error.created_at,
      sample: error.error_message,
    });
  });

  // Get error rate by hour for last 12 hours
  const hourlyErrors = new Map<string, number>();
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const hour = new Date(now);
    hour.setHours(hour.getHours() - i);
    const hourKey = hour.toLocaleString('en-US', {
      hour: '2-digit',
      hour12: true,
    });
    hourlyErrors.set(hourKey, 0);
  }

  recentErrors?.forEach((error) => {
    const errorDate = new Date(error.created_at);
    const hourKey = errorDate.toLocaleString('en-US', {
      hour: '2-digit',
      hour12: true,
    });
    if (hourlyErrors.has(hourKey)) {
      hourlyErrors.set(hourKey, (hourlyErrors.get(hourKey) || 0) + 1);
    }
  });

  // Get active alerts
  const { data: alerts } = await supabase
    .from('admin_alerts')
    .select('*')
    .is('read_at', null)
    .order('created_at', { ascending: false });

  // Build error table
  const errorTableRows = Array.from(errorMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([type, stats]) => [
      <span key="type" className="font-medium text-slate-100 text-sm max-w-xs truncate">
        {type}
      </span>,
      <span key="count" className="text-slate-400 text-sm">{stats.count}</span>,
      <span key="lastSeen" className="text-slate-400 text-sm">
        {new Date(stats.lastSeen).toLocaleTimeString()}
      </span>,
      <span key="sample" className="text-slate-500 text-xs max-w-xs truncate">
        {stats.sample.substring(0, 50)}...
      </span>,
    ]);

  const activeSessionCount = activeSessions?.length || 0;
  const errorCount = recentErrors?.length || 0;
  const errorRate =
    errorCount > 0
      ? ((errorCount / (activeSessionCount + errorCount)) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Layer 1: Operations</h1>
        <p className="text-slate-400 mt-1">System health, error tracking, and alerts</p>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Active Sessions</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">
                  {activeSessionCount}
                </p>
              </div>
              <Activity className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Errors (24h)</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">
                  {errorCount}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Error Rate</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">
                  {errorRate}%
                </p>
              </div>
              {parseFloat(errorRate) < 1 ? (
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-400" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Error Rate (Last 12 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from(hourlyErrors.entries())
              .slice(0, 12)
              .map(([hour, count]) => (
                <div key={hour} className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm w-16">{hour}</span>
                  <div className="flex-1 mx-4 h-6 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        count > 5
                          ? 'bg-red-500'
                          : count > 2
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((count / 20) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-slate-100 text-sm w-8 text-right">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Error Type', 'Count', 'Last Seen', 'Sample']}
            rows={errorTableRows}
            emptyMessage="No errors recorded"
          />
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {!alerts || alerts.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-400">All systems operational</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'critical'
                      ? 'border-red-700/50 bg-red-950/20'
                      : alert.severity === 'warning'
                        ? 'border-amber-700/50 bg-amber-950/20'
                        : alert.severity === 'error'
                          ? 'border-orange-700/50 bg-orange-950/20'
                          : 'border-slate-700 bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-100">
                          {alert.alert_type}
                        </p>
                        <Badge
                          variant={
                            alert.severity === 'critical'
                              ? 'danger'
                              : alert.severity === 'warning'
                                ? 'secondary'
                                : 'success'
                          }
                          className="text-xs"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300 mt-2">{alert.message}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm">
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Operations;
