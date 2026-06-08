/**
 * Draw in the Air 2.0 — in-game Spark companion + coaching.
 *
 * A friendly firefly that lives in the corner during gameplay and greets
 * the child with a short, mode-specific coaching line on entry, then
 * settles into an ambient floating presence.
 *
 * SAFETY: the whole layer is `pointer-events: none`, so it can NEVER
 * intercept a click, pinch, or hand-tracking gesture. It does not read,
 * write, or alter any game state, tracking data, analytics, or progress.
 * It is purely a decorative coaching presence (the "Spark companion"
 * requested for the redesign). Anchored bottom-left to stay clear of the
 * top-right AdultGate and the modes' bottom-center controls.
 */

import { useEffect, useState } from 'react';
import { Dita2Root, Spark, type Companion } from './Kid2';

/** Mode ids mirror App.tsx GameMode (kept loose to avoid a hard import cycle). */
type ModeId = string;

/** Short, warm, on-brand entry lines. No em dashes (2.0 copy rule). */
const ENTRY_LINE: Record<string, string> = {
  free: "Let's make something. Move your hand to paint.",
  calibration: "Let's warm up! Reach out and pop the bubbles.",
  'pre-writing': 'Follow the glowing path. You can do it.',
  'gesture-spelling': "Let's bring the word to life, letter by letter.",
  'sort-and-place': 'Find where each one belongs. Take your time.',
  'word-search': "Hunt for the hidden words. I'll cheer you on.",
  'balloon-math': 'Pop the balloon with the right number!',
  'rainbow-bridge': 'Build the bridge, one colour at a time.',
  'colour-builder': "Let's mix some beautiful colours.",
  building: 'Stack and build. Steady hands!',
};

const DEFAULT_LINE = "Have fun! I'm right here with you.";

export interface GameCompanionProps {
  modeId: ModeId;
  companion?: Companion;
  motionLevel?: number;
  /** ms the greeting bubble stays before collapsing to just the sprite. */
  greetMs?: number;
}

export function GameCompanion({
  modeId,
  companion = 'spark',
  motionLevel = 7,
  greetMs = 4200,
}: GameCompanionProps) {
  const [showBubble, setShowBubble] = useState(true);

  // Re-greet whenever the mode changes; then auto-collapse the bubble.
  useEffect(() => {
    setShowBubble(true);
    const t = setTimeout(() => setShowBubble(false), greetMs);
    return () => clearTimeout(t);
  }, [modeId, greetMs]);

  if (companion === 'off') return null;

  const line = ENTRY_LINE[modeId] ?? DEFAULT_LINE;

  return (
    <Dita2Root
      motionLevel={motionLevel}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 95,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 'clamp(16px, 3vw, 32px)',
          bottom: 'clamp(16px, 3vh, 28px)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--d2-space-4)',
          maxWidth: 'min(420px, 70vw)',
        }}
      >
        <Spark size="sm" mood="idle" variant={companion} />
        {showBubble && (
          <div
            className="d2-say"
            style={{ fontSize: 'var(--d2-text-base)', maxWidth: 320 }}
          >
            {line}
          </div>
        )}
      </div>
    </Dita2Root>
  );
}
