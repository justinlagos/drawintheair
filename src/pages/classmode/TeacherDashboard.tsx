/**
 * Teacher Dashboard — entry point for Class Mode.
 * Auth-gated: shows sign-in card if not authenticated.
 * Authenticated: shows activity picker + session history.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbSelect, dbInsert } from '../../lib/supabase';
import { generateSessionCode } from '../../features/classmode/sessionCode';
import { MODE_LABELS, SCOREABLE_MODES } from '../../features/classmode/scoreMapping';
import type { GameModeId } from '../../features/classmode/scoreMapping';
import './classmode.css';

const platformUrl = import.meta.env.VITE_PLATFORM_URL || 'https://app.drawintheair.com';

interface SessionRow {
  id: string;
  activity: string;
  status: string;
  round: number;
  created_at: string;
  ended_at: string | null;
}

export default function TeacherDashboard() {
  const { user, loading, signIn, signOut } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState<GameModeId | null>(null);
  const [creating, setCreating] = useState(false);
  const [history, setHistory] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load session history
  useEffect(() => {
    if (!user) return;
    dbSelect<SessionRow[]>('sessions', `teacher_id=eq.${user.id}&order=created_at.desc&limit=20`).then(
      ({ data }) => { if (data) setHistory(data); }
    );
  }, [user]);

  // Create session and navigate to lobby
  const handleCreateSession = async () => {
    if (!selectedActivity || !user) return;
    setCreating(true);
    setError(null);

    const code = generateSessionCode();
    const { data, error: insertError } = await dbInsert<SessionRow>('sessions', {
      teacher_id: user.id,
      code,
      activity: selectedActivity,
      status: 'lobby',
      round: 1,
      timer_seconds: 90,
    }, { single: true });

    if (insertError) {
      // Provide user-friendly error messages
      let userMessage = 'Failed to create session. Please try again.';
      if (insertError.message.includes('recursion') || insertError.message.includes('policy')) {
        userMessage = 'Session creation is temporarily unavailable. Please try again in a moment.';
      }
      setError(userMessage);
      setCreating(false);
      return;
    }

    if (data) {
      window.history.pushState({}, '', `/class/lobby?session=${data.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    setCreating(false);
  };

  // Retry creating a session
  const handleRetry = () => {
    setError(null);
    setRetryCount(retryCount + 1);
    handleCreateSession();
  };

  if (loading) {
    return (
      <div className="cm-page">
        <div className="cm-student-page">
          <div className="cm-waiting-spinner" />
        </div>
      </div>
    );
  }

  // Not signed in — show sign-in card
  if (!user) {
    return (
      <div className="cm-page">
        <div className="cm-dashboard">
          <div className="cm-dashboard-hero">
            <h1>Class Mode</h1>
            <p>Turn your classroom into a live, interactive learning experience</p>
          </div>
          <div className="cm-sign-in-card">
            <h2>Teacher Sign In</h2>
            <p>Sign in with your Google account to start a Class Mode session.</p>
            <button className="cm-btn-google" onClick={() => signIn()}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.01 24.01 0 000 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.user_metadata.full_name || user.user_metadata.name || user.email;
  const avatarUrl = user.user_metadata.avatar_url || user.user_metadata.picture;

  return (
    <div className="cm-page">
      {/* Topbar */}
      <div className="cm-topbar">
        <div className="cm-topbar-left">
          <span className="cm-topbar-title">Class Mode</span>
          <a href={`${platformUrl}/auth/login?redirect=/dashboard`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '16px', fontSize: '0.85rem', color: '#8b5cf6', textDecoration: 'none' }}>
            → Full Dashboard
          </a>
        </div>
        <div className="cm-topbar-right">
          {avatarUrl && <img className="cm-avatar" src={avatarUrl} alt="" />}
          <span className="cm-user-name">{displayName}</span>
          <button className="cm-btn-secondary" onClick={signOut} style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="cm-dashboard">
        <div className="cm-dashboard-hero">
          <h1>Start a Session</h1>
          <p>Pick an activity, then share the code with your class</p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '24px',
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            color: '#7f1d1d'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Error:</strong> {error}
            </div>
            <button
              onClick={handleRetry}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Activity picker */}
        <div className="cm-activity-grid">
          {SCOREABLE_MODES.map((modeId) => {
            const mode = MODE_LABELS[modeId];
            return (
              <button
                key={modeId}
                type="button"
                className={`cm-activity-card${selectedActivity === modeId ? ' selected' : ''}`}
                onClick={() => setSelectedActivity(modeId)}
              >
                <div className="cm-activity-icon" aria-hidden>{mode.icon}</div>
                <div className="cm-activity-name">{mode.title}</div>
                <div className="cm-activity-subtitle">{mode.subtitle}</div>
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            className="cm-btn-primary"
            disabled={!selectedActivity || creating}
            onClick={handleCreateSession}
          >
            {creating ? 'Creating...' : 'Start Class Mode'}
          </button>
        </div>

        {/* Session history */}
        {history.length > 0 && (
          <div className="cm-history">
            <h3>Recent Sessions</h3>
            <div className="cm-history-list">
              {history.map((s) => {
                const label = MODE_LABELS[s.activity as GameModeId];
                const date = new Date(s.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                });
                return (
                  <div key={s.id} className="cm-history-item">
                    <div>
                      <span style={{ marginRight: 8 }}>{label?.icon || '🎮'}</span>
                      <strong>{label?.title || s.activity}</strong>
                    </div>
                    <div className="cm-history-meta">
                      <span>{s.round} round{s.round !== 1 ? 's' : ''}</span>
                      <span>{s.status}</span>
                      <span>{date}</span>
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
