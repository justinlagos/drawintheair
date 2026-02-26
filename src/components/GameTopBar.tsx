/**
 * GameTopBar — Reusable per-game top bar
 *
 * Left : ← Menu button  (calls onBack)
 * Center: optional stage chip  (e.g. "Level 3 of 6")
 * Right : empty spacer (keeps center chip truly centred)
 *
 * Rules:
 *  - transform + opacity animations only — no blur, no animated box-shadow
 *  - pointerEvents: none on the container; auto only on interactive children
 *  - no React state — pure presentational
 */

interface GameTopBarProps {
  onBack: () => void;
  /** Optional label shown in the centre, e.g. "Level 3 of 6" */
  stage?: string;
  compact?: boolean;
}

export const GameTopBar = ({ onBack, stage, compact = false }: GameTopBarProps) => {
  const h = compact ? '44px' : '52px';
  const px = compact ? '8px' : '12px';
  const fs = compact ? '0.78rem' : '0.82rem';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${px}`,
        zIndex: 500,
        pointerEvents: 'none',
      }}
    >
      {/* Left: Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: compact ? '7px 11px' : '8px 14px',
          minHeight: '36px',
          minWidth: '44px',
          background: 'rgba(0,0,0,0.35)',
          border: '1.5px solid rgba(255,255,255,0.18)',
          borderRadius: '9999px',
          color: 'rgba(255,255,255,0.92)',
          cursor: 'pointer',
          fontSize: fs,
          fontWeight: 700,
          letterSpacing: '0.2px',
          pointerEvents: 'auto',
          transition: 'transform 0.12s ease, opacity 0.12s ease',
          touchAction: 'manipulation',
          userSelect: 'none',
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>←</span>
        <span>Menu</span>
      </button>

      {/* Centre: optional stage chip */}
      {stage ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.30)',
            border: '1.5px solid rgba(255,255,255,0.14)',
            borderRadius: '9999px',
            padding: compact ? '5px 12px' : '6px 16px',
            fontSize: compact ? '0.72rem' : '0.78rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.80)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {stage}
        </div>
      ) : (
        /* keep layout symmetric even with no chip */
        <div style={{ flex: 1 }} />
      )}

      {/* Right: spacer so back button stays left-aligned */}
      <div style={{ width: compact ? '70px' : '88px', flexShrink: 0 }} />
    </div>
  );
};
