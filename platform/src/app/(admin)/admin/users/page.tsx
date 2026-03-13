
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

async function UserBrowser({
  searchParams,
}: {
  searchParams: { email?: string; tier?: string; page?: string };
}) {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/');
  }

  const supabase = createClient();

  // Pagination
  const page = parseInt(searchParams.page || '1');
  const perPage = 20;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from('teachers')
    .select('*', { count: 'exact' })
    .eq('is_admin', false);

  // Apply filters
  if (searchParams.email) {
    query = query.ilike('email', `%${searchParams.email}%`);
  }
  if (searchParams.tier && searchParams.tier !== 'all') {
    query = query.eq('tier', searchParams.tier);
  }

  // Execute query
  const { data: teachers, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  const totalPages = Math.ceil((count || 0) / perPage);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">User Browser</h1>
        <p className="text-slate-600 mt-1">Search and manage platform teachers</p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <Input
                  type="text"
                  placeholder="Search by email..."
                  defaultValue={searchParams.email || ''}
                  name="email"
                  className="pl-10"
                />
              </div>
              <select
                name="tier"
                defaultValue={searchParams.tier || 'all'}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:border-orange-500 focus:outline-none"
              >
                <option value="all">All Tiers</option>
                <option value="free">Free</option>
                <option value="trial">Trial</option>
                <option value="pro">Pro</option>
                <option value="school">School</option>
              </select>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition"
              >
                Search
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Teachers ({count || 0} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!teachers || teachers.length === 0 ? (
            <p className="text-slate-600 text-sm">No teachers found</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Name
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Email
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Tier
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      School
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Sessions
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Joined
                    </th>
                    <th className="px-6 py-3 font-semibold text-slate-900">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="border-b border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {teacher.name}
                      </td>
                      <td className="px-6 py-3 text-slate-600 text-sm">
                        {teacher.email}
                      </td>
                      <td className="px-6 py-3">
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
                      </td>
                      <td className="px-6 py-3 text-slate-600 text-sm">
                        {teacher.school_id ? 'Yes' : '-'}
                      </td>
                      <td className="px-6 py-3 text-slate-600 text-sm">
                        {teacher.school_id ? '—' : '—'}
                      </td>
                      <td className="px-6 py-3 text-slate-600 text-sm">
                        {new Date(teacher.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/admin/users/${teacher.id}`}>
                          <button className="text-orange-500 hover:text-orange-600 text-sm font-medium">
                            View
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
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
                    href={`/admin/users?email=${searchParams.email || ''}&tier=${searchParams.tier || 'all'}&page=${page - 1}`}
                  >
                    <button className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm">
                      Previous
                    </button>
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/users?email=${searchParams.email || ''}&tier=${searchParams.tier || 'all'}&page=${page + 1}`}
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
    </div>
  );
}

export default UserBrowser;
