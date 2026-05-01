/**
 * KidBadge — reward indicator: star, medal, coin, shield.
 *
 * Spec: Sunshine, Deep Plum, Coral, Aqua tones. Soft 2.5D feel.
 * Use for level rewards, achievements, sticker spots.
 */

import type { CSSProperties, ReactElement } from 'react';
import { tokens } from '../../styles/tokens';
import { kidAnimation } from '../../styles/motion';

export type KidBadgeShape = 'star' | 'medal' | 'coin' | 'shield';
export type KidBadgeTone = 'sunshine' | 'plum' | 'coral' | 'aqua' | 'lime';
export type KidBadgeSize = 'sm' | 'md' | 'lg';

export interface KidBadgeProps {
  shape?: KidBadgeShape;
  tone?: KidBadgeTone;
  size?: KidBadgeSize;
  earned?: boolean;
  /** Animate in on mount (e.g. just-earned reward) */
  animateIn?: boolean;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

const toneColor: Record<KidBadgeTone, string> = {
  sunshine: tokens.colors.sunshine,
  plum: tokens.colors.deepPlum,
  coral: tokens.colors.coral,
  aqua: tokens.colors.aqua,
  lime: tokens.colors.limeGlow,
};

const sizePx: Record<KidBadgeSize, number> = {
  sm: 32,
  md: 56,
  lg: 88,
};

const shapeSvg = (shape: KidBadgeShape, fill: string): ReactElement => {
  switch (shape) {
    case 'star':
      return (
        <path
          d="M50 8 L62 38 L94 41 L69 62 L78 92 L50 75 L22 92 L31 62 L6 41 L38 38 Z"
          fill={fill}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      );
    case 'medal':
      return (
        <>
          <circle cx="50" cy="55" r="32" fill={fill} stroke="rgba(255,255,255,0.55)" strokeWidth={3} />
          <path d="M30 25 L40 45 L60 45 L70 25" stroke={fill} strokeWidth={5} strokeLinecap="round" fill="none" />
          <circle cx="50" cy="55" r="14" fill="rgba(255,255,255,0.4)" />
        </>
      );
    case 'coin':
      return (
        <>
          <circle cx="50" cy="50" r="40" fill={fill} stroke="rgba(255,255,255,0.55)" strokeWidth={3} />
          <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
        </>
      );
    case 'shield':
      return (
        <path
          d="M50 8 L86 22 L82 60 Q72 86 50 92 Q28 86 18 60 L14 22 Z"
          fill={fill}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      );
  }
};

export const KidBadge = ({
  shape = 'star',
  tone = 'sunshine',
  size = 'md',
  earned = true,
  animateIn = false,
  className,
  style,
  ariaLabel,
}: KidBadgeProps) => {
  const px = sizePx[size];
  const fill = earned ? toneColor[tone] : tokens.semantic.disabled;

  const computed: CSSProperties = {
    display: 'inline-flex',
    width: px,
    height: px,
    filter: earned ? 'drop-shadow(0 4px 8px rgba(108, 63, 164, 0.18))' : 'grayscale(0.6)',
    animation: animateIn ? kidAnimation.starBurst : undefined,
    ...style,
  };

  return (
    <span
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      className={className}
      style={computed}
    >
      <svg viewBox="0 0 100 100" width={px} height={px} aria-hidden>
        {shapeSvg(shape, fill)}
      </svg>
    </span>
  );
};
