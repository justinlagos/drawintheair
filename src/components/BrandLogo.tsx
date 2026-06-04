/**
 * BrandLogo, single source of truth for the Draw in the Air mark.
 *
 * Variants
 *   header  , nav-bar height (default 36px)
 *   footer  , slightly smaller, footer chrome
 *   compact , square / mobile burger-row size (used on dense layouts)
 *   hero    , large promotional render (Press kit, CTA bands)
 *   print   , high-contrast raster for PDFs / printed reports
 *
 * Behaviour
 *   - Renders the new vector SVG (/logo.svg) by default for crisp scaling.
 *   - Falls back to /logo.png automatically when `raster` is forced
 *     (print, PDF, og-image contexts) or `dark` is set (older surfaces
 *     that still keep a dark chrome, the PNG carries its own backdrop).
 *   - Accessible alt text on the underlying <img>; pass `decorative`
 *     when the logo accompanies the brand wordmark already in text.
 */

import type { CSSProperties } from 'react';

export type BrandLogoVariant = 'header' | 'footer' | 'compact' | 'hero' | 'print';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  /** When true, render a raster PNG (used in print/export/email surfaces). */
  raster?: boolean;
  /** Render the dark-background fallback (uses raster, no transparency issues). */
  dark?: boolean;
  /** Treat as purely decorative (alt=""). Defaults to false. */
  decorative?: boolean;
  /** Override height in pixels. */
  height?: number;
  /** Custom alt text, defaults to "Draw in the Air". */
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** width attr (rarely needed, kept for layout-shift hints). */
  width?: number;
}

// Heights are tuned for the new (wider) brand mark, 1510×1041 source,
// aspect ≈ 1.45. The old narrow mark sat well at 36px but the new
// "speech-bubble" shape needs ~12px more vertical presence to read.
const VARIANT_HEIGHT: Record<BrandLogoVariant, number> = {
  header: 48,
  footer: 44,
  compact: 32,
  hero: 96,
  print: 56,
};

// Intrinsic aspect ratio of the brand mark (1510 × 1041 source).
const RATIO = 1510 / 1041;

export function BrandLogo({
  variant = 'header',
  raster = false,
  dark = false,
  decorative = false,
  height,
  alt,
  className,
  style,
  width,
}: BrandLogoProps) {
  const h = height ?? VARIANT_HEIGHT[variant];
  const w = width ?? Math.round(h * RATIO);

  const useRaster = raster || dark || variant === 'print';
  const src = useRaster ? '/logo.png' : '/logo.svg';
  const altText = decorative ? '' : (alt ?? 'Draw in the Air');

  return (
    <img
      src={src}
      alt={altText}
      width={w}
      height={h}
      decoding="async"
      loading={variant === 'header' || variant === 'hero' ? 'eager' : 'lazy'}
      draggable={false}
      className={className}
      style={{
        height: h,
        width: 'auto',
        display: 'block',
        userSelect: 'none',
        ...style,
      }}
    />
  );
}

export default BrandLogo;
