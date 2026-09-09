/**
 * thirdPartyAnalytics, the one gate every optional third-party tool goes
 * through (WP2B.1 / DIA-009).
 *
 * Tools covered: Google Analytics 4 (gtag), Microsoft Clarity, the Meta
 * Pixel and PostHog. All four are optional. They may run only when
 *   1. an adult granted cookie consent (analyticsConsent.ts), AND
 *   2. the current screen is not one a child uses (childRoutes.ts).
 *
 * Rule 2 wins even if consent was granted earlier in the same session on a
 * marketing or teacher page and the visitor then moves, without a reload,
 * to /play or /join. The router calls applyRouteAnalyticsPolicy() on every
 * navigation; on a child route it stops whatever is already running.
 *
 * Not covered on purpose: first-party learning telemetry (Supabase
 * analytics_events) and scrubbed Sentry error reporting.
 *
 * The functions take an optional window-like object so they can be unit
 * tested in the node vitest environment without a DOM.
 */

import { hasAnalyticsConsent } from './analyticsConsent';
import { isChildRoute, isCurrentChildRoute } from './childRoutes';

/**
 * SDK-backed tools (PostHog, Meta Pixel wrapper) register a suspend /
 * resume pair here from src/lib/observability so this module stays free
 * of SDK imports and testable in node.
 */
export interface ThirdPartyToolHooks {
  name: string;
  suspend: () => void;
  resume: () => void;
}
const toolHooks = new Map<string, ThirdPartyToolHooks>();

export function registerThirdPartyTool(hooks: ThirdPartyToolHooks): () => void {
  toolHooks.set(hooks.name, hooks);
  return () => { toolHooks.delete(hooks.name); };
}

/** Test helper. */
export function registeredThirdPartyTools(): string[] {
  return [...toolHooks.keys()];
}

function eachHook(kind: 'suspend' | 'resume'): void {
  for (const h of toolHooks.values()) {
    try { h[kind](); } catch { /* analytics must never break the app */ }
  }
}

export const GA_MEASUREMENT_ID = 'G-S4XSWT6Q09';
export const CLARITY_PROJECT_ID = 'vseevw9uck';

/** The `window['ga-disable-<id>']` opt-out flag gtag honours. */
export const GA_DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;

/** Set on window once a child route has stopped the tools. Read by the
 *  deferred loader in main.tsx as a belt-and-braces refusal. */
export const CHILD_BLOCK_FLAG = '__diaChildRouteAnalyticsBlocked';

type AnyFn = (...args: unknown[]) => unknown;

/** The subset of window these helpers touch. Real `window` satisfies it. */
export interface AnalyticsWindow {
  [key: string]: unknown;
  clarity?: AnyFn;
  gtag?: AnyFn;
  fbq?: AnyFn;
  document?: {
    querySelectorAll?: (selector: string) => ArrayLike<{ remove?: () => void; parentNode?: { removeChild: (n: unknown) => void } | null }>;
  };
}

function realWindow(): AnalyticsWindow | null {
  if (typeof window === 'undefined') return null;
  return window as unknown as AnalyticsWindow;
}

/**
 * True when optional third-party analytics may load or run right now.
 * Pass an explicit path / hash to evaluate a navigation target; with no
 * arguments it reads the current location.
 */
export function thirdPartyAnalyticsAllowed(path?: string, hash?: string): boolean {
  if (!hasAnalyticsConsent()) return false;
  if (path !== undefined) return !isChildRoute(path, hash);
  return !isCurrentChildRoute();
}

/**
 * Stop Microsoft Clarity. Works whether the real tag has loaded or only the
 * queue stub is present: a queued 'stop' is replayed by the tag when it
 * arrives, so a script injected just before a child-route navigation still
 * ends up stopped. Also removes any clarity.ms script elements so a later
 * inspection of the DOM shows nothing. Safe when Clarity is absent.
 */
export function stopClarity(win: AnalyticsWindow | null = realWindow()): boolean {
  if (!win) return false;
  let stopped = false;
  try {
    if (typeof win.clarity === 'function') {
      // Withdraw cookie consent first so no further cookie writes happen,
      // then stop the recorder.
      try { win.clarity('consent', false); } catch { /* older tag versions */ }
      win.clarity('stop');
      stopped = true;
    }
  } catch {
    /* analytics must never break the app */
  }
  try {
    const nodes = win.document?.querySelectorAll?.('script[src*="clarity.ms"]');
    if (nodes) {
      for (let i = nodes.length - 1; i >= 0; i -= 1) {
        const n = nodes[i];
        if (typeof n.remove === 'function') n.remove();
        else n.parentNode?.removeChild(n);
      }
    }
  } catch {
    /* no-op */
  }
  return stopped;
}

/** Restart Clarity after an adult route is reached again with consent. */
function startClarity(win: AnalyticsWindow): void {
  try {
    if (typeof win.clarity === 'function') {
      win.clarity('consent');
      win.clarity('start');
    }
  } catch {
    /* no-op */
  }
}

function disableGa(win: AnalyticsWindow, disabled: boolean): void {
  try {
    win[GA_DISABLE_KEY] = disabled;
    if (typeof win.gtag === 'function') {
      const state = disabled ? 'denied' : 'granted';
      win.gtag('consent', 'update', {
        analytics_storage: state,
        ad_storage: state,
        ad_user_data: state,
        ad_personalization: state,
      });
    }
  } catch {
    /* no-op */
  }
}

function setMetaConsent(win: AnalyticsWindow, granted: boolean): void {
  try {
    if (typeof win.fbq === 'function') win.fbq('consent', granted ? 'grant' : 'revoke');
  } catch {
    /* no-op */
  }
}

/**
 * Stop every optional tool that may already be running. Idempotent. Called
 * when the visitor reaches a child route, and usable as a hard kill switch.
 */
export function suspendThirdPartyAnalytics(win: AnalyticsWindow | null = realWindow()): void {
  if (!win) return;
  win[CHILD_BLOCK_FLAG] = true;
  stopClarity(win);
  disableGa(win, true);
  setMetaConsent(win, false);
  eachHook('suspend');
}

/**
 * Let the tools run again. Only does anything when consent is granted and
 * the target is an adult route; otherwise it is a no-op so a caller can
 * never accidentally re-enable tracking on a child screen.
 */
export function resumeThirdPartyAnalytics(
  path?: string,
  hash?: string,
  win: AnalyticsWindow | null = realWindow(),
): void {
  if (!win) return;
  if (!thirdPartyAnalyticsAllowed(path, hash)) return;
  win[CHILD_BLOCK_FLAG] = false;
  disableGa(win, false);
  setMetaConsent(win, true);
  eachHook('resume');
  startClarity(win);
}

/**
 * Apply the policy for a navigation target. Returns 'suspended' on a child
 * route, 'allowed' when the tools may run, 'denied' when no consent.
 */
export function applyRouteAnalyticsPolicy(
  path: string,
  hash?: string,
  win: AnalyticsWindow | null = realWindow(),
): 'suspended' | 'allowed' | 'denied' {
  if (isChildRoute(path, hash)) {
    suspendThirdPartyAnalytics(win);
    return 'suspended';
  }
  if (!hasAnalyticsConsent()) return 'denied';
  resumeThirdPartyAnalytics(path, hash, win);
  return 'allowed';
}
