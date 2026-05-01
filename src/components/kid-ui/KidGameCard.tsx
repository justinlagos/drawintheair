/**
 * KidGameCard — Home grid card for choosing a mode.
 *
 * Spec: illustration + bold title + short description, optional star/badge,
 * clear play affordance. Big, tactile, soft. Lifts on hover/press.
 */

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';

export interface KidGameCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  /** Tile accent color, used on the icon plate */
  accent?: string;
  badge?: ReactNode;
  /** Renders the card as a button */
  onSelect?: () => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

export const KidGameCard = ({
  title,
  description,
  icon,
  accent = tokens.colors.bubbleBlue,
  badge,
  onSelect,
  className,
  style,
  disabled = false,
}: KidGameCardProps) => {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const lift = pressed ? 'translateY(2px)' : hover && !disabled ? 'translateY(-4px)' : 'translateY(0)';

  const computed: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
    width: '100%',
    minHeight: '180px',
    padding: tokens.spacing.xl,
    background: tokens.semantic.bgPanel,
    border: `2px solid ${tokens.semantic.borderPanel}`,
    borderRadius: tokens.radius.xxl,
    boxShadow: pressed ? tokens.shadow.panel : tokens.shadow.float,
    color: tokens.semantic.textPrimary,
    fontFamily: tokens.fontFamily.body,
    cursor: disabled ? 'not-allowed' : onSelect ? 'pointer' : 'default',
    opacity: disabled ? 0.5 : 1,
    transform: lift,
    transition: `transform ${tokens.motion.duration.quick} ${tokens.motion.ease.bounce}, box-shadow ${tokens.motion.duration.quick} ${tokens.motion.ease.standard}`,
    textAlign: 'left',
    ...style,
  };

  return (
    <button
      type="button"
      className={className}
      style={computed}
      onClick={disabled ? undefined : onSelect}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => { setHover(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      disabled={disabled}
    >
      <div
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '88px',
          height: '88px',
          borderRadius: tokens.radius.xl,
          background: `linear-gradient(135deg, ${accent} 0%, rgba(255,255,255,0.4) 100%)`,
          fontSize: '2.5rem',
          boxShadow: tokens.shadow.inset,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: tokens.fontFamily.heading,
          fontWeight: tokens.fontWeight.bold,
          fontSize: tokens.fontSize.heading,
          color: tokens.semantic.textPrimary,
          lineHeight: tokens.lineHeight.tight,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: tokens.fontSize.body,
          color: tokens.semantic.textSecondary,
          lineHeight: tokens.lineHeight.normal,
        }}
      >
        {description}
      </div>
      {badge && (
        <div
          style={{
            position: 'absolute',
            top: tokens.spacing.lg,
            right: tokens.spacing.lg,
          }}
        >
          {badge}
        </div>
      )}
    </button>
  );
};
