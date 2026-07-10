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
 *   classroom      → locked-in space (waiting / playing / paused / between)
 *   kicked         → gentle goodbye (static, no redirect)
 *   ended          → class summary (static, no redirect)
 *
 * Reconnect: sessionStorage keeps session_id + student_id + name +
 * avatar_seed for 15 minutes. If the tablet sleeps and wakes, we
 * auto-rejoin without re-entering anything.
 *
 * Sync model (P0 incident 2026-07-09):
 *   - Realtime postgres_changes is the FAST path only.
 *   - A 5s reconciliation poll is the RELIABLE path. It applies
 *     everything it fetches — session state, activity state
 *     (including pause/resume where the activity id does not change),
 *     kicks and class end — so a dropped websocket event can never
 *     strand this screen for more than one poll tick.
 *   - The same check runs on visibilitychange and realtime reconnect.
 *   - While visible, each tick also sends a presence heartbeat so the
 *     teacher roster reflects reality.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { callRpc, subscribeToTable, onRealtimeReconnect } from '../../lib/supabase';
import { analytics } from '../../lib/analytics';
import { isValidCode, sanitizeCodeInput } from '../../features/classmode/sessionCode';
import { classroomStateChanged } from '../../features/classmode/reconcile';
import { MODE_LABELS } from '../../features/classmode/scoreMapping';
import type { GameModeId } from '../../features/classmode/scoreMapping';
import { avatarFromSeed } from '../../features/classmode/conductor/avatars';
import type { SessionRow, SessionActivityRow, StudentRow } from '../../features/classmode/conductor/types';

import { TrackingLayer } from '../../features/tracking/TrackingLayer';
import { ModeBackground } from '../../components/ModeBackground';
import { MagicCursor } from '../../components/MagicCursor';
import { drawingEngine, PenState } from '../../core/drawingEngine';
import ClassModeGameWrapper from '../../features/classmode/ClassModeGameWrapper';

// All game-mode entry components
import { BubbleCalibration } from '../../features/modes/calibration/BubbleCalibration';
import { FreePaintMode } from '../../features/modes/FreePaintMode';
import { PreWritingMode } from '../../features/modes/PreWritingMode';
import { TracingModePlayful } from '../../features/modes/tracing/TracingModePlayful';
import { SortAndPlaceMode } from '../../features/modes/sortAndPlace/SortAndPlaceMode';
import { WordSearchMode } from '../../features/modes/wordSearch/WordSearchMode';
import { ColourBuilderMode } from '../../features/modes/colourBuilder/ColourBuilderMode';
import { BalloonMathMode } from '../../features/modes/balloonMath/BalloonMathMode';
import { RainbowBridgeMode } from '../../features/modes/rainbowBridge/RainbowBridgeMode';
import { GestureSpellingMode } from '../../features/modes/gestureSpelling/GestureSpellingMode';

// Per-frame logic functions
import { freePaintLogic } from '../../features/modes/freePaintLogic';
import { preWritingLogic } from '../../features/modes/preWriting/preWritingLogic';
import { playfulTracingFrame, resetPlayfulClassScore } from '../../features/modes/tracing/tracingPlayfulFrame';
import { bubbleCalibrationLogic } from '../../features/modes/calibration/bubbleCalibrationLogic';
import { sortAndPlaceLogic } from '../../features/modes/sortAndPlace/sortAndPlaceLogic';
import { wordSearchLogic } from '../../features/modes/wordSearch/wordSearchLogic';
import { colourBuilderLogic } from '../../features/modes/colourBuilder/colourBuilderLogic';
import { balloonMathLogic } from '../../features/modes/balloonMath/balloonMathLogic';
import { rainbowBridgeLogic } from '../../features/modes/rainbowBridge/rainbowBridgeLogic';
import { gestureSpellingLogic } from '../../features/modes/gestureSpelling/gestureSpellingLogic';

import './classmode.css';
import './conductor.css';

