/**
 * Meta (Facebook) Pixel — thin, privacy-vetted wrapper.
 *
 * No-op unless VITE_META_PIXEL_ID is set, so dev / preview / unconfigured
 * environments never pollute the dataset (preview safety, per spec §1b).
 *
 * Only the explicitly-mapped funnel events are ever forwarded (see
 * analytics.ts META_EVENT_MAP and the page-level ViewContent / dedup
 * call-sites). Raw internal events and free-form meta are NEVER sent.
 *
 * Deduplication: every event accepts an optional `eventId`. The matching
 * server-side CAPI event (Stripe webhook / meta-capi function) sends the
 * SAME id so Meta Events Manager shows "Deduplicated", not "Duplicate".
 */

const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined) || '';

// Custom events use trackCustom; standard events use track.
const CUSTOM_EVENTS = new Set(['AddChild', 'AddLearner', 'StartActivity', 'FirstSession']);

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

let active = false;

export function isMetaActive(): boolean {
  return active;
}

/** Load fbevents.js + init the pixel. Idempotent; safe to call from the
 *  deferred post-interactive loader. No-op when the pixel id is unset. */
export function initMetaPixel(): void {
  if (active || !PIXEL_ID || typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    /* eslint-disable */
    // Standard Meta Pixel base snippet (loads connect.facebook.net/en_US/fbevents.js).
    (function (f: any, b: any, e: string, v: string) {
      if (f.fbq) return;
      const n: any = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      const t = b.createElement(e); t.async = true; t.src = v;
      const s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq?.('init', PIXEL_ID);
    window.fbq?.('track', 'PageView');
    active = true;
  } catch {
    /* never break the app for analytics */
  }
}

export interface MetaParams {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
}

/** Fire a Meta event (standard or custom). Best-effort; never throws. */
export function trackMeta(event: string, params: MetaParams = {}, eventId?: string): void {
  if (!active || typeof window === 'undefined' || !window.fbq) return;
  try {
    const opts = eventId ? { eventID: eventId } : undefined;
    if (CUSTOM_EVENTS.has(event)) window.fbq('trackCustom', event, params, opts);
    else window.fbq('track', event, params, opts);
  } catch {
    /* no-op */
  }
}

/** SPA route change — the base snippet only fires PageView once. */
export function trackMetaPageView(): void {
  if (!active || typeof window === 'undefined' || !window.fbq) return;
  try { window.fbq('track', 'PageView'); } catch { /* no-op */ }
}

// ── Deduplication helpers ────────────────────────────────────────────────────
// A single event_id is generated at checkout, stamped onto the Stripe
// subscription metadata AND kept in localStorage across the Stripe redirect, so
// the client Pixel `Subscribe` (on success-return) and the server CAPI
// `Subscribe` (from the webhook) share it → "Deduplicated" in Events Manager.

const CHECKOUT_EID_KEY = 'dita_meta_checkout_eid';

export function newEventId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); } catch { /* fall through */ }
  return 'e-' + Date.now().toString(16) + '-' + Math.random().toString(16).slice(2);
}
export function rememberCheckoutEventId(id: string): void {
  try { localStorage.setItem(CHECKOUT_EID_KEY, id); } catch { /* private mode */ }
}
export function readCheckoutEventId(): string | null {
  try { return localStorage.getItem(CHECKOUT_EID_KEY); } catch { return null; }
}
export function clearCheckoutEventId(): void {
  try { localStorage.removeItem(CHECKOUT_EID_KEY); } catch { /* ignore */ }
}
