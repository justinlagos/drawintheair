'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Teacher = Database['public']['Tables']['teachers']['Row']

interface SettingsFormProps {
  teacher: Teacher
  tierDesc: string
  isProTier: boolean
  isTrialActive: boolean
  trialDaysRemaining: number
}

export function SettingsForm({ teacher, tierDesc, isProTier, isTrialActive, trialDaysRemaining }: SettingsFormProps) {
  const [defaultTimer, setDefaultTimer] = useState<string>(
    (teacher.settings as Record<string, string> | null)?.['default_timer'] || '60'
  )
  const [scoreboardMode, setScoreboardMode] = useState<string>(
    (teacher.settings as Record<string, string> | null)?.['scoreboard_mode'] || 'full'
  )
  const [maxStudents, setMaxStudents] = useState<string>(
    (teacher.settings as Record<string, string> | null)?.['max_students'] || '30'
  )
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
        <p className="mt-1 text-slate-400">Manage your profile and account preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600" />
            <div className="flex-1">
              <p className="font-semibold text-slate-100">{teacher.name}</p>
              <p className="text-sm text-slate-400">{teacher.email}</p>
              <div className="mt-2">
                <Badge variant={isProTier ? 'pro' : isTrialActive ? 'trial' : 'default'}>
                  {tierDesc}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your classroom experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">
              Default Timer (seconds)
            </label>
            <select
              value={defaultTimer}
              onChange={(e) => setDefaultTimer(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 transition focus:border-violet-500 focus:outline-none"
            >
              <option value="60">60 seconds</option>
              <option value="90">90 seconds</option>
              <option value="120">120 seconds</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">
              Default Scoreboard Mode
            </label>
            <select
              value={scoreboardMode}
              onChange={(e) => setScoreboardMode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 transition focus:border-violet-500 focus:outline-none"
            >
              <option value="full">Full Scoreboard</option>
              <option value="top3">Top 3 Only</option>
              <option value="personal">Personal Score Only</option>
              <option value="class">Class Average</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-100 mb-2">
              Max Students per Session
            </label>
            <Input
              type="number"
              min="10"
              max="50"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              className="w-full"
            />
            <p className="mt-1 text-xs text-slate-400">Limit must be between 10-50</p>
          </div>

          <Button variant="secondary" className="w-full">
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Subscription Section */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your billing and plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTrialActive ? (
            <div className="rounded-lg bg-cyan-950/50 border border-cyan-800 p-4">
              <p className="text-sm font-semibold text-cyan-200">Trial Active</p>
              <p className="text-sm text-cyan-300 mt-1">
                {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
              </p>
              <Button variant="primary" href="/dashboard/upgrade" className="mt-4">
                Upgrade to Pro
              </Button>
            </div>
          ) : isProTier ? (
            <div className="rounded-lg bg-violet-950/50 border border-violet-800 p-4">
              <p className="text-sm font-semibold text-violet-200">Pro Subscription Active</p>
              <p className="text-sm text-violet-300 mt-1">
                You have access to all Pro features
              </p>
              <Button variant="secondary" href="/pricing" className="mt-4">
                View Plans
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4">
              <p className="text-sm font-semibold text-slate-100">Free Plan</p>
              <p className="text-sm text-slate-400 mt-1">
                Limited features available
              </p>
              <Button variant="primary" href="/dashboard/upgrade" className="mt-4">
                Upgrade to Pro
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showDeleteConfirm ? (
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          ) : (
            <div className="rounded-lg bg-red-950/50 border border-red-800 p-4">
              <p className="text-sm font-semibold text-red-200">Are you sure?</p>
              <p className="text-sm text-red-300 mt-1">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="danger"
                  href="/api/account/delete"
                  className="flex-1"
                >
                  Delete Everything
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
