/**
 * childRoutes, the single place that decides whether a URL is a screen a
 * child uses (WP2B.1 / DIA-009).
 *
 * Why this exists: cookie consent is an adult decision, and no optional
 * third-party analytics (GA4, Microsoft Clarity, Meta Pixel, PostHog) may
 * run while a child is on screen, whatever consent an adult granted earlier
 * on a marketing or teacher page. Every loader and the consent banner ask
 * this helper first, so there is exactly one list to audit.
 *
 * The list mirrors the route resolution in src/main.tsx (getRouteFromPath):
 *   /play, /onboarding   the game engine (route 'play')
 *   /app or #app         the game engine (route 'app')
 *   /join, /join/*       the student classroom client (route 'student-client')
 *   /demo                the demo loading screen that leads into /play
 *   /dev/*-preview       dev-only game harnesses (never resolve in production)
 *
 * First-party learning telemetry (Supabase analytics_events) and scrubbed
 * Sentry error reporting are NOT affected by this helper. They carry no
 * marketing profile and are needed to keep the product working.
 */

/** Path prefixes that resolve to a child-facing screen. Exact match or
 *  match followed by a slash ('/play', '/play/', '/play/x'), never a
 *  longer word ('/playground' is not a child route). */
export const CHILD_ROUTE_PREFIXES: readonly string[] = [
  '/play',
  '/onboarding',
  '/app',
  '/join',
  '/demo',
  '/dev/tracing-preview',
  '/dev/free-paint-preview',
];

/** Hash values that turn any path into the game (see getRouteFromPath). */
export const CHILD_ROUTE_HASHES: readonly string[] = ['#app'];

function normalisePath(path: string): string {
  let p = (path || '').trim();
  // Tolerate callers that pass a full href or path with query / hash.
  if (/^https?:\/\//i.test(p)) {
    try { p = new URL(p).pathname; } catch { /* fall through */ }
  }
  const cut = p.search(/[?#]/);
  if (cut >= 0) p = p.slice(0, cut);
  if (p === '') p = '/';
  if (!p.startsWith('/')) p = '/' + p;
  // Collapse a trailing slash so '/play/' and '/play' agree.
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p.toLowerCase();
}

function normaliseHash(hash: string | undefined): string {
  const h = (hash || '').trim().toLowerCase();
  if (!h) return '';
  return h.startsWith('#') ? h : '#' + h;
}

/**
 * True when the given path (and optional hash) is a screen a child uses.
 * Pure, no DOM access, safe to call during SSR / prerender.
 */
export function isChildRoute(path: string, hash?: string): boolean {
  const p = normalisePath(path);
  const h = normaliseHash(hash);
  if (h && CHILD_ROUTE_HASHES.includes(h)) return true;
  for (const prefix of CHILD_ROUTE_PREFIXES) {
    if (p === prefix) return true;
    if (p.startsWith(prefix + '/')) return true;
  }
  return false;
}

/** The current browser location, or false when there is no window. */
export function isCurrentChildRoute(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  try {
    return isChildRoute(window.location.pathname, window.location.hash);
  } catch {
    // If we cannot read the location, fail closed: treat it as a child
    // route so nothing optional loads.
    return true;
  }
}
