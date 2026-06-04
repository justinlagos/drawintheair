/**
 * /parent/account. Settings + data rights.
 *
 * Sidebar nav + sectioned content: profile / security / subscription /
 * family / privacy / data. Matches the zip account centre layout.
 */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ParentShell, RequireParentAuth, I } from './_shared';
import { useAuth } from '../../context/AuthContext';
import { useParent } from '../../context/ParentContext';
import { requestAccountDeletion } from '../../lib/parentApi';
import { requestPasswordReset } from '../../lib/supabase';
import { openParentReport, openJsonExport } from '../../lib/parent/parentReport';
import { logEvent } from '../../lib/analytics';

const ACCT_SECTIONS = ['profile', 'security', 'subscription', 'family', 'privacy', 'data'] as const;
type AcctSection = typeof ACCT_SECTIONS[number];

export default function ParentAccount() {
  return (
    <RequireParentAuth>
      <AccountInner />
    </RequireParentAuth>
  );
}

function AccountInner() {
  const { user, signOut } = useAuth();
  const { overview } = useParent();
  const [exporting, setExporting] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [activeSection, setActiveSection] = useState<AcctSection>('profile');

  // Side menu → smooth-scroll to the section. Plain #hash anchors fought
  // the SPA router, so we scroll explicitly and track the active item.
  function goToSection(id: AcctSection) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Keep the highlighted menu item in sync while the user scrolls.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id as AcctSection);
      },
      { rootMargin: '-20% 0px -65% 0px' },
    );
    ACCT_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  async function handleSendReset() {
    if (!user?.email) return;
    await requestPasswordReset(user.email);
    setResetSent(true);
    logEvent('parent_password_reset_requested');
  }

  async function handleReport() {
    setExporting(true);
    const res = await openParentReport();
    setExporting(false);
    if (!res.ok) {
      alert("Couldn't prepare your report right now. Please try again.");
      return;
    }
    logEvent('parent_data_exported');
  }

  async function handleJson() {
    setExportingJson(true);
    const res = await openJsonExport();
    setExportingJson(false);
    if (!res.ok) {
      alert("Couldn't prepare your data right now. Please try again.");
      return;
    }
    logEvent('parent_data_exported');
  }

  async function handleDelete() {
    if (!confirm("Delete your account and all your children's data? This can't be undone.")) return;
    setDeleting(true);
    const res = await requestAccountDeletion();
    setDeleting(false);
    if (res.error) {
      alert("Couldn't start the deletion. Please try again or email us.");
      return;
    }
    logEvent('parent_account_deletion_requested');
    alert('Your deletion request was received. You will be signed out now.');
    await signOut();
    window.location.href = '/';
  }

  return (
    <ParentShell>
      <header style={{ marginBottom: 'var(--space-7)' }}>
        <span className="eyebrow pill"><I.Settings size={14} /> Account centre</span>
        <h1 className="h-page" style={{ marginTop: 14 }}>Account</h1>
        <p className="lede" style={{ marginTop: 8, maxWidth: '54ch' }}>
          Manage your details, your family, and your data. All in one place.
        </p>
      </header>

      <div className="acct">
        {/* Sidebar nav */}
        <nav className="acct-nav" aria-label="Account sections">
          {([
            ['profile', 'Profile', <I.User key="i" size={18} />],
            ['security', 'Security', <I.Lock key="i" size={18} />],
            ['subscription', 'Subscription', <I.Card key="i" size={18} />],
            ['family', 'Family', <I.Users key="i" size={18} />],
            ['privacy', 'Privacy', <I.Shield key="i" size={18} />],
            ['data', 'Data', <I.Download key="i" size={18} />],
          ] as Array<[AcctSection, string, ReactNode]>).map(([id, label, icon]) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeSection === id ? 'on' : undefined}
              aria-current={activeSection === id ? 'true' : undefined}
              onClick={(e) => { e.preventDefault(); goToSection(id); }}
            >
              {icon} {label}
            </a>
          ))}
        </nav>

        {/* Content */}
        <div className="stack">
          <section id="profile" className="card card-pad-lg acct-sec">
            <h2 style={{ margin: '0 0 var(--space-5)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', letterSpacing: 'var(--track-snug)' }}>Profile</h2>
            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
              <div className="field">
                <span className="field-label"><I.User size={14} /> Email</span>
                <div className="field-val">{user?.email || 'Not set'}</div>
              </div>
              <div className="field">
                <span className="field-label"><I.Heart size={14} /> Display name</span>
                <div className="field-val">{overview?.parent?.display_name || 'Not set'}</div>
              </div>
            </div>
          </section>

          <section id="security" className="card card-pad-lg acct-sec">
            <h2 style={{ margin: '0 0 var(--space-5)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', letterSpacing: 'var(--track-snug)' }}>Security</h2>
            <div className="stack" style={{ gap: 'var(--space-3)' }}>
              <div className="irow">
                <span className="itile itile-lav"><I.Lock size={20} /></span>
                <div className="irow-body">
                  <h4>Change password</h4>
                  <p>
                    {resetSent
                      ? <>Reset link sent to <strong>{user?.email}</strong>. Open it to choose a new password.</>
                      : "You'll get a reset link by email. Takes about a minute."}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleSendReset}
                  disabled={resetSent}
                >
                  {resetSent ? 'Link sent' : 'Send reset link'}
                </button>
              </div>
              <div className="irow">
                <span className="itile itile-sky"><I.Shield size={20} /></span>
                <div className="irow-body">
                  <h4>Two-factor sign in</h4>
                  <p>Coming soon. We'll let you know when it's ready.</p>
                </div>
                <span className="chip chip-sky">Soon</span>
              </div>
            </div>
          </section>

          <section id="subscription" className="card card-pad-lg acct-sec">
            <h2 style={{ margin: '0 0 var(--space-5)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', letterSpacing: 'var(--track-snug)' }}>Subscription</h2>
            <p className="muted" style={{ margin: '0 0 var(--space-5)' }}>
              Manage your plan, card on file, and invoices in the Stripe portal.
            </p>
            <Link to="/parent/billing" className="btn btn-primary">
              <I.Card size={16} /> Go to billing
            </Link>
          </section>

          <section id="family" className="card card-pad-lg acct-sec">
            <h2 style={{ margin: '0 0 var(--space-5)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', letterSpacing: 'var(--track-snug)' }}>Family</h2>
            <p className="muted" style={{ margin: '0 0 var(--space-5)' }}>
              Add, archive, or remove learners. Set per-child controls.
            </p>
            <Link to="/parent/children" className="btn btn-primary">
              <I.Users size={16} /> Manage learners
            </Link>
          </section>

          <section id="privacy" className="card card-pad-lg acct-sec">
            <h2 style={{ margin: '0 0 var(--space-5)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', letterSpacing: 'var(--track-snug)' }}>Privacy</h2>
            <p className="muted" style={{ margin: '0 0 var(--space-5)' }}>
              How we keep your child's data safe, in plain English.
            </p>
            <Link to="/parent/privacy" className="btn btn-ghost">
              <I.Shield size={16} /> Read the privacy notice
            </Link>
          </section>

          <section id="data" className="card card-pad-lg acct-sec">
            <h2 style={{ margin: '0 0 var(--space-3)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', letterSpacing: 'var(--track-snug)' }}>Your data</h2>
            <p className="muted" style={{ margin: '0 0 var(--space-5)' }}>
              The family report is a printable summary covering your account, subscription, each learner's activity, and your consent records. Opens in a new tab.
            </p>
            <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
              <button type="button" disabled={exporting} onClick={handleReport} className="btn btn-primary">
                <I.Download size={16} /> {exporting ? 'Preparing...' : 'Open family report'}
              </button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="btn btn-danger">
                <I.Trash size={16} /> {deleting ? 'Submitting...' : 'Delete my account'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="btn btn-ghost btn-sm"
                aria-expanded={showAdvanced}
              >
                {showAdvanced ? 'Hide' : 'Show'} advanced
              </button>
            </div>
            {showAdvanced && (
              <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-1)' }}>
                <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                  The raw JSON export is for engineering or migration use. Most parents will prefer the report above.
                </p>
                <button type="button" disabled={exportingJson} onClick={handleJson} className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-3)' }}>
                  <I.Download size={14} /> {exportingJson ? 'Preparing...' : 'Download raw JSON'}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </ParentShell>
  );
}
