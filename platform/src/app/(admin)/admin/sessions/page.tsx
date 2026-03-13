
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Radio } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

async function SessionBrowser({
  searchParams,
}: {
  searchParams: { status?: string; activity?: string; page?: string };
}) {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/');
  }

  const supabase = createClient();

  // Pagination
  const page = parseInt(searchParams.page || '1');
  const perPage = 30;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from('sessions')
    .select(
      `
      id,
      teacher_id,
      created_at,
      status,
      started_at,
      ended_at,
      session_students (
        id
      ),
      playlists (
        name
      ),
      teachers (
        name,
        email
      )
    `,
      { count: 'exact' }
    );

  // Apply filters
  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status);
  }

  // Execute query
  const { data: sessions, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  const totalPages = Math.ceil((count || 0) / perPage);

  // Build session rows
  const calculateDuration = (startedAt: string, endedAt: string | null) => {
    if (!endedAt) {
      return 'In Progress';
    }
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    const minutes = Math.round((end - start) / 60000);
    return `${minutes}m`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Session Browser</h1>
        <p className="text-slate-600 mt-1">Browse and monitor all platform sessions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-3">
            <select
              name="status"
              defaultValue={searchParams.status || 'all'}
              className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition"
            >
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sessions ({count || 0} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {!sessions || sessions.length === 0 ? (
            <p className="text-slate-600 text-sm">No sessions found</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Session ID
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Teacher
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Activity
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Students
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Duration
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const isLive = session.status === 'active';
                    const duration = calculateDuration(
                      session.started_at,
                      session.ended_at
                    );

                    return (
                      <tr
                        key={session.id}
                        className={`border-b border-slate-200 hover:bg-slate-100 transition-colors ${
                          isLive ? 'bg-cyan-100' : ''
                        }`}
                      >
                        <td className="px-6 py-3 font-mono text-slate-700 text-xs">
                          {session.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-3 text-slate-700 text-sm">
                          <div>
                            <p className="font-medium">{session.teachers?.name}</p>
                            <p className="text-xs text-slate-600">
                              {session.teachers?.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-600 text-sm">
                          {session.playlists?.name || 'Custom'}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            {isLive && (
                              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                            )}
                            <Badge
                              variant={
                                session.status === 'active'
                                  ? 'success'
                                  : session.status === 'completed'
                                    ? 'secondary'
                                    : 'secondary'
                              }
                              className="text-xs"
                            >
                              {session.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-600 text-sm">
                          {session.session_students?.length || 0}
                        </td>
                        <td className="px-6 py-3 text-slate-600 text-sm">
                          {duration}
                        </td>
                        <td className="px-6 py-3 text-slate-600 text-sm">
                          {new Date(session.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/sessions?status=${searchParams.status || 'all'}&page=${page - 1}`}
                  >
                    <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm">
                      Previous
                    </button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/sessions?status=${searchParams.status || 'all'}&page=${page + 1}`}
                  >
                    <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm">
                      Next
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-slate-100">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Radio className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-slate-900 text-sm">Live Sessions</h4>
              <p className="text-sm text-slate-600 mt-1">
                Sessions with active status show a live indicator. Click a session
                to view detailed metrics and participant info.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SessionBrowser;
