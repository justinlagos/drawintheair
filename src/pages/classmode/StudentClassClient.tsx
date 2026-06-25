/**
 * StudentClassClient, the locked-in student experience.
 *
 * One persistent surface across the whole class. Student joins
 * once, stays in. NO buttons that let them exit, switch, or
 * progress, every transition is teacher-driven over Realtime.
 *
 * State machine:
 *   code           → enter 4-digit class code
 *   name           → enter first name
 *   classroom      → locked-in space (waiting / paused / between)
 *   playing        → renders the actual game
 *   kicked         → gentle goodbye, redirects to landing
 *   ended          → class summary, redirects to landing
 *
 * Reconnect: sessionStorage keeps session_id + student_id + name +
 * avatar_seed for 15 minutes. If the tablet sleeps and wakes, we
 * auto-rejoin without re-entering anything.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { callRpc, subscribeToTable } from '../../lib/supabase';
import { isValidCode } from '../../features/classmode/sessionCode';
import { MODE_LABELS } from '../../features/classmode/scoreMapping';
import type { GameModeId } from '../../features/classmode/scoreMapping';
import { avatarFromSeed } from '../../features/classmode/conductor/avatars';
import type { SessionRow, SessionActivityRow, StudentRow } from '../../features/classmode/conductor/types';
import { joinApi } from '../../features/classmode/conductor/joinApi';
import { JOIN_ERROR_MESSAGES } from '../../features/classmode/conductor/joinTypes';
import type { JoinErrorCode } from '../../features/classmode/conductor/joinTypes';
import type { ActivityAssignment, StudentClassState } from '../../features/classmode/conductor/joinTypes';

import { TrackingLayer } from '../../features/tracking/TrackingLayer';
import { ModeBackground } from '../../components/ModeBackground';
import { MagicCursor } from '../../components/MagicCursor';
import { drawingEngine, PenState } from '../../core/drawingEngine';
import ClassModeGameWrapper from '../../features/classmode/ClassModeGameWrapper';

// All game-mode entry components
import { BubbleCalibration } from '../../features/modes/calibration/BubbleCalibration';
import { FreePaintMode } from '../../features/modes/FreePaintMode';
// Tracing resolves through the canonical module so the classroom mounts the
// SAME experience as solo play (the divergence this fixed: the classroom used
// to hard-code the legacy PreWritingMode here). See canonicalTracing.tsx.
import { CanonicalTracingMode } from '../../features/modes/tracing/canonicalTracing';
import { getTracingFrameLogic, TRACING_ACTIVITY_ID } from '../../features/modes/tracing/tracingResolver';
import { SortAndPlaceMode } from '../../features/modes/sortAndPlace/SortAndPlaceMode';
import { WordSearchMode } from '../../features/modes/wordSearch/WordSearchMode';
import { ColourBuilderMode } from '../../features/modes/colourBuilder/ColourBuilderMode';
import { BalloonMathMode } from '../../features/modes/balloonMath/BalloonMathMode';
import { RainbowBridgeMode } from '../../features/modes/rainbowBridge/RainbowBridgeMode';
import { GestureSpellingMode } from '../../features/modes/gestureSpelling/GestureSpellingMode';

// Per-frame logic functions
import { freePaintLogic } from '../../features/modes/freePaintLogic';
import { bubbleCalibrationLogic } from '../../features/modes/calibration/bubbleCalibrationLogic';
import { sortAndPlaceLogic } from '../../features/modes/sortAndPlace/sortAndPlaceLogic';
import { wordSearchLogic } from '../../features/modes/wordSearch/wordSearchLogic';
import { colourBuilderLogic } from '../../features/modes/colourBuilder/colourBuilderLogic';
import { balloonMathLogic } from '../../features/modes/balloonMath/balloonMathLogic';
import { rainbowBridgeLogic } from '../../features/modes/rainbowBridge/rainbowBridgeLogic';
import { gestureSpellingLogic } from '../../features/modes/gestureSpelling/gestureSpellingLogic';

import './classmode.css';
import './conductor.css';

const RECONNECT_KEY = 'cd_reconnect_v2';
const RECONNECT_TTL_MS = 15 * 60 * 1000;
type ReconnectMemo = {
    sessionId: string; studentId: string; name: string; avatarSeed: string;
    activityVersion: number; assignments: ActivityAssignment[]; ts: number;
};

// Tracing ('pre-writing') is intentionally absent — it resolves via
// getTracingFrameLogic() (the canonical engine), never this static map.
const LOGIC_MAP: Partial<Record<GameModeId, unknown>> = {
    'calibration': bubbleCalibrationLogic,
    'free': freePaintLogic,
    'sort-and-place': sortAndPlaceLogic,
    'word-search': wordSearchLogic,
    'colour-builder': colourBuilderLogic,
    'balloon-math': balloonMathLogic,
    'rainbow-bridge': rainbowBridgeLogic,
    'gesture-spelling': gestureSpellingLogic,
};

type UiState =
    | { kind: 'code' }
    | { kind: 'network_error'; message: string }
    | { kind: 'name'; session: SessionRow }
    | { kind: 'classroom'; session: SessionRow; student: StudentRow; activity: SessionActivityRow | null; assignments: ActivityAssignment[]; activityVersion: number }
    | { kind: 'kicked'; reason: string | null }
    | { kind: 'ended'; sessionId: string };

/**
 * Fetch the authoritative student class state from the server.
 * Uses get_student_class_state RPC (single-call resolver).
 */
