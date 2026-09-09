/**
 * CookieConsentBanner — opt-in consent for non-essential analytics.
 *
 * Shown once, until the visitor chooses. "Accept" lets GA4, Microsoft Clarity,
 * the Meta Pixel and PostHog load; "Only essential" keeps them off. Essential
 * cookies (auth/session) run regardless. The choice is persisted.
 *
 * Styles are inline so it renders on any route without a stylesheet dependency.
 *
 * WP2B.1 / DIA-009: consent is an adult decision. The banner is never
 * rendered on a child route (/play, /join, /app, /onboarding, /demo), so a
 * child can never tap Accept, and it never overlaps the play area. The
 * check re-runs on every navigation (popstate, hashchange and the router's
 * dia:route event) so SPA moves between adult and child screens are covered.
 */

import { useEffect, useState } from 'react';
import { getConsent, setConsent, type ConsentChoice } from '../lib/analyticsConsent';
import { isCurrentChildRoute } from '../lib/childRoutes';

function useOnChildRoute(): boolean {
  const [onChild, setOnChild] = useState<boolean>(() => isCurrentChildRoute());
  useEffect(() => {
    const update = () => setOnChild(isCurrentChildRoute());
    update();
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    window.addEventListener('dia:route', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
      window.removeEventListener('dia:route', update);
    };
  }, []);
  return onChild;
}

export function CookieConsentBanner() {
  const [choice, setChoiceState] = useState<ConsentChoice | null>(() => getConsent());
  const onChildRoute = useOnChildRoute();
  if (onChildRoute) return null;
  if (choice !== null) return null;

  const choose = (c: ConsentChoice) => { setConsent(c); setChoiceState(c); };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 2000,
        maxWidth: 520, margin: '0 auto',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14,
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FBF7EE 100%)',
        color: '#40325A',
        borderRadius: 20, padding: '16px 18px',
        border: '1px solid rgba(64, 50, 90, 0.10)',
        boxShadow: '0 12px 34px rgba(64, 50, 90, 0.16)',
        fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 14, lineHeight: 1.45,
      }}
    >
      <p style={{ margin: 0, flex: '1 1 240px' }}>
        <span aria-hidden="true" style={{ marginRight: 6 }}>🍪</span>
        Cookies help us improve Draw in the Air. Analytics only run if you allow them.{' '}
        <a href="/privacy" style={{ color: '#6D4FBE', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
          Privacy
        </a>
      </p>
      <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
        <button
          type="button"
          onClick={() => choose('denied')}
          style={{
            border: '1.5px solid rgba(64, 50, 90, 0.20)', background: 'transparent',
            color: '#40325A', borderRadius: 999, padding: '9px 16px',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Only essential
        </button>
        <button
          type="button"
          onClick={() => choose('granted')}
          style={{
            border: 'none', background: 'linear-gradient(180deg, #8B6BD6, #6D4FBE)',
            color: '#fff', borderRadius: 999, padding: '9px 18px',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(109, 79, 190, 0.28)',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
