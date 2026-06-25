/**
 * Build identity — admin/debug only.
 *
 * Lets local source, GitHub source and the deployed production bundle be
 * matched to an explicit commit SHA (acceptance: local = GitHub = production).
 * Values are baked in at build time by Vite `define` (see vite.config.ts);
 * on Vercel they come from VERCEL_GIT_COMMIT_SHA / VERCEL_ENV automatically.
 *
 * This is intentionally NOT rendered anywhere in the child gameplay UI. It is
 * exposed only on `window.__DRAW_IN_AIR_BUILD__` for admins / the ?debug
 * surface to read.
 */
declare const __BUILD_SHA__: string;
declare const __BUILD_ENV__: string;
declare const __BUILD_TIME__: string;

export interface BuildInfo {
    /** Git commit SHA the bundle was built from ('dev' for local builds). */
    sha: string;
    /** Deployment environment ('production' | 'preview' | 'development'). */
    env: string;
    /** ISO timestamp of the build. */
    builtAt: string;
}

export const buildInfo: BuildInfo = {
    sha: typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev',
    env: typeof __BUILD_ENV__ !== 'undefined' ? __BUILD_ENV__ : 'development',
    builtAt: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown',
};

/** Short SHA for compact display. */
export const shortSha = (): string => (buildInfo.sha === 'dev' ? 'dev' : buildInfo.sha.slice(0, 7));

/**
 * Publish build identity to `window.__DRAW_IN_AIR_BUILD__` so an admin or the
 * ?debug overlay can verify which commit is live. Safe to call once at startup.
 */
export function registerBuildInfo(): void {
    if (typeof window === 'undefined') return;
    (window as unknown as { __DRAW_IN_AIR_BUILD__?: BuildInfo }).__DRAW_IN_AIR_BUILD__ = buildInfo;
}
