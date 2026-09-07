/**
 * WP2B.8 (DIA-030): event -> learning_attempts mapping table.
 *
 * These tests pin the table so a change to any mode's event shape shows
 * up here before it silently starves learning_attempts again.
 */
import { describe, it, expect } from 'vitest';
import {
    ATTEMPT_EVENT_MAP,
    ATTEMPT_META_ALLOWLIST,
    KNOWN_GAME_MODES,
    mapEventToAttempt,
    sanitiseAttemptMeta,
} from '../src/lib/attemptMirror';

describe('attempt mapping table coverage', () => {
    it('lists every mode the menu can launch, explicitly', () => {
        for (const mode of KNOWN_GAME_MODES) {
            expect(ATTEMPT_EVENT_MAP[mode], `mode ${mode} missing from table`).toBeDefined();
        }
    });

    it('modes that emit item_dropped with the full shape do not map their win events (no double count)', () => {
        for (const mode of ['sort-and-place', 'colour-builder', 'balloon-math', 'rainbow-bridge', 'gesture-spelling']) {
            expect(Object.keys(ATTEMPT_EVENT_MAP[mode])).toEqual([]);
        }
        expect(mapEventToAttempt('balloonmath_balloon_popped', { game_mode: 'balloon-math', stage_id: 'x', meta: { isCorrect: true } })).toBeNull();
        expect(mapEventToAttempt('rainbowbridge_match_made', { game_mode: 'rainbow-bridge', stage_id: 'level-1', meta: { colour: 'red', step: 1 } })).toBeNull();
        expect(mapEventToAttempt('spellingstars_word_complete', { game_mode: 'gesture-spelling', stage_id: 'CAT', meta: { word: 'CAT' } })).toBeNull();
    });

    it('open-ended modes never produce attempts', () => {
        expect(mapEventToAttempt('paint_creation_finished', { game_mode: 'free', meta: { stroke_count: 3, colour_count: 2 } })).toBeNull();
        expect(mapEventToAttempt('paint_challenge_completed', { game_mode: 'free', meta: { active_seconds: 10 } })).toBeNull();
        expect(mapEventToAttempt('mode_completed', { game_mode: 'tutorial' })).toBeNull();
    });

    it('unknown mode or event maps to nothing and never throws', () => {
        expect(mapEventToAttempt('tracing_letter_completed', {})).toBeNull();
        expect(mapEventToAttempt('nonsense_event', { game_mode: 'pre-writing', stage_id: 'A' })).toBeNull();
        expect(mapEventToAttempt('tracing_letter_completed', { game_mode: 'not-a-mode', stage_id: 'A' })).toBeNull();
    });
});

describe('tracing (pre-writing, playful engine)', () => {
    const playful = { game_mode: 'pre-writing', stage_id: 'A', meta: { tracing_engine: 'playful_v1', strokes: 3 } };

    it('completed activity becomes a correct content attempt keyed by stage_id', () => {
        const r = mapEventToAttempt('tracing_letter_completed', playful);
        expect(r).not.toBeNull();
        expect(r!.item_key).toBe('A');
        expect(r!.was_correct).toBe(true);
        expect(r!.item_kind).toBe('content');
        expect(r!.stage_id).toBe('A');
        expect(r!.meta).toEqual({ tracing_engine: 'playful_v1', strokes: 3 });
    });

    it('legacy engine completion (no tracing_engine key) is not mapped, because it mirrors via item_dropped', () => {
        const legacy = { game_mode: 'pre-writing', stage_id: 'A', meta: { letter: 'A', accuracy_pct: 91 } };
        expect(mapEventToAttempt('tracing_letter_completed', legacy)).toBeNull();
    });

    it('requires a stage_id', () => {
        expect(mapEventToAttempt('tracing_letter_completed', { game_mode: 'pre-writing', meta: { tracing_engine: 'playful_v1' } })).toBeNull();
    });

    it('stroke, off-path and recovered events are not attempts', () => {
        for (const ev of ['tracing_stroke_completed', 'tracing_off_path', 'tracing_recovered', 'tracing_activity_loaded']) {
            expect(mapEventToAttempt(ev, playful)).toBeNull();
        }
    });
});

