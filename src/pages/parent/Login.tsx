/**
 * /parent/login. Welcome back screen.
 *
 * Two-column layout: brand + welcome copy + three trust bullets on the left,
 * sign-in card on the right. Matches the zip design directly.
 */

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BrandLogo } from '../../components/BrandLogo';
import { I } from './_shared';
import {
  signInWithEmail,
  signInWithGoogle,
  requestPasswordReset,
  hasPendingRecovery,
  updatePassword,
  setRoleIntent,
} from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { logEvent } from '../../lib/analytics';
import { logAuthEvent } from '../../lib/authEvents';
import { authFlags } from '../../lib/authFlags';
import './parent.css';

export default function ParentLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Same-origin path allow-list. Reject absolute URLs, protocol-relative URLs,
  // and anything that doesn't start with a single '/'. This blocks open-redirect
  // phishing via /parent/login?next=https://evil.com.
  const rawNext = params.get('next');
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/parent/dashboard';

  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayed, setStayed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Password recovery: the email link signs the user in silently and lands
  // here. Show a set-new-password card instead of the sign-in form.
  const [recoveryMode, setRecoveryMode] = useState(hasPendingRecovery());
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  useEffect(() => {
    if (hasPendingRecovery()) setRecoveryMode(true);
  }, [user]);

  async function handleSetNewPassword(e: FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setError('Please use at least 8 characters for your new password.'); return; }
    if (newPw !== newPw2) { setError('Those passwords do not match. Try again.'); return; }
    setLoading(true);
    setError(null);
    const result = await updatePassword(newPw);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    logEvent('parent_password_reset_completed');
    if (authFlags.authObservabilityV1) logAuthEvent('auth_password_reset_completed', { role: 'parent', outcome: 'success' });
    navigate(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return; // double-submit guard
    setLoading(true);
    setError(null);
    const result = await signInWithEmail(email, password);
    setLoading(false);
    if (!result.ok) {
      logEvent('parent_login_failed');
      if (authFlags.authObservabilityV1) logAuthEvent('auth_login_failed', { role: 'parent', method: 'password', outcome: 'failed' });
      // Generic error to prevent email enumeration, EXCEPT the unconfirmed-
      // email case: that one needs an actionable message (the user holds
      // valid credentials, so nothing is being enumerated).
      setError(
        result.error.toLowerCase().includes('confirm')
          ? result.error
          : 'That email and password did not match. Try again.',
      );
      return;
    }
    logEvent('parent_login_success');
    if (authFlags.authObservabilityV1) logAuthEvent('auth_login_succeeded', { role: 'parent', method: 'password', outcome: 'success' });
    navigate(next);
  }

  async function handleForgot() {
    if (!email) {
      setError('Enter your email above first, then tap Forgot password.');
      return;
    }
    setError(null);
    await requestPasswordReset(email);
    if (authFlags.authObservabilityV1) logAuthEvent('auth_password_reset_requested', { role: 'parent' });
    setResetSent(true);
  }

  return (
    <>
      <Helmet>
        <title>Sign in · Draw in the Air</title>
      </Helmet>
      <div className="pa-shell">
        <div className="auth">
          {/* ── Left hero ──────────────────────────────────────────── */}
          <aside className="auth-hero">
            <Link to="/" className="ah-logo-wrap ah-logo-big" aria-label="Draw in the Air home">
              <BrandLogo variant="hero" decorative />
            </Link>
            <h1>Welcome back <span aria-hidden>👋</span></h1>
            <p className="ah-lede">
              Sign in to your parent account and pick up right where your child left off.
            </p>
            <ul className="auth-bullets" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="auth-bullet">
                <span className="itile itile-lav"><I.TrendUp size={22} /></span>
                <div>
                  <h4>See progress in plain English</h4>
                  <p>No jargon, no scores. Just how they're doing.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-mint"><I.Heart size={22} /></span>
                <div>
                  <h4>Manage screen time and settings</h4>
                  <p>Daily limits, sound, and camera. Set it and forget it.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-sun"><I.Star size={22} /></span>
                <div>
                  <h4>Personalised recommendations</h4>
                  <p>The next activity, chosen for your child.</p>
                </div>
              </li>
            </ul>

            {/* Sprite scene: hills + gesture trail + sparkles + sprout + bird (ported from reference login.html) */}
            <svg
              className="sprite-scene"
              viewBox="0 0 760 230"
              preserveAspectRatio="xMidYMax slice"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              {/* hills */}
              <path d="M0 150 Q190 96 380 132 T760 122 V230 H0 Z" fill="#E5DBFF" opacity=".75" />
              <path d="M0 178 Q210 138 420 168 T760 160 V230 H0 Z" fill="#CFBCFF" opacity=".7" />
              {/* gesture trail */}
              <path
                className="float-3"
                d="M150 70 C 230 30, 320 110, 410 56 S 560 30, 620 78"
                stroke="#9D7DFF"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="2 14"
                opacity=".55"
              />
              <circle className="float-1" cx="624" cy="78" r="6" fill="#7BB6FF" />
              {/* sparkles */}
              <g className="float-2" fill="#FFC83D">
                <path d="M520 44l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
              </g>
              <g className="float-1" fill="#5BCE9A">
                <path d="M250 38l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
              </g>
              {/* sprout */}
              <g className="float-1">
                <path d="M600 200 V150" stroke="#2E9D68" strokeWidth="7" strokeLinecap="round" />
                <path d="M600 162 Q576 150 566 124 Q596 124 600 156 Z" fill="#5BCE9A" />
                <path d="M600 154 Q624 140 636 116 Q606 116 600 150 Z" fill="#7BD9A8" />
              </g>
              {/* bird */}
              <g className="bird-bob" transform="translate(120 132)">
                <ellipse cx="0" cy="60" rx="20" ry="5" fill="#1F1B2E" opacity=".08" />
                <line x1="-6" y1="44" x2="-9" y2="58" stroke="#1F1B2E" strokeWidth="2.4" strokeLinecap="round" />
                <line x1="7" y1="44" x2="10" y2="58" stroke="#1F1B2E" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="0" cy="22" r="26" fill="#9D7DFF" />
                <circle cx="-2" cy="20" r="22" fill="#B69BFF" />
                <circle cx="9" cy="14" r="6.5" fill="#fff" />
                <circle cx="11" cy="14" r="3.2" fill="#1F1B2E" />
                <path d="M24 20 l16 -5 -14 12 Z" fill="#FFC83D" />
                <path d="M-18 24 q-14 4 -20 -6 q16 -2 20 6" fill="#8A66F0" />
              </g>
            </svg>
          </aside>

          {/* ── Right form ─────────────────────────────────────────── */}
          <main className="auth-form-col">
            {recoveryMode ? (
            <section className="auth-card pop">
              <h2>Set a new password</h2>
              <p style={{ marginTop: 6 }}>
                You're signed in from your reset link{user?.email ? <> as <strong>{user.email}</strong></> : null}.
                Choose a new password to finish.
              </p>
              <form onSubmit={handleSetNewPassword} className="stack">
                <div>
                  <label className="flabel" htmlFor="pa-reset-pw">New password</label>
                  <input
                    id="pa-reset-pw"
                    className="input"
                    type="password"
                    required
                    value={newPw}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flabel" htmlFor="pa-reset-pw2">Repeat new password</label>
                  <input
                    id="pa-reset-pw2"
                    className="input"
                    type="password"
                    required
                    value={newPw2}
                    autoComplete="new-password"
                    placeholder="Same password again"
                    onChange={(e) => setNewPw2(e.target.value)}
                  />
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
                  {loading ? 'Saving...' : 'Save new password'}
                </button>
              </form>
            </section>
            ) : (
            <section className="auth-card pop">
              <h2>Sign in to your account</h2>
              {/* Already signed in on this device? Say WHO, so a link from
                  an email can never silently open someone else's
                  dashboard on a shared computer. */}
              {user && (
                <div className="card" style={{ padding: '14px 16px', margin: '14px 0', background: 'var(--lavender-50, #F4EFFF)', border: '1px solid var(--border-1, rgba(31,27,46,0.08))', borderRadius: 14 }}>
                  <p style={{ margin: 0, fontSize: '0.92rem' }}>
                    This device is already signed in as <strong>{user.email}</strong>.
                  </p>
                  <div className="row gap-2" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(next)}>
                      Continue as {user.email?.split('@')[0]}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={async () => { await signOut(); }}
                    >
                      Use a different account
                    </button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="stack">
                <div>
                  <label className="flabel" htmlFor="pa-login-email">Email address</label>
                  <input
                    id="pa-login-email"
                    className="input"
                    type="email"
                    required
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <div className="row between" style={{ marginBottom: 9 }}>
                    <label className="flabel" htmlFor="pa-login-pw" style={{ margin: 0 }}>Password</label>
                    <button type="button" onClick={handleForgot} className="auth-forgot">
                      Forgot password?
                    </button>
                  </div>
                  <div className="pw-wrap">
                    <input
                      id="pa-login-pw"
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      autoComplete="current-password"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      style={{ paddingRight: 80 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="pw-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  role="checkbox"
                  aria-checked={stayed}
                  onClick={() => setStayed(s => !s)}
                  className="check"
                >
                  <span className="box"><I.Check size={16} /></span>
                  <span className="check-text">Keep me signed in</span>
                </button>

                {error && <p className="form-error" role="alert">{error}</p>}
                {resetSent && (
                  <p className="form-success" role="status">
                    If that email is registered, a reset link is on its way.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg btn-block"
                >
                  {loading ? 'Signing in...' : (<>Sign in <I.ArrowRight size={18} /></>)}
                </button>

                <div className="divider">or</div>

                <button
                  type="button"
                  onClick={() => { setRoleIntent('parent'); signInWithGoogle(next); }}
                  className="btn-google"
                >
                  <I.Google size={18} /> Continue with Google
                </button>

                <p className="auth-alt">
                  New here? <Link to="/parent/signup">Start a free trial</Link>
                </p>
              </form>
            </section>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
