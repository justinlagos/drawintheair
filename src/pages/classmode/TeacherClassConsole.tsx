/**
 * TeacherClassConsole, mission control for class mode.
 *
 * Replaces the previous TeacherDashboard / LobbyScreen /
 * LiveRoundScreen / ResultsScreen with one persistent screen the
 * teacher never leaves during a class.
 *
 * Three phases on this single route:
 *   1. No active session  → "Start Class" hero + recent sessions list
 *   2. Active session     → mission control (roster + activity console)
 *   3. Ended session      → class summary card
 *
 * Sub-components are inlined deliberately, keeps the conductor
 * flow in one file so the next person reading it can scan the
 * transitions without jumping across the tree.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    dbSelect, dbInsert, subscribeToTable,
    getAccountRoles, registerTeacherAccount, consumeRoleIntent,
} from '../../lib/supabase';
import { generateSessionCode } from '../../features/classmode/sessionCode';
import { MODE_LABELS, SCOREABLE_MODES } from '../../features/classmode/scoreMapping';
import type { GameModeId } from '../../features/classmode/scoreMapping';
import { conductorApi } from '../../features/classmode/conductor/api';
import { joinApi } from '../../features/classmode/conductor/joinApi';
import { avatarFromSeed, avatarForStudent } from '../../features/classmode/conductor/avatars';
import type {
    SessionRow,
    SessionActivityRow,
    StudentRow,
    StudentStats,
    ClassSummary,
    EngagementStatus,
} from '../../features/classmode/conductor/types';
import type { AssignActivityRequest } from '../../features/classmode/conductor/joinTypes';
import './classmode.css';
import './conductor.css';

const FREE_TIER_CLASSROOM_CAP = 1;

// ── Helpers ─────────────────────────────────────────────────────────
function formatElapsed(startedAt: string | null): string {
    if (!startedAt) return '-';
    const ms = Date.now() - new Date(startedAt).getTime();
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms / 1000) % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Decide a student's engagement bucket from raw row data + timing.
 *  Calm intelligence, just three states the teacher acts on. */
function engagementOf(student: StudentRow): EngagementStatus {
    if (student.kicked_at) return 'offline';
    if (!student.is_active || !student.is_connected) return 'offline';
    return 'engaged'; // 'stuck' is set externally via stuck_detected events
}

