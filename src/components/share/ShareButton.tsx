// src/components/share/ShareButton.tsx
// Teacher share button + modal for Phase 3 of the growth engine.
// Renders a floating "Share" button that opens a modal with:
//   - Copy link
//   - Email template (opens mailto:)
//   - QR code display
//
// Usage: drop <ShareButton activitySlug="letter-tracing" /> anywhere in the app.

import { useState, useCallback, useEffect, useRef } from 'react';
import { logEvent } from '../../lib/analytics';

// ── Activity slug → share metadata ────────────────────────────────────────────
interface ShareMeta { label: string; emoji: string; description: string }

const SHARE_META: Record<string, ShareMeta> = {
  'calibration': { label: 'Bubble Pop', emoji: '🫧', description: 'A 30-second hand-eye coordination brain break' },
  'pre-writing': { label: 'Letter Tracing', emoji: '✏️', description: 'Air tracing for letters A–Z' },
  'sort-and-place': { label: 'Sort & Place', emoji: '📦', description: 'Gesture-based categorisation game' },
  'free': { label: 'Free Paint', emoji: '🎨', description: 'Open-ended creative air drawing' },
  'word-search': { label: 'Word Search', emoji: '🔤', description: 'Find words using hand gestures' },
  'colour-builder': { label: 'Colour Builder', emoji: '🌈', description: 'Mix and match colours by gesture' },
  'balloon-math': { label: 'Balloon Math', emoji: '🎈', description: 'Pop the right numbers for early maths' },
  'rainbow-bridge': { label: 'Rainbow Bridge', emoji: '🌉', description: 'Colour matching and recognition game' },
  'gesture-spelling': { label: 'Spelling Stars', emoji: '⭐', description: 'Spell words through air tracing' },
};

// Maps game mode → share slug (for the /share/:slug route)
const MODE_TO_SLUG: Record<string, string> = {
  'calibration': 'bubble-pop',
  'pre-writing': 'letter-tracing',
  'sort-and-place': 'sort-and-place',
  'free': 'free-paint',
  'word-search': 'gesture-learning',
  'colour-builder': 'gesture-learning',
  'balloon-math': 'gesture-learning',
  'rainbow-bridge': 'gesture-learning',
  'gesture-spelling': 'gesture-learning',
};

const BASE_URL = 'https://drawintheair.com';

