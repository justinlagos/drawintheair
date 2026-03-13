
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Mail, Calendar, Shield, Radio } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

async function UserDetail({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/');
  }

  const supabase = createClient();

  // Fetch teacher by ID
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!teacher) {
    redirect('/admin/users');
  }

  // Fetch teacher session stats
  const { data: teacherStats } = await supabase
    .from('v_teacher_session_stats')
    .select('*')
    .eq('teacher_id', params.id)
    .single();

  // Fetch last 20 sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      id,
      created_at,
      status,
      session_students (
        id
      ),
      playlists (
        name
      )
    `)
    .eq('teacher_id', params.id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Build session table rows
  const sessionTableRows = (sessions || []).map((session) => [
    <span key="id" className="font-mono text-slate-600 text-xs">
      {session.id.substring(0, 8)}...
    </span>,
    <span key="playlist" className="text-slate-700 text-sm">
      {session.playlists?.name || 'Custom'}
    </span>,
    <Badge
      key="status"
      variant={session.status === 'completed' ? 'success' : 'secondary'}
      className="text-xs"
    >
      {session.status}
    </Badge>,
    <span key="students" className="text-slate-600 text-sm">
      {session.session_students?.length || 0}
    </span>,
    <span key="date" className="text-slate-600 text-sm">
      {new Date(session.created_at).toLocaleDateString()}
    </span>,
  ]);

  const trialStatus =
    teacher.tier === 'trial' && teacher.trial_expires_at
      ? new Date(teacher.trial_expires_at) > new Date()
        ? 'active'
        : 'expired'
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <Link href="/admin/users">
        <button className="flex items-center gap-2 text-slate-600 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>
      </Link>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{teacher.name}</CardTitle>
              <p className="text-slate-600 mt-1">User ID: {teacher.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  teacher.tier === 'pro'
                    ? 'success'
                    : teacher.tier === 'trial'
                      ? 'secondary'
                      : 'secondary'
                }
              >
                {teacher.tier}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-600">Email</p>
                  <p className="text-sm text-slate-900">{teacher.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-600">Joined</p>
                  <p className="text-sm text-slate-900">
                    {new Date(teacher.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {teacher.school_id && (
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-slate-600" />
                  <div>
                    <p className="text-xs text-slate-600">School</p>
                    <p className="text-sm text-slate-900">{teacher.school_id}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Subscription Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-600 mb-2">Subscription Status</p>
                <div className="space-y-2">
                  <p className="text-sm text-slate-900 font-medium">
                    Tier: {teacher.tier}
                  </p>
                  {teacher.tier === 'trial' && trialStatus && (
                    <div className="text-xs">
                      <Badge
                        variant={trialStatus === 'active' ? 'success' : 'danger'}
                      >
                        Trial {trialStatus}
                      </Badge>
                      <p className="text-slate-600 mt-1">
                        Expires:{' '}
                        {teacher.trial_expires_at
                          ? new Date(
                              teacher.trial_expires_at
                            ).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  )}
                  {teacher.stripe_customer_id && (
                    <p className="text-xs text-slate-600">
                      Stripe ID: {teacher.stripe_customer_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      {teacherStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-600">Total Sessions</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {teacherStats.total_sessions}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Students Engaged</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {teacherStats.total_students}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Avg Duration</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {teacherStats.avg_session_duration
                    ? `${Math.round(teacherStats.avg_session_duration)}m`
                    : 'N/A'}
                </p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-300">
              <p className="text-sm text-slate-600">Last Session</p>
              <p className="text-sm text-slate-900 mt-1">
                {teacherStats.last_session_at
                  ? new Date(teacherStats.last_session_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Sessions (Last 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Session ID', 'Playlist', 'Status', 'Students', 'Date']}
            rows={sessionTableRows}
            emptyMessage="No sessions found"
          />
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <CardTitle className="text-lg">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-left text-sm font-medium text-slate-700 transition">
              Set as Platform Admin
            </button>
            <button className="w-full px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-left text-sm font-medium text-slate-700 transition">
              Force Tier Change
            </button>
            <button className="w-full px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-left text-sm font-medium text-slate-700 transition">
              Impersonate User
            </button>
            <button className="w-full px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 text-left text-sm font-medium text-red-600 transition">
              Disable Account
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserDetail;
