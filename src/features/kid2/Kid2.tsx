/**
 * Draw in the Air 2.0 — shared "kid2" component library.
 *
 * TSX port of the handoff prototype's design components
 * (gameplay-redesign/project/system.jsx + home.jsx). These are PURE
 * PRESENTATION components: they render the 2.0 look and feel and carry
 * no gameplay, tracking, analytics, or persistence logic.
 *
 * All markup is namespaced with `d2-` classes and must live inside a
 * `.dita2` ancestor (see <Dita2Root>), which scopes the design-system
 * CSS so it can never regress parent / teacher / admin / marketing pages.
 */

import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from 'react';
import '../../styles/dita2.css';

export type Companion = 'spark' | 'orb' | 'off';
export type Tone = 'mint' | 'sky' | 'lavender' | 'sun' | 'peach';

/* ─────────────────────────────────────────────────────────────
   Dita2Root — scoping wrapper. Renders the design-system boundary
   plus (optionally) the ambient sky / clouds / bokeh layers.
───────────────────────────────────────────────────────────── */
export function Dita2Root({
  children,
  className = '',
  ambient = false,
  motionLevel = 7,
  style,
}: {
  children: ReactNode;
  className?: string;
  ambient?: boolean;
  /** 0–10; maps to the --d2-motion CSS variable (0.2–1.4). */
  motionLevel?: number;
  style?: CSSProperties;
}) {
  const motion = 0.2 + (Math.max(0, Math.min(10, motionLevel)) / 10) * 1.2;
  return (
    <div
      className={`dita2 ${className}`}
      style={{ ['--d2-motion' as string]: motion.toFixed(3), ...style }}
    >
      {ambient && (
        <>
          <div className="d2-sky" />
          <Clouds />
          {motionLevel > 1 && <Bokeh count={Math.round(6 + motionLevel)} />}
        </>
      )}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Spark — glowing firefly companion made of light & particles.
───────────────────────────────────────────────────────────── */
export function Spark({
  size = 'sm',
  mood = 'idle',
  variant = 'spark',
}: {
  size?: 'sm' | 'lg';
  mood?: 'idle' | 'cheer';
  variant?: Companion;
}) {
  return (
    <div
      className={`d2-spark ${size === 'lg' ? 'lg' : ''} ${mood} ${variant}`}
      aria-hidden="true"
    >
      <div className="halo" />
      <div className="orbit">
        <b />
      </div>
      <div className="orbit b2">
        <b />
      </div>
      <div className="core" />
    </div>
  );
}

/* Coach — Spark + a contextual speech bubble. Companion can be hidden. */
export function Coach({
  children,
  mood = 'idle',
  companion = 'spark',
  size = 'sm',
  style,
}: {
  children?: ReactNode;
  mood?: 'idle' | 'cheer';
  companion?: Companion;
  size?: 'sm' | 'lg';
  style?: CSSProperties;
}) {
  if (companion === 'off') {
    return (
      <div className="d2-say" style={style}>
        {children}
      </div>
    );
  }
  return (
    <div className="d2-spark-wrap" style={style}>
      <Spark size={size} mood={mood} variant={companion} />
      {children != null && <div className="d2-say">{children}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Ambient layers — Clouds + Bokeh.
───────────────────────────────────────────────────────────── */
export function Clouds() {
  const data = useRef<
    { w: number; h: number; top: string; delay: number; dur: number }[] | null
  >(null);
  if (!data.current) {
    data.current = [
      { w: 220, h: 60, top: '12%', delay: 0, dur: 1 },
      { w: 160, h: 46, top: '26%', delay: -18, dur: 1.3 },
      { w: 280, h: 72, top: '60%', delay: -32, dur: 0.85 },
      { w: 140, h: 40, top: '74%', delay: -9, dur: 1.5 },
    ];
  }
  return (
    <div className="d2-clouds">
      {data.current.map((c, i) => (
        <div
          key={i}
          className="d2-cloud"
          style={{
            width: c.w,
            height: c.h,
            top: c.top,
            animationDelay: `${c.delay}s`,
            animationDuration: `calc(${48 * c.dur}s / var(--d2-motion,1))`,
          }}
        />
      ))}
    </div>
  );
}

export function Bokeh({ count = 14 }: { count?: number }) {
  const dots = useRef<
    { size: number; left: number; delay: number; dur: number }[] | null
  >(null);
  if (!dots.current) {
    dots.current = Array.from({ length: count }).map(() => ({
      size: 10 + Math.random() * 34,
      left: Math.random() * 100,
      delay: -Math.random() * 22,
      dur: 16 + Math.random() * 14,
    }));
  }
  return (
    <div className="d2-bokeh">
      {dots.current.map((d, i) => (
        <span
          key={i}
          className="d2-dot"
          style={{
            width: d.size,
            height: d.size,
            left: `${d.left}%`,
            bottom: '-40px',
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HUD — back chip (+ optional status / streak) and adult-gate lock.
───────────────────────────────────────────────────────────── */
export function HUD({
  onBack,
  backLabel = 'Menu',
  status,
  streak,
  right,
  onLock,
}: {
  onBack?: () => void;
  backLabel?: string;
  status?: string;
  streak?: number | null;
  right?: ReactNode;
  onLock?: () => void;
}) {
  return (
    <>
      <div className="d2-hud-tl">
        {onBack && (
          <button className="d2-chip" onClick={onBack}>
            <span className="d2-ic">←</span> {backLabel}
          </button>
        )}
        {status && (
          <div className="d2-chip success">
            <span className="d2-ic">●</span> {status}
          </div>
        )}
        {streak != null && (
          <div className="d2-chip streak">
            <span className="d2-ic">🔥</span> {streak} day streak
          </div>
        )}
      </div>
      <div className="d2-hud-tr">
        {right}
        {onLock && (
          <button
            className="d2-lock"
            title="Grown-ups, hold to unlock"
            aria-label="Adult gate"
            onClick={onLock}
          >
            🔒
          </button>
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   StarRow — animated earned stars.
───────────────────────────────────────────────────────────── */
export function StarRow({
  earned = 3,
  total = 3,
}: {
  earned?: number;
  total?: number;
}) {
  return (
    <div className="d2-stars">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`s ${i < earned ? 'on' : ''}`}>
          ★
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DwellButton — signature dwell-to-select ring on hover.
   Mirrors the prototype's mouse-dwell affordance. Hand-tracking
   dwell is driven separately (by hit-testing in the menu), so this
   ring is the *visual* feedback for pointer/hover users.
───────────────────────────────────────────────────────────── */
export function DwellButton({
  onSelect,
  className = '',
  children,
  dwell = 1200,
  style,
  id,
}: {
  onSelect?: () => void;
  className?: string;
  children?: ReactNode;
  dwell?: number;
  style?: CSSProperties;
  id?: string;
}) {
  const [p, setP] = useState(0);
  const [hover, setHover] = useState(false);
  const start = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!hover) {
      setP(0);
      return;
    }
    start.current = Date.now();
    const tick = () => {
      const el = Math.min((Date.now() - start.current) / dwell, 1);
      setP(el);
      if (el >= 1) {
        onSelect?.();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [hover, dwell, onSelect]);
  const R = 15;
  const C = 2 * Math.PI * R;
  return (
    <button
      id={id}
      className={className}
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect?.()}
    >
      {hover && (
        <div className="d2-dwell-ring" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <circle cx="16" cy="16" r={R} className="trk" />
            <circle
              cx="16"
              cy="16"
              r={R}
              className="fil"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - p)}
            />
          </svg>
        </div>
      )}
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Confetti — celebration effect.
───────────────────────────────────────────────────────────── */
const CONFETTI_COLORS = ['#9D7DFF', '#5BCE9A', '#7BB6FF', '#FFC83D', '#FF9B7E'];
export function Confetti({
  count = 70,
  motion = 1,
}: {
  count?: number;
  motion?: number;
}) {
  const bits = useRef<
    {
      left: number;
      delay: number;
      dur: number;
      col: string;
      rot: number;
      round: boolean;
    }[]
  | null>(null);
  if (!bits.current) {
    bits.current = Array.from({ length: count }).map(() => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.6 + Math.random() * 1.8,
      col: CONFETTI_COLORS[Math.floor(Math.random() * 5)],
      rot: Math.random() * 360,
      round: Math.random() > 0.6,
    }));
  }
  return (
    <div className="d2-confetti">
      {bits.current.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b.left}%`,
            background: b.col,
            transform: `rotate(${b.rot}deg)`,
            borderRadius: b.round ? '50%' : '3px',
            animationDuration: `${b.dur / Math.max(motion, 0.3)}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MasteryRing — small progress ring used on adventure tiles.
───────────────────────────────────────────────────────────── */
const TONE_RING: Record<Tone, string> = {
  lavender: 'var(--d2-lavender-400)',
  mint: 'var(--d2-mint-400)',
  sky: 'var(--d2-sky-400)',
  sun: 'var(--d2-sun-400)',
  peach: 'var(--d2-peach-400)',
};

export function MasteryRing({ pct, tone }: { pct: number; tone: Tone }) {
  const R = 17;
  const C = 2 * Math.PI * R;
  return (
    <div className="d2-mastery">
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={R} className="d2-mr-trk" />
        <circle
          cx="20"
          cy="20"
          r={R}
          className="d2-mr-fil"
          style={{ stroke: TONE_RING[tone] }}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
        />
      </svg>
      <span>
        {pct}
        <small>%</small>
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   GameTop — shared in-game progress bar (title + bar + percent).
───────────────────────────────────────────────────────────── */
export function GameTop({
  title,
  sub,
  pct,
  accent = 'mint',
}: {
  title: string;
  sub?: string;
  pct: number;
  accent?: 'mint' | 'lav' | 'sun';
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="d2-game-top">
      <div className="d2-game-top-label">
        <b>{title}</b>
        {sub && <span>{sub}</span>}
      </div>
      <div className={`d2-pbar ${accent === 'lav' ? 'lav' : accent === 'sun' ? 'sun' : ''}`}>
        <span style={{ width: `${clamped}%` }} />
      </div>
      <div className="d2-game-top-pct">{Math.round(clamped)}%</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ProgressBar — standalone pbar for ad-hoc use.
───────────────────────────────────────────────────────────── */
export function ProgressBar({
  pct,
  accent = 'mint',
  style,
}: {
  pct: number;
  accent?: 'mint' | 'lav' | 'sun';
  style?: CSSProperties;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={`d2-pbar ${accent === 'lav' ? 'lav' : accent === 'sun' ? 'sun' : ''}`}
      style={style}
    >
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}
