'use client'

import { ReactNode } from 'react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { Lock } from 'lucide-react'

interface BlurOverlayProps {
  isLocked: boolean
  upgradeMessage?: string
  children: ReactNode
}

export function BlurOverlay({
  isLocked,
  upgradeMessage = 'Upgrade to Pro to unlock this feature',
  children,
}: BlurOverlayProps) {
  if (!isLocked) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <Card className="shadow-xl">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="rounded-full bg-red-500/10 p-3">
              <Lock className="h-6 w-6 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-100 font-medium">{upgradeMessage}</p>
              <p className="mt-1 text-sm text-slate-400">
                Unlock full access with a Pro subscription
              </p>
            </div>
            <Button
              variant="primary"
              href="/dashboard/upgrade"
              className="mt-2"
            >
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
