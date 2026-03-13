
import { redirect } from 'next/navigation';
import { TrendingUp, Users, Building2, DollarSign } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';

async function Growth() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/');
  }

  const supabase = createClient();

  // Get all teachers with tier data
  const { data: allTeachers } = await supabase
    .from('teachers')
    .select('id, tier, created_at, trial_expires_at')
    .eq('is_admin', false);

  // Count tier distribution
  const freeTeachers = allTeachers?.filter((t) => t.tier === 'free').length || 0;
  const trialTeachers = allTeachers?.filter((t) => t.tier === 'trial').length || 0;
  const proTeachers = allTeachers?.filter((t) => t.tier === 'pro').length || 0;
  const schoolTeachers = allTeachers?.filter((t) => t.tier === 'school').length || 0;
  const totalTeachers = allTeachers?.length || 0;

  // Get school stats
  const { data: schools } = await supabase
    .from('schools')
    .select('id, subscription_tier, settings')
    .order('created_at', { ascending: false });

  const totalSchools = schools?.length || 0;
  const proSchools = schools?.filter((s) => s.subscription_tier === 'pro').length || 0;

  // Calculate average seats per school
  const avgSeats =
    schools && schools.length > 0
      ? schools.reduce(
          (sum, s) => sum + ((s.settings?.max_seats as number) || 10),
          0
        ) / schools.length
      : 0;

  // Calculate trial conversions
  const trialConversions = allTeachers?.filter(
    (t) => t.tier === 'pro' && t.trial_expires_at
  ).length || 0;

  // Get signup trend for last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSignups } = await supabase
    .from('teachers')
    .select('created_at')
    .gte('created_at', thirtyDaysAgo)
    .eq('is_admin', false);

  // Build daily signup counts
  const dailySignups = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });
    dailySignups.set(dateKey, 0);
  }

  recentSignups?.forEach((signup) => {
    const signupDate = new Date(signup.created_at);
    const dateKey = signupDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
    });
    if (dailySignups.has(dateKey)) {
      dailySignups.set(dateKey, (dailySignups.get(dateKey) || 0) + 1);
    }
  });

  // Build signup table rows
  const signupTableRows = Array.from(dailySignups.entries())
    .slice(0, 30)
    .map(([date, count]) => [
      <span key="date" className="text-slate-600 text-sm">{date}</span>,
      <span key="count" className="text-slate-600 text-sm">{count}</span>,
      <div key="chart" className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-cyan-400 to-orange-500 h-full"
          style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
        />
      </div>,
    ]);

  // Get retention metrics
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgoDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: last7Sessions } = await supabase
    .from('sessions')
    .select('teacher_id')
    .gte('created_at', sevenDaysAgo);

  const { data: last30Sessions } = await supabase
    .from('sessions')
    .select('teacher_id')
    .gte('created_at', thirtyDaysAgoDate);

  const { data: last90Sessions } = await supabase
    .from('sessions')
    .select('teacher_id')
    .gte('created_at', ninetyDaysAgoDate);

  const active7Day = new Set(last7Sessions?.map((s) => s.teacher_id) || []).size;
  const active30Day = new Set(last30Sessions?.map((s) => s.teacher_id) || []).size;
  const active90Day = new Set(last90Sessions?.map((s) => s.teacher_id) || []).size;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Layer 2: Growth</h1>
        <p className="text-slate-600 mt-1">User acquisition, retention, and expansion metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Teachers</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalTeachers}</p>
              <p className="text-xs text-slate-600 mt-2">
                +{recentSignups?.length || 0} this month
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Schools</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalSchools}</p>
              <p className="text-xs text-slate-600 mt-2">
                {proSchools} pro schools
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-slate-600">Trial Conversions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {trialConversions}
              </p>
              <p className="text-xs text-slate-600 mt-2">
                {totalTeachers > 0
                  ? ((trialConversions / totalTeachers) * 100).toFixed(1)
                  : 0}
                % conversion
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Seats/School</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {avgSeats.toFixed(1)}
              </p>
              <p className="text-xs text-slate-600 mt-2">
                {totalSchools > 0 ? Math.round(avgSeats * totalSchools) : 0} total seats
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tier Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-slate-100">
              <p className="text-2xl font-bold text-slate-900">{freeTeachers}</p>
              <p className="text-xs text-slate-600 mt-2">Free</p>
              <p className="text-xs text-slate-600 mt-1">
                {totalTeachers > 0
                  ? ((freeTeachers / totalTeachers) * 100).toFixed(0)
                  : 0}
                %
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-100">
              <p className="text-2xl font-bold text-slate-900">{trialTeachers}</p>
              <p className="text-xs text-slate-600 mt-2">Trial</p>
              <p className="text-xs text-slate-600 mt-1">
                {totalTeachers > 0
                  ? ((trialTeachers / totalTeachers) * 100).toFixed(0)
                  : 0}
                %
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-100">
              <p className="text-2xl font-bold text-slate-900">{proTeachers}</p>
              <p className="text-xs text-slate-600 mt-2">Pro</p>
              <p className="text-xs text-slate-600 mt-1">
                {totalTeachers > 0
                  ? ((proTeachers / totalTeachers) * 100).toFixed(0)
                  : 0}
                %
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-100">
              <p className="text-2xl font-bold text-slate-900">{schoolTeachers}</p>
              <p className="text-xs text-slate-600 mt-2">School</p>
              <p className="text-xs text-slate-600 mt-1">
                {totalTeachers > 0
                  ? ((schoolTeachers / totalTeachers) * 100).toFixed(0)
                  : 0}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signup Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Signups (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Date', 'Signups', 'Trend']}
            rows={signupTableRows}
            emptyMessage="No signup data"
          />
        </CardContent>
      </Card>

      {/* Retention Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retention Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-100 text-center">
              <p className="text-2xl font-bold text-slate-900">{active7Day}</p>
              <p className="text-xs text-slate-600 mt-2">Active (7 days)</p>
              <p className="text-xs text-slate-600 mt-1">
                {totalTeachers > 0
                  ? ((active7Day / totalTeachers) * 100).toFixed(1)
                  : 0}
                % DAU
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-100 text-center">
              <p className="text-2xl font-bold text-slate-900">{active30Day}</p>
              <p className="text-xs text-slate-600 mt-2">Active (30 days)</p>
              <p className="text-xs text-slate-600 mt-1">
                {totalTeachers > 0
                  ? ((active30Day / totalTeachers) * 100).toFixed(1)
                  : 0}
                % MAU
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-100 text-center">
              <p className="text-2xl font-bold text-slate-900">{active90Day}</p>
              <p className="text-xs text-slate-600 mt-2">Active (90 days)</p>
              <p className="text-xs text-slate-600 mt-1">
                {totalTeachers > 0
                  ? ((active90Day / totalTeachers) * 100).toFixed(1)
                  : 0}
                % QAU
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Growth;
