import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  accentBorder?: boolean
}

export function Card({ children, className, accentBorder }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-800 bg-slate-900 text-slate-100',
        accentBorder && 'border-l-2 border-l-orange-500',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 border-b border-slate-800 p-6', className)}
    >
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: ReactNode
  className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h2 className={cn('text-2xl font-semibold leading-none tracking-tight', className)}>
      {children}
    </h2>
  )
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-slate-400', className)}>
      {children}
    </p>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('p-6 pt-0', className)}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('flex items-center border-t border-slate-800 p-6', className)}>
      {children}
    </div>
  )
}
