/**
 * /parent/account. Settings + data rights.
 *
 * Sidebar nav + sectioned content: profile / security / subscription /
 * family / privacy / data. Matches the zip account centre layout.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ParentShell, RequireParentAuth, I } from './_shared';
import { useAuth } from '../../context/AuthContext';
import { useParent } from '../../context/ParentContext';
import { requestAccountDeletion } from '../../lib/parentApi';
import { openParentReport, openJsonExport } from '../../lib/parent/parentReport';
import { logEvent } from '../../lib/analytics';

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
          <a href="#profile" className="on"><I.User size={18} /> Profile</a>
          <a href="#security"><I.Lock size={18} /> Security</a>
          <a href="#subscription"><I.Card size={18} /> Subscription</a>
          <a href="#family"><I.Users size={18} /> Family</a>
          <a href="#privacy"><I.Shield size={18} /> Privacy</a>
          <a href="#data"><I.Download size={18} /> Data</a>
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
                  <p>You'll get a reset link by email. Takes about a minute.</p>
                </div>
                <Link to="/parent/login" className="btn btn-ghost btn-sm">Send reset link</Link>
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