describe('bubble pop (calibration)', () => {
    it('each round complete is a correct attempt on the level', () => {
        const r = mapEventToAttempt('bubblepop_round_complete', {
            game_mode: 'calibration', stage_id: 'level-2', meta: { score: 4, target: 8 },
        });
        expect(r).toEqual(expect.objectContaining({
            item_key: 'level-2', was_correct: true, item_kind: 'content', stage_id: 'level-2',
        }));
        expect(r!.meta).toEqual({ score: 4, target: 8 });
    });

    it('stage_completed is not a per-item attempt', () => {
        expect(mapEventToAttempt('stage_completed', { game_mode: 'calibration', stage_id: 'level-2', meta: { hits: 8, misses: 2 } })).toBeNull();
    });
});

describe('word search', () => {
    it('incorrect drag without a target word becomes a technical row keyed by chapter', () => {
        const r = mapEventToAttempt('item_dropped', {
            game_mode: 'word-search', stage_id: '3',
            meta: { isCorrect: false, itemInstanceId: 't1,t2', path_length: 2, action_duration_ms: 812, actual_word: null, expected_word: null },
        });
        expect(r).toEqual(expect.objectContaining({
            item_key: 'stage_3', was_correct: false, item_kind: 'technical', ms_to_attempt: 812,
        }));
        // free-form selection path never travels
        expect(r!.meta).toEqual({ path_length: 2, action_duration_ms: 812 });
    });

    it('correct drag (has itemKey) is left to the item_dropped mirror', () => {
        expect(mapEventToAttempt('item_dropped', {
            game_mode: 'word-search', stage_id: '3', meta: { isCorrect: true, itemKey: 'CAT' },
        })).toBeNull();
    });

    it('wordsearch_word_found is not mapped (item_dropped already carries the correct attempt)', () => {
        expect(mapEventToAttempt('wordsearch_word_found', { game_mode: 'word-search', stage_id: '3', meta: { word: 'CAT', chapter: 3 } })).toBeNull();
    });
});

describe('building', () => {
    it('successful snap is a correct attempt on the piece', () => {
        const r = mapEventToAttempt('successful_snap', {
            game_mode: 'building', stage_id: 'house',
            meta: { piece_id: 'roof', target_zone_id: 'top', time_since_grab_ms: 1500.4, was_first_attempt: true },
        });
        expect(r).toEqual(expect.objectContaining({
            item_key: 'roof', was_correct: true, item_kind: 'content', ms_to_attempt: 1500,
            expected_value: 'top', actual_value: 'top',
        }));
    });

    it('wrong piece attempt is an incorrect attempt on the piece', () => {
        const r = mapEventToAttempt('wrong_piece_attempt', {
            game_mode: 'building', stage_id: 'house',
            meta: { piece_id: 'roof', attempted_zone_id: 'base', attempted_zone_role: 'floor' },
        });
        expect(r).toEqual(expect.objectContaining({
            item_key: 'roof', was_correct: false, item_kind: 'content', actual_value: 'base', expected_value: null,
        }));
    });

    it('needs a piece_id', () => {
        expect(mapEventToAttempt('successful_snap', { game_mode: 'building', stage_id: 'house', meta: {} })).toBeNull();
    });
});

describe('privacy: meta allow-list', () => {
    it('drops non allow-listed keys, nested objects and arrays', () => {
        const out = sanitiseAttemptMeta({
            score: 3,
            word: 'SECRET',
            child_name: 'someone',
            gesture_quality: { path_accuracy_pct: 90 },
            path: [1, 2, 3],
            fn: () => 1,
            is_letter: true,
            stage_index: 2,
        });
        expect(out).toEqual({ score: 3, is_letter: true, stage_index: 2 });
    });

    it('caps string values', () => {
        const out = sanitiseAttemptMeta({ template_id: 'x'.repeat(500) });
        expect((out.template_id as string).length).toBe(64);
    });

    it('drops non-finite numbers', () => {
        expect(sanitiseAttemptMeta({ score: Number.NaN, target: Number.POSITIVE_INFINITY })).toEqual({});
    });

    it('the allow-list never contains free-text keys', () => {
        for (const bad of ['word', 'letter', 'name', 'child_name', 'email', 'note', 'text', 'gesture_quality']) {
            expect(ATTEMPT_META_ALLOWLIST.has(bad), `${bad} must not be allow-listed`).toBe(false);
        }
    });
});