// ── Top page ────────────────────────────────────────────────────────
export default function TeacherClassConsole() {
    const { user, loading, signIn, signOut } = useAuth();

    // Signing out of the classroom returns teachers to the teacher page,
    // not a bare login screen.
    const handleSignOut = useCallback(async () => {
        await signOut();
        window.location.href = '/teachers';
    }, [signOut]);
    const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
    const [recent, setRecent] = useState<SessionRow[]>([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Role isolation (migration 0013): the classroom area requires an
    // account that explicitly signed up as a teacher. Parent credentials
    // alone no longer open /class.
    const [roleStatus, setRoleStatus] = useState<'checking' | 'teacher' | 'not-teacher'>('checking');
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const roles = await getAccountRoles();
            if (cancelled) return;
            if (roles?.teacher || roles?.admin) { setRoleStatus('teacher'); return; }
            // Arrived via the teacher signup/login flow (e.g. Google): finish
            // the explicit teacher registration they started.
            if (consumeRoleIntent('teacher')) {
                const ok = await registerTeacherAccount(
                    user.user_metadata.full_name || user.user_metadata.name,
                );
                if (!cancelled) setRoleStatus(ok ? 'teacher' : 'not-teacher');
                return;
            }
            setRoleStatus('not-teacher');
        })();
        return () => { cancelled = true; };
    }, [user]);

    // Load recent sessions + check for an in-flight one for this teacher.
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const { data } = await dbSelect<SessionRow[]>(
                'sessions',
                `teacher_id=eq.${user.id}&order=created_at.desc&limit=10`,
            );
            if (cancelled || !data) return;
            setRecent(data);
            const live = data.find(
                (s) => s.class_state !== 'ended' && s.class_state !== undefined,
            );
            if (live) setActiveSession(live);
        })();
        return () => { cancelled = true; };
    }, [user]);

    const reloadRecent = useCallback(async () => {
        if (!user) return;
        const { data } = await dbSelect<SessionRow[]>(
            'sessions',
            `teacher_id=eq.${user.id}&order=created_at.desc&limit=20`,
        );
        if (data) setRecent(data);
    }, [user]);

    const handleStartClass = useCallback(async () => {
        if (!user) return;
        setCreating(true);
        setError(null);
        const activeCount = recent.filter((s) => s.class_state !== 'ended').length;
        if (activeCount >= FREE_TIER_CLASSROOM_CAP) {
            setError(
                `You already have ${activeCount} class${activeCount === 1 ? '' : 'es'} in progress. End that one first, or upgrade for multi-classroom support.`,
            );
            setCreating(false);
            return;
        }
        const code = generateSessionCode();
        const { data, error: insertError } = await dbInsert<SessionRow>(
            'sessions',
            {
                teacher_id: user.id,
                code,
                class_state: 'lobby',
                status: 'lobby',
                round: 1,
                timer_seconds: 90,
            },
            { single: true },
        );
        if (insertError) {
            setError(insertError.message ?? 'Could not start class. Try again.');
            setCreating(false);
            return;
        }

        // Set network fingerprint for same-network enforcement
        if (data) {
            try {
                await joinApi.setNetworkFingerprint(data.id);
            } catch {
                // Non-critical: network enforcement degrades gracefully
            }
        }

        if (data) setActiveSession(data);
        setCreating(false);
    }, [user, recent]);

    const handleDeleteSession = useCallback(async (sessionId: string) => {
        try {
            await conductorApi.deleteSession(sessionId);
            setRecent((cur) => cur.filter((s) => s.id !== sessionId));
        } catch (e) {
            setError((e as Error).message);
        }
    }, []);

    const handleEndStale = useCallback(async () => {
        try {
            await conductorApi.endStaleSessions();
            await reloadRecent();
        } catch (e) {
            setError((e as Error).message);
        }
    }, [reloadRecent]);

    // ── Loading / sign-in gates ────────────────────────────────────
    if (loading) {
        return <div className="cm-page"><div className="cm-student-page"><div className="cm-waiting-spinner" /></div></div>;
    }

    if (!user) {
        return (
            <div className="cm-page">
                <div className="cm-dashboard">
                    <div className="cm-dashboard-hero">
                        <h1>Class Mode</h1>
                        <p>The calmest 5-minute movement break for your classroom</p>
                    </div>
                    <div className="cm-sign-in-card">
                        <h2>Teacher sign in</h2>
                        <p>Sign in with your Google account to start a class.</p>
                        <button className="cm-btn-google" onClick={() => signIn()}>
                            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.01 24.01 0 000 21.56l7.98-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                            Sign in with Google
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Role gate: signed in, but not (yet) a teacher account ──────
    if (roleStatus === 'checking') {
        return <div className="cm-page"><div className="cm-student-page"><div className="cm-waiting-spinner" /></div></div>;
    }
    if (roleStatus === 'not-teacher') {
        return (
            <div className="cm-page">
                <div className="cm-dashboard">
                    <div className="cm-dashboard-hero">
                        <h1>Class Mode</h1>
                        <p>This area is for teacher accounts</p>
                    </div>
                    <div className="cm-sign-in-card">
                        <h2>This area is for teachers</h2>
                        <p>
                            You're signed in with a family account, and the classroom area is
                            kept completely separate from family accounts. If you teach, you
                            can create a teacher account from the teachers page whenever
                            you're ready.
                        </p>
                        <p style={{ marginTop: 12 }}>
                            <a href="/parent/dashboard">Back to my family dashboard</a>
                            {' · '}
                            <a href="/teachers">About Draw in the Air for teachers</a>
                            {' · '}
                            <button
                                type="button"
                                onClick={() => handleSignOut()}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', color: 'inherit', font: 'inherit' }}
                            >
                                Sign out
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Active session, the conductor lives here ──────────────────
    if (activeSession && activeSession.class_state !== 'ended') {
        return (
            <ConductorScreen
                session={activeSession}
                onSessionUpdate={setActiveSession}
                onSignOut={handleSignOut}
                userName={user.user_metadata.full_name || user.user_metadata.name || user.email}
                userAvatarUrl={user.user_metadata.avatar_url || user.user_metadata.picture}
            />
        );
    }

    // ── Pre-class, start a class + recent sessions ────────────────
    return (
        <div className="cm-page">
            <ConductorTopBar
                userName={user.user_metadata.full_name || user.user_metadata.name || user.email}
                userAvatarUrl={user.user_metadata.avatar_url || user.user_metadata.picture}
                onSignOut={handleSignOut}
            />
            <div className="cm-dashboard">
                <div className="cm-dashboard-hero">
                    <h1>Start a class</h1>
                    <p>One join code. One class. You're in control the whole time.</p>
                </div>
                {error && <div className="cd-error">{error}</div>}
                <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 32 }}>
                    <button className="cm-btn-primary cd-start-cta" onClick={handleStartClass} disabled={creating}>
                        {creating ? 'Starting…' : 'Start Class'}
                    </button>
                </div>

                {/* Recent sessions, quick-resume for ones still in lobby/in_activity */}
                {recent.length > 0 && (
                    <div className="cm-history">
                        <div className="cd-history-header">
                            <h3>Recent classes</h3>
                            {recent.filter((s) => s.class_state !== 'ended' && s.class_state !== 'in_activity').length > 1 && (
                                <button className="cm-btn-secondary" onClick={handleEndStale} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                                    End all stale
                                </button>
                            )}
                        </div>
                        <div className="cm-history-list">
                            {recent.map((s) => {
                                const date = new Date(s.created_at).toLocaleDateString('en-GB', {
                                    day: 'numeric', month: 'short',
                                });
                                const isLive = s.class_state !== 'ended';
                                return (
                                    <div key={s.id} className="cm-history-item cd-history-row">
                                        <div className="cd-history-name">
                                            <strong>{s.class_name || `Class · ${s.code}`}</strong>
                                        </div>
                                        <div className="cm-history-meta cd-history-meta">
                                            <span className={`cd-state-badge cd-state-${s.class_state}`}>
                                                {s.class_state === 'ended' ? 'finished' : s.class_state.replace('_', ' ')}
                                            </span>
                                            <span className="cd-history-date">{date}</span>
                                            {isLive && (
                                                <button className="cm-btn-secondary" onClick={() => setActiveSession(s)} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                                                    Resume
                                                </button>
                                            )}
                                            <button
                                                className="cd-history-delete"
                                                aria-label={`Delete ${s.class_name || `Class · ${s.code}`}`}
                                                title="Delete class"
                                                onClick={() => {
                                                    if (window.confirm(isLive ? 'Delete this class in progress? Students will be removed.' : 'Delete this finished class permanently?')) {
                                                        handleDeleteSession(s.id);
                                                    }
                                                }}
                                            >🗑</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════
// ConductorScreen, the mission control surface itself
// ════════════════════════════════════════════════════════════════════
interface ConductorScreenProps {
    session: SessionRow;
    onSessionUpdate: (s: SessionRow | null) => void;
    onSignOut: () => Promise<void>;
    userName: string;
    userAvatarUrl?: string;
}

function ConductorScreen({ session, onSessionUpdate, onSignOut, userName, userAvatarUrl }: ConductorScreenProps) {
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [currentActivity, setCurrentActivity] = useState<SessionActivityRow | null>(null);
    const [pastActivities, setPastActivities] = useState<SessionActivityRow[]>([]);
    const [statsForStudent, setStatsForStudent] = useState<StudentRow | null>(null);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now());
    const [assignModal, setAssignModal] = useState<{ student: StudentRow; mode: 'individual' | 'bulk'; selectedStudentIds?: Set<string> } | null>(null);
    const [bulkSelection, setBulkSelection] = useState<Set<string> | null>(null);

    // Tick every second so the elapsed-time pill stays alive.
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    // Load + subscribe: students
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await dbSelect<StudentRow[]>(
                'session_students',
                `session_id=eq.${session.id}&order=joined_at.asc`,
            );
            if (!cancelled && data) setStudents(data);
        })();

        const unsubInsert = subscribeToTable(
            `session-students-${session.id}`,
            'session_students', 'INSERT',
            (payload) => {
                const row = payload.new as unknown as StudentRow;
                if (row.session_id === session.id) setStudents((cur) => [...cur, row]);
            },
            `session_id=eq.${session.id}`,
        );
        const unsubUpdate = subscribeToTable(
            `session-students-update-${session.id}`,
            'session_students', 'UPDATE',
            (payload) => {
                const row = payload.new as unknown as StudentRow;
                setStudents((cur) => cur.map((s) => (s.id === row.id ? row : s)));
            },
            `session_id=eq.${session.id}`,
        );

        return () => { cancelled = true; unsubInsert(); unsubUpdate(); };
    }, [session.id]);

    // Load + subscribe: session activities
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await dbSelect<SessionActivityRow[]>(
                'session_activities',
                `session_id=eq.${session.id}&order=ordinal.asc`,
            );
            if (cancelled || !data) return;
            const open = data.find((a) => a.state !== 'ended');
            const closed = data.filter((a) => a.state === 'ended');
            setCurrentActivity(open ?? null);
            setPastActivities(closed);
        })();

        const unsubInsert = subscribeToTable(
            `session-activities-${session.id}`,
            'session_activities', 'INSERT',
            (payload) => {
                const row = payload.new as unknown as SessionActivityRow;
                if (row.session_id === session.id && row.state !== 'ended') setCurrentActivity(row);
            },
            `session_id=eq.${session.id}`,
        );
        const unsubUpdate = subscribeToTable(
            `session-activities-update-${session.id}`,
            'session_activities', 'UPDATE',
            (payload) => {
                const row = payload.new as unknown as SessionActivityRow;
                if (row.state === 'ended') {
                    setCurrentActivity((c) => (c?.id === row.id ? null : c));
                    setPastActivities((p) => {
                        if (p.find((x) => x.id === row.id)) return p.map((x) => x.id === row.id ? row : x);
                        return [...p, row];
                    });
                } else {
                    setCurrentActivity(row);
                }
            },
            `session_id=eq.${session.id}`,
        );

        return () => { cancelled = true; unsubInsert(); unsubUpdate(); };
    }, [session.id]);

    // Subscribe to session row updates (class_state, current_activity_id)
    useEffect(() => {
        const unsub = subscribeToTable(
            `session-${session.id}`,
            'sessions', 'UPDATE',
            (payload) => {
                const row = payload.new as unknown as SessionRow;
                if (row.id === session.id) onSessionUpdate(row);
            },
            `id=eq.${session.id}`,
        );
        return unsub;
    }, [session.id, onSessionUpdate]);

    // ── Actions ────────────────────────────────────────────────────
    const [startingActivity, setStartingActivity] = useState<GameModeId | null>(null);
    const handleStartActivity = useCallback(async (activity: GameModeId) => {
        try {
            setError(null);
            setStartingActivity(activity);
            const result = await conductorApi.startActivity(session.id, activity);
            // The result includes: activity_version, status, etc.
            // The Realtime subscription on the sessions table will notify all
            // connected students. The return value is the authoritative confirmation.
            if (result.status !== 'playing' || !result.activity_version) {
                console.warn('startActivity: unexpected server response', result);
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setStartingActivity(null);
        }
    }, [session.id]);

    // If pause/resume errors with "no active activity" the server has
    // already lost the active row, clear it client-side so the UI flips
    // back to the launcher instead of leaving the user staring at a
    // broken panel.
    const clearStaleOnNoActive = useCallback((e: Error) => {
        const msg = e.message ?? '';
        if (msg.includes('no active activity')) {
            setCurrentActivity(null);
        }
        setError(msg);
    }, []);

    const handlePause = useCallback(async () => {
        try { await conductorApi.pauseActivity(session.id); }
        catch (e) { clearStaleOnNoActive(e as Error); }
    }, [session.id, clearStaleOnNoActive]);

    const handleResume = useCallback(async () => {
        try { await conductorApi.resumeActivity(session.id); }
        catch (e) { clearStaleOnNoActive(e as Error); }
    }, [session.id, clearStaleOnNoActive]);

    const handleEndActivity = useCallback(async () => {
        try { await conductorApi.endActivity(session.id); } catch (e) { setError((e as Error).message); }
    }, [session.id]);

    const handleKick = useCallback(async (student: StudentRow) => {
        try {
            await conductorApi.kickStudent(session.id, student.id, 'removed_by_teacher');
        } catch (e) {
            setError((e as Error).message);
        }
    }, [session.id]);

    const handleEndClass = useCallback(async () => {
        try {
            await conductorApi.endSession(session.id);
            setSummaryOpen(true);
        } catch (e) {
            setError((e as Error).message);
        }
    }, [session.id]);

    const handleAssignActivities = useCallback(async (
        studentId: string,
        activities: AssignActivityRequest[],
    ) => {
        try {
            setError(null);
            await joinApi.setStudentAssignments(session.id, studentId, activities);
        } catch (e) {
            setError((e as Error).message);
        }
    }, [session.id]);

    const handleBulkAssign = useCallback(async (
        studentIds: string[],
        activities: AssignActivityRequest[],
    ) => {
        try {
            setError(null);
            await Promise.all(
                studentIds.map((sid) =>
                    joinApi.setStudentAssignments(session.id, sid, activities),
                ),
            );
        } catch (e) {
            setError((e as Error).message);
        }
    }, [session.id]);

    const handleSetDefaults = useCallback(async (activities: string[]) => {
        try {
            setError(null);
            await joinApi.setClassroomDefaults(session.id, activities);
        } catch (e) {
            setError((e as Error).message);
        }
    }, [session.id]);

    // Engagement counts (only the three buckets the teacher acts on)
    const counts = useMemo(() => {
        let engaged = 0, offline = 0;
        for (const s of students) {
            const e = engagementOf(s);
            if (e === 'engaged') engaged++;
            else if (e === 'offline') offline++;
        }
        return { engaged, offline, total: students.length };
    }, [students]);

    void now; // referenced to force re-renders for elapsed pill

    if (summaryOpen || session.class_state === 'ended') {
        return (
            <ClassSummaryView
                sessionId={session.id}
                onDone={() => onSessionUpdate(null)}
                userName={userName}
                userAvatarUrl={userAvatarUrl}
                onSignOut={onSignOut}
            />
        );
    }

    const activeStudents = students.filter((s) => !s.kicked_at);

    return (
        <div className="cm-page cd-page">
            {/* Top bar, code, time, students, end class */}
            <div className="cd-topbar">
                <div className="cd-topbar-left">
                    <div className="cd-code-pill" title="Students join with this code">
                        <span className="cd-code-label">Code</span>
                        <span className="cd-code-value">{session.code}</span>
                    </div>
                    <div className="cd-elapsed">
                        ⏱ {formatElapsed(session.started_at)}
                    </div>
                    <div className="cd-class-state">
                        {session.class_state === 'lobby' && <>🟡 Waiting · <strong>{counts.total}</strong> joined</>}
                        {session.class_state === 'in_activity' && <>🟢 Live · <strong>{counts.engaged}</strong> engaged</>}
                        {session.class_state === 'between_activities' && <>🔵 Between activities · {counts.total} ready</>}
                    </div>
                </div>
                <div className="cd-topbar-right">
                    <HoldToConfirmButton
                        label="End class"
                        confirmLabel="Hold to end…"
                        onConfirm={handleEndClass}
                        kind="danger"
                    />
                    <span className="cm-user-name">{userName}</span>
                    {userAvatarUrl && <img className="cm-avatar" src={userAvatarUrl} alt="" />}
                </div>
            </div>

            {error && <div className="cd-error" onClick={() => setError(null)}>{error} <span style={{ opacity: 0.6, marginLeft: 8 }}>(tap to dismiss)</span></div>}

            {/* Mission control split */}
            <div className="cd-grid">
                {/* Left: roster */}
                <aside className="cd-roster">
                    <header className="cd-panel-h">
                        <h2>Class roster</h2>
                        <span className="cd-panel-meta">{activeStudents.length} student{activeStudents.length === 1 ? '' : 's'}</span>
                    </header>
                    {activeStudents.length === 0 ? (
                        <div className="cd-roster-empty">
                            <div className="cd-roster-empty-icon">🎒</div>
                            <p>No-one's joined yet.</p>
                            <p className="cd-roster-empty-sub">Share <strong>code <span style={{ color: 'var(--cd-plum)' }}>{session.code}</span></strong> on the board.</p>
                        </div>
                    ) : (
                        <div className="cd-roster-list">
                            {activeStudents.map((s) => (
                                <StudentRosterCard
                                    key={s.id}
                                    student={s}
                                    onClickStats={() => setStatsForStudent(s)}
                                    onKick={() => handleKick(s)}
                                    onAssign={() => setAssignModal({ student: s, mode: 'individual' })}
                                />
                            ))}
                            {activeStudents.length > 1 && (
                                <div className="cd-bulk-actions">
                                    {bulkSelection ? (
                                        <>
                                            <button
                                                className="cm-btn-secondary"
                                                onClick={() => setAssignModal({
                                                    student: activeStudents[0],
                                                    mode: 'bulk',
                                                    selectedStudentIds: bulkSelection,
                                                })}
                                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                                disabled={bulkSelection.size === 0}
                                            >
                                                Assign to {bulkSelection.size} selected
                                            </button>
                                            <button
                                                className="cm-btn-secondary"
                                                onClick={() => setBulkSelection(null)}
                                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                            >
                                                Clear selection
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="cm-btn-secondary"
                                            onClick={() => setBulkSelection(new Set(activeStudents.map(s => s.id)))}
                                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                        >
                                            Select all
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </aside>

                {/* Right: activity console
                 *
                 * Belt-and-braces gating: only render the NowPlaying panel when
                 * BOTH the local currentActivity state and the authoritative
                 * session.class_state agree we're in an activity. This prevents
                 * the panel from getting stuck on a stale "playing" view when a
                 * realtime UPDATE event for session_activities is dropped but
                 * the sessions row arrives correctly, surfaced by the live
                 * classroom test on 2026-05-11 (code 1823, see migration
                 * 20260511_conductor_pause_selfheal for the DB-side hotfix). */}
                <section className="cd-stage">
                    {currentActivity && session.class_state === 'in_activity' ? (
                        <ActivityNowPlaying
                            activity={currentActivity}
                            onPause={handlePause}
                            onResume={handleResume}
                            onEnd={handleEndActivity}
                        />
                    ) : (
                        <ActivityLauncher
                            onStart={handleStartActivity}
                            heading={
                                pastActivities.length === 0
                                    ? 'Pick the first activity'
                                    : 'Pick the next activity'
                            }
                            startingActivity={startingActivity}
                        />
                    )}

                    {pastActivities.length > 0 && (
                        <div className="cd-timeline">
                            <h3>Today's class</h3>
                            <ol>
                                {pastActivities.map((a) => {
                                    const label = MODE_LABELS[a.activity];
                                    const dur = a.ended_at && a.started_at
                                        ? Math.round((new Date(a.ended_at).getTime() - new Date(a.started_at).getTime()) / 60000)
                                        : null;
                                    return (
                                        <li key={a.id}>
                                            <span className="cd-timeline-icon">{label?.icon ?? '🎮'}</span>
                                            <span className="cd-timeline-name">{label?.title ?? a.activity}</span>
                                            <span className="cd-timeline-meta">{dur != null ? `${dur} min` : 'just ended'}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    )}
                </section>
            </div>

            {statsForStudent && (
                <StudentStatsModal
                    sessionId={session.id}
                    student={statsForStudent}
                    onClose={() => setStatsForStudent(null)}
                    onKick={async () => { await handleKick(statsForStudent); setStatsForStudent(null); }}
                />
            )}

            {assignModal && (
                <AssignActivitiesModal
                    sessionId={session.id}
                    student={assignModal.mode === 'individual' ? assignModal.student : null}
                    studentIds={assignModal.mode === 'bulk' && assignModal.selectedStudentIds
                        ? Array.from(assignModal.selectedStudentIds) : null}
                    onSave={async (activities) => {
                        if (assignModal.mode === 'individual' && assignModal.student) {
                            await handleAssignActivities(assignModal.student.id, activities);
                        } else if (assignModal.mode === 'bulk' && assignModal.selectedStudentIds) {
                            await handleBulkAssign(Array.from(assignModal.selectedStudentIds), activities);
                        }
                        setAssignModal(null);
                        setBulkSelection(null);
                    }}
                    onSetDefaults={handleSetDefaults}
                    onClose={() => { setAssignModal(null); setBulkSelection(null); }}
                />
            )}
        </div>
    );
}

// ── Sub-components inlined below ────────────────────────────────────

function ConductorTopBar({ userName, userAvatarUrl, onSignOut }: { userName: string; userAvatarUrl?: string; onSignOut: () => Promise<void> }) {
    return (
        <div className="cm-topbar">
            <div className="cm-topbar-left">
                <span className="cm-topbar-title">Class Mode</span>
            </div>
            <div className="cm-topbar-right">
                {userAvatarUrl && <img className="cm-avatar" src={userAvatarUrl} alt="" />}
                <span className="cm-user-name">{userName}</span>
                <button className="cm-btn-secondary" onClick={onSignOut} style={{ padding: '6px 16px', fontSize: '0.8rem' }}>Sign out</button>
            </div>
        </div>
    );
}

function StudentRosterCard({ student, onClickStats, onKick, onAssign }: {
    student: StudentRow; onClickStats: () => void; onKick: () => void; onAssign?: () => void;
}) {
    const eng = engagementOf(student);
    const avatar = avatarFromSeed(student.avatar_seed ?? `${student.session_id}:${student.name.toLowerCase()}`);
    return (
        <div className={`cd-roster-card cd-eng-${eng}`}>
            <button className="cd-roster-card-main" onClick={onClickStats} aria-label={`See ${student.name}'s stats`}>
                <span className="cd-avatar" style={{ background: avatar.color }}>{avatar.emoji}</span>
                <span className="cd-roster-name">{student.name}</span>
                <span className={`cd-eng-pill cd-eng-pill-${eng}`}>
                    {eng === 'engaged' ? '🟢 engaged' : eng === 'stuck' ? '🟡 stuck' : '⚫ offline'}
                </span>
            </button>
            <div className="cd-roster-actions">
                {onAssign && (
                    <button className="cd-roster-btn-assign" onClick={onAssign} aria-label={`Assign activities to ${student.name}`} title="Assign activities">
                        📋
                    </button>
                )}
                <button className="cd-roster-card-kick" onClick={onKick} aria-label={`Remove ${student.name} from class`}>
                    ✕
                </button>
            </div>
        </div>
    );
}

function ActivityNowPlaying({ activity, onPause, onResume, onEnd }: {
    activity: SessionActivityRow;
    onPause: () => void; onResume: () => void; onEnd: () => void;
}) {
    const label = MODE_LABELS[activity.activity];
    const isPaused = activity.state === 'paused';
    return (
        <div className="cd-now">
            <div className="cd-now-card">
                <div className="cd-now-eyebrow">Now playing</div>
                <div className="cd-now-icon">{label?.icon ?? '🎮'}</div>
                <h2 className="cd-now-title">{label?.title ?? activity.activity}</h2>
                <p className="cd-now-sub">{label?.subtitle ?? ''}</p>
                <span className={`cd-now-state cd-now-state-${activity.state}`}>
                    {activity.state === 'playing' ? '▶ playing' : activity.state === 'paused' ? '⏸ paused' : activity.state}
                </span>

                <div className="cd-transport">
                    {isPaused ? (
                        <button className="cm-btn-primary" onClick={onResume}>▶ Resume</button>
                    ) : (
                        <button className="cm-btn-secondary" onClick={onPause}>⏸ Pause</button>
                    )}
                    <button className="cm-btn-secondary" onClick={onEnd}>⏹ End activity</button>
                </div>
            </div>
        </div>
    );
}

function ActivityLauncher({ onStart, heading, startingActivity }: {
    onStart: (a: GameModeId) => void; heading: string; startingActivity: GameModeId | null;
}) {
    return (
        <div className="cd-launcher">
            <h2>{heading}</h2>
            <div className="cm-activity-grid">
                {SCOREABLE_MODES.map((modeId) => {
                    const mode = MODE_LABELS[modeId];
                    const isStarting = startingActivity === modeId;
                    return (
                        <button
                            key={modeId}
                            type="button"
                            className={`cm-activity-card cd-launcher-card${isStarting ? ' cd-launcher-starting' : ''}`}
                            onClick={() => !isStarting && onStart(modeId)}
                            disabled={isStarting || startingActivity !== null}
                        >
                            {isStarting ? (
                                <div className="cd-launcher-loading">
                                    <div className="cm-waiting-spinner" />
                                    <span>Starting…</span>
                                </div>
                            ) : (
                                <>
                                    <div className="cm-activity-icon" aria-hidden>{mode.icon}</div>
                                    <div className="cm-activity-name">{mode.title}</div>
                                    <div className="cm-activity-subtitle">{mode.subtitle}</div>
                                </>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function HoldToConfirmButton({ label, confirmLabel, onConfirm, kind = 'primary' }: {
    label: string; confirmLabel: string;
    onConfirm: () => void;
    kind?: 'primary' | 'danger';
}) {
    const HOLD_MS = 2000;
    const [progress, setProgress] = useState(0);
    const startedRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    const tick = useCallback(() => {
        if (startedRef.current == null) return;
        const elapsed = Date.now() - startedRef.current;
        const p = Math.min(elapsed / HOLD_MS, 1);
        setProgress(p);
        if (p >= 1) {
            startedRef.current = null;
            setProgress(0);
            onConfirm();
            return;
        }
        rafRef.current = requestAnimationFrame(tick);
    }, [onConfirm]);

    const start = () => {
        startedRef.current = Date.now();
        rafRef.current = requestAnimationFrame(tick);
    };
    const cancel = () => {
        startedRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setProgress(0);
    };

    useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

    return (
        <button
            className={`cd-hold cd-hold-${kind}`}
            onMouseDown={start} onMouseUp={cancel} onMouseLeave={cancel}
            onTouchStart={start} onTouchEnd={cancel} onTouchCancel={cancel}
            style={{
                background: progress > 0
                    ? `linear-gradient(90deg, ${kind === 'danger' ? '#C13A3A' : '#6C3FA4'} ${progress * 100}%, transparent ${progress * 100}%)`
                    : undefined,
            }}
        >
            {progress > 0 ? confirmLabel : label}
        </button>
    );
}

// ── Stats modal ─────────────────────────────────────────────────────
function StudentStatsModal({ sessionId, student, onClose, onKick }: {
    sessionId: string; student: StudentRow;
    onClose: () => void; onKick: () => void | Promise<void>;
}) {
    const [stats, setStats] = useState<StudentStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await conductorApi.studentStats<StudentStats>(sessionId, student.id);
                if (!cancelled) setStats(data);
            } catch (e) {
                if (!cancelled) setError((e as Error).message);
            }
        })();
        return () => { cancelled = true; };
    }, [sessionId, student.id]);

    const avatar = avatarFromSeed(student.avatar_seed ?? `${student.session_id}:${student.name.toLowerCase()}`);

    return (
        <div className="cd-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cd-modal">
                <header className="cd-modal-header">
                    <span className="cd-avatar cd-avatar-lg" style={{ background: avatar.color }}>{avatar.emoji}</span>
                    <div>
                        <h2>{student.name}</h2>
                        <p className="cd-modal-sub">Joined {new Date(student.joined_at).toLocaleTimeString()}</p>
                    </div>
                    <button className="cd-modal-close" onClick={onClose} aria-label="Close">✕</button>
                </header>

                {error && <div className="cd-error">{error}</div>}

                {stats ? (
                    <>
                        <div className="cd-stats-totals">
                            <div className="cd-stats-tile">
                                <div className="cd-stats-tile-l">Time on task</div>
                                <div className="cd-stats-tile-v">{Math.round((stats.totals.time_on_task_s ?? 0) / 60)}m</div>
                            </div>
                            <div className="cd-stats-tile">
                                <div className="cd-stats-tile-l">Rounds</div>
                                <div className="cd-stats-tile-v">{stats.totals.rounds}</div>
                            </div>
                            <div className="cd-stats-tile">
                                <div className="cd-stats-tile-l">Stars</div>
                                <div className="cd-stats-tile-v">⭐ {stats.totals.stars}</div>
                            </div>
                        </div>

                        <h3 className="cd-stats-h3">Activities this class</h3>
                        {stats.activities.length === 0 ? (
                            <p className="cd-stats-empty">No activities played yet.</p>
                        ) : (
                            <ul className="cd-stats-list">
                                {stats.activities.map((a) => {
                                    const label = MODE_LABELS[a.activity];
                                    const total = (a.rounds ?? []).reduce((s, r) => s + (r.stars ?? 0), 0);
                                    return (
                                        <li key={a.session_activity_id}>
                                            <span className="cd-stats-list-icon">{label?.icon ?? '🎮'}</span>
                                            <span className="cd-stats-list-name">{label?.title ?? a.activity}</span>
                                            <span className="cd-stats-list-meta">
                                                {a.rounds?.length ?? 0} round{(a.rounds?.length ?? 0) === 1 ? '' : 's'} · ⭐ {total}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                ) : (
                    <div className="cd-stats-loading">Loading…</div>
                )}

                <footer className="cd-modal-footer">
                    <button className="cm-btn-danger-outline" onClick={onKick}>Remove from class</button>
                    <button className="cm-btn-secondary" onClick={onClose}>Close</button>
                </footer>
            </div>
        </div>
    );
}

// ── Class summary ──────────────────────────────────────────────────
function ClassSummaryView({ sessionId, onDone, userName, userAvatarUrl, onSignOut }: {
    sessionId: string; onDone: () => void;
    userName: string; userAvatarUrl?: string; onSignOut: () => Promise<void>;
}) {
    const [summary, setSummary] = useState<ClassSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await conductorApi.summary<ClassSummary>(sessionId);
                if (!cancelled) setSummary(data);
            } catch (e) {
                if (!cancelled) setError((e as Error).message);
            }
        })();
        return () => { cancelled = true; };
    }, [sessionId]);

    return (
        <div className="cm-page cd-page">
            <ConductorTopBar userName={userName} userAvatarUrl={userAvatarUrl} onSignOut={onSignOut} />
            <div className="cd-summary">
                <div className="cd-summary-hero">
                    <h1>Great class!</h1>
                    {summary?.session.duration_minutes != null && (
                        <p className="cd-summary-sub">
                            {summary.session.duration_minutes} minutes · {summary.totals?.students_total ?? 0} students · {summary.totals?.rounds_completed ?? 0} rounds
                        </p>
                    )}
                </div>

                {error && <div className="cd-error">{error}</div>}

                {summary && (
                    <>
                        {summary.activities && summary.activities.length > 0 && (
                            <div className="cd-summary-section">
                                <h2>What we did</h2>
                                <ul className="cd-stats-list">
                                    {summary.activities.map((a) => {
                                        const label = MODE_LABELS[a.activity];
                                        const dur = a.duration_seconds ? Math.round(a.duration_seconds / 60) : null;
                                        return (
                                            <li key={a.ordinal}>
                                                <span className="cd-stats-list-icon">{label?.icon ?? '🎮'}</span>
                                                <span className="cd-stats-list-name">{label?.title ?? a.activity}</span>
                                                <span className="cd-stats-list-meta">
                                                    {dur != null ? `${dur} min` : 'short'} · avg ⭐ {a.avg_stars ?? '-'}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {summary.students && summary.students.length > 0 && (
                            <div className="cd-summary-section">
                                <h2>Class roster</h2>
                                <ul className="cd-summary-students">
                                    {summary.students.map((s) => {
                                        const av = avatarFromSeed(s.avatar_seed);
                                        return (
                                            <li key={s.student_id}>
                                                <span className="cd-avatar" style={{ background: av.color }}>{av.emoji}</span>
                                                <span className="cd-summary-student-name">{s.name}</span>
                                                <span className="cd-summary-student-meta">⭐ {s.stars} · {s.rounds} rounds</span>
                                                {s.kicked && <span className="cd-summary-student-tag">left early</span>}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
                    <button className="cm-btn-primary" onClick={onDone}>Back to dashboard</button>
                    <button className="cm-btn-secondary" onClick={() => window.print()}>Print summary</button>
                </div>
            </div>
        </div>
    );
}

// ── Assign Activities Modal ──────────────────────────────────────
function AssignActivitiesModal({ sessionId, student, studentIds, onSave, onSetDefaults, onClose }: {
    sessionId: string;
    student: StudentRow | null;
    studentIds: string[] | null;
    onSave: (activities: AssignActivityRequest[]) => Promise<void>;
    onSetDefaults: (activities: string[]) => Promise<void>;
    onClose: () => void;
}) {
    const [selected, setSelected] = useState<Set<GameModeId>>(new Set(SCOREABLE_MODES));
    const [order, setOrder] = useState<GameModeId[]>([...SCOREABLE_MODES]);
    const [saving, setSaving] = useState(false);
    // When editing a single student, preload their CURRENT assignment so the
    // teacher sees and edits what's actually assigned (not a blank "all").
    const [loading, setLoading] = useState<boolean>(Boolean(student));

    useEffect(() => {
        if (!student) { setLoading(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const existing = await joinApi.getStudentAssignments(student.id, sessionId);
                if (cancelled || !existing || existing.length === 0) return;
                const enabled = existing
                    .filter((a) => a.is_enabled)
                    .sort((a, b) => a.sequence_order - b.sequence_order)
                    .map((a) => a.activity as GameModeId)
                    .filter((a) => SCOREABLE_MODES.includes(a));
                if (enabled.length > 0) {
                    setSelected(new Set(enabled));
                    setOrder([...enabled, ...SCOREABLE_MODES.filter((m) => !enabled.includes(m))]);
                }
            } catch { /* keep the all-selected default on any error */ }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [student, sessionId]);

    const toggle = (mode: GameModeId) => {
        const next = new Set(selected);
        if (next.has(mode)) {
            if (next.size > 1) next.delete(mode);
        } else {
            next.add(mode);
        }
        setSelected(next);
        setOrder((cur) => {
            if (cur.includes(mode)) return cur;
            return [...cur, mode];
        });
    };

    const moveUp = (mode: GameModeId) => {
        const idx = order.indexOf(mode);
        if (idx <= 0) return;
        const next = [...order];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        setOrder(next);
    };

    const moveDown = (mode: GameModeId) => {
        const idx = order.indexOf(mode);
        if (idx < 0 || idx >= order.length - 1) return;
        const next = [...order];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        setOrder(next);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const activities = order
                .filter((a) => selected.has(a))
                .map((a, i) => ({ activity: a, sequence_order: i }));
            await onSave(activities);
        } finally {
            setSaving(false);
        }
    };

    const handleSetDefault = async () => {
        setSaving(true);
        try {
            await onSetDefaults(order.filter((a) => selected.has(a)));
        } finally {
            setSaving(false);
        }
    };

    const label = student ? `${student.name}` : `${studentIds?.length ?? 0} students`;

    return (
        <div className="cd-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cd-modal cd-modal-wide">
                <header className="cd-modal-header">
                    <div>
                        <h2>Assign activities</h2>
                        <p className="cd-modal-sub">{loading ? 'Loading current activities…' : label}</p>
                    </div>
                    <button className="cd-modal-close" onClick={onClose} aria-label="Close">✕</button>
                </header>

                <div className="cd-assign-grid">
                    {SCOREABLE_MODES.map((modeId) => {
                        const mode = MODE_LABELS[modeId];
                        const isOn = selected.has(modeId);
                        return (
                            <button
                                key={modeId}
                                type="button"
                                className={`cd-assign-card ${isOn ? 'cd-assign-on' : 'cd-assign-off'}`}
                                onClick={() => toggle(modeId)}
                            >
                                <span className="cd-assign-icon">{mode.icon}</span>
                                <span className="cd-assign-name">{mode.title}</span>
                                {isOn && (
                                    <span className="cd-assign-order">
                                        #{order.indexOf(modeId) + 1}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {selected.size > 1 && (
                    <div className="cd-assign-order-section">
                        <h3>Reorder activities</h3>
                        <div className="cd-assign-order-list">
                            {order.filter((a) => selected.has(a)).map((modeId) => {
                                const mode = MODE_LABELS[modeId];
                                return (
                                    <div key={modeId} className="cd-assign-order-row">
                                        <span className="cd-assign-order-icon">{mode.icon}</span>
                                        <span className="cd-assign-order-name">{mode.title}</span>
                                        <div className="cd-assign-order-btns">
                                            <button onClick={() => moveUp(modeId)} disabled={order.indexOf(modeId) === 0}>▲</button>
                                            <button onClick={() => moveDown(modeId)} disabled={order.indexOf(modeId) >= order.length - 1}>▼</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <footer className="cd-modal-footer">
                    <button className="cm-btn-secondary" onClick={handleSetDefault} disabled={saving || loading || selected.size === 0}>
                        {saving ? 'Saving…' : 'Save as classroom default'}
                    </button>
                    <div style={{ flex: 1 }} />
                    <button className="cm-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="cm-btn-primary" onClick={handleSave} disabled={saving || loading || selected.size === 0}>
                        {saving ? 'Saving…' : 'Assign'}
                    </button>
                </footer>
            </div>
        </div>
    );
}

// silence the unused-var lint when no studentForStats animation timer is in use
void avatarForStudent;
