import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'trial' | 'pro' | 'school' | 'admin' | 'success' | 'warning' | 'danger'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-orange-100 text-orange-700 border border-orange-200',
  secondary: 'bg-slate-100 text-slate-600 border border-slate-200',
  trial: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  pro: 'bg-orange-100 text-orange-700 border border-orange-200',
  school: 'bg-purple-100 text-purple-700 border border-purple-200',
  admin: 'bg-red-500/20 text-red-300 border border-red-500/30',
  success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  danger: 'bg-red-500/20 text-red-300 border border-red-500/30',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-1 text-xs rounded',
  md: 'px-3 py-1.5 text-sm rounded-md',
}

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  )
}