async function fetchStudentClassState(
    sessionId: string, studentId: string,
): Promise<{
    session: SessionRow | null;
    student: StudentRow | null;
    activity: SessionActivityRow | null;
    state: StudentClassState | null;
    error?: string;
}> {
    const { data: raw } = await callRpc<StudentClassState | { error: string }>(
        'get_student_class_state',
        { in_student_id: studentId, in_session_id: sessionId },
    );
    if (!raw || 'error' in (raw as Record<string, unknown>)) {
        const err = (raw as { error?: string })?.error ?? 'unknown';
        return { session: null, student: null, activity: null, state: null, error: err };
    }
    const st = raw as StudentClassState;

    const { data: session } = await callRpc<SessionRow | null>(
        'class_get_session', { in_session_id: sessionId },
    );
    const { data: student } = await callRpc<StudentRow | null>(
        'class_get_self', { in_student_id: studentId },
    );

    let activity: SessionActivityRow | null = null;
    if (st.assignedActivity) {
        const { data: act } = await callRpc<SessionActivityRow | null>(
            'class_get_activity', { in_activity_id: st.assignedActivity.sessionActivityId },
        );
        if (act) activity = act;
    }

    return { session, student, activity, state: st };
}

export default function StudentClassClient() {
    const [ui, setUi] = useState<UiState>({ kind: 'code' });
    const [error, setError] = useState<string | null>(null);

    // ── Central updater: call getStudentClassState + set classroom state ─
    const syncFromServer = useCallback(async (sessionId: string, studentId: string) => {
        try {
        const result = await fetchStudentClassState(sessionId, studentId);
        if (result.state?.error) {
            if (result.state.error === 'STUDENT_NOT_FOUND' || result.state.error === 'SESSION_NOT_FOUND') {
                sessionStorage.removeItem(RECONNECT_KEY);
                setUi({ kind: 'ended', sessionId });
            }
            return;
        }
        if (!result.session || !result.student) {
            sessionStorage.removeItem(RECONNECT_KEY);
            setUi({ kind: 'ended', sessionId });
            return;
        }
        if (result.student.kicked_at) {
            sessionStorage.removeItem(RECONNECT_KEY);
            setUi({ kind: 'kicked', reason: result.student.kicked_reason });
            return;
        }
        if (result.state!.sessionStatus === 'ended') {
            sessionStorage.removeItem(RECONNECT_KEY);
            setUi({ kind: 'ended', sessionId });
            return;
        }

        const { data: assignments } = await callRpc<ActivityAssignment[]>(
            'get_student_assignments',
            { in_student_id: studentId, in_session_id: sessionId },
        );

        setUi({
            kind: 'classroom',
            session: result.session,
            student: result.student,
            activity: result.activity,
            assignments: assignments ?? [],
            activityVersion: result.state!.activityVersion,
        });

        // Persist reconnect memo
        const memo: ReconnectMemo = {
            sessionId, studentId,
            name: result.student.name,
            avatarSeed: result.student.avatar_seed ?? '',
            activityVersion: result.state!.activityVersion,
            assignments: assignments ?? [],
            ts: Date.now(),
        };
        try { sessionStorage.setItem(RECONNECT_KEY, JSON.stringify(memo)); } catch { /* ignore */ }
        } catch (e) {
            // Transient network/Realtime failure — keep current UI; the 10s
            // heartbeat and reconnect retry. Never strand the child on a stale
            // screen, and never leave an unhandled promise rejection.
            console.warn('[StudentClassClient] syncFromServer failed (will retry)', e);
        }
    }, []);

    // ── Try to auto-rejoin from sessionStorage on mount ────────────
    useEffect(() => {
        const raw = sessionStorage.getItem(RECONNECT_KEY);
        if (!raw) return;
        try {
            const memo = JSON.parse(raw) as ReconnectMemo;
            if (Date.now() - memo.ts > RECONNECT_TTL_MS) {
                sessionStorage.removeItem(RECONNECT_KEY);
                return;
            }
            // On reconnect, use getStudentClassState with the stored IDs.
            // This is the authoritative state resolver.
            (async () => {
                await syncFromServer(memo.sessionId, memo.studentId);
            })();
        } catch {
            sessionStorage.removeItem(RECONNECT_KEY);
        }
    }, [syncFromServer]);

    // ── Subscribe once we're in the classroom ──────────────────────
    useEffect(() => {
        if (ui.kind !== 'classroom') return;
        const sessionId = ui.session.id;
        const studentId = ui.student.id;

        const unsubSession = subscribeToTable(
            `student-session-${sessionId}`,
            'sessions', 'UPDATE',
            (payload) => {
                const row = payload.new as unknown as SessionRow;
                if (row.id !== sessionId) return;
                setUi((prev) => {
                    // Check version for duplicate/stale events
                    if (prev.kind !== 'classroom') return prev;
                    const newVer = (row as { activity_version?: number }).activity_version ?? 0;
                    if (newVer <= prev.activityVersion) return prev;

                    // Trigger async refetch (outside setUi setter — can't await)
                    syncFromServer(sessionId, studentId);

                    // Optimistically update session + clear activity (will be corrected by fetch)
                    return { ...prev, session: row as SessionRow, activity: null, activityVersion: newVer };
                });
            },
            `id=eq.${sessionId}`,
        );

        const unsubMyRow = subscribeToTable(
            `student-self-${studentId}`,
            'session_students', 'UPDATE',
            (payload) => {
                const row = payload.new as unknown as StudentRow;
                if (row.id !== studentId) return;
                if (row.kicked_at) {
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi({ kind: 'kicked', reason: row.kicked_reason });
                }
            },
            `id=eq.${studentId}`,
        );

        const unsubActivity = subscribeToTable(
            `student-activity-${sessionId}`,
            'session_activities', 'UPDATE',
            (payload) => {
                const row = payload.new as unknown as SessionActivityRow;
                if (row.session_id !== sessionId) return;
                setUi((prev) => {
                    if (prev.kind !== 'classroom') return prev;
                    if (prev.activity?.id === row.id) return { ...prev, activity: row };
                    return prev;
                });
            },
            `session_id=eq.${sessionId}`,
        );

        return () => { unsubSession(); unsubMyRow(); unsubActivity(); };
    }, [ui.kind, ui.kind === 'classroom' ? ui.session.id : null, ui.kind === 'classroom' ? ui.student.id : null, syncFromServer]);

    // ── Defensive session heartbeat ────────────────────────────────
    // Uses getStudentClassState (authoritative) instead of individual
    // RPC calls. Catches Realtime gaps (mobile tab suspension, LB
    // killing idle connections, Supabase reconnect gaps).
    useEffect(() => {
        if (ui.kind !== 'classroom') return;
        const sessionId = ui.session.id;
        const studentId = ui.student.id;
        let cancelled = false;
        const check = async () => {
            if (cancelled || document.visibilityState !== 'visible') return;
            try {
                const { data: raw } = await callRpc<StudentClassState | { error: string }>(
                    'get_student_class_state',
                    { in_student_id: studentId, in_session_id: sessionId },
                );
                if (cancelled || !raw || 'error' in (raw as Record<string, unknown>)) return;
                const st = raw as StudentClassState;

                if (st.sessionStatus === 'ended' || st.kicked) {
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi(st.kicked
                        ? { kind: 'kicked', reason: st.kickedReason }
                        : { kind: 'ended', sessionId });
                    return;
                }

                setUi((prev) => {
                    if (prev.kind !== 'classroom') return prev;
                    if (st.activityVersion <= prev.activityVersion) return prev;
                    // Version changed — fetch full state
                    syncFromServer(sessionId, studentId);
                    return prev;
                });
            } catch {
                /* network blip */
            }
        };
        const id = window.setInterval(check, 10_000);
        const onVis = () => { if (document.visibilityState === 'visible') check(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            cancelled = true;
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [ui.kind, ui.kind === 'classroom' ? ui.session.id : null, ui.kind === 'classroom' ? ui.student.id : null, syncFromServer]);

    // ── Auto-redirect after kicked / ended ─────────────────────────
    useEffect(() => {
        if (ui.kind !== 'kicked' && ui.kind !== 'ended') return;
        const t = setTimeout(() => { window.location.href = '/'; }, 8000);
        return () => clearTimeout(t);
    }, [ui.kind]);

    // ── Submit handlers ────────────────────────────────────────────
    const handleCode = useCallback(async (code: string) => {
        setError(null);
        const trimmed = code.trim();
        if (!isValidCode(trimmed)) { setError('Enter a 4-digit code'); return; }

        const result = await joinApi.validateCode(trimmed);
        if (!result) {
            setError('No active class with that code');
            return;
        }
        if (!result.valid) {
            const msg = JOIN_ERROR_MESSAGES[result.code as JoinErrorCode] || 'Could not join. Check the code and try again.';
            if (result.code === 'NETWORK_MISMATCH') {
                setUi({ kind: 'network_error', message: msg });
                return;
            }
            setError(msg);
            return;
        }
        if (!result.session) {
            setError('No active class with that code');
            return;
        }
        const sessionRow: SessionRow = {
            id: result.session.id,
            teacher_id: '',
            code: result.session.code,
            activity: result.session.activity,
            class_state: result.session.class_state as SessionRow['class_state'],
            current_activity_id: result.session.current_activity_id,
            class_name: null,
            scoreboard_visible: false,
            timer_seconds: result.session.timer_seconds,
            started_at: null,
            ended_at: null,
            created_at: '',
            updated_at: null,
        };
        setUi({ kind: 'name', session: sessionRow });
    }, []);

    const handleName = useCallback(async (rawName: string) => {
        if (ui.kind !== 'name') return;
        setError(null);
        const desired = rawName.trim();
        if (!desired) { setError(JOIN_ERROR_MESSAGES.INVALID_NAME); return; }

        const { data, error: joinErr } = await joinApi.joinWithNetwork(ui.session.id, desired);
        if (joinErr || !data) {
            const code = (joinErr?.message ?? '') as JoinErrorCode;
            setError(JOIN_ERROR_MESSAGES[code] || JOIN_ERROR_MESSAGES.JOIN_FAILED);
            return;
        }
        const finalName = data.name;

        // Use authoritative getStudentClassState instead of separate RPCs
        const result = await fetchStudentClassState(ui.session.id, data.id);
        if (!result.session || !result.student) {
            // Session might have ended between join and fetch
            const session = ui.session;
            const student = data as StudentRow;
            const ass = await callRpc<ActivityAssignment[]>(
                'get_student_assignments',
                { in_student_id: data.id, in_session_id: ui.session.id },
            );
            const memo: ReconnectMemo = {
                sessionId: ui.session.id, studentId: data.id, name: finalName,
                avatarSeed: data.avatar_seed ?? '', activityVersion: 0,
                assignments: ass.data ?? [], ts: Date.now(),
            };
            try { sessionStorage.setItem(RECONNECT_KEY, JSON.stringify(memo)); } catch { /* ignore */ }
            setUi({ kind: 'classroom', session, student, activity: null, assignments: ass.data ?? [], activityVersion: 0 });
            return;
        }

        const ass = await callRpc<ActivityAssignment[]>(
            'get_student_assignments',
            { in_student_id: data.id, in_session_id: ui.session.id },
        );
        const finalAssignments = ass.data ?? [];

        const memo: ReconnectMemo = {
            sessionId: ui.session.id, studentId: data.id, name: finalName,
            avatarSeed: data.avatar_seed ?? '', activityVersion: result.state?.activityVersion ?? 0,
            assignments: finalAssignments, ts: Date.now(),
        };
        try { sessionStorage.setItem(RECONNECT_KEY, JSON.stringify(memo)); } catch { /* ignore */ }

        setUi({
            kind: 'classroom',
            session: result.session!,
            student: result.student!,
            activity: result.activity,
            assignments: finalAssignments,
            activityVersion: result.state?.activityVersion ?? 0,
        });
    }, [ui]);

    // ── Render ─────────────────────────────────────────────────────
    if (ui.kind === 'code') {
        return <CodeEntry error={error} onSubmit={handleCode} />;
    }
    if (ui.kind === 'network_error') {
        return <NetworkErrorScreen message={ui.message} onRetry={() => setUi({ kind: 'code' })} />;
    }
    if (ui.kind === 'name') {
        return <NameEntry session={ui.session} error={error} onSubmit={handleName} />;
    }
    if (ui.kind === 'kicked') {
        return <KickedScreen reason={ui.reason} />;
    }
    if (ui.kind === 'ended') {
        return <EndedScreen sessionId={ui.sessionId} />;
    }
    // Classroom, composite of waiting / playing / paused / between
    return <ClassroomShell ui={ui} />;
}

// ── Step 1: Code entry ─────────────────────────────────────────────
function CodeEntry({ error, onSubmit }: { error: string | null; onSubmit: (code: string) => void }) {
    const [digits, setDigits] = useState(['', '', '', '']);
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    const onChange = (i: number, v: string) => {
        if (!/^\d*$/.test(v)) return;
        const d = [...digits]; d[i] = v.slice(-1); setDigits(d);
        if (v && i < 3) refs.current[i + 1]?.focus();
    };
    const onKey = (i: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    };

    const ready = digits.every((d) => d.length === 1);

    return (
        <div className="cm-page">
            <div className="cm-student-page">
                <div className="cm-join-card cd-join-card">
                    <h2>Join class</h2>
                    <p style={{ color: '#94a3b8', marginBottom: 20 }}>Type the four-digit code from your teacher</p>
                    <div className="cm-code-inputs">
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                ref={(el) => { refs.current[i] = el; }}
                                className="cm-code-input"
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={d}
                                onChange={(e) => onChange(i, e.target.value)}
                                onKeyDown={(e) => onKey(i, e)}
                                autoFocus={i === 0}
                            />
                        ))}
                    </div>
                    {error && <div className="cm-error">{error}</div>}
                    <button
                        className="cm-btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => onSubmit(digits.join(''))}
                        disabled={!ready}
                    >Next</button>
                </div>
            </div>
        </div>
    );
}

