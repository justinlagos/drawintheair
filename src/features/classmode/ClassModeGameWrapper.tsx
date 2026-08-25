/**
 * ClassModeGameWrapper, wraps any game mode for Class Mode.
 * Polls the game's score getter, and when the round ends, captures the
 * final score, converts to stars, and submits to Supabase.
 *
 * Score integrity (P0 incident 2026-07-09): the previous version only
 * submitted when sessions.status flipped to 'results'/'ended' — but
 * class_end_activity moves the session back to 'lobby', so every score a
 * teacher ended manually was silently lost. Submission now fires on ALL
 * terminal paths:
 *   - the round timer expires
 *   - the session_activity state becomes 'ended' or 'results' (prop-driven
 *     from the student client, which reconciles by poll AND realtime)
 *   - the sessions row flips to results/ended (legacy realtime path, kept)
 *   - the wrapper unmounts while the round is unsubmitted (teacher ended
 *     the activity / class, or the student was kicked)
 *
 * Idempotency: a ref guard (not React state) makes double events safe, and
 * the DB's UNIQUE(session_id, student_id, round) constraint is the server
 * backstop. `round` is now the activity ordinal, so each activity in a
 * session gets its own row (round=1 for everything previously collided
 * with that constraint and lost every score after the first activity).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getRawScore, rawToStars } from './scoreMapping';
import { buildRoundScoreRow, createOnceGuard } from './roundScore';
import { dbInsert, subscribeToTable } from '../../lib/supabase';
import type { GameModeId } from './scoreMapping';
import type { ActivityState } from './conductor/types';

interface ClassModeGameWrapperProps {
  sessionId: string;
  studentId: string;
  /** session_activities.id for this round — stored on the score row so
   *  results can be grouped per activity. */
  sessionActivityId?: string;
  /** Live activity state from the student client; 'ended'/'results'
   *  triggers submission even if no websocket event ever arrives. */
  activityState?: ActivityState;
  activity: GameModeId;
  round: number;
  timerSeconds: number;
  children: React.ReactNode;
  onRoundEnd: (stars: number) => void;
  /** Pause the countdown, used while the camera explainer is on screen,
   *  the camera is still being acquired, or the teacher has paused. The
   *  wrapper stays mounted through pause so timeLeft survives resume. */
  freeze?: boolean;
}

export default function ClassModeGameWrapper({
  sessionId,
  studentId,
  sessionActivityId,
  activityState,
  activity,
  round,
  timerSeconds,
  children,
  onRoundEnd,
  freeze = false,
}: ClassModeGameWrapperProps) {
  const [timeLeft, setTimeLeft] = useState(timerSeconds > 0 ? timerSeconds : 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  // Idempotency guard. A synchronous once-guard held in a ref, not React
  // state: state updates are async and a burst of terminal events (timer +
  // activity-ended prop + realtime echo + unmount) could otherwise race
  // through a state-based `submitted` check and insert duplicate rows.
  const onceRef = useRef(createOnceGuard());
  const startedAtRef = useRef(Date.now());

  // Poll game score every 2 seconds
  useEffect(() => {
    const poll = setInterval(() => {
      scoreRef.current = getRawScore(activity);
    }, 2000);
    return () => clearInterval(poll);
  }, [activity]);

  const submitScore = useCallback(async () => {
    if (!onceRef.current.tryAcquire()) return;

    if (timerRef.current) clearInterval(timerRef.current);

    // Final score capture → typed insert payload (round = activity
    // ordinal, session_activity_id attached, duration + completed set).
    const finalRaw = getRawScore(activity);
    const row = buildRoundScoreRow({
      sessionId,
      studentId,
      sessionActivityId,
      round,
      activity,
      rawScore: finalRaw,
      stars: rawToStars(activity, finalRaw),
      startedAtMs: startedAtRef.current,
      nowMs: Date.now(),
    });

    // Submit to database. UNIQUE(session_id, student_id, round) makes a
    // duplicate insert a safe no-op error rather than a double count.
    await dbInsert('round_scores', row as unknown as Record<string, unknown>);

    onRoundEnd(row.stars);
  }, [activity, sessionId, studentId, sessionActivityId, round, onRoundEnd]);

  // Keep a stable handle for the unmount submitter so the cleanup effect
  // below can run with an empty dep array (true unmount only).
  const submitRef = useRef(submitScore);
  useEffect(() => { submitRef.current = submitScore; }, [submitScore]);

  // Countdown timer, held while `freeze` is true so the timer doesn't
  // burn down while the camera explainer covers the game or the teacher
  // has paused. timeLeft state survives freeze/unfreeze cycles.
  useEffect(() => {
    if (timerSeconds <= 0) return;
    if (freeze) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          void submitScore();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerSeconds, freeze, submitScore]);

  // Terminal path 1: the activity row this round belongs to was ended by
  // the teacher (End Activity / End Class both end the row server-side).
  // Prop-driven, so it works even with realtime fully down.
  useEffect(() => {
    if (activityState === 'ended' || activityState === 'results') {
      void submitScore();
    }
  }, [activityState, submitScore]);

  // Terminal path 2 (legacy fast path, kept): sessions.status flips.
  useEffect(() => {
    const unsub = subscribeToTable(
      `game-${sessionId}`,
      'sessions',
      'UPDATE',
      (payload) => {
        const updated = payload.new as { status?: string };
        if (updated.status === 'results' || updated.status === 'ended') {
          void submitScore();
        }
      },
      `id=eq.${sessionId}`,
    );
    return unsub;
  }, [sessionId, submitScore]);

  // Terminal path 3: unmount with an unsubmitted round. Covers teacher
  // End Activity/End Class transitions that swap the student screen before
  // any other path fired, and kicks mid-round.
  useEffect(() => {
    return () => {
      if (!onceRef.current.acquired()) void submitRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Timer overlay — top-right; the student name pip lives top-left
          (conductor.css .cd-student-pip) so the two can never collide. */}
      {timerSeconds > 0 && (
        <div style={{
          position: 'fixed',
          top: 12,
          right: 16,
          zIndex: 500,
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 12,
          padding: '6px 14px',
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 800,
          fontSize: '1.1rem',
          color: timeLeft <= 10 ? '#ef4444' : timeLeft <= 30 ? '#fbbf24' : '#22d3ee',
        }}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      )}

      {/* Game content */}
      {children}
    </div>
  );
}