describe('technical keys agree with the database helper', () => {
    it('technical rows always start with stage_, mode_ or session_', () => {
        const r = mapEventToAttempt('item_dropped', { game_mode: 'word-search', stage_id: '1', meta: { isCorrect: false } });
        expect(r!.item_key).toMatch(/^(mode|stage|session)_/);
    });

    it('every spec in the table has a note and a valid item kind', () => {
        for (const [mode, byEvent] of Object.entries(ATTEMPT_EVENT_MAP)) {
            for (const [ev, spec] of Object.entries(byEvent)) {
                expect(spec.note.length, `${mode}/${ev} note`).toBeGreaterThan(10);
                expect(['content', 'technical']).toContain(spec.itemKind);
            }
        }
    });
});

// ── End to end through logEvent (same queue and RPC path as item_dropped) ──
import { logEvent, endAttempt, peekLearningQueueForTests } from '../src/lib/analytics';

describe('logEvent writes learning_attempts rows for anonymous / school sessions', () => {
    it('playful tracing completion queues one content row with no child bound', () => {
        endAttempt();
        const before = peekLearningQueueForTests().length;
        logEvent('mode_started', { game_mode: 'pre-writing', stage_id: 'B' });
        logEvent('tracing_letter_completed', {
            game_mode: 'pre-writing', stage_id: 'B', meta: { tracing_engine: 'playful_v1', strokes: 2 },
        });
        const rows = peekLearningQueueForTests().slice(before);
        expect(rows).toHaveLength(1);
        const row = rows[0];
        expect(row.game_mode).toBe('pre-writing');
        expect(row.item_key).toBe('B');
        expect(row.was_correct).toBe(true);
        expect(row.child_profile_id).toBeNull();
        const meta = row.meta as Record<string, unknown>;
        expect(meta._mirror_source).toBe('tracing_letter_completed');
        expect(meta._item_kind).toBe('content');
        expect(typeof meta.attempt_id).toBe('string');
        expect(typeof row.event_uid).toBe('string');
        logEvent('mode_completed', { game_mode: 'pre-writing', stage_id: 'B' });
    });

    it('bubble pop round queues one content row keyed by level', () => {
        const before = peekLearningQueueForTests().length;
        logEvent('bubblepop_round_complete', { game_mode: 'calibration', stage_id: 'level-1', meta: { score: 1, target: 5 } });
        const rows = peekLearningQueueForTests().slice(before);
        expect(rows).toHaveLength(1);
        expect(rows[0].item_key).toBe('level-1');
        expect(rows[0].was_correct).toBe(true);
    });

    it('a mode that already mirrors via item_dropped is not double counted by its win event', () => {
        const before = peekLearningQueueForTests().length;
        logEvent('item_dropped', {
            game_mode: 'balloon-math', stage_id: 'sums',
            meta: { itemKey: '7', isCorrect: true, expected_value: '7', actual_value: '7', action_duration_ms: 400 },
        });
        logEvent('balloonmath_balloon_popped', { game_mode: 'balloon-math', stage_id: 'sums', meta: { number: 7, target: 7, isCorrect: true } });
        const rows = peekLearningQueueForTests().slice(before);
        expect(rows).toHaveLength(1);
        expect(rows[0].item_key).toBe('7');
    });

    it('free paint and mode_completed queue nothing for an anonymous session', () => {
        const before = peekLearningQueueForTests().length;
        logEvent('paint_creation_finished', { game_mode: 'free', meta: { stroke_count: 5, colour_count: 2 } });
        logEvent('mode_completed', { game_mode: 'free' });
        expect(peekLearningQueueForTests().length).toBe(before);
    });
});
