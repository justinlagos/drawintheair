/**
 * KidButton — pill-shaped, oversized, tactile button.
 *
 * Spec variants:
 *   - primary: Deep Plum gradient + white text. Play / Start / Next / Continue.
 *   - secondary: White fill + plum outline + plum text. Try Again / Reset / Back.
 *   - success: Meadow Green + dark text. Done / Correct / Continue.
 *
 * Rules:
 *   - Min target size 64px (kid hands + gesture-tracking grace).
 *   - Soft inner highlight + drop shadow → pillowy.
 *   - Press state: drop shadow softens (button "presses in").
 */

import { useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export type KidButtonVariant = 'primary' | 'secondary' | 'success';
export type KidButtonSize = 'md' | 'lg' | 'xl';

export interface KidButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: KidButtonVariant;
  size?: KidButtonSize;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const sizePadding: Record<KidButtonSize, string> = {
  md: `${tokens.spacing.md} ${tokens.spacing.xl}`,
  lg: `${tokens.spacing.lg} ${tokens.spacing.xxl}`,
  xl: `${tokens.spacing.xl} ${tokens.spacing.xxxl}`,
};

const sizeMinHeight: Record<KidButtonSize, string> = {
  md: tokens.targetSize.min,             // 64px
  lg: tokens.targetSize.comfortable,     // 88px
  xl: tokens.targetSize.generous,        // 120px
};

const sizeFontSize: Record<KidButtonSize, string> = {
  md: tokens.fontSize.button,
  lg: 'clamp(1.2rem, 2vw, 1.7rem)',
  xl: 'clamp(1.4rem, 2.4vw, 2rem)',
};

const variantStyle = (variant: KidButtonVariant, pressed: boolean): CSSProperties => {
  switch (variant) {
    case 'primary':
      return {
        background: pressed
          ? tokens.semantic.primaryActive
          : `linear-gradient(180deg, ${tokens.semantic.primaryHover} 0%, ${tokens.semantic.primary} 100%)`,
        color: tokens.semantic.textOnPlum,
        border: 'none',
        boxShadow: pressed
          ? tokens.shadow.buttonPressed
          : `${tokens.shadow.button}, ${tokens.shadow.inset}`,
      };
    case 'secondary':
      return {
        background: tokens.semantic.bgPanel,
        color: tokens.semantic.primary,
        border: `2.5px solid ${tokens.semantic.primary}`,
        boxShadow: pressed ? 'none' : tokens.shadow.float,
      };
    case 'success':
      return {
        background: pressed
          ? tokens.semantic.successHover
          : `linear-gradient(180deg, ${tokens.semantic.successHover} 0%, ${tokens.semantic.success} 100%)`,
        color: tokens.semantic.textPrimary,
        border: 'none',
        boxShadow: pressed
          ? tokens.shadow.buttonPressed
          : `${tokens.shadow.button}, ${tokens.shadow.inset}`,
      };
  }
};

export const KidButton = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  disabled,
  style,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  ...rest
}: KidButtonProps) => {
  const [pressed, setPressed] = useState(false);

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    padding: sizePadding[size],
    minHeight: sizeMinHeight[size],
    width: fullWidth ? '100%' : 'auto',
    fontFamily: tokens.fontFamily.heading,
    fontWeight: tokens.fontWeight.bold,
    fontSize: sizeFontSize[size],
    letterSpacing: tokens.letterSpacing.normal,
    borderRadius: tokens.radius.pill,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transform: pressed && !disabled ? 'translateY(2px) scale(0.98)' : 'translateY(0) scale(1)',
    transition: `transform ${tokens.motion.duration.quick} ${tokens.motion.ease.bounce}, box-shadow ${tokens.motion.duration.quick} ${tokens.motion.ease.standard}`,
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...variantStyle(variant, pressed && !disabled),
    ...style,
  };

  return (
    <button
      {...rest}
      disabled={disabled}
      style={baseStyle}
      onPointerDown={(e) => { setPressed(true); onPointerDown?.(e); }}
      onPointerUp={(e) => { setPressed(false); onPointerUp?.(e); }}
      onPointerLeave={(e) => { setPressed(false); onPointerLeave?.(e); }}
    >
      {icon && <span aria-hidden style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
};
