import { redirect } from 'next/navigation'
import {
  CreditCard,
  TrendingUp,
  DollarSign,
  Users,
  Zap,
} from 'lucide-react'
import { requireAdmin } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Billing | Draw in the Air Admin',
  description: 'Platform billing and revenue overview',
}

export default async function AdminBillingPage() {
  const admin = await requireAdmin()
  if (!admin) {
    redirect('/')
  }

  const supabase = createClient()

  // Get all teachers with their tiers
  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, email, name, tier, trial_started_at, created_at')
    .eq('is_admin', false)
    .order('created_at', { ascending: false })

  const proTeachers = teachers?.filter((t) => t.tier === 'pro') || []
  const trialTeachers = teachers?.filter((t) => t.tier === 'trial') || []
  const freeTeachers = teachers?.filter((t) => t.tier === 'free' || !t.tier) || []

  // Revenue estimates (based on $9/month per pro teacher)
  const monthlyRevenue = proTeachers.length * 9
  const annualRevenue = monthlyRevenue * 12

  // Trials started in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const recentTrials = trialTeachers.filter(
    (t) => t.trial_started_at && t.trial_started_at > thirtyDaysAgo
  ).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Billing</h1>
        <p className="text-slate-400 mt-1">Revenue overview and subscription metrics</p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Revenue (Est.)"
          value={`$${monthlyRevenue}`}
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="Annual Revenue (Est.)"
          value={`$${annualRevenue}`}
          icon={TrendingUp}
          trend="up"
        />
        <StatCard title="Pro Subscribers" value={proTeachers.length} icon={Zap} trend="up" />
        <StatCard title="Active Trials" value={trialTeachers.length} icon={Users} trend="flat" />
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
            <CardDescription>Current subscriber breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Pro', count: proTeachers.length, total: teachers?.length || 1, color: 'bg-violet-500' },
              { label: 'Trial', count: trialTeachers.length, total: teachers?.length || 1, color: 'bg-cyan-500' },
              { label: 'Free', count: freeTeachers.length, total: teachers?.length || 1, color: 'bg-slate-500' },
            ].map(({ label, count, total, color }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">{label}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${color} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Trials and upgrades in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400">New trials (30d)</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{recentTrials}</p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400">Conversion rate (est.)</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {trialTeachers.length > 0
                  ? `${Math.round((proTeachers.length / (proTeachers.length + trialTeachers.length)) * 100)}%`
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400">Avg revenue per user</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {teachers && teachers.length > 0
                  ? `$${(monthlyRevenue / teachers.length).toFixed(2)}`
                  : '$0.00'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pro Subscribers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pro Subscribers ({proTeachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {proTeachers.length === 0 ? (
            <p className="text-slate-400 text-sm">No pro subscribers yet</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-100">Name</th>
                    <th className="px-6 py-3 font-semibold text-slate-100">Email</th>
                    <th className="px-6 py-3 font-semibold text-slate-100">Tier</th>
                    <th className="px-6 py-3 font-semibold text-slate-100">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {proTeachers.slice(0, 20).map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-3 font-medium text-slate-100">{teacher.name || '—'}</td>
                      <td className="px-6 py-3 text-slate-400 text-sm">{teacher.email}</td>
                      <td className="px-6 py-3">
                        <Badge variant="success">Pro</Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-400 text-sm">
                        {new Date(teacher.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
