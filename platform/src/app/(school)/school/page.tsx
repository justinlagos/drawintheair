
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users,
  Radio,
  BookOpen,
  Calendar,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { requireAuth, getTeacher } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';

async function SchoolDashboard() {
  const session = await requireAuth();
  if (!session) {
    redirect('/auth/login');
  }

  const teacher = await getTeacher();
  if (!teacher || !teacher.school_id) {
    redirect('/');
  }

  const supabase = createClient();

  // Fetch school record
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', teacher.school_id)
    .single();

  // Fetch school overview from materialized view
  const { data: overview } = await supabase
    .from('v_school_overview')
    .select('*')
    .eq('school_id', teacher.school_id)
    .single();

  // Fetch active teachers with session count
  const { data: schoolTeachers } = await supabase
    .from('school_teachers')
    .select(`
      id,
      teacher_id,
      teachers (
        id,
        email,
        name
      )
    `)
    .eq('school_id', teacher.school_id);

  // Get session stats for each teacher
  let topTeachers: Array<{
    name: string;
    email: string;
    sessionCount: number;
  }> = [];

  if (schoolTeachers && schoolTeachers.length > 0) {
    const teacherIds = schoolTeachers.map((st) => st.teacher_id);
    const { data: sessionStats } = await supabase
      .from('sessions')
      .select('teacher_id, id')
      .in('teacher_id', teacherIds)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    const statsMap = new Map<string, number>();
    sessionStats?.forEach((s) => {
      statsMap.set(s.teacher_id, (statsMap.get(s.teacher_id) || 0) + 1);
    });

    topTeachers = schoolTeachers
      .map((st) => ({
        name: st.teachers?.name || 'Unknown',
        email: st.teachers?.email || '',
        sessionCount: statsMap.get(st.teacher_id) || 0,
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 5);
  }

  // Fetch activity popularity
  const { data: sessionRounds } = await supabase
    .from('round_scores')
    .select('gesture_name')
    .gte(
      'created_at',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    );

  const activityMap = new Map<string, number>();
  sessionRounds?.forEach((round) => {
    activityMap.set(
      round.gesture_name,
      (activityMap.get(round.gesture_name) || 0) + 1
    );
  });

  const topActivities = Array.from(activityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const seatsUsed = overview?.seats_used || 0;
  const maxSeats = school?.settings?.max_seats || 10;
  const seatPercentage = Math.round((seatsUsed / maxSeats) * 100);
  const totalSessions = overview?.total_sessions || 0;
  const studentsReached = overview?.total_students || 0;

  return (
    <div className="space-y-8">
      {/* Header with Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">{school?.name}</h1>
          <p className="text-slate-400 mt-1">School Dashboard Overview</p>
        </div>
        <Link href="/school/teachers/invite">
          <Button variant="primary">
            <Users className="w-4 h-4 mr-2" />
            Invite Teacher
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Seats"
          value={`${seatsUsed}/${maxSeats}`}
          trend={seatPercentage > 80 ? 'up' : 'flat'}
          icon={Users}
        />
        <StatCard
          title="Total Sessions"
          value={totalSessions}
          trend="up"
          icon={Radio}
        />
        <StatCard
          title="Students Reached"
          value={studentsReached}
          trend="up"
          icon={BookOpen}
        />
        <StatCard
          title="Last Session"
          value={overview?.last_session_date
            ? new Date(overview.last_session_date).toLocaleDateString()
            : 'N/A'}
          icon={Calendar}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Teachers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Most Active Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            {topTeachers.length === 0 ? (
              <p className="text-slate-400 text-sm">No teachers added yet</p>
            ) : (
              <div className="space-y-3">
                {topTeachers.map((teacher) => (
                  <div
                    key={teacher.email}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100 text-sm">
                        {teacher.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {teacher.email}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-slate-100 text-sm">
                        {teacher.sessionCount}
                      </p>
                      <p className="text-xs text-slate-400">sessions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Popularity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Popular Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {topActivities.length === 0 ? (
              <p className="text-slate-400 text-sm">No activity data yet</p>
            ) : (
              <div className="space-y-3">
                {topActivities.map((activity, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{activity.name}</span>
                      <span className="text-slate-400">{activity.count}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-violet-500 h-full"
                        style={{
                          width: `${(activity.count / (topActivities[0]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/school/teachers/invite" className="block">
              <button className="w-full p-4 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition text-left group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100 text-sm">
                      Add Teachers
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Invite more teachers to your school
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition" />
                </div>
              </button>
            </Link>
            <Link href="/school/analytics" className="block">
              <button className="w-full p-4 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition text-left group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100 text-sm">
                      View Analytics
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Detailed usage and performance metrics
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition" />
                </div>
              </button>
            </Link>
            <Link href="/school/teachers" className="block">
              <button className="w-full p-4 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition text-left group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100 text-sm">
                      Manage Teachers
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      View and manage teacher seats
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition" />
                </div>
              </button>
            </Link>
            <Link href="/school/settings" className="block">
              <button className="w-full p-4 rounded-lg border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition text-left group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100 text-sm">
                      Settings
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure school preferences
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition" />
                </div>
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SchoolDashboard;
