/**
 * attemptMirror.ts: event -> learning_attempts mapping table (WP2B.8, DIA-030).
 *
 * Why this exists
 * ---------------
 * learning_attempts was written from exactly one event, `item_dropped`.
 * The activities that actually run on the deployed client (playful
 * tracing, bubble pop) never emit it, and the older "win event" mirror
 * in analytics.ts only fires when a parent has selected a child. School
 * and anonymous play therefore produced no attempt rows at all after
 * 10 July 2026.
 *
 * This module is a pure, unit-tested table: for each (game_mode, event)
 * pair that represents an attempt on an item it says where the item key
 * comes from, whether the attempt was correct, and which meta fields may
 * travel with the row. analytics.ts consults it inside logEvent and
 * writes the row through the existing learning queue and
 * `ingest_learning_attempts` RPC. No new write path, no schema change.
 *
 * Rules
 * -----
 * - One row per attempt. Modes that already emit `item_dropped` with the
 *   full shape are NOT listed here for their derived "win" events, so
 *   nothing is double counted.
 * - Privacy: only allow-listed scalar meta keys are copied. No free text.
 * - Rows with `_item_kind: 'technical'` are engagement evidence and must
 *   never feed mastery (the database helper lios_is_technical_item_key
 *   also treats keys starting with stage_/mode_/session_ as technical).
 */

export type ItemKind = 'content' | 'technical';

/** Where the item key for an attempt comes from. */
export type ItemKeySource =
    | { kind: 'stage_id' }
    | { kind: 'meta'; key: string }
    | { kind: 'meta_or_stage'; key: string };

/** Where the correctness of an attempt comes from. */
export type CorrectSource =
    | { kind: 'always'; value: boolean }
    | { kind: 'meta'; key: string };

export interface AttemptEventSpec {
    itemKey: ItemKeySource;
    correct: CorrectSource;
    itemKind: ItemKind;
    /** Meta keys, in priority order, that give ms_to_attempt. */
    msKeys?: string[];
    /** Meta keys copied into expected_value / actual_value. */
    expectedKey?: string;
    actualKey?: string;
    /** Only mirror when this predicate holds (used to avoid double
     *  counting where a legacy engine mirrors through item_dropped). */
    when?: (meta: Record<string, unknown>) => boolean;
    /** Plain-English reason kept next to the rule for reviewers. */
    note: string;
}

export interface MinimalEventOptions {
    game_mode?: string;
    stage_id?: string;
    meta?: Record<string, unknown>;
}

export interface MappedAttempt {
    item_key: string;
    was_correct: boolean;
    item_kind: ItemKind;
    stage_id: string | null;
    stage_index: number | null;
    ms_to_attempt: number | null;
    expected_value: string | null;
    actual_value: string | null;
    /** Sanitised meta (allow-listed scalars only). */
    meta: Record<string, unknown>;
}

/** Meta keys that may be copied onto a learning_attempts row. Scalars
 *  only. Nothing here is free text typed by a person. */
export const ATTEMPT_META_ALLOWLIST: ReadonlySet<string> = new Set([
    'stage_index',
    'tracing_engine',
    'type',
    'strokes',
    'stroke',
    'accuracy_pct',
    'score',
    'target',
    'hits',
    'misses',
    'step',
    'position',
    'chapter',
    'path_length',
    'time_to_complete_ms',
    'time_to_first_correct_ms',
    'time_to_all_correct_ms',
    'action_duration_ms',
    'time_since_grab_ms',
    'was_first_attempt',
    'is_letter',
    'piece_id',
    'target_zone_id',
    'attempted_zone_id',
    'attempted_zone_role',
    'world',
    'build_type',
    'template_id',
    'class_code',
    'environment',
    'traffic_type',
    'attempt_id',
]);

const MAX_META_STRING = 64;

/**
 * Copy only allow-listed scalar keys. Strings are capped so a stray long
 * value cannot smuggle text into the table.
 */
export function sanitiseAttemptMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!meta) return out;
    for (const [k, v] of Object.entries(meta)) {
        if (!ATTEMPT_META_ALLOWLIST.has(k)) continue;
        if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
        else if (typeof v === 'boolean') out[k] = v;
        else if (typeof v === 'string') out[k] = v.length > MAX_META_STRING ? v.slice(0, MAX_META_STRING) : v;
        else if (v === null) out[k] = null;
        // objects, arrays, functions: dropped
    }
    return out;
}

const playfulOnly = (m: Record<string, unknown>): boolean =>
    typeof m.tracing_engine === 'string';

/**
 * The table. Keyed by game_mode, then event name.
 *
 * Modes whose attempts already arrive through `item_dropped` (sort-and-place,
 * colour-builder, balloon-math, rainbow-bridge, gesture-spelling, word-search
 * correct drops) are deliberately absent for their derived win events.
 * The existing item_dropped mirror in analytics.ts stays the writer there.
 */
