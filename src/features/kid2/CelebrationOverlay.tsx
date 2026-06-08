/**
 * Draw in the Air 2.0 — Completion / Celebration overlay.
 *
 * TSX port of the prototype's ScreenCelebrate (meta.jsx). Pure
 * presentation: it renders the reward moment on top of whatever game
 * is running. It does NOT decide WHEN a stage is complete or persist
 * anything — the host game owns that and simply mounts this overlay
 * with the relevant copy + callbacks.
 */

import { useEffect, useState } from 'react';
import { Dita2Root, Spark, StarRow, Confetti, ProgressBar, type Companion } from './Kid2';

export interface CelebrationReward {
  badge: string;
  name: string;
  desc?: string;
}

export interface CelebrationOverlayProps {
  /** Headline, defaults to "Great job!" */
  heading?: string;
  /** One-line encouragement about what the child just did. */
  line: string;
  /** Stars earned (0–3). */
  stars?: number;
  /** Optional XP / mastery progress block. */
  xpLabel?: string;
  xpValue?: string;
  xpPct?: number;
  xpNote?: string;
  /** Optional "new reward unlocked" block. */
  reward?: CelebrationReward;
  /** Primary action ("Next stage"). */
  onNext?: () => void;
  nextLabel?: string;
  /** Secondary action ("Back home" / "Menu"). */
  onHome?: () => void;
  homeLabel?: string;
  companion?: Companion;
  motionLevel?: number;
}

export function CelebrationOverlay({
  heading = 'Great job!',
  line,
  stars = 3,
  xpLabel,
  xpValue,
  xpPct,
  xpNote,
  reward,
  onNext,
  nextLabel = '▶ Next stage',
  onHome,
  homeLabel = 'Back home',
  companion = 'spark',
  motionLevel = 7,
}: CelebrationOverlayProps) {
  const [xp, setXp] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setXp(xpPct ?? 0), 300);
    return () => clearTimeout(t);
  }, [xpPct]);

  const motion = 0.2 + (Math.max(0, Math.min(10, motionLevel)) / 10) * 1.2;

  return (
    <Dita2Root motionLevel={motionLevel}>
      <div className="d2-celebrate" role="dialog" aria-modal="true" aria-label="Stage complete">
        <div className="d2-scrim" />
        <Confetti count={110} motion={motion} />
        <div className="d2-celeb-card">
          <div className="d2-celeb-spark">
            <Spark size="lg" mood="cheer" variant={companion === 'orb' ? 'orb' : 'spark'} />
          </div>
          <span className="d2-eyebrow" style={{ color: 'var(--d2-sun-600)' }}>
            Stage complete
          </span>
          <h1 className="d2-celeb-h">{heading}</h1>
          <p className="d2-celeb-sub">{line}</p>

          <StarRow earned={stars} total={3} />

          {xpLabel != null && (
            <div className="d2-celeb-xp">
              <div className="d2-celeb-xp-row">
                <span>{xpLabel}</span>
                {xpValue && <b>{xpValue}</b>}
              </div>
              <ProgressBar pct={xp} accent="lav" />
              {xpNote && <em>{xpNote}</em>}
            </div>
          )}

          {reward && (
            <div className="d2-celeb-unlock">
              <div className="d2-celeb-unlock-badge">{reward.badge}</div>
              <div>
                <span className="d2-eyebrow">New reward unlocked</span>
                <b>{reward.name}</b>
                {reward.desc && <p>{reward.desc}</p>}
              </div>
            </div>
          )}

          <div className="d2-celeb-actions">
            {onNext && (
              <button className="d2-btn d2-btn-play" onClick={onNext}>
                {nextLabel}
              </button>
            )}
            {onHome && (
              <button className="d2-btn d2-btn-ghost" onClick={onHome}>
                {homeLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </Dita2Root>
  );
}
