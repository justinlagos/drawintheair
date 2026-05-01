/**
 * KidChip — small rounded white card for score / timer / status.
 *
 * Spec: small rounded white card, icon + bold number, soft shadow.
 * NOT a serious dashboard — keep it friendly, not data-dense.
 *
 * Variants:
 *   - score:   sunshine star + number
 *   - timer:   aqua-tinted background + clock icon + readable digits
 *   - neutral: white + custom icon + label/number
 *   - reward:  sunshine glow background for "you earned!"
 */

import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export type KidChipVariant = 'score' | 'timer' | 'neutral' | 'reward';
export type KidChipSize = 'sm' | 'md' | 'lg';

export interface KidChipProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: KidChipVariant;
  size?: KidChipSize;
  className?: string;
  style?: CSSProperties;
}

const variantBg: Record<KidChipVariant, string> = {
  score: tokens.semantic.bgPanel,
  timer: '#E5FAFB',     // soft aqua tint
  neutral: tokens.semantic.bgPanel,
  reward: '#FFF6D6',    // soft sunshine tint
};

const variantBorder: Record<KidChipVariant, string> = {
  score: tokens.semantic.borderPanel,
  timer: 'rgba(85, 221, 224, 0.35)',
  neutral: tokens.semantic.borderPanel,
  reward: 'rgba(255, 216, 77, 0.55)',
};

const variantTextColor: Record<KidChipVariant, string> = {
  score: tokens.semantic.textPrimary,
  timer: tokens.semantic.textPrimary,
  neutral: tokens.semantic.textPrimary,
  reward: tokens.semantic.textPrimary,
};

const sizePadding: Record<KidChipSize, string> = {
  sm: `${tokens.spacing.xs} ${tokens.spacing.md}`,
  md: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
  lg: `${tokens.spacing.md} ${tokens.spacing.xl}`,
};

const sizeFontSize: Record<KidChipSize, string> = {
  sm: tokens.fontSize.caption,
  md: tokens.fontSize.label,
  lg: tokens.fontSize.button,
};

const sizeIconSize: Record<KidChipSize, string> = {
  sm: '1.1em',
  md: '1.3em',
  lg: '1.6em',
};

export const KidChip = ({
  children,
  icon,
  variant = 'neutral',
  size = 'md',
  className,
  style,
}: KidChipProps) => {
  const computed: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: sizePadding[size],
    background: variantBg[variant],
    color: variantTextColor[variant],
    border: `1.5px solid ${variantBorder[variant]}`,
    borderRadius: tokens.radius.pill,
    fontFamily: tokens.fontFamily.heading,
    fontWeight: tokens.fontWeight.bold,
    fontSize: sizeFontSize[size],
    boxShadow: variant === 'reward' ? tokens.shadow.glow : tokens.shadow.float,
    whiteSpace: 'nowrap',
    ...style,
  };

  const cls = ['kid-panel', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={computed}>
      {icon && (
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            fontSize: sizeIconSize[size],
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
};
