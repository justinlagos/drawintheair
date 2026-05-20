'use client'

import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Logo — Draw in the Air brand mark for the platform (Next.js) app.
 *
 * This component renders the official vector logo (/logo.svg) using
 * next/image, with sensible sizing per variant. The legacy `showIcon`
 * + wordmark layout has been retired in favour of the unified brand
 * mark, but the component preserves its existing prop shape so callers
 * keep compiling.
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  linked?: boolean
  className?: string
  /** Render the PNG raster instead of the SVG (print/export/email surfaces). */
  raster?: boolean
  /** Decorative — empty alt for screen readers. */
  decorative?: boolean
  /** @deprecated Kept for back-compat. The new logo is the icon. */
  showIcon?: boolean
}

const SIZE_PX: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 80,
}

// Intrinsic aspect ratio: 1510 × 1041
const RATIO = 1510 / 1041

export function Logo({
  size = 'md',
  linked = false,
  className,
  raster = false,
  decorative = false,
}: LogoProps) {
  const h = SIZE_PX[size]
  const w = Math.round(h * RATIO)
  const src = raster ? '/logo.png' : '/logo.svg'
  const alt = decorative ? '' : 'Draw in the Air'

  const img = (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      priority={size === 'lg' || size === 'xl'}
      className={cn('inline-block h-auto select-none', className)}
      style={{ height: h, width: 'auto' }}
      draggable={false}
    />
  )

  if (linked) {
    return (
      <Link
        href="/"
        aria-label="Draw in the Air — Home"
        className="inline-flex items-center hover:opacity-90 transition-opacity"
      >
        {img}
      </Link>
    )
  }
  return img
}

/** Convenience re-export with a cleaner name; both names work. */
export const BrandLogo = Logo