export const ATTEMPT_EVENT_MAP: Readonly<Record<string, Readonly<Record<string, AttemptEventSpec>>>> = {
    // Tracing (playful engine, deployed). One completed letter or shape
    // is one correct attempt on that activity. stage_id carries the
    // activity id. The legacy engine (flag off) also emits item_dropped
    // for the same completion and carries no tracing_engine key, so it is
    // excluded here to avoid a second row.
    'pre-writing': {
        tracing_letter_completed: {
            itemKey: { kind: 'stage_id' },
            correct: { kind: 'always', value: true },
            itemKind: 'content',
            msKeys: ['time_to_complete_ms', 'action_duration_ms'],
            when: playfulOnly,
            note: 'Playful tracing: completed activity = correct attempt on stage_id.',
        },
    },

    // Bubble pop (menu name "Bubbles", game_mode 'calibration'). Each
    // round complete is one bubble hit on the current level. Misses are
    // not emitted per item; stage_completed carries hit and miss totals.
    calibration: {
        bubblepop_round_complete: {
            itemKey: { kind: 'stage_id' },
            correct: { kind: 'always', value: true },
            itemKind: 'content',
            note: 'Bubble hit on level-N = correct attempt. No per-miss event exists.',
        },
    },

    // Word search: a correct drag carries itemKey (the word) and is
    // mirrored by the item_dropped path. An incorrect drag has no target
    // word, so it is recorded against the chapter as engagement evidence
    // (technical, never feeds mastery).
    'word-search': {
        item_dropped: {
            itemKey: { kind: 'stage_id' },
            correct: { kind: 'meta', key: 'isCorrect' },
            itemKind: 'technical',
            msKeys: ['action_duration_ms'],
            when: (m) => typeof m.itemKey !== 'string' && typeof m.isCorrect === 'boolean',
            note: 'Incorrect word-search drag (no itemKey): technical row keyed stage_<chapter>.',
        },
    },

    // Building (Build It): snaps and wrong placements are per-piece
    // attempts. build_object_completed stays a win event for the parent
    // dashboard path and is not an item attempt.
    building: {
        successful_snap: {
            itemKey: { kind: 'meta', key: 'piece_id' },
            correct: { kind: 'always', value: true },
            itemKind: 'content',
            msKeys: ['time_since_grab_ms'],
            expectedKey: 'target_zone_id',
            actualKey: 'target_zone_id',
            note: 'Piece snapped to its zone = correct attempt on piece_id.',
        },
        wrong_piece_attempt: {
            itemKey: { kind: 'meta', key: 'piece_id' },
            correct: { kind: 'always', value: false },
            itemKind: 'content',
            actualKey: 'attempted_zone_id',
            note: 'Piece placed in the wrong zone = incorrect attempt on piece_id.',
        },
    },

    // Modes below emit item_dropped with itemKey + isCorrect for every
    // attempt. The item_dropped mirror in analytics.ts is the writer, so
    // their derived events map to nothing. Listed for completeness and so
    // the unit test can assert the table covers every mode explicitly.
    'sort-and-place': {},
    'colour-builder': {},
    'balloon-math': {},
    'rainbow-bridge': {},
    'gesture-spelling': {},

    // Open-ended creativity: no item, no correctness, no attempt row.
    free: {},
    tutorial: {},
};

/** Modes the menu can launch. Kept here so the test can prove coverage. */
export const KNOWN_GAME_MODES: readonly string[] = [
    'calibration', 'free', 'pre-writing', 'sort-and-place', 'word-search',
    'colour-builder', 'balloon-math', 'rainbow-bridge', 'gesture-spelling',
    'building', 'tutorial',
];

function readString(meta: Record<string, unknown>, key: string | undefined): string | null {
    if (!key) return null;
    const v = meta[key];
    if (typeof v === 'string') return v.length > MAX_META_STRING ? v.slice(0, MAX_META_STRING) : v;
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    return null;
}

function readMs(meta: Record<string, unknown>, keys: string[] | undefined): number | null {
    if (!keys) return null;
    for (const k of keys) {
        const v = meta[k];
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.round(v);
    }
    return null;
}

function resolveItemKey(src: ItemKeySource, opts: MinimalEventOptions, meta: Record<string, unknown>): string | null {
    const fromMeta = (key: string): string | null => {
        const v = meta[key];
        if (typeof v === 'string' && v.length > 0) return v;
        if (typeof v === 'number' && Number.isFinite(v)) return String(v);
        return null;
    };
    switch (src.kind) {
        case 'stage_id':
            return opts.stage_id && opts.stage_id.length > 0 ? opts.stage_id : null;
        case 'meta':
            return fromMeta(src.key);
        case 'meta_or_stage':
            return fromMeta(src.key) ?? (opts.stage_id && opts.stage_id.length > 0 ? opts.stage_id : null);
    }
}

function resolveCorrect(src: CorrectSource, meta: Record<string, unknown>): boolean | null {
    if (src.kind === 'always') return src.value;
    const v = meta[src.key];
    return typeof v === 'boolean' ? v : null;
}

/**
 * Pure mapping: returns the attempt fields for an event, or null when the
 * event is not an attempt for that mode (or the required data is missing).
 * Never throws.
 */
export function mapEventToAttempt(eventName: string, opts: MinimalEventOptions): MappedAttempt | null {
    if (!opts.game_mode) return null;
    const spec = ATTEMPT_EVENT_MAP[opts.game_mode]?.[eventName];
    if (!spec) return null;
    const meta = opts.meta ?? {};
    if (spec.when && !spec.when(meta)) return null;

    const rawKey = resolveItemKey(spec.itemKey, opts, meta);
    if (rawKey === null) return null;
    const correct = resolveCorrect(spec.correct, meta);
    if (correct === null) return null;

    // Technical rows are keyed with a stage_ prefix so the database helper
    // lios_is_technical_item_key() agrees with _item_kind without a join.
    const itemKey = spec.itemKind === 'technical' && !/^(mode|stage|session)_/.test(rawKey)
        ? `stage_${rawKey}`
        : rawKey;

    const stageIndexRaw = meta.stage_index;
    return {
        item_key: itemKey.slice(0, 128),
        was_correct: correct,
        item_kind: spec.itemKind,
        stage_id: opts.stage_id ?? null,
        stage_index: typeof stageIndexRaw === 'number' && Number.isFinite(stageIndexRaw) ? stageIndexRaw : null,
        ms_to_attempt: readMs(meta, spec.msKeys),
        expected_value: readString(meta, spec.expectedKey),
        actual_value: readString(meta, spec.actualKey),
        meta: sanitiseAttemptMeta(meta),
    };
}
