/**
 * CookieConsentBanner — opt-in consent for non-essential analytics.
 *
 * Shown once, until the visitor makes a choice. "Accept all" grants consent and
 * lets GA4, Microsoft Clarity, the Meta Pixel and PostHog load; "Only essential"
 * keeps them off. Essential cookies (auth/session) run regardless. The choice is
 * persisted, so the banner does not reappear.
 *
 * Styles are inline so the banner can render on any route (marketing, /play,
 * parent area) without depending on a particular stylesheet.
 */

import { useState } from 'react';
import { getConsent, setConsent, type ConsentChoice } from '../lib/analyticsConsent';

export function CookieConsentBanner() {
  const [choice, setChoiceState] = useState<ConsentChoice | null>(() => getConsent());
  if (choice !== null) return null;

  const choose = (c: ConsentChoice) => { setConsent(c); setChoiceState(c); };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 2000,
        maxWidth: 720, margin: '0 auto',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16,
        background: '#1A1B2E', color: '#fff',
        borderRadius: 18, padding: '16px 20px',
        boxShadow: '0 18px 50px rgba(7, 12, 24, 0.4)',
        fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 14, lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0, flex: '1 1 320px', color: '#E9E7F5' }}>
        We use essential cookies to run Draw in the Air, and — only with your consent —
        analytics cookies to understand usage and improve the product.{' '}
        <a href="/privacy" style={{ color: '#C9B8F0', textDecoration: 'underline' }}>
          Privacy Policy
        </a>.
      </p>
      <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
        <button
          type="button"
          onClick={() => choose('denied')}
          style={{
            border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent',
            color: '#fff', borderRadius: 999, padding: '10px 16px',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Only essential
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          style={{
            border: 'none', background: 'linear-gradient(180deg, #7E4FB8, #6C3FA4)',
            color: '#fff', borderRadius: 999, padding: '10px 18px',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer',
          }}
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