const RECONNECT_KEY = 'cd_reconnect_v1';
const RECONNECT_TTL_MS = 15 * 60 * 1000;
type ReconnectMemo = { sessionId: string; studentId: string; name: string; avatarSeed: string; ts: number };

/** Frame no-op used while the teacher has paused the activity: the game
 *  stays mounted (camera keeps running, timer state survives) but no
 *  gameplay logic executes, so nothing can be scored behind the overlay. */
const pausedFrameLogic = () => { /* teacher paused — game frozen */ };

const LOGIC_MAP: Record<GameModeId, unknown> = {
    'calibration': bubbleCalibrationLogic,
    'free': freePaintLogic,
    // 'pre-writing' is resolved dynamically in ClassroomGame: Class Mode
    // ALWAYS uses the playful tracing experience (2026-07-10 decision) and
    // never reads the device-persisted tracingPlayfulUiV1 flag — a single
    // engine-init failure used to poison that flag OFF forever, silently
    // downgrading a school device to the legacy tracing UI.
    'pre-writing': preWritingLogic,
    'sort-and-place': sortAndPlaceLogic,
    'word-search': wordSearchLogic,
    'colour-builder': colourBuilderLogic,
    'balloon-math': balloonMathLogic,
    'rainbow-bridge': rainbowBridgeLogic,
    'gesture-spelling': gestureSpellingLogic,
};

type UiState =
    | { kind: 'code' }
    | { kind: 'name'; session: SessionRow }
    | { kind: 'classroom'; session: SessionRow; student: StudentRow; activity: SessionActivityRow | null }
    | { kind: 'kicked'; reason: string | null }
    | { kind: 'ended'; sessionId: string };

