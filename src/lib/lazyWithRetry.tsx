import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * React.lazy with automatic retry + a per-attempt hard timeout.
 *
 * Why this exists (the Nigeria failure mode):
 *   On flaky / high-latency mobile networks a single dynamic chunk fetch
 *   frequently fails or stalls transiently. The stock React.lazy then
 *   throws and the user is dumped into the error fallback even though an
 *   immediate retry would have succeeded. This wrapper:
 *     1. Retries the import a few times with exponential backoff.
 *     2. Races each attempt against a timeout so a stalled request can't
 *        hang the Suspense boundary forever.
 *     3. As a last resort, forces ONE full reload (guarded against loops
 *        via sessionStorage), this also fixes the classic post-deploy
 *        "old hashed chunk no longer exists" error for returning users.
 *
 * Drop-in replacement for React.lazy: same signature, same return type.
 */
const RELOAD_KEY = 'dia:chunk-reload';

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  opts: { retries?: number; timeoutMs?: number } = {},
): LazyExoticComponent<T> {
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 15000;

  const load = (): Promise<{ default: T }> => {
    let attempt = 0;

    const tryOnce = (): Promise<{ default: T }> => {
      attempt += 1;

      const withTimeout = new Promise<{ default: T }>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('chunk load timeout')),
          timeoutMs,
        );
        factory().then(
          (mod) => {
            clearTimeout(timer);
            // Loaded cleanly, clear any prior reload guard for this session.
            try {
              sessionStorage.removeItem(RELOAD_KEY);
            } catch {
              /* ignore */
            }
            resolve(mod);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
        );
      });

      return withTimeout.catch((err) => {
        if (attempt <= retries) {
          const backoff = Math.min(1000 * 2 ** (attempt - 1), 6000);
          return new Promise<{ default: T }>((res) =>
            setTimeout(res, backoff),
          ).then(tryOnce);
        }
        // Every retry failed. A stale-deploy chunk mismatch is fixed by
        // reloading index.html once. Guard against reload loops.
        try {
          if (!sessionStorage.getItem(RELOAD_KEY)) {
            sessionStorage.setItem(RELOAD_KEY, '1');
            window.location.reload();
          }
        } catch {
          /* ignore */
        }
        throw err;
      });
    };

    return tryOnce();
  };

  return lazy(load);
}
