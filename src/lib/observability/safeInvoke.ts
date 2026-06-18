/**
 * safeInvoke — defensive wrapper for instrumentation, analytics, and any
 * browser/native-bridge call that MUST NOT crash or block product code.
 *
 * Issue 2 background: production Sentry showed
 *   "Error invoking enableButtonsClickedMetaDataLogging: Java object is gone"
 * fired from a beforeunload handler. That symbol is NOT ours — it is injected
 * by the Meta (Facebook/Instagram) in-app browser's JS↔native bridge, which on
 * page teardown calls back into a Java object Android has already destroyed.
 * We can't stop the host from doing that, but the lesson generalises: ANY
 * logging/telemetry call we make can fail (bridge gone, API missing, network
 * dead, page unloading) and it must never take the app down with it.
 *
 * safeInvoke gives every such call: try/catch, feature detection, a no-op
 * fallback, and optional timeout protection. It NEVER throws.
 */

export interface SafeInvokeOptions<T> {
  /** Value returned if the call is unavailable, throws, or times out. */
  fallback?: T;
  /** Human label used in the dev-only warning. */
  label?: string;
  /**
   * Feature-detection guard. If provided and it returns false (or itself
   * throws), the call is skipped and `fallback` is returned. Use this to probe
   * `typeof navigator.sendBeacon === 'function'`, bridge presence, etc.
   */
  available?: () => boolean;
}

function warn(label: string | undefined, err: unknown): void {
  // Dev-only breadcrumb. Never use console in a way that could itself throw.
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.debug(`[safeInvoke] ${label ?? 'call'} suppressed:`, err instanceof Error ? err.message : err);
    }
  } catch {
    /* never let logging-about-logging throw */
  }
}

/**
 * Run a synchronous instrumentation call defensively. Returns the call's
 * result, or `fallback` (default `undefined`) if it is unavailable or throws.
 */
export function safeInvoke<T>(fn: () => T, opts: SafeInvokeOptions<T> = {}): T | undefined {
  try {
    if (opts.available) {
      let ok = false;
      try { ok = opts.available(); } catch { ok = false; }
      if (!ok) return opts.fallback;
    }
    return fn();
  } catch (err) {
    warn(opts.label, err);
    return opts.fallback;
  }
}

/**
 * Async variant with timeout protection. A telemetry call that hangs (e.g. a
 * bridge that never resolves) resolves to `fallback` after `timeoutMs` instead
 * of stalling an unload/navigation. Always resolves, never rejects.
 */
export async function safeInvokeAsync<T>(
  fn: () => Promise<T> | T,
  opts: SafeInvokeOptions<T> & { timeoutMs?: number } = {},
): Promise<T | undefined> {
  try {
    if (opts.available) {
      let ok = false;
      try { ok = opts.available(); } catch { ok = false; }
      if (!ok) return opts.fallback;
    }
    const call = Promise.resolve().then(fn);
    if (!opts.timeoutMs || opts.timeoutMs <= 0) {
      return await call.catch((err) => { warn(opts.label, err); return opts.fallback; });
    }
    const timeout = new Promise<T | undefined>((resolve) => {
      setTimeout(() => { warn(opts.label, new Error(`timed out after ${opts.timeoutMs}ms`)); resolve(opts.fallback); }, opts.timeoutMs);
    });
    return await Promise.race([
      call.catch((err) => { warn(opts.label, err); return opts.fallback; }),
      timeout,
    ]);
  } catch (err) {
    warn(opts.label, err);
    return opts.fallback;
  }
}
