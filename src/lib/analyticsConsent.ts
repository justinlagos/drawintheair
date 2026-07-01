/**
 * analyticsConsent — single source of truth for non-essential cookie consent.
 *
 * Essential cookies (auth/session) always run. The third-party analytics and
 * marketing tools — Google Analytics 4, Microsoft Clarity, the Meta Pixel and
 * PostHog — are NON-essential and, under UK GDPR / PECR, must be opt-in. So
 * they only load once the visitor has actively granted consent. Until then
 * (choice === null) nothing non-essential is loaded, which is the compliant
 * default.
 *
 * The value is persisted in localStorage and broadcast so the loaders in
 * main.tsx / observability can react the moment consent is granted.
 */

const KEY = 'dita-cookie-consent';

export type ConsentChoice = 'granted' | 'denied';

type Listener = (choice: ConsentChoice) => void;
const listeners = new Set<Listener>();

/** The stored choice, or null if the visitor has not chosen yet. */
export function getConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

/** True only when the visitor has explicitly allowed non-essential analytics. */
export function hasAnalyticsConsent(): boolean {
  return getConsent() === 'granted';
}

/** Record the visitor's choice and notify listeners. */
export function setConsent(choice: ConsentChoice): void {
  try { localStorage.setItem(KEY, choice); } catch { /* noop */ }
  for (const l of listeners) l(choice);
}

/** Subscribe to consent changes (e.g. to load analytics when granted). */
export function onConsentChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
