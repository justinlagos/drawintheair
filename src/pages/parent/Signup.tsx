/**
 * /parent/signup. Create your parent account.
 *
 * Two-column layout: brand + START FREE eyebrow + hero copy + 4 trust bullets
 * on the left, signup card on the right. Matches the zip design.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BrandLogo } from '../../components/BrandLogo';
import { I } from './_shared';
import {
  signUpWithEmail,
  signInWithGoogle,
  setRoleIntent,
  resendConfirmation,
} from '../../lib/supabase';
import { recordConsent } from '../../lib/parentApi';
import { logEvent } from '../../lib/analytics';
import { logAuthEvent } from '../../lib/authEvents';
import { authFlags } from '../../lib/authFlags';
import './parent.css';

const CONSENT_VERSION = 'v2026-05';

export default function ParentSignup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Honour ?next= (e.g. /subscribe sends users here mid-flow). Same-origin
  // path allow-list, reject absolute and protocol-relative URLs.
  const rawNext = params.get('next');
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/parent/dashboard';
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  async function handleResend() {
    if (resendState === 'sending') return;
    setResendState('sending');
    const res = await resendConfirmation(email);
    setResendState(res.ok ? 'sent' : 'failed');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return; // double-submit guard
    if (!agreeTerms || !agreePrivacy) {
      setError('Please confirm the two consent boxes so we can create your account.');
      return;
    }
    if (password.length < 8) {
      setError('Please use at least 8 characters for your password.');
      return;
    }
    setLoading(true);
    setError(null);
    logEvent('parent_signup_started');
    if (authFlags.authObservabilityV1) logAuthEvent('auth_signup_started', { role: 'parent', method: 'password' });
    const result = await signUpWithEmail(email, password, displayName);
    if (!result.ok) {
      setError(result.error || 'Could not create your account.');
      if (authFlags.authObservabilityV1) logAuthEvent('auth_signup_failed', { role: 'parent', method: 'password', outcome: 'failed' });
      setLoading(false);
      return;
    }
    logEvent('parent_signup_completed');
    if (authFlags.authObservabilityV1) logAuthEvent('auth_signup_succeeded', { role: 'parent', method: 'password', outcome: 'success' });
    if (result.needsEmailConfirm) {
      // Email confirmation is on: there is no session yet, so don't
      // navigate to the dashboard (it would bounce to login) and don't
      // try to write consent rows (no auth). Show the check-your-inbox
      // panel instead; consents are confirmed on first sign-in.
      setLoading(false);
      setConfirmEmail(true);
      return;
    }
    await Promise.all([
      recordConsent('account_terms', CONSENT_VERSION, true),
      recordConsent('child_privacy', CONSENT_VERSION, true),
      recordConsent('camera_use', CONSENT_VERSION, true),
      recordConsent('marketing', CONSENT_VERSION, marketingOptIn),
    ]);
    setLoading(false);
    navigate(next);
  }

  return (
    <>
      <Helmet>
        <title>Start free trial · Draw in the Air</title>
      </Helmet>
      <div className="pa-shell">
        <div className="auth">
          {/* ── Left hero ──────────────────────────────────────────── */}
          <aside className="auth-hero tint-mint">
            <div className="ah-logo-wrap ah-logo-big">
              <Link to="/" aria-label="Draw in the Air home">
                <BrandLogo variant="hero" decorative />
              </Link>
              <span className="eyebrow pill"><I.Sparkle size={14} /> Start free</span>
            </div>
            <h1>Create your <span className="grad-name">parent account</span></h1>
            <p className="ah-lede">
              7 days free. No card needed today. We'll only ask when your trial ends.
            </p>

            <ul className="auth-bullets" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="auth-bullet">
                <span className="itile itile-lav"><I.Shield size={22} /></span>
                <div>
                  <h4>Privacy by design</h4>
                  <p>No raw camera frames ever leave the device.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-mint"><I.Heart size={22} /></span>
                <div>
                  <h4>Plain-English progress</h4>
                  <p>Reports written for parents, not data scientists.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-sky"><I.Users size={22} /></span>
                <div>
                  <h4>Up to 2 learners included</h4>
                  <p>Add more siblings any time. Just $2/month each.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-sun"><I.Star size={22} /></span>
                <div>
                  <h4>Cancel anytime</h4>
                  <p>No dark patterns. Manage your plan from one screen.</p>
                </div>
              </li>
            </ul>

            {/* Sprite scene: big sprout center + sparkles + dashed gesture trail (ported from reference signup.html) */}
            <svg
              className="sprite-scene"
              viewBox="0 0 760 230"
              preserveAspectRatio="xMidYMax slice"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path d="M0 150 Q190 96 380 132 T760 122 V230 H0 Z" fill="#E5DBFF" opacity=".75" />
              <path d="M0 178 Q210 138 420 168 T760 160 V230 H0 Z" fill="#FFE08A" opacity=".55" />
              <path
                className="float-3"
                d="M140 64 C 230 24, 320 104, 410 50 S 560 24, 640 70"
                stroke="#9D7DFF"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="2 14"
                opacity=".5"
              />
              <g className="float-2" fill="#FFC83D">
                <path d="M470 40l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
              </g>
              <g className="float-1" fill="#FF9B7E">
                <path d="M300 36l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
              </g>
              {/* big sprout center */}
              <g className="float-1" transform="translate(360 0)">
                <path d="M0 210 V140" stroke="#2E9D68" strokeWidth="9" strokeLinecap="round" />
                <path d="M0 156 Q-34 142 -48 108 Q4 108 0 150 Z" fill="#5BCE9A" />
                <path d="M0 146 Q34 128 50 96 Q-2 96 0 142 Z" fill="#7BD9A8" />
              </g>
              <circle className="float-3" cx="640" cy="70" r="6" fill="#7BB6FF" />
            </svg>
          </aside>

          {/* ── Right form ─────────────────────────────────────────── */}
          <main className="auth-form-col">
            {confirmEmail ? (
              <section className="auth-card pop">
                <h2>One more step: check your inbox</h2>
                <p style={{ marginTop: 8 }}>
                  Your account is created and your <strong>7-day free trial is already
                  running</strong>. We've sent a confirmation link to <strong>{email}</strong>.
                </p>
                <p style={{ marginTop: 10 }}>
                  Tap <strong>Confirm your mail</strong> in that email and you'll be signed
                  in automatically and taken straight to your family dashboard. Nothing
                  else to do.
                </p>
                <p className="auth-alt" style={{ marginTop: 16 }}>
                  Didn't get it? Check your spam folder first.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  style={{ marginTop: 12 }}
                  disabled={resendState === 'sending' || resendState === 'sent'}
                  onClick={handleResend}
                >
                  {resendState === 'sending' ? 'Sending...'
                    : resendState === 'sent' ? 'Confirmation email re-sent'
                    : 'Resend confirmation email'}
                </button>
                {resendState === 'failed' && (
                  <p className="form-error" role="alert" style={{ marginTop: 10 }}>
                    We couldn't resend it just now. Please wait a little while and try again.
                  </p>
                )}
                <Link to="/parent/login" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 12 }}>
                  Go to sign in
                </Link>
              </section>
            ) : (
            <section className="auth-card pop">
              <h2>Start your free trial</h2>
              <form onSubmit={handleSubmit} className="stack">
                <div>
                  <label className="flabel" htmlFor="pa-su-name">Your name (optional)</label>
                  <input
                    id="pa-su-name"
                    className="input"
                    type="text"
                    value={displayName}
                    autoComplete="name"
                    placeholder="e.g. Amara's mum"
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flabel" htmlFor="pa-su-email">Email address</label>
                  <input
                    id="pa-su-email"
                    className="input"
                    type="email"
                    required
                    value={email}
                    autoComplete="email"
                    placeholder="you@example.com"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flabel" htmlFor="pa-su-pw">Password</label>
                  <div className="pw-wrap">
                    <input
                      id="pa-su-pw"
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      onChange={(e) => setPassword(e.target.value)}
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
                  aria-checked={agreeTerms}
                  onClick={() => setAgreeTerms(v => !v)}
                  className="check"
                >
                  <span className="box"><I.Check size={16} /></span>
                  <span className="check-text">
                    I agree to the <Link to="/terms">Terms of Service</Link>.
                  </span>
                </button>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={agreePrivacy}
                  onClick={() => setAgreePrivacy(v => !v)}
                  className="check"
                >
                  <span className="box"><I.Check size={16} /></span>
                  <span className="check-text">
                    I've read the <Link to="/parent/privacy">child privacy notice</Link> and consent on behalf of my children.
                  </span>
                </button>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={marketingOptIn}
                  onClick={() => setMarketingOptIn(v => !v)}
                  className="check"
                >
                  <span className="box"><I.Check size={16} /></span>
                  <span className="check-text">Send me parent-friendly activity ideas. (Optional)</span>
                </button>

                {error && <p className="form-error" role="alert">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg btn-block"
                >
                  {loading ? 'Creating your account...' : (<>Start free trial <I.ArrowRight size={18} /></>)}
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
                  Already have an account? <Link to="/parent/login">Sign in</Link>
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
