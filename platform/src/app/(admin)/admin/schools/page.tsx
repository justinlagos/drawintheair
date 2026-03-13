import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
} from 'lucide-react'
import { requireAdmin } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Schools | Draw in the Air Admin',
  description: 'Manage school accounts and subscriptions',
}

export default async function AdminSchoolsPage() {
  const admin = await requireAdmin()
  if (!admin) {
    redirect('/')
  }

  const supabase = createClient()

  // Get all schools
  const { data: schools, count } = await supabase
    .from('schools')
    .select('*, teachers(count)', { count: 'exact' })
    .order('created_at', { ascending: false })

  const proSchools = schools?.filter((s) => s.subscription_tier === 'pro').length || 0
  const totalSchools = count || 0
  const trialSchools = schools?.filter((s) => s.subscription_tier === 'trial').length || 0
  const freeSchools = totalSchools - proSchools - trialSchools

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Schools</h1>
        <p className="text-slate-600 mt-1">Manage school accounts and subscriptions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Schools" value={totalSchools} icon={Building2} trend="up" />
        <StatCard title="Pro Schools" value={proSchools} icon={CreditCard} trend="up" />
        <StatCard title="Trial Schools" value={trialSchools} icon={TrendingUp} trend="flat" />
        <StatCard title="Free Schools" value={freeSchools} icon={Users} trend="flat" />
      </div>

      {/* Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Schools ({totalSchools})</CardTitle>
        </CardHeader>
        <CardContent>
          {!schools || schools.length === 0 ? (
            <p className="text-slate-600 text-sm">No schools registered yet</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-900">School Name</th>
                    <th className="px-6 py-3 font-semibold text-slate-900">Domain</th>
                    <th className="px-6 py-3 font-semibold text-slate-900">Tier</th>
                    <th className="px-6 py-3 font-semibold text-slate-900">Teachers</th>
                    <th className="px-6 py-3 font-semibold text-slate-900">Created</th>
                    <th className="px-6 py-3 font-semibold text-slate-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => {
                    const teacherCount = (school.teachers as unknown as { count: number }[] | null)?.[0]?.count || 0
                    return (
                      <tr
                        key={school.id}
                        className="border-b border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <td className="px-6 py-3 font-medium text-slate-900">{school.name}</td>
                        <td className="px-6 py-3 text-slate-600 text-sm">{school.domain || '—'}</td>
                        <td className="px-6 py-3">
                          <Badge
                            variant={
                              school.subscription_tier === 'pro'
                                ? 'success'
                                : school.subscription_tier === 'trial'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {school.subscription_tier || 'free'}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-slate-600 text-sm">{teacherCount}</td>
                        <td className="px-6 py-3 text-slate-600 text-sm">
                          {new Date(school.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <Link href={`/admin/users?school=${school.id}`}>
                            <button className="text-orange-500 hover:text-orange-600 text-sm font-medium">
                              View Teachers
                            </button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
