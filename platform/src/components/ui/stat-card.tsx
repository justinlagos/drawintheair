'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './card'
import { Badge } from './badge'
import { TrendingDown, TrendingUp } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'flat'
  className?: string
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  const isPositive = trend === 'up'
  const changeColor = change && change > 0 ? 'success' : 'danger'

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              {change !== undefined && (
                <Badge variant={changeColor} size="sm">
                  {isPositive ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : trend === 'down' ? (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  ) : null}
                  {change > 0 ? '+' : ''}{change}%
                </Badge>
              )}
            </div>
          </div>
          {Icon && (
            <div className="ml-4 rounded-lg bg-orange-100 p-3">
              <Icon className="h-6 w-6 text-orange-500" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