// ── Simple QR code via Google Charts API ──────────────────────────────────────
function QRCode({ url }: { url: string }) {
  const encoded = encodeURIComponent(url);
  const src = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encoded}&choe=UTF-8`;
  return (
    <img
      src={src}
      alt="QR code for this activity"
      width={160}
      height={160}
      style={{ borderRadius: 8, border: '4px solid white', display: 'block', margin: '0 auto' }}
    />
  );
}

// ── Track share events ────────────────────────────────────────────────────────
function trackShare(method: 'link' | 'email' | 'qr', activitySlug: string) {
  try {
    if (typeof (window as any).__dita_track === 'function') {
      (window as any).__dita_track('share_initiated', { method, activitySlug, timestamp: Date.now() });
    }
  } catch {
    // Non-critical
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ShareButtonProps {
  /** The GameMode string (e.g. 'calibration', 'pre-writing') */
  gameMode: string;
  /** Visual style: 'floating' shows a fixed button, 'inline' renders it inline */
  variant?: 'floating' | 'inline';
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ShareModalProps {
  gameMode: string;
  onClose: () => void;
}

function ShareModal({ gameMode, onClose }: ShareModalProps) {
  const meta = SHARE_META[gameMode] ?? { label: 'Draw in the Air', emoji: '✋', description: 'Gesture learning activities for kids' };
  const slug = MODE_TO_SLUG[gameMode] ?? 'gesture-learning';
  const shareRef = `ts_${Date.now().toString(36)}`;
  const shareUrl = `${BASE_URL}/share/${slug}?ref=${shareRef}`;

  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'link' | 'email' | 'qr'>('link');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      trackShare('link', slug);
      setTimeout(() => setCopied(false), 3000);
    });
  }, [shareUrl, slug]);

  const handleEmail = useCallback(() => {
    trackShare('email', slug);
    const subject = encodeURIComponent(`Try this gesture learning activity — ${meta.label}`);
    const body = encodeURIComponent(
      `Hi,\n\nI've been using this free activity with my class and thought you might like it.\n\n` +
      `It's called ${meta.label} — ${meta.description}. It works through the webcam using hand gestures — no installation or login needed.\n\n` +
      `Try it here: ${shareUrl}\n\n` +
      `No accounts or setup needed — just open the link and wave at the camera.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }, [meta, shareUrl, slug]);

  const handleQRView = useCallback(() => {
    trackShare('qr', slug);
    setTab('qr');
  }, [slug]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#6c47ff' : 'rgba(108,71,255,0.1)',
    border: `1px solid ${active ? '#6c47ff' : 'rgba(108,71,255,0.3)'}`,
    color: active ? 'white' : '#a78bfa',
    borderRadius: 20, padding: '7px 18px',
    fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    /* Backdrop */
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9000, padding: 20,
      }}
    >
      {/* Modal card */}
      <div style={{
        background: '#111629', border: '1px solid rgba(108,71,255,0.35)',
        borderRadius: 20, width: '100%', maxWidth: 460, padding: 32,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}
          aria-label="Close"
        >✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>{meta.emoji}</div>
          <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', margin: 0, marginBottom: 4 }}>
            Share {meta.label}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Share this activity with a colleague
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
          <button style={tabStyle(tab === 'link')} onClick={() => setTab('link')}>🔗 Copy Link</button>
          <button style={tabStyle(tab === 'email')} onClick={() => { setTab('email'); handleEmail(); }}>✉️ Email</button>
          <button style={tabStyle(tab === 'qr')} onClick={handleQRView}>📱 QR Code</button>
        </div>

        {/* Tab content */}
        {tab === 'link' && (
          <div>
            <div style={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#22d3ee', fontSize: '0.82rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shareUrl}
              </span>
            </div>
            <button
              onClick={handleCopy}
              style={{
                width: '100%', background: copied ? '#22c55e' : '#6c47ff',
                color: 'white', border: 'none', borderRadius: 12,
                padding: '12px', fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              {copied ? '✓ Link Copied!' : 'Copy Share Link'}
            </button>
            <p style={{ color: '#475569', fontSize: '0.78rem', textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
              Anyone with this link can try the activity for free
            </p>
          </div>
        )}

        {tab === 'email' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✉️</div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 20 }}>
              Your email app should open with a pre-written message. If it didn't open, copy the link instead.
            </p>
            <button
              onClick={handleEmail}
              style={{ background: '#6c47ff', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 12 }}
            >
              Open Email Again
            </button>
            <div style={{ marginTop: 8 }}>
              <button
                style={{ background: 'none', border: 'none', color: '#6c47ff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                onClick={() => setTab('link')}
              >
                ← Copy link instead
              </button>
            </div>
          </div>
        )}

        {tab === 'qr' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 16 }}>
              Display this on your whiteboard, print it on a handout, or share it at a staff meeting.
            </p>
            <QRCode url={shareUrl} />
            <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: 12 }}>
              Scans to: {shareUrl}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Share Button ───────────────────────────────────────────────────────────────
export function ShareButton({ gameMode, variant = 'inline' }: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  const buttonStyles: Record<string, React.CSSProperties> = {
    floating: {
      position: 'fixed', bottom: 24, right: 24, zIndex: 8000,
      background: 'rgba(108,71,255,0.9)', backdropFilter: 'blur(8px)',
      color: 'white', border: '1px solid rgba(108,71,255,0.6)',
      borderRadius: 32, padding: '10px 20px',
      fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(108,71,255,0.4)',
      display: 'flex', alignItems: 'center', gap: 8,
    },
    inline: {
      background: 'rgba(108,71,255,0.15)',
      border: '1px solid rgba(108,71,255,0.35)',
      color: '#a78bfa', borderRadius: 20,
      padding: '8px 18px', fontWeight: 700, fontSize: '0.85rem',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    },
  };

  return (
    <>
      <button
        onClick={() => {
          logEvent('share_button_clicked', {
            component: 'ShareButton',
            meta: { activity_slug: gameMode, variant },
          });
          setOpen(true);
        }}
        style={buttonStyles[variant]}
        aria-label="Share this activity with a colleague"
      >
        <span>📤</span>
        <span>Share with a Colleague</span>
      </button>

      {open && (
        <ShareModal
          gameMode={gameMode}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default ShareButton;
