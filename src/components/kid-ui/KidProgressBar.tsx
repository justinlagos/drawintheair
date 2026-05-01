/**
 * KidProgressBar — rounded track with smooth aqua/lime fill.
 *
 * Spec: rounded track, soft glow only when progressing, simple.
 */

import type { CSSProperties } from 'react';
import { tokens } from '../../styles/tokens';

export type KidProgressTone = 'aqua' | 'lime' | 'sunshine' | 'plum';

export interface KidProgressBarProps {
  /** 0..1 — values outside the range are clamped */
  value: number;
  tone?: KidProgressTone;
  height?: number;
  showGlow?: boolean;
  /** Optional accessible label (e.g. "Level 1 progress, 3 of 8") */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const toneFill: Record<KidProgressTone, string> = {
  aqua: `linear-gradient(90deg, ${tokens.colors.aqua} 0%, ${tokens.colors.skyBlue} 100%)`,
  lime: `linear-gradient(90deg, ${tokens.colors.limeGlow} 0%, ${tokens.colors.meadowGreen} 100%)`,
  sunshine: `linear-gradient(90deg, ${tokens.colors.sunshine} 0%, ${tokens.colors.warmOrange} 100%)`,
  plum: `linear-gradient(90deg, ${tokens.colors.deepPlum} 0%, ${tokens.colors.softLavender} 100%)`,
};

const toneGlow: Record<KidProgressTone, string> = {
  aqua: '0 0 14px rgba(85, 221, 224, 0.55)',
  lime: '0 0 14px rgba(181, 241, 92, 0.55)',
  sunshine: '0 0 14px rgba(255, 216, 77, 0.6)',
  plum: '0 0 14px rgba(108, 63, 164, 0.5)',
};

export const KidProgressBar = ({
  value,
  tone = 'aqua',
  height = 12,
  showGlow = true,
  ariaLabel,
  className,
  style,
}: KidProgressBarProps) => {
  const clamped = Math.min(1, Math.max(0, value));
  const pct = `${clamped * 100}%`;

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={className}
      style={{
        width: '100%',
        height: `${height}px`,
        background: 'rgba(108, 63, 164, 0.12)',
        borderRadius: tokens.radius.pill,
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          width: pct,
          height: '100%',
          background: toneFill[tone],
          borderRadius: tokens.radius.pill,
          boxShadow: showGlow && clamped > 0 ? toneGlow[tone] : 'none',
          transition: `width ${tokens.motion.duration.smooth} ${tokens.motion.ease.standard}`,
        }}
      />
    </div>
  );
};
