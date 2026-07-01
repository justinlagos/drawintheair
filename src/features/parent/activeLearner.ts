/**
 * activeLearner — the single source of truth for "which learner is playing".
 *
 * Progress is attributed to the selected learner, so a stale or invisible
 * selection means one child's work can be logged against another. Previously
 * the selection was written straight to sessionStorage and, once set, silently
 * reused for the whole tab with no visible reconfirmation. This module:
 *   • centralises get/set/clear of the selection,
 *   • stamps each /play selection with a timestamp so it can expire after a
 *     period of inactivity (forcing a fresh, visible confirmation),
 *   • provides pub/sub so the picker and the "Playing as X" chip stay in sync.
 *
 * Backwards-compatible: the storage KEY is unchanged, and a selection with no
 * timestamp (e.g. one set by the dashboard's ParentContext) is treated as
 * valid and never auto-expires.
 */

export const SELECTED_CHILD_KEY = 'dita-selected-child';
const SELECTED_TS_KEY = 'dita-selected-child-ts';

/** How long a /play selection stays valid without activity. */
export const SELECTION_INACTIVITY_MS = 45 * 60 * 1000; // 45 minutes

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getSelectedChildId(): string | null {
  try { return sessionStorage.getItem(SELECTED_CHILD_KEY); } catch { return null; }
}

function getSelectedTs(): number {
  try {
    const raw = sessionStorage.getItem(SELECTED_TS_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

/**
 * Pure expiry rule (exported for tests). A selection is expired only when it
 * carries a timestamp (ts > 0) and that timestamp is older than the window.
 * A missing timestamp means "never auto-expire".
 */
export function isSelectionExpired(ts: number, now: number, windowMs = SELECTION_INACTIVITY_MS): boolean {
  return ts > 0 && now - ts > windowMs;
}

/** True when there is a selected learner that has not gone stale. */
export function hasValidSelection(now: number = Date.now()): boolean {
  if (!getSelectedChildId()) return false;
  return !isSelectionExpired(getSelectedTs(), now);
}

/** Set the active learner and stamp it (starts the inactivity clock). */
export function setSelectedChild(id: string): void {
  try {
    sessionStorage.setItem(SELECTED_CHILD_KEY, id);
    sessionStorage.setItem(SELECTED_TS_KEY, String(Date.now()));
  } catch { /* noop */ }
  emit();
}

/** Clear the active learner (used by "Switch learner"). */
export function clearSelectedChild(): void {
  try {
    sessionStorage.removeItem(SELECTED_CHILD_KEY);
    sessionStorage.removeItem(SELECTED_TS_KEY);
  } catch { /* noop */ }
  emit();
}

/** Refresh the inactivity clock while the learner is actively playing. */
export function touchSelection(): void {
  if (!getSelectedChildId()) return;
  try { sessionStorage.setItem(SELECTED_TS_KEY, String(Date.now())); } catch { /* noop */ }
}
