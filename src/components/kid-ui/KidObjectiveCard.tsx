/**
 * KidObjectiveCard — large rounded white card that tells the child what to do.
 *
 * Spec: "Trace the shape." / "Pop the right number." / "Find the word."
 *   - Near the top center of the screen.
 *   - Short, large, friendly.
 *   - Optional pointer emoji prefix (👆 or ✨).
 */

import type { CSSProperties, ReactNode } from 'react';
import { tokens } from '../../styles/tokens';
import { kidAnimation } from '../../styles/motion';

export interface KidObjectiveCardProps {
  /** The "what to do" instruction. Keep short, sentence case. */
  children: ReactNode;
  icon?: ReactNode;
  /** When true, gently floats up-and-down to draw attention. */
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const KidObjectiveCard = ({
  children,
  icon = '👆',
  animate = true,
  className,
  style,
}: KidObjectiveCardProps) => {
  const computed: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.md,
    padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
    background: tokens.semantic.bgPanel,
    border: `2px solid ${tokens.semantic.borderPanel}`,
    borderRadius: tokens.radius.pill,
    boxShadow: tokens.shadow.float,
    fontFamily: tokens.fontFamily.heading,
    fontWeight: tokens.fontWeight.bold,
    fontSize: tokens.fontSize.objective,
    color: tokens.semantic.textPrimary,
    lineHeight: tokens.lineHeight.normal,
    maxWidth: '90vw',
    textAlign: 'center',
    animation: animate ? kidAnimation.float : undefined,
    ...style,
  };

  return (
    <div className={className} style={computed}>
      {icon && (
        <span aria-hidden style={{ fontSize: '1.1em', lineHeight: 1, flexShrink: 0 }}>
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
};
