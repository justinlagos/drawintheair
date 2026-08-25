/**
 * PlayBlockedNotice — kid-safe full-screen message shown when a parental
 * control blocks activity entry (pause or daily limit reached).
 *
 * Design rules (children-first): no adult controls, plain language, a single
 * large friendly dismiss target, and it points the child back to a grown-up
 * rather than to a paywall or settings screen.
 */

import type { PlayBlockReason } from './playControlsGate';

interface Props {
  reason: PlayBlockReason;
  onClose: () => void;
}

const COPY: Record<'paused' | 'daily-limit', { icon: string; title: string; line: string }> = {
  'paused': {
    icon: '⏸️',
    title: 'Playtime is paused',
    line: 'Your grown-up paused Draw in the Air. Come back and play again soon!',
  },
  'daily-limit': {
    icon: '🌙',
    title: "That's all for today!",
    line: 'Great playing today. Ask your grown-up if you would like more time.',
  },
};

export function PlayBlockedNotice({ reason, onClose }: Props) {
  if (reason == null) return null;
  const copy = COPY[reason];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #F4EFFF 0%, #EEF6FF 55%, #FBF7EE 100%)',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 28, padding: '40px 32px', maxWidth: 460,
          textAlign: 'center', boxShadow: '0 18px 60px rgba(64,50,90,0.22)',
        }}
      >
        <div style={{ fontSize: '4rem', lineHeight: 1, marginBottom: 12 }} aria-hidden>{copy.icon}</div>
        <h1 style={{ margin: '0 0 10px', fontSize: '1.7rem', color: '#40325A' }}>{copy.title}</h1>
        <p style={{ margin: '0 0 26px', fontSize: '1.1rem', color: '#5B5170', lineHeight: 1.4 }}>{copy.line}</p>
        <button
          onClick={onClose}
          style={{
            border: 'none', borderRadius: 999, padding: '14px 34px', cursor: 'pointer',
            fontSize: '1.1rem', fontWeight: 700, color: '#fff',
            background: 'linear-gradient(180deg, #8B6BD6, #6D4FBE)',
            boxShadow: '0 8px 20px rgba(109,79,190,0.35)',
          }}
        >
          Okay
        </button>
      </div>
    </div>
  );
}
