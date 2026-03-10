
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users, Trash2, RotateCw, X } from 'lucide-react';
import { requireAuth, getTeacher } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';

async function TeacherManagement() {
  const session = await requireAuth();
  if (!session) {
    redirect('/auth/login');
  }

  const teacher = await getTeacher();
  if (!teacher || !teacher.school_id) {
    redirect('/');
  }

  const supabase = createClient();

  // Fetch school
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', teacher.school_id)
    .single();

  // Fetch school teachers with details
  const { data: schoolTeachers } = await supabase
    .from('school_teachers')
    .select(`
      id,
      teacher_id,
      role,
      joined_at,
      teachers (
        id,
        email,
        name
      )
    `)
    .eq('school_id', teacher.school_id)
    .order('joined_at', { ascending: false });

  // Get session counts for each teacher
  const teacherIds = schoolTeachers?.map((st) => st.teacher_id) || [];
  const { data: sessionStats } = await supabase
    .from('sessions')
    .select('teacher_id, id, created_at')
    .in('teacher_id', teacherIds);

  const sessionMap = new Map<string, { count: number; lastActive: string | null }>();
  sessionStats?.forEach((s) => {
    const current = sessionMap.get(s.teacher_id) || { count: 0, lastActive: null };
    sessionMap.set(s.teacher_id, {
      count: current.count + 1,
      lastActive: !current.lastActive || s.created_at > current.lastActive ? s.created_at : current.lastActive,
    });
  });

  // Fetch pending invites
  const { data: pendingInvites } = await supabase
    .from('school_invites')
    .select('*')
    .eq('school_id', teacher.school_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Calculate seats
  const maxSeats = school?.settings?.max_seats || 10;
  const seatsUsed = schoolTeachers?.length || 0;
  const seatsAvailable = maxSeats - seatsUsed;

  // Build teacher table rows
  const tableRows = (schoolTeachers || []).map((st) => {
    const stats = sessionMap.get(st.teacher_id);
    const lastActive = stats?.lastActive
      ? new Date(stats.lastActive).toLocaleDateString()
      : 'Never';

    return [
      <span key="name" className="font-medium text-slate-100">{st.teachers?.name || 'Unknown'}</span>,
      <span key="email" className="text-slate-400 text-sm">{st.teachers?.email || '-'}</span>,
      <Badge key="status" variant="success">Active</Badge>,
      <span key="sessions" className="text-slate-400 text-sm">{stats?.count || 0}</span>,
      <span key="lastActive" className="text-slate-400 text-sm">{lastActive}</span>,
      <div key="actions" className="flex gap-2">
        <button
          className="p-1 hover:bg-slate-700 rounded transition"
          title="Remove teacher"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>,
    ];
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Teacher Management</h1>
          <p className="text-slate-400 mt-1">Manage teacher seats and invitations</p>
        </div>
        <Link href="/school/teachers/invite">
          <Button variant="primary">
            <Users className="w-4 h-4 mr-2" />
            Invite Teacher
          </Button>
        </Link>
      </div>

      {/* Seat Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seat Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">
                {seatsUsed} of {maxSeats} seats used
              </span>
              <span className="text-sm text-slate-400">
                {seatsAvailable} available
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-violet-500 h-full transition-all"
                style={{ width: `${(seatsUsed / maxSeats) * 100}%` }}
              />
            </div>
            {seatsAvailable === 0 && (
              <p className="text-sm text-amber-400">
                All seats are in use. Upgrade or remove a teacher to add more.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={['Name', 'Email', 'Status', 'Sessions', 'Last Active', 'Actions']}
            rows={tableRows}
            emptyMessage="No teachers assigned to this school yet"
          />
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-100">{invite.email}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Invited {new Date(invite.created_at).toLocaleDateString()} • Expires{' '}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium text-slate-100 transition flex items-center gap-1">
                      <RotateCw className="w-3 h-3" />
                      Resend
                    </button>
                    <button className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-sm font-medium text-red-300 transition flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TeacherManagement;
