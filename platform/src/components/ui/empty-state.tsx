'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
          <div className="rounded-full bg-violet-500/10 p-4">
            <Icon className="h-8 w-8 text-violet-400" />
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>

          {actionLabel && actionHref && (
            <Button variant="primary" href={actionHref} className="mt-4">
              {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