export default function StudentClassClient() {
    const [ui, setUi] = useState<UiState>({ kind: 'code' });
    const [error, setError] = useState<string | null>(null);

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
            (async () => {
                // H1: reads go through capability-scoped SECURITY DEFINER RPCs
                // (keyed on the session/student id we already hold) instead of
                // broad anon table reads. class_get_session returns null for an
                // ended session.
                const { data: session } = await callRpc<SessionRow | null>(
                    'class_get_session', { in_session_id: memo.sessionId },
                );
                if (!session) {
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi({ kind: 'ended', sessionId: memo.sessionId });
                    return;
                }
                const { data: student } = await callRpc<StudentRow | null>(
                    'class_get_self', { in_student_id: memo.studentId },
                );
                if (!student) return;
                if (student.kicked_at) {
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi({ kind: 'kicked', reason: student.kicked_reason });
                    return;
                }
                // Presence: announce we're back before the first poll tick.
                void callRpc('class_student_heartbeat', { in_student_id: memo.studentId });
                let activity: SessionActivityRow | null = null;
                if (session.current_activity_id) {
                    const { data: act } = await callRpc<SessionActivityRow | null>(
                        'class_get_activity', { in_activity_id: session.current_activity_id },
                    );
                    if (act) activity = act;
                }
                setUi({ kind: 'classroom', session, student, activity });
            })();
        } catch {
            sessionStorage.removeItem(RECONNECT_KEY);
        }
    }, []);

    // ── Subscribe once we're in the classroom (fast path) ──────────
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
                if (row.class_state === 'ended') {
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi({ kind: 'ended', sessionId });
                    return;
                }
                setUi((prev) => prev.kind === 'classroom' ? { ...prev, session: row } : prev);
                // Fetch the (possibly new) activity row for the session's
                // current pointer; pause/resume also lands here via the
                // session UPDATE that accompanies every conductor RPC.
                if (row.current_activity_id) {
                    callRpc<SessionActivityRow | null>('class_get_activity', { in_activity_id: row.current_activity_id })
                        .then(({ data }) => {
                            if (data) {
                                setUi((prev) => prev.kind === 'classroom' ? { ...prev, activity: data } : prev);
                            }
                        });
                } else {
                    setUi((prev) => prev.kind === 'classroom' ? { ...prev, activity: null } : prev);
                }
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
    }, [ui.kind, ui.kind === 'classroom' ? ui.session.id : null, ui.kind === 'classroom' ? ui.student.id : null]);

    // ── Reconciliation poll (reliable path) ────────────────────────
    // Realtime can drop events (socket races, suspended tabs, LB resets,
    // and the 2026-07-09 server-side apply_rls outage). Every 5s — and on
    // visibilitychange / realtime reconnect — fetch the authoritative
    // state and APPLY it: session fields, activity state (including
    // pause/resume where the activity id is unchanged), kicks, class end.
    // The previous poll only reacted to ended/kicked and threw the rest
    // away, which left children playing through a teacher's Pause whenever
    // a websocket event went missing. The same tick carries the presence
    // heartbeat that feeds the teacher's engaged/offline pills.
    useEffect(() => {
        if (ui.kind !== 'classroom') return;
        const sessionId = ui.session.id;
        const studentId = ui.student.id;
        let cancelled = false;

        const check = async () => {
            if (cancelled || document.visibilityState !== 'visible') return;
            try {
                // Presence heartbeat: fire-and-forget, never blocks the poll.
                void callRpc('class_student_heartbeat', { in_student_id: studentId });

                const [{ data: session }, { data: student }] = await Promise.all([
                    callRpc<SessionRow | null>('class_get_session', { in_session_id: sessionId }),
                    callRpc<StudentRow | null>('class_get_self', { in_student_id: studentId }),
                ]);
                if (cancelled) return;
                if (!session) {
                    // null ⇒ session ended or gone.
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi({ kind: 'ended', sessionId });
                    return;
                }
                if (student?.kicked_at) {
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi({ kind: 'kicked', reason: student.kicked_reason });
                    return;
                }
                // Always resolve the activity the session points at. Pause and
                // resume change session_activities.state WITHOUT changing the
                // id, so "same id" must not short-circuit the fetch.
                const targetActivityId = session.current_activity_id ?? null;
                let activity: SessionActivityRow | null = null;
                if (targetActivityId) {
                    const { data: act } = await callRpc<SessionActivityRow | null>(
                        'class_get_activity', { in_activity_id: targetActivityId },
                    );
                    if (cancelled) return;
                    activity = act ?? null;
                }
                setUi((prev) => {
                    if (prev.kind !== 'classroom') return prev;
                    if (!classroomStateChanged(prev.session, prev.activity, session, activity)) {
                        return prev; // no churn inside the camera frame loop
                    }
                    return {
                        ...prev,
                        session,
                        student: student ?? prev.student,
                        activity,
                    };
                });
            } catch {
                /* network blip, next tick will retry */
            }
        };

        void check(); // immediate reconcile + heartbeat on entering classroom
        const id = window.setInterval(check, 5_000);
        const onVis = () => { if (document.visibilityState === 'visible') void check(); };
        document.addEventListener('visibilitychange', onVis);
        const unsubReconnect = onRealtimeReconnect(check);
        return () => {
            cancelled = true;
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
            unsubReconnect();
        };
    }, [ui.kind, ui.kind === 'classroom' ? ui.session.id : null, ui.kind === 'classroom' ? ui.student.id : null]);

    // ── Terminal states ────────────────────────────────────────────
    useEffect(() => {
        if (ui.kind !== 'kicked' && ui.kind !== 'ended') return;
        // Teacher authority: ending the session or removing the student is a
        // terminal outcome for any activity the child still had open. Record
        // it as teacher_ended so it isn't mislabelled as difficulty/abandon.
        analytics.abandonOpenAttempt('teacher_ended');
        // Classroom control: do NOT redirect the child to the marketing site.
        // On shared/projected classroom devices that would drop a young learner
        // onto the public homepage and its family signup CTA. The child stays on
        // a static end screen until an adult closes or navigates the tab.
    }, [ui.kind]);

    // ── Submit handlers ────────────────────────────────────────────
    const handleCode = useCallback(async (code: string) => {
        setError(null);
        if (!isValidCode(code)) { setError('Enter a 4-digit code'); return; }
        // H1: resolve the code through the anon-callable SECURITY DEFINER RPC,
        // which returns a tightly-scoped projection only for active sessions.
        const { data, error: lookupErr } = await callRpc<SessionRow | null>(
            'session_lookup_by_code', { in_code: code },
        );
        if (lookupErr) {
            // Network / server failure is NOT "wrong code" — say so honestly
            // instead of sending the child back to re-type a correct code.
            setError('Hmm, we can’t connect right now. Check the internet and try again.');
            return;
        }
        if (!data) { setError('No active class with that code'); return; }
        setUi({ kind: 'name', session: data });
    }, []);

    const clearError = useCallback(() => setError(null), []);

    // Shared post-join transition (used by both name-join and token-join).
    // Marks this device's session as a CLASSROOM session for analytics so every
    // subsequent event carries context='classroom' + the class code, stores the
    // reconnect memo, then hydrates the authoritative session + activity.
    const enterClassroom = useCallback(async (joinSession: SessionRow, student: StudentRow) => {
        analytics.setClassCode(joinSession.code);
        const memo: ReconnectMemo = {
            sessionId: joinSession.id, studentId: student.id, name: student.name,
            avatarSeed: student.avatar_seed ?? '', ts: Date.now(),
        };
        try { sessionStorage.setItem(RECONNECT_KEY, JSON.stringify(memo)); } catch { /* ignore */ }
        // Presence: first heartbeat immediately so the roster shows us live.
        void callRpc('class_student_heartbeat', { in_student_id: student.id });
        const { data: fullSession } = await callRpc<SessionRow | null>(
            'class_get_session', { in_session_id: joinSession.id },
        );
        const session = fullSession ?? joinSession;
        let activity: SessionActivityRow | null = null;
        if (session.current_activity_id) {
            const { data: act } = await callRpc<SessionActivityRow | null>(
                'class_get_activity', { in_activity_id: session.current_activity_id },
            );
            if (act) activity = act;
        }
        setUi({ kind: 'classroom', session, student, activity });
    }, []);

    const handleName = useCallback(async (rawName: string) => {
        if (ui.kind !== 'name') return;
        setError(null);
        const desired = rawName.trim();
        if (!desired) { setError('Enter your first name'); return; }
        // Legacy name-join: single SECURITY DEFINER RPC that validates the
        // session, dedupes the name server-side, inserts, and returns the row.
        const { data, error: joinErr } = await callRpc<StudentRow | null>(
            'class_join', { in_session_id: ui.session.id, in_name: desired },
        );
        if (joinErr || !data) {
            setError(joinErr?.message ?? 'Could not join class');
            return;
        }
        await enterClassroom(ui.session, data);
    }, [ui, enterClassroom]);


    // ── Render ─────────────────────────────────────────────────────
    if (ui.kind === 'code') {
        return <CodeEntry error={error} onSubmit={handleCode} onEdit={clearError} />;
    }
    if (ui.kind === 'name') {
        return <NameEntry session={ui.session} error={error} onSubmit={handleName} onEdit={clearError} />;
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
// One real (visually hidden) input drives four display boxes. This makes
// paste, overtype, fast typing, backspace and Enter all behave like a
// normal text field — the previous four-separate-inputs version trapped
// children after a typo (filled maxLength=1 boxes swallowed keystrokes).
export function CodeEntry({ error, onSubmit, onEdit }: {
    error: string | null;
    onSubmit: (code: string) => void;
    onEdit: () => void;
}) {
    const [code, setCode] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleChange = (raw: string) => {
        setCode(sanitizeCodeInput(raw));
        if (error) onEdit(); // typing clears the previous error immediately
    };

    const ready = code.length === 4;

    return (
        <div className="cm-page">
            <div className="cm-student-page">
                <div className="cm-join-card cd-join-card">
                    <h2>Join class</h2>
                    <p style={{ color: '#94a3b8', marginBottom: 20 }}>Type the four-digit code from your teacher</p>
                    <div
                        className="cm-code-inputs"
                        onClick={() => inputRef.current?.focus()}
                    >
                        {/* The real input: invisible but focused, stretched
                            across the boxes so tapping anywhere focuses it. */}
                        <input
                            ref={inputRef}
                            className="cm-code-real-input"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            aria-label="Four digit class code"
                            value={code}
                            onChange={(e) => handleChange(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && ready) onSubmit(code); }}
                            autoFocus
                        />
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                aria-hidden
                                className={`cm-code-input cm-code-box${i === Math.min(code.length, 3) ? ' cm-code-box-active' : ''}`}
                            >
                                {code[i] ?? ''}
                            </div>
                        ))}
                    </div>
                    {error && <div className="cm-error">{error}</div>}
                    <button
                        className="cm-btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => onSubmit(code)}
                        disabled={!ready}
                    >Next</button>
                </div>
            </div>
        </div>
    );
}

