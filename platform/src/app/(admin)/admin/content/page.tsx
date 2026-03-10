import { redirect } from 'next/navigation'
import {
  Puzzle,
  Gamepad2,
  BookOpen,
  Star,
  BarChart3,
} from 'lucide-react'
import { requireAdmin } from '@/lib/auth/session'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Content | Draw in the Air Admin',
  description: 'Manage activities and learning content',
}

const ACTIVITIES = [
  { id: 'calibration', name: 'Bubble Pop', emoji: '🫧', type: 'calibration', status: 'live', popularity: 'high' },
  { id: 'pre-writing', name: 'Tracing', emoji: '✏️', type: 'pre-writing', status: 'live', popularity: 'high' },
  { id: 'sort-and-place', name: 'Sort & Place', emoji: '📦', type: 'sort-and-place', status: 'live', popularity: 'medium' },
  { id: 'word-search', name: 'Word Search', emoji: '🔤', type: 'word-search', status: 'live', popularity: 'medium' },
  { id: 'colour-builder', name: 'Colour Builder', emoji: '🎨', type: 'colour-builder', status: 'live', popularity: 'medium' },
  { id: 'balloon-math', name: 'Balloon Math', emoji: '🎈', type: 'balloon-math', status: 'live', popularity: 'high' },
  { id: 'rainbow-bridge', name: 'Rainbow Bridge', emoji: '🌈', type: 'rainbow-bridge', status: 'live', popularity: 'medium' },
  { id: 'gesture-spelling', name: 'Gesture Spelling', emoji: '🖐️', type: 'gesture-spelling', status: 'live', popularity: 'low' },
  { id: 'free-paint', name: 'Free Paint', emoji: '🎪', type: 'free', status: 'live', popularity: 'high' },
]

export default async function AdminContentPage() {
  const admin = await requireAdmin()
  if (!admin) {
    redirect('/')
  }

  const liveActivities = ACTIVITIES.filter((a) => a.status === 'live').length
  const highPopularity = ACTIVITIES.filter((a) => a.popularity === 'high').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Content</h1>
        <p className="text-slate-400 mt-1">Manage activities and learning content across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Activities" value={ACTIVITIES.length} icon={Gamepad2} />
        <StatCard title="Live Activities" value={liveActivities} icon={Star} />
        <StatCard title="High Popularity" value={highPopularity} icon={BarChart3} />
        <StatCard title="Activity Types" value={4} icon={Puzzle} />
      </div>

      {/* Activities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Catalogue</CardTitle>
          <CardDescription>All activities available on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-100">Activity</th>
                  <th className="px-6 py-3 font-semibold text-slate-100">Type</th>
                  <th className="px-6 py-3 font-semibold text-slate-100">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-100">Popularity</th>
                  <th className="px-6 py-3 font-semibold text-slate-100">ID</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITIES.map((activity) => (
                  <tr
                    key={activity.id}
                    className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{activity.emoji}</span>
                        <span className="font-medium text-slate-100">{activity.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-sm capitalize">{activity.type.replace('-', ' ')}</td>
                    <td className="px-6 py-3">
                      <Badge variant={activity.status === 'live' ? 'success' : 'warning'}>
                        {activity.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          activity.popularity === 'high'
                            ? 'success'
                            : activity.popularity === 'medium'
                              ? 'secondary'
                              : 'default'
                        }
                      >
                        {activity.popularity}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-500 font-mono text-xs">{activity.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Content Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Content Notes</CardTitle>
          <CardDescription>Platform content guidelines and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-emerald-950/50 border border-emerald-800 p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-200">All Activities Live</p>
                <p className="text-sm text-emerald-300 mt-1">
                  All {liveActivities} activities are currently deployed and available to users. The game
                  engine runs in the Vite SPA at the root URL, with the platform handling session management.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
            <p className="text-sm font-semibold text-slate-200">Game Engine</p>
            <p className="text-sm text-slate-400 mt-1">
              Activities are powered by MediaPipe hand tracking. The Vite SPA handles all game logic.
              The platform (Next.js) handles session orchestration, analytics, and user management.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
