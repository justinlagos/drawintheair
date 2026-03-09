/**
 * Lobby Screen — teacher waits here while students join.
 * Shows large session code, live student grid, and "Start Round" button.
 */

import { useState, useEffect, useCallback } from 'react';
import { dbSelect, dbUpdate, subscribeToTable } from '../../lib/supabase';
import { MODE_LABELS } from '../../features/classmode/scoreMapping';
import type { GameModeId } from '../../features/classmode/scoreMapping';
import './classmode.css';

interface SessionRow {
  id: string;
  code: string;
  activity: string;
  status: string;
  round: number;
  timer_seconds: number;
  max_students: number;
}

interface StudentRow {
  id: string;
  name: string;
  joined_at: string;
}

export default function LobbyScreen() {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [starting, setStarting] = useState(false);

  // Get session ID from URL
  const sessionId = new URLSearchParams(window.location.search).get('session');

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    dbSelect<SessionRow>('sessions', `id=eq.${sessionId}`, { single: true }).then(({ data }) => {
      if (data) setSession(data);
    });
  }, [sessionId]);

  // Load existing students
  useEffect(() => {
    if (!sessionId) return;
    dbSelect<StudentRow[]>('session_students', `session_id=eq.${sessionId}&order=joined_at.asc`).then(({ data }) => {
      if (data) setStudents(data);
    });
  }, [sessionId]);

  // Subscribe to new student joins
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToTable(
      `lobby-${sessionId}`,
      'session_students',
      'INSERT',
      (payload) => {
        const student = payload.new as unknown as StudentRow;
        setStudents((prev) => {
          if (prev.some(s => s.id === student.id)) return prev;
          return [...prev, student];
        });
      },
      `session_id=eq.${sessionId}`,
    );
    return unsub;
  }, [sessionId]);

  // Start round
  const handleStartRound = useCallback(async () => {
    if (!session) return;
    setStarting(true);
    await dbUpdate('sessions', { status: 'playing' }, `id=eq.${session.id}`);
    // Navigate to live round
    window.history.pushState({}, '', `/class/round?session=${session.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [session]);

  // End session
  const handleEndSession = useCallback(async () => {
    if (!session) return;
    await dbUpdate('sessions', { status: 'ended', ended_at: new Date().toISOString() }, `id=eq.${session.id}`);
    window.history.pushState({}, '', '/class');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [session]);

  if (!session) {
    return (
      <div className="cm-page">
        <div className="cm-student-page">
          <div className="cm-waiting-spinner" />
          <p style={{ color: '#94a3b8', marginTop: 16 }}>Loading session...</p>
        </div>
      </div>
    );
  }

  const modeLabel = MODE_LABELS[session.activity as GameModeId];

  return (
    <div className="cm-page">
      <div className="cm-topbar">
        <div className="cm-topbar-left">
          <span className="cm-topbar-title">Class Mode — Lobby</span>
        </div>
        <div className="cm-topbar-right">
          <button className="cm-btn-danger" onClick={handleEndSession}>End Session</button>
        </div>
      </div>

      <div className="cm-lobby">
        {/* Session code */}
        <div className="cm-code-display">
          <div className="cm-code-label">Join Code</div>
          <div className="cm-code-digits">{session.code}</div>
        </div>

        <div className="cm-lobby-activity">
          {modeLabel?.icon} {modeLabel?.title || session.activity} — Round {session.round}
        </div>

        {/* Student count */}
        <div className="cm-student-count">
          {students.length} / {session.max_students} students joined
        </div>

        {/* Student grid */}
        <div className="cm-student-grid">
          {students.map((s) => (
            <div key={s.id} className="cm-student-chip">
              {s.name}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="cm-lobby-actions">
          <button
            className="cm-btn-primary"
            disabled={students.length === 0 || starting}
            onClick={handleStartRound}
          >
            {starting ? 'Starting...' : 'Start Round'}
          </button>
        </div>
      </div>
    </div>
  );
}
