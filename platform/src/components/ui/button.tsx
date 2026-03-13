'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  asChild?: boolean
  children: ReactNode
  className?: string
  onClick?: () => void
  href?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  outline: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

const baseStyles =
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed'

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  asChild = false,
  children,
  className,
  onClick,
  href,
}: ButtonProps) {
  const combinedClassName = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className,
  )

  const content = (
    <>
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {content}
      </Link>
    )
  }

  return (
    <button
      className={combinedClassName}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {content}
    </button>
  )
}
