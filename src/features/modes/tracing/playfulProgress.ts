/**
 * Playful tracing progression — single source of truth for the V2 (playful)
 * tracing path, driven by ALL_TRACING_ACTIVITIES (the same content the engine
 * renders). This replaces the legacy tracingProgress for the playful path,
 * which read from tracingContent and could drift out of sync with the trimmed
 * activity set (the cause of progression stalling, e.g. "stuck on 10").
 *
 * All sections are always selectable (no locking) so a child/teacher can jump
 * straight to Warm-up, Shapes, Letters or Numbers. Advancing past the last
 * item of the last pack wraps to the first pack, so it never gets stuck.
 */

import {
    ALL_TRACING_ACTIVITIES,
    getActivitiesByPack,
    PACK_INFO,
} from './tracingActivities';
import type { TracingActivity } from './tracingStrokeModel';

const STORAGE_KEY = 'draw-in-the-air:tracing-playful:progress';
export const PACK_ORDER = [1, 2, 3, 4];

interface PlayfulProgressState {
    pack: number;
    index: number;
    completed: string[];
}

const load = (): PlayfulProgressState => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const p = JSON.parse(raw) as Partial<PlayfulProgressState>;
            return {
                pack: typeof p.pack === 'number' ? p.pack : 1,
                index: typeof p.index === 'number' ? p.index : 0,
                completed: Array.isArray(p.completed) ? p.completed : [],
            };
        }
    } catch { /* ignore */ }
    return { pack: 1, index: 0, completed: [] };
};

let state: PlayfulProgressState = load();
const completed = new Set(state.completed);

const save = (): void => {
    state.completed = [...completed];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    // Clamp index to the current pack's bounds (defends against stale storage).
    const len = getActivitiesByPack(state.pack).length;
    if (state.index >= len) state.index = Math.max(0, len - 1);
};

export const getCurrentActivity = (): TracingActivity | null => {
    const list = getActivitiesByPack(state.pack);
    if (list.length === 0) return null;
    const idx = Math.max(0, Math.min(state.index, list.length - 1));
    return list[idx] ?? null;
};

export const getCurrentPack = (): number => state.pack;
export const getCurrentIndex = (): number => state.index;

export const getPackProgress = (pack = state.pack) => {
    const list = getActivitiesByPack(pack);
    const done = list.filter((a) => completed.has(a.id)).length;
    return { pack, total: list.length, completed: done, currentIndex: pack === state.pack ? state.index : 0 };
};

export interface SectionInfo { pack: number; name: string; icon: string; total: number; completed: number; }
export const getSections = (): SectionInfo[] =>
    PACK_ORDER.map((p) => {
        const info = PACK_INFO[p];
        const list = getActivitiesByPack(p);
        return { pack: p, name: info.name, icon: info.icon, total: list.length, completed: list.filter((a) => completed.has(a.id)).length };
    });

/** Jump straight to a section (always allowed). */
export const setSection = (pack: number, index = 0): void => {
    state.pack = pack;
    state.index = index;
    save();
};

export const completeCurrent = (): void => {
    const a = getCurrentActivity();
    if (a) { completed.add(a.id); save(); }
};

/** Advance to the next activity; wraps around so it never gets stuck. */
export const advance = (): boolean => {
    const list = getActivitiesByPack(state.pack);
    if (state.index < list.length - 1) {
        state.index += 1;
    } else {
        // Next pack, or wrap to the first.
        const pos = PACK_ORDER.indexOf(state.pack);
        const nextPack = PACK_ORDER[(pos + 1) % PACK_ORDER.length];
        state.pack = nextPack;
        state.index = 0;
    }
    save();
    return true;
};

export const resetPlayfulProgress = (): void => {
    state = { pack: 1, index: 0, completed: [] };
    completed.clear();
    save();
};

export const totalActivities = (): number => ALL_TRACING_ACTIVITIES.length;
