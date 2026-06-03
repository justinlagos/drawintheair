/**
 * /teacher/signup. Create your teacher account.
 *
 * Two-column Calm-direction layout, mirroring /parent/signup but with
 * teacher-targeted copy. Free pilot, no card. After signup we land in
 * /class (TeacherClassConsole) so the user can start a classroom session.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BrandLogo } from '../../components/BrandLogo';
import { I } from '../parent/_shared';
import { signInWithGoogle } from '../../lib/supabase';
import { signUpTeacher } from '../../lib/teacherApi';
import { logEvent } from '../../lib/analytics';
import '../parent/parent.css';

export default function TeacherSignup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreeTerms) {
      setError('Please confirm the consent box so we can create your account.');
      return;
    }
    if (password.length < 8) {
      setError('Please use at least 8 characters for your password.');
      return;
    }
    setLoading(true);
    setError(null);
    logEvent('teacher_signup_started');
    const result = await signUpTeacher(email, password, fullName, schoolName);
    if (!result.ok) {
      setError(result.error || 'Could not create your account.');
      setLoading(false);
      return;
    }
    logEvent('teacher_signup_completed');
    setLoading(false);
    navigate('/class');
  }

  return (
    <>
      <Helmet>
        <title>Start your classroom · Draw in the Air</title>
      </Helmet>
      <div className="pa-shell">
        <div className="auth">
          {/* Left hero */}
          <aside className="auth-hero tint-mint">
            <div className="ah-logo-wrap ah-logo-big">
              <Link to="/" aria-label="Draw in the Air home">
                <BrandLogo variant="hero" decorative />
              </Link>
              <span className="eyebrow pill"><I.Sparkle size={14} /> Start your classroom</span>
            </div>
            <h1>Create your <span className="grad-name">teacher account</span></h1>
            <p className="ah-lede">
              Free pilot. No card. Set up your classroom in under five minutes.
            </p>

            <ul className="auth-bullets" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="auth-bullet">
                <span className="itile itile-lav"><I.Shield size={22} /></span>
                <div>
                  <h4>EYFS aligned</h4>
                  <p>Activities mapped to Early Years outcomes.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-mint"><I.Camera size={22} /></span>
                <div>
                  <h4>Camera processed on-device</h4>
                  <p>No raw frames ever leave the classroom.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-sky"><I.Users size={22} /></span>
                <div>
                  <h4>Up to 30 learners per class</h4>
                  <p>Built for whole-class delivery on a single screen.</p>
                </div>
              </li>
              <li className="auth-bullet">
                <span className="itile itile-sun"><I.Star size={22} /></span>
                <div>
                  <h4>Cancel anytime</h4>
                  <p>No dark patterns. Leave whenever you like.</p>
                </div>
              </li>
            </ul>
          </aside>

          {/* Right form */}
          <main className="auth-form-col">
            <section className="auth-card pop">
              <h2>Create your teacher account</h2>
              <form onSubmit={handleSubmit} className="stack">
                <div>
                  <label className="flabel" htmlFor="te-su-name">Full name</label>
                  <input
                    id="te-su-name"
                    className="input"
                    type="text"
                    required
                    value={fullName}
                    autoComplete="name"
                    placeholder="e.g. Ms Patel"
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flabel" htmlFor="te-su-school">School name (optional)</label>
                  <input
                    id="te-su-school"
                    className="input"
                    type="text"
                    value={schoolName}
                    autoComplete="organization"
                    placeholder="e.g. Riverside Primary"
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flabel" htmlFor="te-su-email">Email address</label>
                  <input
                    id="te-su-email"
                    className="input"
                    type="email"
                    required
                    value={email}
                    autoComplete="email"
                    placeholder="you@school.edu"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flabel" htmlFor="te-su-pw">Password</label>
                  <div className="pw-wrap">
                    <input
                      id="te-su-pw"
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
                    I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
                  </span>
                </button>

                {error && <p className="form-error" role="alert">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg btn-block"
                >
                  {loading ? 'Creating your account...' : (<>Create teacher account <I.ArrowRight size={18} /></>)}
                </button>

                <div className="divider">or</div>

                <button
                  type="button"
                  onClick={() => signInWithGoogle('/class')}
                  className="btn-google"
                >
                  <I.Google size={18} /> Continue with Google
                </button>

                <p className="auth-alt">
                  Already have an account? <Link to="/teacher/login">Sign in</Link>
                </p>
              </form>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
