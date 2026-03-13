
import { redirect } from 'next/navigation';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';
import { requireAuth, getTeacher } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';

async function SchoolAnalytics() {
  const session = await requireAuth();
  if (!session) {
    redirect('/auth/login');
  }

  const teacher = await getTeacher();
  if (!teacher || !teacher.school_id) {
    redirect('/');
  }

  const supabase = createClient();

  // Get school overview stats
  const { data: overview } = await supabase
    .from('v_school_overview')
    .select('*')
    .eq('school_id', teacher.school_id)
    .single();

  // Get all sessions for the school in the last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      id,
      teacher_id,
      created_at,
      status,
      session_students (
        id
      )
    `)
    .eq('school_id', teacher.school_id)
    .gte('created_at', ninetyDaysAgo);

  // Get teacher details
  const { data: schoolTeachers } = await supabase
    .from('school_teachers')
    .select(`
      teacher_id,
      teachers (
        id,
        name,
        email
      )
    `)
    .eq('school_id', teacher.school_id);

  // Build per-teacher stats
  const teacherStats = new Map<string, {
    name: string;
    email: string;
    sessionCount: number;
    studentCount: number;
    avgStars: number;
  }>();

  schoolTeachers?.forEach((st) => {
    if (st.teachers) {
      teacherStats.set(st.teacher_id, {
        name: st.teachers.name,
        email: st.teachers.email,
        sessionCount: 0,
        studentCount: 0,
        avgStars: 0,
      });
    }
  });

  // Calculate stats
  if (sessions) {
    sessions.forEach((s) => {
      const stats = teacherStats.get(s.teacher_id);
      if (stats) {
        stats.sessionCount += 1;
        stats.studentCount += s.session_students?.length || 0;
      }
    });
  }

  // Get activity data
  const { data: roundScores } = await supabase
    .from('round_scores')
    .select('gesture_name, accuracy')
    .gte('created_at', ninetyDaysAgo);

  const activityStats = new Map<string, { count: number; totalAccuracy: number }>();
  roundScores?.forEach((round) => {
    const current = activityStats.get(round.gesture_name) || {
      count: 0,
      totalAccuracy: 0,
    };
    activityStats.set(round.gesture_name, {
      count: current.count + 1,
      totalAccuracy: current.totalAccuracy + (round.accuracy || 0),
    });
  });

  // Calculate weekly session counts
  const weeklyMap = new Map<string, number>();
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (today.getDay() + 7 * i) - 6);
    const weekKey = `Week ${Math.ceil((today.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
    weeklyMap.set(weekKey, 0);
  }

  sessions?.forEach((s) => {
    const sessionDate = new Date(s.created_at);
    const weekStart = new Date(sessionDate);
    weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
    const weekKey = `Week of ${weekStart.toLocaleDateString()}`;
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
  });

  // Build teacher table
  const teacherTableRows = Array.from(teacherStats.values())
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .map((stats) => [
      <span key="name" className="font-medium text-slate-900">{stats.name}</span>,
      <span key="sessions" className="text-slate-600 text-sm">{stats.sessionCount}</span>,
      <span key="students" className="text-slate-600 text-sm">{stats.studentCount}</span>,
      <span key="avg" className="text-slate-600 text-sm">
        {stats.avgStars.toFixed(1)} ★
      </span>,
    ]);

  // Build activity table
  const activityTableRows = Array.from(activityStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, stats]) => [
      <span key="name" className="font-medium text-slate-900">{name}</span>,
      <span key="count" className="text-slate-600 text-sm">{stats.count}</span>,
      <span key="avg" className="text-slate-600 text-sm">
        {(stats.totalAccuracy / stats.count).toFixed(1)}%
      </span>,
    ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">School Analytics</h1>
        <p className="text-slate-600 mt-1">Usage and performance insights (Last 90 days)</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Sessions</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {overview?.total_sessions || 0}
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Students Engaged</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {overview?.total_students || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Teachers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {teacherStats.size}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sessions Per Week (Last 90 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {Array.from(weeklyMap.entries())
              .slice(0, 12)
              .map(([week, count]) => (
                <div key={week} className="flex items-center justify-between">
                  <span className="text-slate-600">{week}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-orange-500 h-full"
                        style={{ width: `${Math.min((count / 50) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-slate-900 font-medium w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Per-Teacher Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Teacher Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              headers={['Name', 'Sessions', 'Students', 'Avg Rating']}
              rows={teacherTableRows}
              emptyMessage="No session data yet"
            />
          </CardContent>
        </Card>

        {/* Activity Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Popularity</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              headers={['Activity', 'Times Used', 'Avg Accuracy']}
              rows={activityTableRows}
              emptyMessage="No activity data yet"
            />
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="bg-slate-100/30">
        <CardContent className="pt-6">
          <h3 className="font-medium text-slate-900 mb-2">About This Data</h3>
          <p className="text-sm text-slate-600">
            Analytics shown above include all sessions run by teachers in your school
            over the last 90 days. No individual student data is displayed to protect
            privacy. Metrics are updated in real-time as sessions complete.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SchoolAnalytics;
