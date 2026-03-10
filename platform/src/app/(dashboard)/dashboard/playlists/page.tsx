import { requireAuth, getTeacher } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BlurOverlay } from '@/components/ui/blur-overlay'
import { EmptyState } from '@/components/ui/empty-state'
import { isTrial, isPro } from '@/lib/auth/tier'
import { Plus, Music } from 'lucide-react'

export const metadata = {
  title: 'Playlists | Draw in the Air',
  description: 'Manage your custom activity playlists',
}

export default async function PlaylistsPage() {
  // Require authentication
  await requireAuth()

  // Get teacher profile
  const teacher = await getTeacher()
  if (!teacher) {
    return null
  }

  const supabase = await createClient()
  const isTrialUser = isTrial(teacher)
  const isProUser = isPro(teacher)

  // Fetch playlists for this teacher
  const { data: playlists } = await supabase
    .from('playlists')
    .select('*')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  const playlistsContent = (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Playlists</h1>
          <p className="mt-1 text-slate-400">Create and manage custom activity playlists for your classes</p>
        </div>
        {isProUser && (
          <Button variant="primary" href="/dashboard/playlists/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Playlist
          </Button>
        )}
      </div>

      {!playlists || playlists.length === 0 ? (
        <EmptyState
          icon={Music}
          title="No playlists yet"
          description={
            isProUser
              ? 'Create your first playlist to organize your favorite activities'
              : 'Upgrade to Pro to create and save custom playlists'
          }
          actionLabel={isProUser ? 'Create Playlist' : 'Upgrade to Pro'}
          actionHref={isProUser ? '/dashboard/playlists/new' : '/dashboard/upgrade'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => {
            const createdDate = new Date(playlist.created_at)
            const dateStr = createdDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            const activityCount = (playlist.gestures as string[])?.length || 0

            return (
              <Card key={playlist.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span>{playlist.name}</span>
                    {playlist.is_public && (
                      <span className="ml-2 inline-flex rounded bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-300">
                        Public
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between">
                  <div>
                    {playlist.description && (
                      <p className="text-sm text-slate-400 mb-4">{playlist.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Activities</span>
                        <span className="font-medium text-slate-100">{activityCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Duration</span>
                        <span className="font-medium text-slate-100">{playlist.duration_minutes}m</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Difficulty</span>
                        <span className="font-medium text-slate-100 capitalize">{playlist.difficulty}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Created</span>
                        <span className="text-slate-300">{dateStr}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <Button variant="secondary" size="sm" href={`/dashboard/playlists/${playlist.id}`} className="flex-1">
                      View
                    </Button>
                    <Button variant="ghost" size="sm" href={`/dashboard/playlists/${playlist.id}/edit`} className="flex-1">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <BlurOverlay
      isLocked={!isProUser}
      upgradeMessage="Upgrade to Pro to create and save custom playlists"
    >
      {playlistsContent}
    </BlurOverlay>
  )
}