// ── Step 2: Name entry ─────────────────────────────────────────────
function NameEntry({ session, error, onSubmit }: { session: SessionRow; error: string | null; onSubmit: (name: string) => void }) {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const errorAnnounce = useRef<HTMLDivElement | null>(null);
    const label = session.activity ? MODE_LABELS[session.activity as GameModeId] : null;

    const handleSubmit = useCallback(async () => {
        if (!name.trim() || submitting) return;
        setSubmitting(true);
        await new Promise(requestAnimationFrame);
        onSubmit(name);
        setSubmitting(false);
    }, [name, submitting, onSubmit]);

    useEffect(() => {
        if (error && inputRef.current) {
            inputRef.current.focus();
        }
    }, [error]);

    return (
        <div className="cm-page">
            <div className="cm-student-page">
                <div className="cm-join-card cd-join-card">
                    <h2>What's your name?</h2>
                    {label ? (
                        <p style={{ color: '#94a3b8', marginBottom: 20 }}>Joining {label.icon} {label.title}</p>
                    ) : (
                        <p style={{ color: '#94a3b8', marginBottom: 20 }}>Joining your teacher's class</p>
                    )}
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                        <input
                            ref={inputRef}
                            className="cm-name-input"
                            type="text"
                            placeholder="First name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={20}
                            autoFocus
                            aria-describedby={error ? 'name-error' : undefined}
                            aria-invalid={!!error}
                        />
                        <div
                            id="name-error"
                            ref={errorAnnounce}
                            className="cm-error"
                            role="alert"
                            aria-live="assertive"
                            aria-atomic="true"
                            style={error ? {} : { visibility: 'hidden', height: 0, overflow: 'hidden' }}
                        >
                            {error || '\u00A0'}
                        </div>
                        <button
                            className="cm-btn-primary"
                            style={{ width: '100%' }}
                            onClick={handleSubmit}
                            disabled={!name.trim() || submitting}
                            type="submit"
                        >
                            {submitting ? 'Joining…' : 'Join class'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ── Network error screen ──────────────────────────────────────────
function NetworkErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="cm-page">
            <div className="cm-student-page">
                <div className="cm-join-card cd-join-card">
                    <div className="cd-student-emoji" style={{ fontSize: '3rem', marginBottom: 12 }}>🌐</div>
                    <h2>Network issue</h2>
                    <p style={{ color: '#94a3b8', marginBottom: 20 }}>{message}</p>
                    <button
                        className="cm-btn-primary"
                        style={{ width: '100%' }}
                        onClick={onRetry}
                    >Try again</button>
                </div>
            </div>
        </div>
    );
}

// ── Locked-in classroom shell ──────────────────────────────────────
function ClassroomShell({ ui }: { ui: { kind: 'classroom'; session: SessionRow; student: StudentRow; activity: SessionActivityRow | null; assignments: ActivityAssignment[] } }) {
    const { session, student, activity, assignments } = ui;
    const avatar = avatarFromSeed(student.avatar_seed ?? `${session.id}:${student.name.toLowerCase()}`);

    // No activity loaded, or not yet in an activity → waiting room
    if (!activity || session.class_state === 'lobby' || session.class_state === 'between_activities') {
        const between = session.class_state === 'between_activities';
        return (
            <div className="cd-student-shell">
                <header className="cd-student-header">
                    <span className="cd-avatar cd-avatar-lg" style={{ background: avatar.color }}>{avatar.emoji}</span>
                    <h1 className="cd-student-name">{student.name}</h1>
                </header>
                <main className="cd-student-main">
                    <div className="cd-student-bigcard">
                        {between ? (
                            <>
                                <div className="cd-student-emoji">⭐</div>
                                <h2>Great job!</h2>
                                <p>Your teacher is picking the next activity…</p>
                            </>
                        ) : session.class_state === 'in_activity' ? (
                            <>
                                <div className="cd-student-emoji">🚀</div>
                                <h2>Your activity is starting…</h2>
                                <p>Just a moment.</p>
                            </>
                        ) : (
                            <>
                                <div className="cd-student-emoji">🎒</div>
                                <h2>You're in!</h2>
                                <p>Waiting for your teacher to start.</p>
                            </>
                        )}
                        <div className="cd-student-spinner" />
                    </div>
                </main>
            </div>
        );
    }

    // Activity paused → pause overlay over a dimmed game canvas
    if (activity.state === 'paused') {
        return (
            <div className="cd-student-shell cd-student-paused">
                <header className="cd-student-header">
                    <span className="cd-avatar cd-avatar-lg" style={{ background: avatar.color }}>{avatar.emoji}</span>
                    <h1 className="cd-student-name">{student.name}</h1>
                </header>
                <main className="cd-student-main">
                    <div className="cd-student-bigcard">
                        <div className="cd-student-emoji">⏸</div>
                        <h2>Paused</h2>
                        <p>Your teacher will continue in a moment.</p>
                    </div>
                </main>
            </div>
        );
    }

    // Activity playing → render the game
    if (activity.state === 'playing' || activity.state === 'starting') {
        return <ClassroomGame student={student} avatar={avatar} session={session} activity={activity} assignments={assignments} />;
    }

    // Activity ended (waiting for next or end-of-class)
    return (
        <div className="cd-student-shell">
            <header className="cd-student-header">
                <span className="cd-avatar cd-avatar-lg" style={{ background: avatar.color }}>{avatar.emoji}</span>
                <h1 className="cd-student-name">{student.name}</h1>
            </header>
            <main className="cd-student-main">
                <div className="cd-student-bigcard">
                    <div className="cd-student-emoji">⭐</div>
                    <h2>Great job!</h2>
                    <p>Your teacher is picking the next activity…</p>
                    <div className="cd-student-spinner" />
                </div>
            </main>
        </div>
    );
}

// ── The actual game render ─────────────────────────────────────────
function ClassroomGame({ student, avatar, session, activity, assignments }: {
    student: StudentRow;
    avatar: { emoji: string; color: string };
    session: SessionRow;
    activity: SessionActivityRow;
    assignments: ActivityAssignment[];
}) {
    // Tracing resolves through the canonical helper (same engine the canonical
    // render shell uses); all other modes use the static map.
    const activeLogic = useMemo(
        () => activity.activity === TRACING_ACTIVITY_ID ? getTracingFrameLogic() : LOGIC_MAP[activity.activity],
        [activity.activity],
    ) as never;
    const noop = useCallback(() => { /* locked-in: teacher controls */ }, []);
    const isAssigned = assignments.length === 0 ||
        assignments.some((a) => a.activity === activity.activity && a.is_enabled);
    if (!isAssigned) {
        return (
            <div className="cd-student-shell">
                <header className="cd-student-header">
                    <span className="cd-avatar cd-avatar-lg" style={{ background: avatar.color }}>{avatar.emoji}</span>
                    <h1 className="cd-student-name">{student.name}</h1>
                </header>
                <main className="cd-student-main">
                    <div className="cd-student-bigcard">
                        <div className="cd-student-emoji">🎒</div>
                        <h2>Waiting for your activity</h2>
                        <p>Your teacher will start your activity soon.</p>
                        <div className="cd-student-spinner" />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="App">
            <TrackingLayer onFrame={activeLogic}>
                {(frameRef, diagnostics) => (
                    <>
                        <ModeBackground modeId={activity.activity} />
                        <MagicCursor
                            frameRef={frameRef}
                            getPenDown={() => activity.activity === 'free' ? drawingEngine.getPenState() === PenState.DOWN : false}
                            mode={activity.activity}
                        />
                        {/* Persistent name + avatar pip, top-right so a teacher
                            walking by can spot the kid on a projector. */}
                        <div className="cd-student-pip">
                            <span className="cd-avatar" style={{ background: avatar.color }}>{avatar.emoji}</span>
                            <span>{student.name}</span>
                        </div>

                        {/* Freeze the round timer until the kid's camera is
                         *  actually running. The Phase B camera explainer can
                         *  sit on screen for 10–30 s before they tap Allow,
                         *  and during that time we shouldn't be burning round
                         *  time on them, surfaced by the 2026-05-11 test
                         *  where Balloon Math read 0:21 on the explainer.   */}
                        <ClassModeGameWrapper
                            sessionId={session.id}
                            studentId={student.id}
                            activity={activity.activity}
                            round={1}
                            timerSeconds={session.timer_seconds}
                            freeze={diagnostics.cameraStatus !== 'running'}
                            onRoundEnd={noop}
                        >
                            {activity.activity === 'calibration' && <BubbleCalibration onComplete={noop} onExit={noop} />}
                            {activity.activity === 'free' && <FreePaintMode frameRef={frameRef} onExit={noop} />}
                            {/* General Tracing assignment → category selection
                                is allowed (explicit, not inferred). A future
                                per-category assignment passes allowCategorySelection
                                {false} + initialSection. */}
                            {activity.activity === 'pre-writing' && <CanonicalTracingMode onExit={noop} allowCategorySelection />}
                            {activity.activity === 'sort-and-place' && <SortAndPlaceMode onExit={noop} />}
                            {activity.activity === 'word-search' && (
                                <WordSearchMode frameRef={frameRef} showSettings={false} onCloseSettings={noop} onExit={noop} />
                            )}
                            {activity.activity === 'colour-builder' && <ColourBuilderMode onExit={noop} />}
                            {activity.activity === 'balloon-math' && <BalloonMathMode onExit={noop} />}
                            {activity.activity === 'rainbow-bridge' && <RainbowBridgeMode onExit={noop} />}
                            {activity.activity === 'gesture-spelling' && <GestureSpellingMode onExit={noop} />}
                        </ClassModeGameWrapper>
                    </>
                )}
            </TrackingLayer>
        </div>
    );
}

// ── Kicked / Ended screens ─────────────────────────────────────────
function KickedScreen({ reason }: { reason: string | null }) {
    return (
        <div className="cd-student-shell">
            <main className="cd-student-main">
                <div className="cd-student-bigcard">
                    <div className="cd-student-emoji">👋</div>
                    <h2>Class is finished for you</h2>
                    <p>{reason ? reason : 'Your teacher has ended your session.'}</p>
                    <p style={{ color: '#94a3b8', marginTop: 16, fontSize: '0.9rem' }}>You'll be sent home in a few seconds.</p>
                </div>
            </main>
        </div>
    );
}

function EndedScreen({ sessionId }: { sessionId: string }) {
    void sessionId;
    return (
        <div className="cd-student-shell">
            <main className="cd-student-main">
                <div className="cd-student-bigcard">
                    <div className="cd-student-emoji">🎉</div>
                    <h2>Great class!</h2>
                    <p>Class is finished. Well done!</p>
                </div>
            </main>
        </div>
    );
}