// ── Step 2: Name entry ─────────────────────────────────────────────
function NameEntry({ session, error, onSubmit, onEdit }: {
    session: SessionRow;
    error: string | null;
    onSubmit: (name: string) => void;
    onEdit: () => void;
}) {
    const [name, setName] = useState('');
    const label = session.activity ? MODE_LABELS[session.activity as GameModeId] : null;
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
                    <input
                        className="cm-name-input"
                        type="text"
                        placeholder="First name"
                        value={name}
                        onChange={(e) => { setName(e.target.value); if (error) onEdit(); }}
                        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSubmit(name)}
                        maxLength={20}
                        autoFocus
                    />
                    {error && <div className="cm-error">{error}</div>}
                    <button
                        className="cm-btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => onSubmit(name)}
                        disabled={!name.trim()}
                    >Join class</button>
                </div>
            </div>
        </div>
    );
}

// ── Locked-in classroom shell ──────────────────────────────────────
function ClassroomShell({ ui }: { ui: { kind: 'classroom'; session: SessionRow; student: StudentRow; activity: SessionActivityRow | null } }) {
    const { session, student, activity } = ui;
    const avatar = avatarFromSeed(student.avatar_seed ?? `${session.id}:${student.name.toLowerCase()}`);

    // Live activity (playing OR paused) → keep the game MOUNTED.
    // Pausing must not unmount the game: unmounting reset the round timer
    // and restarted camera acquisition on every resume. Instead we render
    // a full-screen overlay and freeze both the countdown and the
    // per-frame game logic (see ClassroomGame).
    const activityLive = activity
        && (activity.state === 'playing' || activity.state === 'starting' || activity.state === 'paused')
        && session.class_state === 'in_activity';

    if (activityLive) {
        return (
            <ClassroomGame
                student={student}
                avatar={avatar}
                session={session}
                activity={activity!}
                paused={activity!.state === 'paused'}
            />
        );
    }

    // No live activity → waiting / between-activities room.
    const between = session.class_state === 'between_activities' || activity?.state === 'ended';
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


// ── The actual game render ─────────────────────────────────────────
function ClassroomGame({ student, avatar, session, activity, paused }: {
    student: StudentRow;
    avatar: { emoji: string; color: string };
    session: SessionRow;
    activity: SessionActivityRow;
    paused: boolean;
}) {
    // Class Mode ALWAYS plays the playful tracing experience. The only
    // fallback is a real engine-init failure in THIS session (never the
    // device-persisted flag, which one bad init used to poison forever).
    const [playfulFailed, setPlayfulFailed] = useState(false);

    const activeLogic = useMemo(() => {
        if (paused) return pausedFrameLogic;
        if (activity.activity === 'pre-writing') {
            return playfulFailed ? preWritingLogic : playfulTracingFrame;
        }
        return LOGIC_MAP[activity.activity];
    }, [activity.activity, paused, playfulFailed]) as never;

    // Stub onExit, we never let the kid exit; only the teacher does.
    const noop = useCallback(() => { /* locked-in: teacher controls */ }, []);

    // Fresh per-round tracing tally: each new session_activity starts the
    // playful-tracing class score from zero.
    useEffect(() => {
        if (activity.activity === 'pre-writing') resetPlayfulClassScore();
    }, [activity.id, activity.activity]);

    return (
        /* cd-locked hides every back-to-menu escape hatch the shared game
           components render — in class mode the teacher is the only exit. */
        <div className="App cd-locked">
            <TrackingLayer onFrame={activeLogic}>
                {(frameRef, diagnostics) => (
                    <>
                        <ModeBackground modeId={activity.activity} />
                        <MagicCursor
                            frameRef={frameRef}
                            getPenDown={() => activity.activity === 'free' ? drawingEngine.getPenState() === PenState.DOWN : false}
                            mode={activity.activity}
                        />
                        {/* Persistent name + avatar pip. Top-LEFT (the Menu
                            button it replaces is hidden in class mode) so it
                            can never collide with the round timer top-right. */}
                        <div className="cd-student-pip">
                            <span className="cd-avatar" style={{ background: avatar.color }}>{avatar.emoji}</span>
                            <span>{student.name}</span>
                        </div>

                        {/* Freeze the round timer until the kid's camera is
                         *  actually running (camera explainer can sit on
                         *  screen 10–30s) and while the teacher has paused.
                         *  The game stays mounted through pause so the timer
                         *  and camera survive resume. */}
                        <ClassModeGameWrapper
                            sessionId={session.id}
                            studentId={student.id}
                            sessionActivityId={activity.id}
                            activityState={activity.state}
                            activity={activity.activity}
                            round={activity.ordinal || 1}
                            timerSeconds={session.timer_seconds}
                            freeze={paused || diagnostics.cameraStatus !== 'running'}
                            onRoundEnd={noop}
                        >
                            {activity.activity === 'calibration' && <BubbleCalibration onComplete={noop} onExit={noop} />}
                            {activity.activity === 'free' && <FreePaintMode frameRef={frameRef} onExit={noop} />}
                            {activity.activity === 'pre-writing' && (
                                playfulFailed
                                    ? <PreWritingMode onExit={noop} />
                                    : <TracingModePlayful onExit={noop} onInitFailed={() => setPlayfulFailed(true)} />
                            )}
                            {activity.activity === 'sort-and-place' && <SortAndPlaceMode onExit={noop} />}
                            {activity.activity === 'word-search' && (
                                <WordSearchMode frameRef={frameRef} showSettings={false} onCloseSettings={noop} onExit={noop} />
                            )}
                            {activity.activity === 'colour-builder' && <ColourBuilderMode onExit={noop} />}
                            {activity.activity === 'balloon-math' && <BalloonMathMode onExit={noop} />}
                            {activity.activity === 'rainbow-bridge' && <RainbowBridgeMode onExit={noop} />}
                            {activity.activity === 'gesture-spelling' && <GestureSpellingMode onExit={noop} />}
                        </ClassModeGameWrapper>

                        {/* Teacher-paused overlay ON TOP of the mounted game.
                            Fully opaque interaction shield: logic is frozen
                            (pausedFrameLogic) and pointer events stop here. */}
                        {paused && (
                            <div className="cd-pause-overlay" role="status">
                                <div className="cd-student-bigcard">
                                    <div className="cd-student-emoji">⏸</div>
                                    <h2>Paused</h2>
                                    <p>Your teacher will continue in a moment.</p>
                                </div>
                            </div>
                        )}
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
                    <p style={{ color: '#94a3b8', marginTop: 16, fontSize: '0.9rem' }}>Please ask your teacher for help.</p>
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
