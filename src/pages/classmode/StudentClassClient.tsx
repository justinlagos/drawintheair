/**
 * StudentClassClient — the locked-in student experience.
 *
 * One persistent surface across the whole class. Student joins
 * once, stays in. NO buttons that let them exit, switch, or
 * progress — every transition is teacher-driven over Realtime.
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
import { dbSelect, dbInsert, subscribeToTable } from '../../lib/supabase';
import { isValidCode } from '../../features/classmode/sessionCode';
import { MODE_LABELS } from '../../features/classmode/scoreMapping';
import type { GameModeId } from '../../features/classmode/scoreMapping';
import { avatarForStudent, avatarFromSeed, dedupeName } from '../../features/classmode/conductor/avatars';
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
import { SortAndPlaceMode } from '../../features/modes/sortAndPlace/SortAndPlaceMode';
import { WordSearchMode } from '../../features/modes/wordSearch/WordSearchMode';
import { ColourBuilderMode } from '../../features/modes/colourBuilder/ColourBuilderMode';
import { BalloonMathMode } from '../../features/modes/balloonMath/BalloonMathMode';
import { RainbowBridgeMode } from '../../features/modes/rainbowBridge/RainbowBridgeMode';
import { GestureSpellingMode } from '../../features/modes/gestureSpelling/GestureSpellingMode';

// Per-frame logic functions
import { freePaintLogic } from '../../features/modes/freePaintLogic';
import { preWritingLogic } from '../../features/modes/preWriting/preWritingLogic';
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

const LOGIC_MAP: Record<GameModeId, unknown> = {
    'calibration': bubbleCalibrationLogic,
    'free': freePaintLogic,
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
                const { data } = await dbSelect<SessionRow[]>(
                    'sessions', `id=eq.${memo.sessionId}&limit=1`,
                );
                if (!data || !data[0]) return;
                const session = data[0];
                if (session.class_state === 'ended') {
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi({ kind: 'ended', sessionId: session.id });
                    return;
                }
                const { data: studs } = await dbSelect<StudentRow[]>(
                    'session_students', `id=eq.${memo.studentId}&limit=1`,
                );
                if (!studs || !studs[0]) return;
                const student = studs[0];
                if (student.kicked_at) {
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi({ kind: 'kicked', reason: student.kicked_reason });
                    return;
                }
                let activity: SessionActivityRow | null = null;
                if (session.current_activity_id) {
                    const { data: act } = await dbSelect<SessionActivityRow[]>(
                        'session_activities', `id=eq.${session.current_activity_id}&limit=1`,
                    );
                    if (act && act[0]) activity = act[0];
                }
                setUi({ kind: 'classroom', session, student, activity });
            })();
        } catch {
            sessionStorage.removeItem(RECONNECT_KEY);
        }
    }, []);

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
                if (row.class_state === 'ended') {
                    sessionStorage.removeItem(RECONNECT_KEY);
                    setUi({ kind: 'ended', sessionId });
                    return;
                }
                setUi((prev) => prev.kind === 'classroom' ? { ...prev, session: row } : prev);
                // If current_activity_id changed, fetch the new activity row.
                if (row.current_activity_id) {
                    dbSelect<SessionActivityRow[]>('session_activities', `id=eq.${row.current_activity_id}&limit=1`)
                        .then(({ data }) => {
                            if (data && data[0]) {
                                setUi((prev) => prev.kind === 'classroom' ? { ...prev, activity: data[0] } : prev);
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

    // ── Auto-redirect after kicked / ended ─────────────────────────
    useEffect(() => {
        if (ui.kind !== 'kicked' && ui.kind !== 'ended') return;
        const t = setTimeout(() => { window.location.href = '/'; }, 8000);
        return () => clearTimeout(t);
    }, [ui.kind]);

    // ── Submit handlers ────────────────────────────────────────────
    const handleCode = useCallback(async (code: string) => {
        setError(null);
        if (!isValidCode(code)) { setError('Enter a 4-digit code'); return; }
        const { data } = await dbSelect<SessionRow[]>(
            'sessions', `code=eq.${code}&class_state=neq.ended&limit=1`,
        );
        if (!data || data.length === 0) { setError('No active class with that code'); return; }
        setUi({ kind: 'name', session: data[0] });
    }, []);

    const handleName = useCallback(async (rawName: string) => {
        if (ui.kind !== 'name') return;
        setError(null);
        const desired = rawName.trim();
        if (!desired) { setError('Enter your first name'); return; }
        const { data: existing } = await dbSelect<StudentRow[]>(
            'session_students', `session_id=eq.${ui.session.id}&select=name`,
        );
        const finalName = dedupeName(desired, (existing ?? []).map((s) => s.name));
        const avatar = avatarForStudent(ui.session.id, finalName);
        const { data, error: insertErr } = await dbInsert<StudentRow>(
            'session_students',
            {
                session_id: ui.session.id,
                name: finalName,
                avatar_seed: avatar.seed,
            },
            { single: true },
        );
        if (insertErr || !data) {
            setError(insertErr?.message ?? 'Could not join class');
            return;
        }
        const memo: ReconnectMemo = {
            sessionId: ui.session.id, studentId: data.id, name: finalName,
            avatarSeed: avatar.seed, ts: Date.now(),
        };
        try { sessionStorage.setItem(RECONNECT_KEY, JSON.stringify(memo)); } catch { /* ignore */ }

        let activity: SessionActivityRow | null = null;
        if (ui.session.current_activity_id) {
            const { data: act } = await dbSelect<SessionActivityRow[]>(
                'session_activities', `id=eq.${ui.session.current_activity_id}&limit=1`,
            );
            if (act && act[0]) activity = act[0];
        }
        setUi({ kind: 'classroom', session: ui.session, student: data, activity });
    }, [ui]);

    // ── Render ─────────────────────────────────────────────────────
    if (ui.kind === 'code') {
        return <CodeEntry error={error} onSubmit={handleCode} />;
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
    // Classroom — composite of waiting / playing / paused / between
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
                        onChange={(e) => setName(e.target.value)}
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

    // No activity loaded → waiting room
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
        return <ClassroomGame student={student} avatar={avatar} session={session} activity={activity} />;
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
function ClassroomGame({ student, avatar, session, activity }: {
    student: StudentRow;
    avatar: { emoji: string; color: string };
    session: SessionRow;
    activity: SessionActivityRow;
}) {
    const activeLogic = useMemo(() => LOGIC_MAP[activity.activity], [activity.activity]) as never;
    // Stub onExit — we never let the kid exit; only the teacher does.
    const noop = useCallback(() => { /* locked-in: teacher controls */ }, []);

    return (
        <div className="App">
            <TrackingLayer onFrame={activeLogic}>
                {(frameRef) => (
                    <>
                        <ModeBackground modeId={activity.activity} />
                        <MagicCursor
                            frameRef={frameRef}
                            getPenDown={() => activity.activity === 'free' ? drawingEngine.getPenState() === PenState.DOWN : false}
                            mode={activity.activity}
                        />
                        {/* Persistent name + avatar pip — top-right so a teacher
                            walking by can spot the kid on a projector. */}
                        <div className="cd-student-pip">
                            <span className="cd-avatar" style={{ background: avatar.color }}>{avatar.emoji}</span>
                            <span>{student.name}</span>
                        </div>

                        <ClassModeGameWrapper
                            sessionId={session.id}
                            studentId={student.id}
                            activity={activity.activity}
                            round={1}
                            timerSeconds={session.timer_seconds}
                            onRoundEnd={noop}
                        >
                            {activity.activity === 'calibration' && <BubbleCalibration onComplete={noop} onExit={noop} />}
                            {activity.activity === 'free' && <FreePaintMode frameRef={frameRef} onExit={noop} />}
                            {activity.activity === 'pre-writing' && <PreWritingMode onExit={noop} />}
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
