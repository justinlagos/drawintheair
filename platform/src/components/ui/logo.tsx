'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  linked?: boolean
  className?: string
  showIcon?: boolean
}

const sizeStyles = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }
const iconSizes  = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-11 w-11' }

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={className} aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="#f97316"/>
      {/* trail arc */}
      <path d="M8 26 Q13 12 22 8" stroke="#fde68a" strokeWidth="2.5"
        strokeLinecap="round" fill="none" opacity="0.7"/>
      <path d="M10 24 Q16 10 24 7" stroke="#fff" strokeWidth="2"
        strokeLinecap="round" fill="none" opacity="0.9"/>
      {/* fingertip */}
      <circle cx="24" cy="7" r="3" fill="#fbbf24"/>
      {/* sparkles */}
      <circle cx="7"  cy="9"  r="1.5" fill="#fde68a" opacity="0.8"/>
      <circle cx="28" cy="22" r="1.2" fill="#fde68a" opacity="0.6"/>
      <circle cx="15" cy="6"  r="1"   fill="#fff"    opacity="0.5"/>
    </svg>
  )
}

export function Logo({ size = 'md', linked = false, className, showIcon = true }: LogoProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2 font-bold', className)}>
      {showIcon && <LogoIcon className={iconSizes[size]} />}
      <span className={cn('text-orange-500 font-extrabold tracking-tight', sizeStyles[size])}>
        Draw in the Air
      </span>
    </span>
  )
  if (linked) {
    return (
      <Link href="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
        {content}
      </Link>
    )
  }
  return content
}
