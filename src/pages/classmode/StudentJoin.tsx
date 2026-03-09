/**
 * Student Join Flow — code entry → name entry → waiting room.
 * No account required. Students join with a 4-digit code + first name.
 */

import React, { useState, useRef, useEffect } from 'react';
import { dbSelect, dbInsert, subscribeToTable } from '../../lib/supabase';
import { isValidCode } from '../../features/classmode/sessionCode';
import { MODE_LABELS } from '../../features/classmode/scoreMapping';
import type { GameModeId } from '../../features/classmode/scoreMapping';
import './classmode.css';

type JoinStep = 'code' | 'name' | 'waiting' | 'playing' | 'results';

interface SessionRow {
  id: string;
  code: string;
  activity: string;
  status: string;
  round: number;
  timer_seconds: number;
}

export default function StudentJoin() {
  const [step, setStep] = useState<JoinStep>('code');
  const [digits, setDigits] = useState(['', '', '', '']);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState<SessionRow | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentStars] = useState(0);
  const [studentRank] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle digit input — auto-advance focus
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError('');

    // Auto-advance
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Submit code
  const handleCodeSubmit = async () => {
    const code = digits.join('');
    if (!isValidCode(code)) {
      setError('Enter a 4-digit code');
      return;
    }

    const { data, error: fetchErr } = await dbSelect<SessionRow[]>(
      'sessions',
      `code=eq.${code}&status=neq.ended&limit=1`
    );

    if (fetchErr || !data || data.length === 0) {
      setError('No active session found with that code');
      return;
    }

    setSession(data[0]);
    setStep('name');
  };

  // Submit name and join
  const handleNameSubmit = async () => {
    if (!name.trim()) {
      setError('Enter your first name');
      return;
    }
    if (!session) return;

    // Try to join
    let joinName = name.trim();
    const { data, error: insertErr } = await dbInsert<{ id: string }>(
      'session_students',
      { session_id: session.id, name: joinName },
      { single: true }
    );

    if (insertErr) {
      // Name taken — append number
      if (insertErr.code === '23505') {
        for (let i = 2; i <= 9; i++) {
          const altName = `${joinName}${i}`;
          const retry = await dbInsert<{ id: string }>(
            'session_students',
            { session_id: session.id, name: altName },
            { single: true }
          );
          if (retry.data) {
            joinName = altName;
            setStudentId(retry.data.id);
            break;
          }
        }
        if (!studentId) {
          setError('Could not join — try a different name');
          return;
        }
      } else {
        setError(insertErr.message);
        return;
      }
    } else if (data) {
      setStudentId(data.id);
    }

    // Store in sessionStorage for reconnect
    sessionStorage.setItem('cm_session_id', session.id);
    sessionStorage.setItem('cm_student_name', joinName);

    // Go to waiting or straight to playing if round is live
    if (session.status === 'playing') {
      setStep('playing');
    } else {
      setStep('waiting');
    }
  };

  // Subscribe to session status changes
  useEffect(() => {
    if (!session) return;

    const unsub = subscribeToTable(
      `student-session-${session.id}`,
      'sessions',
      'UPDATE',
      (payload) => {
        const updated = payload.new as unknown as SessionRow;
        setSession(updated);

        if (updated.status === 'playing' && (step === 'waiting' || step === 'results')) {
          setStep('playing');
        } else if (updated.status === 'results' && step === 'playing') {
          setStep('results');
        } else if (updated.status === 'lobby' && step === 'results') {
          setStep('waiting');
        } else if (updated.status === 'ended') {
          setStep('code');
          setSession(null);
          setStudentId(null);
          setDigits(['', '', '', '']);
        }
      },
      `id=eq.${session.id}`,
    );

    return unsub;
  }, [session, step]);

  // When playing — navigate to StudentGameScreen
  useEffect(() => {
    if (step === 'playing' && session && studentId) {
      // Store game params
      sessionStorage.setItem('cm_student_id', studentId);
      sessionStorage.setItem('cm_session_id', session.id);
      sessionStorage.setItem('cm_activity', session.activity);
      sessionStorage.setItem('cm_round', String(session.round));
      sessionStorage.setItem('cm_timer', String(session.timer_seconds));

      window.history.pushState({}, '', `/join/play`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [step, session, studentId]);

  const modeLabel = session ? MODE_LABELS[session.activity as GameModeId] : null;

  return (
    <div className="cm-page">
      <div className="cm-student-page">
        {/* Step 1: Code entry */}
        {step === 'code' && (
          <div className="cm-join-card">
            <h2>Join Class</h2>
            <p style={{ color: '#94a3b8', marginBottom: 20 }}>Enter the code from your teacher's screen</p>
            <div className="cm-code-inputs">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  className="cm-code-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {error && <div className="cm-error">{error}</div>}
            <button
              className="cm-btn-primary"
              style={{ width: '100%' }}
              onClick={handleCodeSubmit}
              disabled={digits.some(d => !d)}
            >
              Join
            </button>
          </div>
        )}

        {/* Step 2: Name entry */}
        {step === 'name' && (
          <div className="cm-join-card">
            <h2>What's your name?</h2>
            <p style={{ color: '#94a3b8', marginBottom: 20 }}>
              Joining {modeLabel?.icon} {modeLabel?.title}
            </p>
            <input
              className="cm-name-input"
              type="text"
              placeholder="First name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              maxLength={20}
              autoFocus
            />
            {error && <div className="cm-error">{error}</div>}
            <button
              className="cm-btn-primary"
              style={{ width: '100%' }}
              onClick={handleNameSubmit}
              disabled={!name.trim()}
            >
              Join Game
            </button>
          </div>
        )}

        {/* Step 3: Waiting room */}
        {step === 'waiting' && (
          <div className="cm-waiting">
            <div className="cm-waiting-spinner" />
            <h3>You're in!</h3>
            <p>Waiting for your teacher to start the round...</p>
            <p style={{ color: '#6c47ff', fontWeight: 700 }}>
              {modeLabel?.icon} {modeLabel?.title}
            </p>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && (
          <div className="cm-student-result" style={{ position: 'relative' }}>
            <h2>Round Complete!</h2>
            <div className="cm-your-stars">{studentStars > 0 ? '⭐'.repeat(studentStars) : '⭐'}</div>
            {studentRank > 0 && (
              <div className="cm-your-rank">You placed #{studentRank}</div>
            )}
            <p style={{ color: '#94a3b8', marginTop: 16 }}>Waiting for next round...</p>
            <div className="cm-waiting-spinner" style={{ marginTop: 16 }} />
          </div>
        )}
      </div>
    </div>
  );
}
