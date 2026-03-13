
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  Users,
  Zap,
  Building2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

async function AdminCommandCenter() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/');
  }

  const supabase = createClient();

  // Get active sessions (not ended)
  const { data: activeSessions } = await supabase
    .from('sessions')
    .select('id')
    .neq('status', 'ended');

  // Get total teachers count
  const { data: allTeachers } = await supabase
    .from('teachers')
    .select('id, tier')
    .eq('is_admin', false);

  // Count pro teachers
  const proTeachers = allTeachers?.filter((t) => t.tier === 'pro').length || 0;

  // Get active schools count
  const { data: schools } = await supabase
    .from('schools')
    .select('id')
    .eq('subscription_tier', 'pro');

  // Get today's engagement metrics
  const today = new Date().toISOString().split('T')[0];
  const { data: todayMetrics } = await supabase
    .from('v_engagement_metrics')
    .select('*')
    .eq('period', today)
    .single();

  // Count today's sessions
  const { data: todaySessions } = await supabase
    .from('sessions')
    .select('id')
    .gte('created_at', `${today}T00:00:00Z`)
    .lte('created_at', `${today}T23:59:59Z`);

  // Count today's students
  const { data: todayStudents } = await supabase
    .from('session_students')
    .select('id')
    .gte('created_at', `${today}T00:00:00Z`)
    .lte('created_at', `${today}T23:59:59Z`);

  // Get recent alerts (unresolved)
  const { data: recentAlerts } = await supabase
    .from('admin_alerts')
    .select('*')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  const activeSessionCount = activeSessions?.length || 0;
  const totalTeachersCount = allTeachers?.length || 0;
  const activeSchoolsCount = schools?.length || 0;
  const sessionsToday = todaySessions?.length || 0;
  const studentsToday = todayStudents?.length || 0;

  return (
    <div className="space-y-8">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Command Center
          </h1>
          <p className="text-slate-600 mt-1">Platform overview and key metrics</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-600">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-emerald-300">System Live</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Active Sessions"
          value={activeSessionCount}
          icon={Activity}
          trend="up"
        />
        <StatCard
          title="Total Teachers"
          value={totalTeachersCount}
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Pro Subscribers"
          value={proTeachers}
          icon={Zap}
          trend="up"
        />
        <StatCard
          title="Active Schools"
          value={activeSchoolsCount}
          icon={Building2}
          trend="up"
        />
        <StatCard
          title="Sessions Today"
          value={sessionsToday}
          icon={TrendingUp}
          trend="flat"
        />
        <StatCard
          title="Students Today"
          value={studentsToday}
          icon={Users}
          trend="up"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/admin/operations" className="block">
                <button className="w-full p-3 rounded-lg hover:bg-slate-100 transition text-left">
                  <p className="font-medium text-slate-900 text-sm">Operations</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Health, errors, and alerts
                  </p>
                </button>
              </Link>
              <Link href="/admin/growth" className="block">
                <button className="w-full p-3 rounded-lg hover:bg-slate-100 transition text-left">
                  <p className="font-medium text-slate-900 text-sm">Growth</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Signups and tier distribution
                  </p>
                </button>
              </Link>
              <Link href="/admin/intelligence" className="block">
                <button className="w-full p-3 rounded-lg hover:bg-slate-100 transition text-left">
                  <p className="font-medium text-slate-900 text-sm">Intelligence</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Activity performance and insights
                  </p>
                </button>
              </Link>
              <Link href="/admin/users" className="block">
                <button className="w-full p-3 rounded-lg hover:bg-slate-100 transition text-left">
                  <p className="font-medium text-slate-900 text-sm">User Browser</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Search and manage teachers
                  </p>
                </button>
              </Link>
              <Link href="/admin/sessions" className="block">
                <button className="w-full p-3 rounded-lg hover:bg-slate-100 transition text-left">
                  <p className="font-medium text-slate-900 text-sm">Sessions</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Browse all platform sessions
                  </p>
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentAlerts || recentAlerts.length === 0 ? (
              <p className="text-slate-600 text-sm">All systems operational</p>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.severity === 'critical'
                        ? 'border-red-700/50 bg-red-950/20'
                        : alert.severity === 'warning'
                          ? 'border-amber-700/50 bg-amber-950/20'
                          : 'border-slate-300 bg-slate-100/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          alert.severity === 'critical'
                            ? 'text-red-400'
                            : alert.severity === 'warning'
                              ? 'text-amber-400'
                              : 'text-slate-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {alert.alert_type}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {alert.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status Overview */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader>
          <CardTitle className="text-lg">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">99.9%</div>
              <p className="text-xs text-slate-600 mt-2">Uptime</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {activeSessionCount}
              </div>
              <p className="text-xs text-slate-600 mt-2">Live Sessions</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">2ms</div>
              <p className="text-xs text-slate-600 mt-2">Avg Response</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminCommandCenter;
