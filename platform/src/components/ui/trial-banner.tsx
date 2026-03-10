'use client'

import { Button } from './button'
import { AlertCircle, Clock } from 'lucide-react'

interface TrialBannerProps {
  daysRemaining: number
  trialExpired: boolean
}

export function TrialBanner({ daysRemaining, trialExpired }: TrialBannerProps) {
  if (trialExpired) {
    return (
      <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">
              Trial ended — Upgrade to unlock your classroom data
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          href="/dashboard/upgrade"
          className="flex-shrink-0"
        >
          Upgrade Now
        </Button>
      </div>
    )
  }

  if (daysRemaining <= 3) {
    return (
      <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Clock className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-300">
              Day {6 - daysRemaining} of 5 — Your trial is active
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          href="/dashboard/upgrade"
          className="flex-shrink-0"
        >
          Upgrade Now
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1">
        <Clock className="h-5 w-5 text-amber-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-300">
            {daysRemaining} day{daysRemaining > 1 ? 's' : ''} left — Upgrade to keep your data
          </p>
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        href="/dashboard/upgrade"
        className="flex-shrink-0"
      >
        Upgrade Now
      </Button>
    </div>
  )
}
