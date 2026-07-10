/**
 * Shared parent-area building blocks.
 *
 * Brand: Draw in the Air parent surface. Cream + lavender + mint + sky + sun
 * + peach. Outfit / Nunito / Fraunces. All component CSS lives scoped under
 * `.pa-shell` (see parent.css) so nothing leaks into Landing or Game CSS.
 */

import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useParent } from '../../context/ParentContext';
import { BrandLogo } from '../../components/BrandLogo';
import {
  centsToDisplay,
  describeSubscriptionState,
  type SubscriptionState,
} from '../../lib/parentApi';
import {
  getAccountRoles,
  registerParentAccount,
  consumeRoleIntent,
} from '../../lib/supabase';
import './parent.css';

// ── Icons (Lucide-style, consistent 1.75 stroke, 20px box) ────────────────
type IconProps = { size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean };
function Icon({ size = 20, strokeWidth = 1.75, className, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const I = {
  ArrowRight: (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>,
  ArrowLeft:  (p: IconProps) => <Icon {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></Icon>,
  Check:      (p: IconProps) => <Icon {...p}><path d="M20 6L9 17l-5-5"/></Icon>,
  Close:      (p: IconProps) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>,
  Sparkle:    (p: IconProps) => <Icon {...p}><path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8L12 3zM19 17l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/></Icon>,
  Shield:     (p: IconProps) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></Icon>,
  Heart:      (p: IconProps) => <Icon {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Icon>,
  User:       (p: IconProps) => <Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>,
  Users:      (p: IconProps) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  Card:       (p: IconProps) => <Icon {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></Icon>,
  Home:       (p: IconProps) => <Icon {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></Icon>,
  Settings:   (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>,
  Logout:     (p: IconProps) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></Icon>,
  Star:       (p: IconProps) => <Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>,
  TrendUp:    (p: IconProps) => <Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>,
  Hourglass:  (p: IconProps) => <Icon {...p}><path d="M5 22h14M5 2h14M17 22a5 5 0 0 0-10 0M17 2a5 5 0 0 1-10 0"/></Icon>,
  Lock:       (p: IconProps) => <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>,
  Download:   (p: IconProps) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></Icon>,
  Trash:      (p: IconProps) => <Icon {...p}><path d="M3 6h18M19 6l-1.5 14a2 2 0 0 1-2 2H8.5a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></Icon>,
  Plus:       (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  Archive:    (p: IconProps) => <Icon {...p}><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 13h4"/></Icon>,
  Refresh:    (p: IconProps) => <Icon {...p}><path d="M21 12a9 9 0 0 1-15.5 6.4L3 16M3 12a9 9 0 0 1 15.5-6.4L21 8M21 3v5h-5M3 21v-5h5"/></Icon>,
  Eye:        (p: IconProps) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Icon>,
  Calendar:   (p: IconProps) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Icon>,
  Pause:      (p: IconProps) => <Icon {...p}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></Icon>,
  Speaker:    (p: IconProps) => <Icon {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></Icon>,
  Camera:     (p: IconProps) => <Icon {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></Icon>,
  Info:       (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Icon>,
  Shuffle:    (p: IconProps) => <Icon {...p}><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></Icon>,
  Smile:      (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></Icon>,
  Minus:      (p: IconProps) => <Icon {...p}><path d="M5 12h14"/></Icon>,
  Google: (p: IconProps) => (
    <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 18 18" aria-hidden="true" className={p.className}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34A8.99 8.99 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.95H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.34z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.93 8.93 0 0 0 9 0 8.99 8.99 0 0 0 .96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  ),
};

// ── Layout shell ──────────────────────────────────────────────────────────

export function ParentShell({
  title,
  intro,
  children,
  inner: _inner,
  hideNav,
  width = 'default',
}: {
  title?: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  inner?: boolean;
  hideNav?: boolean;
  width?: 'default' | 'narrow' | 'tight';
}) {
  const innerStyle: React.CSSProperties = width === 'narrow' || width === 'tight'
    ? { maxWidth: 'var(--container-content)', marginInline: 'auto' }
    : {};
  const { pathname } = useLocation();
  return (
    <>
      <Helmet>
        <title>{title ? `${title} · Draw in the Air` : 'Parents · Draw in the Air'}</title>
      </Helmet>
      <div className="pa-shell">
        <div className="page-amb" aria-hidden />
        <div className="shell">
          {!hideNav && <ParentNav />}
          <main>
            <div className="wrap">
              <motion.div
                key={pathname}
                style={innerStyle}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {(title || intro) && (
                  <header className="stack-sm" style={{ marginBottom: 'var(--space-7)' }}>
                    {title && (
                      <motion.h1
                        className="h-page"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {title}
                      </motion.h1>
                    )}
                    {intro && (
                      <motion.p
                        className="lede"
                        style={{ maxWidth: '60ch', margin: 0 }}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {intro}
                      </motion.p>
                    )}
                  </header>
                )}
                {children}
              </motion.div>
            </div>
          </main>
          {!hideNav && (
            <footer className="foot">
              Draw in the Air. Built to keep your child safe. <Link to="/parent/privacy">Privacy</Link>
            </footer>
          )}
        </div>
      </div>
    </>
  );
}

function ParentNav() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();

  const NavLink = ({ to, label }: { to: string; label: string }) => (
    <Link to={to} className={`nav-link ${pathname === to ? 'active' : ''}`}>
      {label}
    </Link>
  );

  return (
    <nav className="topnav">
      <Link to={user ? '/parent/dashboard' : '/parents'} className="nav-brand" aria-label="Draw in the Air home">
        <BrandLogo variant="compact" decorative />
        <span className="nav-tag">Parents</span>
      </Link>
      {user && (
        <div className="nav-links">
          <NavLink to="/parent/dashboard" label="Dashboard" />
          <NavLink to="/parent/children" label="Children" />
          <NavLink to="/parent/billing" label="Billing" />
          <NavLink to="/parent/account" label="Account" />
        </div>
      )}
      {user ? (
        <button
          type="button"
          onClick={async () => {
            await signOut();
            window.location.href = '/parents';
          }}
          className="nav-signout"
          aria-label="Sign out"
        >
          <I.Logout size={16} /> Sign out
        </button>
      ) : (
        <div className="row gap-2" style={{ marginLeft: 'auto' }}>
          <Link to="/parent/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link to="/parent/signup" className="btn btn-primary btn-sm">
            Start free <I.ArrowRight size={16} />
          </Link>
        </div>
      )}
    </nav>
  );
}

// ── Auth + access gates ──────────────────────────────────────────────────

export function RequireParentAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Role isolation (migration 0013): the family area requires an account
  // that explicitly signed up as a parent. A teacher-only login with the
  // same email does NOT get in automatically; they see an explicit opt-in.
  const [roleStatus, setRoleStatus] = useState<'checking' | 'parent' | 'not-parent'>('checking');
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const roles = await getAccountRoles();
      if (cancelled) return;
      if (roles?.parent || roles?.admin) { setRoleStatus('parent'); return; }
      // Arrived through the parent signup/login flow (e.g. Google): finish
      // the explicit parent registration they started.
      if (consumeRoleIntent('parent')) {
        const ok = await registerParentAccount();
        if (!cancelled) setRoleStatus(ok ? 'parent' : 'not-parent');
        return;
      }
      setRoleStatus('not-parent');
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <LoadingShell />;
  if (!user) return <Navigate to={`/parent/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (roleStatus === 'checking') return <LoadingShell />;
  if (roleStatus === 'not-parent') {
    return (
      <div className="pa-shell">
        <div className="auth" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <main className="auth-form-col" style={{ margin: '0 auto' }}>
            <section className="auth-card pop">
              <h2>This area is for families</h2>
              <p style={{ marginTop: 8 }}>
                You're signed in with a teacher account, and the family area is kept
                completely separate from classroom accounts. If you'd like a family
                account, you can start a free trial from the parents page whenever
                you're ready.
              </p>
              <div className="stack" style={{ marginTop: 16 }}>
                <Link to="/class" className="btn btn-primary btn-lg btn-block">Back to my classroom</Link>
                <Link to="/parents" className="btn btn-ghost btn-block">About Draw in the Air for families</Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function RequireSubscription({
  children,
  reason,
}: {
  children: React.ReactNode;
  reason: 'save_progress' | 'dashboard' | 'trial_ended' | 'premium_mode';
}) {
  const { loading, hasAccess, subscriptionState } = useParent();
  if (loading) return <LoadingShell />;
  if (!hasAccess) return <Paywall reason={reason} state={subscriptionState} />;
  return <>{children}</>;
}

function LoadingShell() {
  return (
    <ParentShell hideNav>
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <div className="card card-pad-lg" style={{ display: 'grid', placeItems: 'center', gap: 12, minWidth: 260 }}>
          <p className="muted" style={{ margin: 0 }}>Loading your account...</p>
        </div>
      </div>
    </ParentShell>
  );
}

// ── Paywall ───────────────────────────────────────────────────────────────

const PAYWALL_COPY: Record<string, { title: string; sub: string }> = {
  save_progress: { title: "Save what they've built so far.", sub: "Keep your child's learning journey going with a 7-day free trial. No card required today." },
  dashboard:     { title: 'Follow their learning, step by step.', sub: 'Plain-English progress, gentle daily limits, and one clear next activity — all in your parent dashboard.' },
  trial_ended:   { title: 'Your free trial has ended.', sub: "Everything your child has done is still safely saved. Continue any time to pick up where you left off." },
  premium_mode:  { title: 'This activity is part of the Family plan.', sub: 'Start your 7-day free trial to unlock the full activity library. No card required today.' },
};

export function Paywall({ reason, state }: { reason: keyof typeof PAYWALL_COPY; state: SubscriptionState }) {
  const copy = PAYWALL_COPY[reason];
  return (
    <ParentShell>
      <header className="text-center" style={{ maxWidth: 720, margin: '24px auto 8px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'inline-block' }}>
          <span className="eyebrow pill"><I.Sparkle size={14} /> Family plan</span>
        </motion.div>
        <motion.h1 className="h-page" style={{ marginTop: 16, maxWidth: '18ch', marginLeft: 'auto', marginRight: 'auto' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
          {copy.title}
        </motion.h1>
        <motion.p className="lede" style={{ margin: '12px auto 0', maxWidth: '52ch' }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}>
          {copy.sub}
        </motion.p>
      </header>

      <div style={{ maxWidth: 720, margin: '32px auto 0' }}>
        <div className="grid-2">
          <PlanCard
            title="Monthly"
            subtitle="Try it for a month."
            priceCents={499}
            interval="month"
            ctaTo="/subscribe?plan=month"
          />
          <PlanCard
            title="Yearly"
            subtitle="Best value for the year."
            priceCents={5499}
            interval="year"
            ctaTo="/subscribe?plan=year"
            featured
            ribbon="Save $5"
          />
        </div>

        <div className="row center gap-6" style={{ marginTop: 22, color: 'var(--fg-3)', fontSize: 13.5, flexWrap: 'wrap' }}>
          <span className="row gap-2"><I.Shield size={16} /> 7-day free trial</span>
          <span className="row gap-2"><I.Check size={16} /> Cancel anytime</span>
          <span className="row gap-2"><I.Users size={16} /> Up to 2 learners included</span>
        </div>

        {/* Escape hatch — the paywall must never feel like a dead-end. Free
            activities stay open, so offer a clear way back to play. */}
        <div className="text-center" style={{ marginTop: 24 }}>
          <a href="/play" className="btn btn-ghost sm" style={{ color: 'var(--fg-2)' }}>
            Not now — keep exploring free activities
          </a>
        </div>

        <p className="muted text-center" style={{ marginTop: 12, fontSize: 'var(--text-sm)' }}>
          {describeSubscriptionState(state)}
        </p>
      </div>
    </ParentShell>
  );
}

export function PlanCard({
  title,
  subtitle,
  priceCents,
  interval,
  ctaTo,
  featured,
  ribbon,
  features,
}: {
  title: string;
  subtitle: string;
  priceCents: number;
  interval: 'month' | 'year';
  ctaTo: string;
  featured?: boolean;
  ribbon?: string;
  features?: string[];
}) {
  const defaultFeatures = [
    '7-day free trial',
    'Up to 2 learners included',
    'Full activity library',
    'Plain-English progress reports',
    'Gentle parental controls',
    'Cancel anytime',
  ];
  return (
    <motion.div
      className={`card card-pad-lg ${featured ? 'card-tint-lav' : ''}`}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18 }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {ribbon && (
        <span className="chip chip-sun" style={{ position: 'absolute', top: -12, right: 18 }}>
          <I.Star size={14} /> {ribbon}
        </span>
      )}
      <div>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', letterSpacing: 'var(--track-snug)' }}>{title}</h3>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', fontWeight: 500 }}>{subtitle}</p>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: 'var(--track-tight)', color: 'var(--fg-1)' }}>
        {centsToDisplay(priceCents)}<small style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--fg-3)' }}>/ {interval}</small>
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(features ?? defaultFeatures).map(f => (
          <li key={f} className="row gap-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--fg-2)' }}>
            <span className="itile itile-sm itile-mint" style={{ width: 24, height: 24, borderRadius: 8 }}>
              <I.Check size={14} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link to={ctaTo} className={`btn ${featured ? 'btn-primary' : 'btn-secondary'} btn-block`}>
        Start free trial <I.ArrowRight size={18} />
      </Link>
    </motion.div>
  );
}

// ── Reusable primitives ──────────────────────────────────────────────────

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  hero,
  tint,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hero?: boolean;
  tint?: 'lav' | 'mint' | 'sky' | 'sun' | 'peach';
}) {
  const tintClass = tint ? `card-tint-${tint}` : '';
  const padClass = hero ? 'card-pad-lg' : 'card-pad';
  return (
    <section className={`card ${padClass} ${tintClass} ${className ?? ''}`.trim()}>
      {(title || action) && (
        <div className="row between section-head" style={{ alignItems: 'flex-start' }}>
          <div>
            {title && <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', letterSpacing: 'var(--track-snug)' }}>{title}</h2>}
            {subtitle && <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', fontWeight: 500 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StateChip({ state }: { state: SubscriptionState }) {
  const tone =
    state === 'trial_active' || state === 'active_monthly' || state === 'active_annual' ? 'mint' :
    state === 'cancelled_active' ? 'sky' :
    state === 'payment_failed' ? 'peach' :
    state === 'trial_expired' || state === 'expired' ? 'lav' :
    'lav';
  return (
    <span className={`chip chip-${tone}`}>
      <span className="dot" /> {describeSubscriptionState(state)}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional sticky footer for action buttons. */
  footer?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="scrim pa-scrim open"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        role="dialog" aria-modal="true" aria-label={title}
      >
        <motion.div
          className="modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: reduce ? 0 : 0.24, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div className="modal-head">
            <div className="modal-head-text">
              <h3>{title}</h3>
            </div>
            <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
              <I.Close size={16} />
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Convenience export for the stagger transition used in lists.
export const stagger = {
  container: { animate: { transition: { staggerChildren: 0.05 } } },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  },
} as const;
