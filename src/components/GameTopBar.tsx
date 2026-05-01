/**
 * GameTopBar — Per-game top bar in the bright Kid-UI design language.
 *
 * Left   : ← Menu button  (KidButton secondary style: white fill + plum
 *          outline + plum text — pillowy, kid-target-sized)
 * Center : optional stage chip in cream pill style
 * Right  : empty spacer (kept for symmetric layout)
 *
 * Rules:
 *  - transform + opacity animations only
 *  - pointerEvents: none on the container; auto only on interactive children
 *  - no React state — pure presentational
 *
 * Modes that have their own bespoke panel showing the level (e.g. Sort &
 * Place) should pass `stage` undefined to avoid a duplicate indicator.
 */

import { tokens } from '../styles/tokens';

interface GameTopBarProps {
  onBack: () => void;
  /** Optional label shown in the centre, e.g. "Level 3 of 6" */
  stage?: string;
  compact?: boolean;
}

export const GameTopBar = ({ onBack, stage, compact = false }: GameTopBarProps) => {
  const px = compact ? '10px' : '14px';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: compact ? '60px' : '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${tokens.spacing.md} ${px}`,
        zIndex: 500,
        pointerEvents: 'none',
      }}
    >
      {/* Left: Back-to-Menu button — KidButton secondary style inlined here
          to avoid an import cycle with the kid-ui barrel. Shape and tokens
          match KidButton variant="secondary". */}
      <button
        onClick={onBack}
        aria-label="Back to menu"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          padding: compact ? `${tokens.spacing.sm} ${tokens.spacing.lg}` : `${tokens.spacing.md} ${tokens.spacing.xl}`,
          minHeight: compact ? '52px' : tokens.targetSize.min,
          background: tokens.semantic.bgPanel,
          color: tokens.semantic.primary,
          border: `2.5px solid ${tokens.semantic.primary}`,
          borderRadius: tokens.radius.pill,
          boxShadow: tokens.shadow.float,
          fontFamily: tokens.fontFamily.heading,
          fontWeight: tokens.fontWeight.bold,
          fontSize: compact ? tokens.fontSize.label : tokens.fontSize.button,
          letterSpacing: tokens.letterSpacing.normal,
          cursor: 'pointer',
          pointerEvents: 'auto',
          transition: `transform ${tokens.motion.duration.quick} ${tokens.motion.ease.bounce}, box-shadow ${tokens.motion.duration.quick} ${tokens.motion.ease.standard}`,
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        onPointerDown={(e) => { e.currentTarget.style.transform = 'translateY(2px) scale(0.97)'; }}
        onPointerUp={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
        onPointerLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
      >
        <span aria-hidden style={{ fontSize: '1.1em', lineHeight: 1 }}>←</span>
        <span>Menu</span>
      </button>

      {/* Centre: optional stage chip (Kid-UI style cream pill).
          Modes with their own bespoke level panel should not pass a `stage`
          prop — duplicate level indicators look broken. */}
      {stage ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: compact ? '14px' : '18px',
            background: tokens.semantic.bgPanel,
            color: tokens.semantic.textPrimary,
            border: `1.5px solid ${tokens.semantic.borderPanel}`,
            borderRadius: tokens.radius.pill,
            padding: compact ? `${tokens.spacing.xs} ${tokens.spacing.lg}` : `${tokens.spacing.sm} ${tokens.spacing.xl}`,
            fontFamily: tokens.fontFamily.heading,
            fontSize: compact ? tokens.fontSize.caption : tokens.fontSize.label,
            fontWeight: tokens.fontWeight.bold,
            boxShadow: tokens.shadow.float,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {stage}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* Right: spacer so the back button stays left-aligned even with no stage chip */}
      <div style={{ width: compact ? '70px' : '88px', flexShrink: 0 }} />
    </div>
  );
};
