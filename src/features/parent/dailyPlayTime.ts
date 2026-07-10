/**
 * dailyPlayTime — per-(learner, local calendar day) active-play accumulator.
 *
 * Used to enforce the parent "daily play limit" control. The data model has no
 * per-day duration server-side (learning_attempts has no duration column;
 * child_activity_summary is a lifetime rollup), so today's active time is
 * accumulated on the device while an activity is running.
 *
 * Storage: a single localStorage entry per learner, holding { day, seconds }.
 * We reset when the local calendar day rolls over. Values are device-local by
 * design; this is honest ("time played on this device today") and needs no
 * server change. A cross-device limit is a future server-duration feature.
 */

const KEY_PREFIX = 'dita-play-secs:';

/** Local calendar-day key (YYYY-MM-DD) in the device's timezone. Pure. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface Entry {
  day: string;
  seconds: number;
}

function read(childId: string): Entry {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + childId);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Entry>;
      if (parsed && typeof parsed.seconds === 'number' && typeof parsed.day === 'string') {
        return { day: parsed.day, seconds: parsed.seconds };
      }
    }
  } catch { /* noop */ }
  return { day: localDateKey(), seconds: 0 };
}

function write(childId: string, entry: Entry): void {
  try {
    localStorage.setItem(KEY_PREFIX + childId, JSON.stringify(entry));
  } catch { /* noop */ }
}

/** Active seconds already used today for this learner (0 after a day rollover). */
export function getTodaySeconds(childId: string): number {
  if (!childId) return 0;
  const today = localDateKey();
  const entry = read(childId);
  return entry.day === today ? entry.seconds : 0;
}

/**
 * Add `delta` active seconds for this learner today and return the new total.
 * Resets automatically when the calendar day has rolled over.
 */
export function addTodaySeconds(childId: string, delta: number): number {
  if (!childId || !Number.isFinite(delta) || delta <= 0) return getTodaySeconds(childId);
  const today = localDateKey();
  const entry = read(childId);
  const base = entry.day === today ? entry.seconds : 0;
  const next: Entry = { day: today, seconds: base + delta };
  write(childId, next);
  return next.seconds;
}
