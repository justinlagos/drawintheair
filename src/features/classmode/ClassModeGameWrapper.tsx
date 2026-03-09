/**
 * ClassModeGameWrapper — wraps any game mode for Class Mode.
 * Polls the game's score getter, and when the round ends (timer or teacher action),
 * captures final score, converts to stars, and submits to Supabase.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getRawScore, rawToStars } from './scoreMapping';
import { dbInsert, subscribeToTable } from '../../lib/supabase';
import type { GameModeId } from './scoreMapping';

interface ClassModeGameWrapperProps {
  sessionId: string;
  studentId: string;
  activity: GameModeId;
  round: number;
  timerSeconds: number;
  children: React.ReactNode;
  onRoundEnd: (stars: number) => void;
}

export default function ClassModeGameWrapper({
  sessionId,
  studentId,
  activity,
  round,
  timerSeconds,
  children,
  onRoundEnd,
}: ClassModeGameWrapperProps) {
  const [timeLeft, setTimeLeft] = useState(timerSeconds > 0 ? timerSeconds : 0);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

  // Poll game score every 2 seconds
  useEffect(() => {
    const poll = setInterval(() => {
      scoreRef.current = getRawScore(activity);
    }, 2000);
    return () => clearInterval(poll);
  }, [activity]);

  // Countdown timer
  useEffect(() => {
    if (timerSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          submitScore();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerSeconds]);

  // Listen for session status change (teacher ends round)
  useEffect(() => {
    const unsub = subscribeToTable(
      `game-${sessionId}`,
      'sessions',
      'UPDATE',
      (payload) => {
        const updated = payload.new as { status?: string };
        if (updated.status === 'results' || updated.status === 'ended') {
          submitScore();
        }
      },
      `id=eq.${sessionId}`,
    );
    return unsub;
  }, [sessionId]);

  const submitScore = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);

    if (timerRef.current) clearInterval(timerRef.current);

    // Final score capture
    const finalRaw = getRawScore(activity);
    const stars = rawToStars(activity, finalRaw);

    // Submit to database
    await dbInsert('round_scores', {
      session_id: sessionId,
      student_id: studentId,
      round,
      stars,
      raw_score: finalRaw,
      activity,
    });

    onRoundEnd(stars);
  }, [submitted, activity, sessionId, studentId, round, onRoundEnd]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Timer overlay */}
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
