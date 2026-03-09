/**
 * Results Screen — shown after each round.
 * Podium for top 3, round stats, and next actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { dbSelect, dbUpdate } from '../../lib/supabase';
import { MODE_LABELS, SCOREABLE_MODES } from '../../features/classmode/scoreMapping';
import type { GameModeId } from '../../features/classmode/scoreMapping';
import './classmode.css';

interface SessionRow {
  id: string;
  activity: string;
  round: number;
  timer_seconds: number;
}

interface StudentRow {
  id: string;
  name: string;
}

interface ScoreRow {
  student_id: string;
  round: number;
  stars: number;
  raw_score: number;
}

interface LeaderEntry {
  name: string;
  totalStars: number;
  currentRoundStars: number;
}

export default function ResultsScreen() {
  const [session, setSession] = useState<SessionRow | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [avgStars, setAvgStars] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [changingActivity, setChangingActivity] = useState(false);
  const [selectedNewActivity, setSelectedNewActivity] = useState<GameModeId | null>(null);

  const sessionId = new URLSearchParams(window.location.search).get('session');

  useEffect(() => {
    if (!sessionId) return;
    loadData();
  }, [sessionId]);

  async function loadData() {
    if (!sessionId) return;

    const [sessionRes, studentsRes, scoresRes] = await Promise.all([
      dbSelect<SessionRow>('sessions', `id=eq.${sessionId}`, { single: true }),
      dbSelect<StudentRow[]>('session_students', `session_id=eq.${sessionId}`),
      dbSelect<ScoreRow[]>('round_scores', `session_id=eq.${sessionId}`),
    ]);

    const sess = sessionRes.data;
    const students = studentsRes.data || [];
    const scores = scoresRes.data || [];

    if (sess) setSession(sess);

    // Build leaderboard
    const entries: LeaderEntry[] = students.map((s) => {
      const studentScores = scores.filter(sc => sc.student_id === s.id);
      const totalStars = studentScores.reduce((sum, sc) => sum + sc.stars, 0);
      const currentRound = studentScores.find(sc => sc.round === sess?.round);
      return {
        name: s.name,
        totalStars,
        currentRoundStars: currentRound?.stars || 0,
      };
    }).sort((a, b) => b.totalStars - a.totalStars);

    setLeaderboard(entries);

    // Stats for current round
    const currentRoundScores = scores.filter(sc => sc.round === sess?.round);
    setParticipantCount(currentRoundScores.length);
    if (currentRoundScores.length > 0) {
      const totalStarsRound = currentRoundScores.reduce((s, sc) => s + sc.stars, 0);
      setAvgStars(Math.round((totalStarsRound / currentRoundScores.length) * 10) / 10);
      setHighestScore(Math.max(...currentRoundScores.map(sc => sc.raw_score)));
    }
  }

  const handleNextRound = useCallback(async () => {
    if (!session) return;
    const newRound = session.round + 1;
    await dbUpdate('sessions', { round: newRound, status: 'lobby' }, `id=eq.${session.id}`);
    window.history.pushState({}, '', `/class/lobby?session=${session.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [session]);

  const handleChangeActivity = useCallback(async () => {
    if (!session || !selectedNewActivity) return;
    await dbUpdate('sessions', {
      activity: selectedNewActivity,
      round: session.round + 1,
      status: 'lobby',
    }, `id=eq.${session.id}`);
    window.history.pushState({}, '', `/class/lobby?session=${session.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [session, selectedNewActivity]);

  const handleEndSession = useCallback(async () => {
    if (!session) return;
    await dbUpdate('sessions', { status: 'ended', ended_at: new Date().toISOString() }, `id=eq.${session.id}`);
    window.history.pushState({}, '', '/class');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [session]);

  if (!session) {
    return (
      <div className="cm-page"><div className="cm-student-page"><div className="cm-waiting-spinner" /></div></div>
    );
  }

  const modeLabel = MODE_LABELS[session.activity as GameModeId];
  const top3 = leaderboard.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];

  function renderStars(count: number) {
    return '⭐'.repeat(Math.min(count, 5));
  }

  return (
    <div className="cm-page">
      <div className="cm-topbar">
        <div className="cm-topbar-left">
          <span className="cm-topbar-title">
            {modeLabel?.icon} {modeLabel?.title} — Round {session.round} Results
          </span>
        </div>
      </div>

      <div className="cm-results">
        <h2>Round Complete!</h2>

        {/* Podium */}
        {top3.length > 0 && (
          <div className="cm-podium">
            {/* Show in order: 2nd, 1st, 3rd for visual podium effect */}
            {[1, 0, 2].map((idx) => {
              const entry = top3[idx];
              if (!entry) return null;
              const place = idx === 0 ? 'first' : idx === 1 ? 'second' : 'third';
              return (
                <div key={idx} className={`cm-podium-slot ${place}`}>
                  <div className="cm-podium-medal">{medals[idx]}</div>
                  <div className="cm-podium-name">{entry.name}</div>
                  <div className="cm-podium-stars">{renderStars(entry.totalStars)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="cm-stats-row">
          <div className="cm-stat">
            <div className="cm-stat-value">{avgStars}</div>
            <div className="cm-stat-label">Avg Stars</div>
          </div>
          <div className="cm-stat">
            <div className="cm-stat-value">{highestScore}</div>
            <div className="cm-stat-label">Top Score</div>
          </div>
          <div className="cm-stat">
            <div className="cm-stat-value">{participantCount}</div>
            <div className="cm-stat-label">Played</div>
          </div>
        </div>

        {/* Full leaderboard */}
        <div className="cm-leaderboard" style={{ marginTop: 24, textAlign: 'left' }}>
          {leaderboard.map((entry, i) => {
            const rank = i + 1;
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            return (
              <div key={i} className={`cm-leaderboard-row${rank <= 3 ? ' top-3' : ''}`}>
                <div className={`cm-rank ${rankClass}`}>{rank}</div>
                <div className="cm-lb-name">{entry.name}</div>
                <div className="cm-lb-stars">{renderStars(entry.currentRoundStars)}</div>
                <div className="cm-lb-score">{entry.totalStars} total</div>
              </div>
            );
          })}
        </div>

        {/* Change activity modal */}
        {changingActivity && (
          <div style={{ marginTop: 24 }}>
            <p style={{ color: '#94a3b8', marginBottom: 12 }}>Pick a new activity:</p>
            <div className="cm-activity-grid">
              {SCOREABLE_MODES.map((modeId) => {
                const m = MODE_LABELS[modeId];
                return (
                  <div
                    key={modeId}
                    className={`cm-activity-card${selectedNewActivity === modeId ? ' selected' : ''}`}
                    onClick={() => setSelectedNewActivity(modeId)}
                  >
                    <span className="cm-activity-icon">{m.icon}</span>
                    <span className="cm-activity-name">{m.title}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="cm-btn-primary"
                disabled={!selectedNewActivity}
                onClick={handleChangeActivity}
              >
                Start with New Activity
              </button>
              <button className="cm-btn-secondary" onClick={() => setChangingActivity(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!changingActivity && (
          <div className="cm-results-actions">
            <button className="cm-btn-primary" onClick={handleNextRound}>
              Next Round
            </button>
            <button className="cm-btn-secondary" onClick={() => setChangingActivity(true)}>
              Change Activity
            </button>
            <button className="cm-btn-danger" onClick={handleEndSession}>
              End Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
