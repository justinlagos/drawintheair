/**
 * KidPanel — soft, tactile rounded card.
 *
 * Used for HUDs, instruction surfaces, generic content containers.
 * Spec: 24-36px radius, soft shadow, generous padding, optional sky tint.
 */

import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export type KidPanelTone = 'white' | 'sky' | 'lavender';
export type KidPanelSize = 'sm' | 'md' | 'lg';

export interface KidPanelProps {
  children: ReactNode;
  tone?: KidPanelTone;
  size?: KidPanelSize;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  /** Removes the soft outline border (e.g. for nested panels) */
  flat?: boolean;
}

const toneBg: Record<KidPanelTone, string> = {
  white: tokens.semantic.bgPanel,
  sky: tokens.semantic.bgPanelTinted,
  lavender: tokens.colors.softLavender,
};

const sizePadding: Record<KidPanelSize, string> = {
  sm: `${tokens.spacing.md} ${tokens.spacing.lg}`,
  md: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
  lg: `${tokens.spacing.xl} ${tokens.spacing.xxl}`,
};

const sizeRadius: Record<KidPanelSize, string> = {
  sm: tokens.radius.lg,
  md: tokens.radius.xl,
  lg: tokens.radius.xxl,
};

export const KidPanel = ({
  children,
  tone = 'white',
  size = 'md',
  className,
  style,
  onClick,
  flat = false,
}: KidPanelProps) => {
  const computed: CSSProperties = {
    background: toneBg[tone],
    borderRadius: sizeRadius[size],
    border: flat ? 'none' : `1.5px solid ${tokens.semantic.borderPanel}`,
    padding: sizePadding[size],
    boxShadow: flat ? 'none' : tokens.shadow.panel,
    color: tokens.semantic.textPrimary,
    fontFamily: tokens.fontFamily.body,
    cursor: onClick ? 'pointer' : 'default',
    transition: `transform ${tokens.motion.duration.quick} ${tokens.motion.ease.standard}`,
    ...style,
  };

  const cls = ['kid-panel', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={computed} onClick={onClick}>
      {children}
    </div>
  );
};
