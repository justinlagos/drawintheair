/**
 * /teacher/login. Welcome back screen for teachers.
 *
 * Two-column Calm-direction layout, mirroring /parent/login but with
 * classroom-targeted copy. After sign-in we land in /class.
 */

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BrandLogo } from '../../components/BrandLogo';
import { I } from '../parent/_shared';
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
import '../parent/parent.css';

export default function TeacherLogin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Same-origin path allow-list. Reject absolute URLs, protocol-relative URLs,
  // and anything that doesn't start with a single '/'. Blocks open-redirect
  // phishing via /teacher/login?next=https://evil.com.
  const rawNext = params.get('next');
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/class';

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
    logEvent('teacher_password_reset_completed');
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
      logEvent('teacher_login_failed');
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
    logEvent('teacher_login_success');
    navigate(next);
  }

  async function handleForgot() {
    if (!email) {
      setError('Enter your email above first, then tap Forgot password.');
      return;
    }
    setError(null);
    await requestPasswordReset(email, `${window.location.origin}/teacher/login`);
    setResetSent(true);
  }

  return (
    <>
      <Helmet>
        <title>Sign in · Draw in the Air for teachers</title>
      </Helmet>
      <div className="pa-shell">
        <div className="auth">
          {/* Left hero */}
          <aside className="auth-hero">
            <Link to="/" className="ah-logo-wrap ah-logo-big" aria-label="Draw in the Air home">
              <BrandLogo variant="hero" decorative />
            </Link>
            <h1>Welcome back, teacher <span aria-hidden>👋</span></h1>
            <p className="ah-lede">
              Sign in to your classroom and pick up where your learners left off.
            </p>
            <ul className="auth-bullets" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="auth-bullet">
                <span className="itile itile-lav"><I.TrendUp size={22} /></span>
                <div>
                  <h4>See class progress</h4>
                  <p>Plain-English insight on how the room is moving.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-mint"><I.Users size={22} /></span>
                <div>
                  <h4>Manage your classroom</h4>
                  <p>Settings, codes, and screen time in one place.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-sun"><I.Star size={22} /></span>
                <div>
                  <h4>Try new lessons</h4>
                  <p>Fresh EYFS activities the moment they ship.</p>
                </div>
              </li>
            </ul>
          </aside>

          {/* Right form */}
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
                  <label className="flabel" htmlFor="te-reset-pw">New password</label>
                  <input
                    id="te-reset-pw"
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
                  <label className="flabel" htmlFor="te-reset-pw2">Repeat new password</label>
                  <input
                    id="te-reset-pw2"
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
              <h2>Sign in to your classroom</h2>
              {/* Already signed in on this device? Say WHO, so a link from
                  an email can never silently open someone else's
                  classroom on a shared computer. */}
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
                  <label className="flabel" htmlFor="te-login-email">Email address</label>
                  <input
                    id="te-login-email"
                    className="input"
                    type="email"
                    required
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                  />
                </div>
                <div>
                  <div className="row between" style={{ marginBottom: 9 }}>
                    <label className="flabel" htmlFor="te-login-pw" style={{ margin: 0 }}>Password</label>
                    <button type="button" onClick={handleForgot} className="auth-forgot">
                      Forgot password?
                    </button>
                  </div>
                  <div className="pw-wrap">
                    <input
                      id="te-login-pw"
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
                  onClick={() => { setRoleIntent('teacher'); signInWithGoogle(next); }}
                  className="btn-google"
                >
                  <I.Google size={18} /> Continue with Google
                </button>

                <p className="auth-alt">
                  New here? <Link to="/teacher/signup">Start your classroom</Link>
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
