/**
 * Live Round Screen — teacher view during active gameplay.
 * Shows countdown timer, live leaderboard, student status grid.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dbSelect, dbUpdate, subscribeToTable } from '../../lib/supabase';
import { MODE_LABELS } from '../../features/classmode/scoreMapping';
import type { GameModeId } from '../../features/classmode/scoreMapping';
import './classmode.css';

interface SessionRow {
  id: string;
  activity: string;
  status: string;
  round: number;
  timer_seconds: number;
}

interface StudentRow {
  id: string;
  name: string;
}

interface ScoreRow {
  id: string;
  student_id: string;
  round: number;
  stars: number;
  raw_score: number;
}

interface LeaderboardEntry {
  studentId: string;
  name: string;
  totalStars: number;
  roundStars: number;
  finished: boolean;
}

export default function LiveRoundScreen() {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sessionId = new URLSearchParams(window.location.search).get('session');

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    dbSelect<SessionRow>('sessions', `id=eq.${sessionId}`, { single: true }).then(({ data }) => {
      if (data) {
        setSession(data);
        if (data.timer_seconds > 0) setTimeLeft(data.timer_seconds);
      }
    });
  }, [sessionId]);

  // Load students
  useEffect(() => {
    if (!sessionId) return;
    dbSelect<StudentRow[]>('session_students', `session_id=eq.${sessionId}`).then(({ data }) => {
      if (data) setStudents(data);
    });
  }, [sessionId]);

  // Load all scores for this session (cumulative)
  useEffect(() => {
    if (!sessionId) return;
    dbSelect<ScoreRow[]>('round_scores', `session_id=eq.${sessionId}`).then(({ data }) => {
      if (data) setScores(data);
    });
  }, [sessionId]);

  // Subscribe to new scores
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToTable(
      `scores-${sessionId}`,
      'round_scores',
      'INSERT',
      (payload) => {
        const score = payload.new as unknown as ScoreRow;
        setScores((prev) => {
          if (prev.some(s => s.id === score.id)) return prev;
          return [...prev, score];
        });
      },
      `session_id=eq.${sessionId}`,
    );
    return unsub;
  }, [sessionId]);

  // Timer countdown
  useEffect(() => {
    if (!session || session.timer_seconds === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer expired — end round
          if (timerRef.current) clearInterval(timerRef.current);
          handleEndRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  const handleEndRound = useCallback(async () => {
    if (!session) return;
    if (timerRef.current) clearInterval(timerRef.current);
    await dbUpdate('sessions', { status: 'results' }, `id=eq.${session.id}`);
    window.history.pushState({}, '', `/class/results?session=${session.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [session]);

  if (!session) {
    return (
      <div className="cm-page"><div className="cm-student-page"><div className="cm-waiting-spinner" /></div></div>
    );
  }

  // Build leaderboard
  const currentRound = session.round;

  const leaderboard: LeaderboardEntry[] = students.map((s) => {
    const studentScores = scores.filter(sc => sc.student_id === s.id);
    const totalStars = studentScores.reduce((sum, sc) => sum + sc.stars, 0);
    const roundScore = studentScores.find(sc => sc.round === currentRound);
    return {
      studentId: s.id,
      name: s.name,
      totalStars,
      roundStars: roundScore?.stars || 0,
      finished: !!roundScore,
    };
  }).sort((a, b) => b.totalStars - a.totalStars);

  // Timer display
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerClass = timeLeft <= 10 ? 'critical' : timeLeft <= 30 ? 'warning' : '';
  const timerPct = session.timer_seconds > 0 ? (timeLeft / session.timer_seconds) * 100 : 100;

  const finishedCount = leaderboard.filter(e => e.finished).length;
  const modeLabel = MODE_LABELS[session.activity as GameModeId];

  function renderStars(count: number) {
    return '⭐'.repeat(Math.min(count, 5));
  }

  return (
    <div className="cm-page">
      <div className="cm-topbar">
        <div className="cm-topbar-left">
          <span className="cm-topbar-title">
            {modeLabel?.icon} {modeLabel?.title} — Round {currentRound}
          </span>
        </div>
        <div className="cm-topbar-right">
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            {finishedCount}/{students.length} finished
          </span>
        </div>
      </div>

      <div className="cm-live-round">
        {/* Timer */}
        {session.timer_seconds > 0 && (
          <div className="cm-timer-bar">
            <div className={`cm-timer-value ${timerClass}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="cm-timer-progress">
              <div className="cm-timer-progress-fill" style={{ width: `${timerPct}%` }} />
            </div>
          </div>
        )}

        {/* Status dots */}
        <div className="cm-status-grid">
          {leaderboard.map((entry) => (
            <div
              key={entry.studentId}
              className={`cm-status-dot ${entry.finished ? 'finished' : 'playing'}`}
              title={`${entry.name}: ${entry.finished ? 'finished' : 'playing'}`}
            />
          ))}
        </div>

        {/* Leaderboard */}
        <div className="cm-leaderboard">
          {leaderboard.map((entry, i) => {
            const rank = i + 1;
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            return (
              <div key={entry.studentId} className={`cm-leaderboard-row${rank <= 3 ? ' top-3' : ''}`}>
                <div className={`cm-rank ${rankClass}`}>{rank}</div>
                <div className="cm-lb-name">{entry.name}</div>
                <div className="cm-lb-stars">{renderStars(entry.totalStars)}</div>
                <div className="cm-lb-score">{entry.totalStars} pts</div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="cm-round-actions">
          <button className="cm-btn-danger" onClick={handleEndRound}>
            End Round
          </button>
        </div>
      </div>
    </div>
  );
}
