/**
 * Traffic classification — keeps internal, QA, demo and bot traffic out
 * of the "real" denominator that powers every headline metric.
 *
 * WHY THIS EXISTS
 * The Clarity 100-recording export was 84% internal (localhost + /admin),
 * and the admin Insights mix real users, founders, QA and bots into one
 * pool. Until each event carries a trustworthy `traffic_type`, no funnel,
 * completion rate or activation number can be defended to a school, an
 * investor or a product decision.
 *
 * DESIGN
 * These functions are PURE — no window, navigator, localStorage or React.
 * All environmental signals are injected by the caller (analytics.ts),
 * exactly like deviceProfile.classifyDevice(ua, width). That makes the
 * rules unit-testable in the node vitest environment and keeps the policy
 * in one auditable place.
 */

export type AppEnvironment = 'local' | 'staging' | 'production';

/**
 * traffic_type taxonomy. Only `real` (and, where explicitly chosen, `demo`)
 * should ever feed a headline KPI. Everything else is excluded by default.
 */
export type TrafficType = 'real' | 'internal' | 'qa' | 'demo' | 'bot';

// Conservative bot signature. We would rather misclassify a genuine
// headless-ish user as a bot (and lose one row) than let crawlers and
// synthetic monitors inflate "real" sessions.
const BOT_UA =
    /(bot|crawl|spider|slurp|headless|lighthouse|playwright|puppeteer|phantomjs|pingdom|uptime|monitor|gtmetrix|pagespeed|prerender)/i;

/**
 * Map a hostname to a deployment environment. Anything that isn't clearly
 * a real public host is treated as non-production so dev/staging traffic
 * can never reach the `real` bucket.
 */
export function classifyEnvironment(hostname: string | null | undefined): AppEnvironment {
    const h = (hostname ?? '').toLowerCase().trim();
    if (
        h === '' ||
        h === 'localhost' ||
        h === '127.0.0.1' ||
        h === '0.0.0.0' ||
        h === '::1' ||
        h.endsWith('.local') ||
        h.endsWith('.localhost')
    ) {
        return 'local';
    }
    if (
        h.includes('staging') ||
        h.includes('preview') ||
        h.includes('-git-') || // Vercel branch deploys: project-git-branch-team.vercel.app
        h.startsWith('deploy-preview')
    ) {
        return 'staging';
    }
    return 'production';
}

export function isBot(userAgent: string | null | undefined, webdriver?: boolean): boolean {
    if (webdriver === true) return true;
    return BOT_UA.test(userAgent ?? '');
}

/** Environmental signals gathered by analytics.ts at event-build time. */
export interface TrafficSignals {
    environment: AppEnvironment;
    userAgent: string | null | undefined;
    /** navigator.webdriver — true under automated browsers (Playwright, etc.). */
    webdriver?: boolean;
    /** Sticky: this device has visited /admin or arrived with ?internal=1. */
    internal?: boolean;
    /** Sticky: this device arrived with ?qa=1. */
    qa?: boolean;
    /** Marketing demo surface (?demo=1 or a /demo path). */
    demo?: boolean;
}

/**
 * Single source of truth for the traffic_type decision. Order matters:
 *
 *   1. bots first        — never let synthetic traffic look human.
 *   2. non-prod env      — all local/staging traffic is internal by
 *                          definition, regardless of any flag.
 *   3. sticky internal   — founder/QA/admin devices on production.
 *   4. explicit qa flag  — ?qa=1 (separated so QA can be reported on).
 *   5. demo surface      — marketing demos, excluded from headline but
 *                          tracked separately.
 *   6. real              — a genuine production visitor. The only value
 *                          that feeds headline KPIs by default.
 */
export function classifyTrafficType(s: TrafficSignals): TrafficType {
    if (isBot(s.userAgent, s.webdriver)) return 'bot';
    if (s.environment === 'local' || s.environment === 'staging') return 'internal';
    if (s.internal) return 'internal';
    if (s.qa) return 'qa';
    if (s.demo) return 'demo';
    return 'real';
}

/**
 * The default headline-KPI predicate. A metric that claims to describe
 * "users" should count only `real` traffic. `demo` is deliberately
 * excluded here — surface it on its own panel, never folded into the
 * real denominator.
 */
export function isExcludedFromHeadline(t: TrafficType): boolean {
    return t !== 'real';
}
