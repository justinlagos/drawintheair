/**
 * /parent/billing. Current plan + simple Stripe Customer Portal handoff.
 *
 * For users without a subscription: paywall.
 * For active subscribers: current plan summary + manage-in-Stripe + plan
 * comparison + billing history timeline.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ParentShell, Card, RequireParentAuth, StateChip, I,
} from './_shared';
import { useParent } from '../../context/ParentContext';
import {
  centsToDisplay,
  describeSubscriptionState,
  getBillingPreview,
  openStripePortal,
  startStripeCheckout,
  type BillingPreview,
} from '../../lib/parentApi';
import { logEvent } from '../../lib/analytics';

export default function ParentBilling() {
  return (
    <RequireParentAuth>
      <BillingInner />
    </RequireParentAuth>
  );
}

function BillingInner() {
  const { overview, subscriptionState, planUsage } = useParent();
  const [interval, setInterval] = useState<'month' | 'year'>('year');
  const [previewMonth, setPreviewMonth] = useState<BillingPreview | null>(null);
  const [previewYear, setPreviewYear] = useState<BillingPreview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getBillingPreview('month', planUsage.active),
      getBillingPreview('year', planUsage.active),
    ]).then(([m, y]) => {
      if (cancelled) return;
      setPreviewMonth(m); setPreviewYear(y);
    });
    return () => { cancelled = true; };
  }, [planUsage.active]);

  const sub = overview?.subscription;
  const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : null;
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const hasActive = sub && subscriptionState !== 'none' && subscriptionState !== 'expired' && subscriptionState !== 'trial_expired';

  const [billingNote, setBillingNote] = useState<string | null>(null);

  async function goCheckout(plan: 'month' | 'year') {
    setBusy(true);
    setBillingNote(null);
    try {
      const url = await startStripeCheckout(plan);
      setBusy(false);
      if (url) {
        logEvent('parent_checkout_started');
        window.location.href = url;
      } else {
        setBillingNote(
          "Stripe Checkout isn't available yet. Make sure STRIPE_SECRET_KEY, PARENT_APP_URL and the price IDs are configured in Supabase Edge Function secrets, then try again.",
        );
      }
    } catch (e) {
      setBusy(false);
      console.error('[stripe-checkout] failed', e);
      setBillingNote("Couldn't reach Stripe. Please try again in a moment.");
    }
  }

  async function goPortal() {
    setBusy(true);
    setBillingNote(null);
    const result = await openStripePortal();
    setBusy(false);
    if (result && 'url' in result) {
      logEvent('parent_portal_opened');
      window.location.href = result.url;
    } else if (result && 'reason' in result && result.reason === 'no_customer') {
      setBillingNote(
        "You're on a complimentary plan, so there's no Stripe card on file yet. Once you start a paid plan, the Stripe portal becomes available here for card and invoice management.",
      );
    } else {
      setBillingNote("Couldn't reach Stripe. Please try again in a moment.");
    }
  }

  // ── No active subscription: paywall layout ─────────────────────────
  if (!hasActive) {
    return (
      <ParentShell>
        <header className="text-center" style={{ maxWidth: 720, margin: '24px auto 8px' }}>
          <span className="eyebrow pill"><I.Card size={14} /> Family plan</span>
          <h1 className="h-page" style={{ marginTop: 16, maxWidth: '18ch', marginLeft: 'auto', marginRight: 'auto' }}>
            Unlock the <span className="grad-name">parent dashboard</span>.
          </h1>
          <p className="lede" style={{ margin: '12px auto 0', maxWidth: '52ch' }}>
            See progress in plain English, set gentle limits, and get one clear next step.
          </p>
        </header>

        {billingNote && (
          <p role="status" className="form-note" style={{ maxWidth: 720, margin: '24px auto 0' }}>
            {billingNote}
          </p>
        )}

        <div style={{ maxWidth: 720, margin: '32px auto 0' }}>
          <div className="grid-2">
            <PlanCardWithCheckout
              title="Monthly"
              subtitle="Try it for a month."
              priceCents={previewMonth?.total_cents ?? 499}
              interval="month"
              onClick={() => goCheckout('month')}
              busy={busy}
            />
            <PlanCardWithCheckout
              title="Yearly"
              subtitle="Best value for the year."
              priceCents={previewYear?.total_cents ?? 5499}
              interval="year"
              onClick={() => goCheckout('year')}
              busy={busy}
              featured
              ribbon={previewYear && previewYear.annual_savings_cents > 0 ? `Save ${centsToDisplay(previewYear.annual_savings_cents, previewYear.currency)}` : undefined}
            />
          </div>

          <p className="muted text-center" style={{ marginTop: 14, fontSize: 'var(--text-sm)' }}>
            Already have a plan? Refresh, or <a href="/parent/login" style={{ color: 'var(--lavender-700)', fontWeight: 700 }}>sign in again</a>.
          </p>

          <div className="row center gap-6" style={{ marginTop: 22, color: 'var(--fg-3)', fontSize: 13.5, flexWrap: 'wrap' }}>
            <span className="row gap-2"><I.Shield size={16} /> 14-day free trial</span>
            <span className="row gap-2"><I.Check size={16} /> Cancel anytime</span>
            <span className="row gap-2"><I.Users size={16} /> Up to 2 learners included</span>
          </div>

          <p className="muted text-center" style={{ marginTop: 18, fontSize: 'var(--text-sm)' }}>
            Current status: No subscription
          </p>
        </div>
      </ParentShell>
    );
  }

  // ── Active subscription: current plan + comparison + history ──────
  return (
    <ParentShell>
      <header style={{ marginBottom: 'var(--space-7)' }}>
        <span className="eyebrow pill"><I.Card size={14} /> Membership</span>
        <h1 className="h-page" style={{ marginTop: 14 }}>Billing</h1>
        <p className="lede" style={{ marginTop: 8, maxWidth: '54ch' }}>
          See what you're paying, when, and manage your card. All in one place.
        </p>
      </header>

      <div className="stack">
        {/* Current plan card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card hero tint="lav">
            <div className="row between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span className="eyebrow">Current plan</span>
                <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', letterSpacing: 'var(--track-snug)' }}>
                  {sub?.plan_interval === 'year' ? 'Yearly family plan' : 'Monthly family plan'}
                </h2>
                <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: 'var(--track-tight)' }}>
                  {centsToDisplay((interval === 'year' ? previewYear?.total_cents : previewMonth?.total_cents) ?? (sub?.plan_interval === 'year' ? 5499 : 499))}
                  <small style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--fg-3)' }}>/ {sub?.plan_interval ?? 'month'}</small>
                </p>
              </div>
              <StateChip state={subscriptionState} />
            </div>
            <div className="grid-3">
              <SummaryField
                label="Learner spots"
                value={`${planUsage.active} active / ${planUsage.included} included`}
                icon={<I.Users size={14} />}
              />
              <SummaryField
                label={trialEnd ? 'Trial ends' : 'Next billing date'}
                value={(trialEnd || periodEnd)?.toLocaleDateString() ?? 'Not set'}
                icon={<I.Calendar size={14} />}
              />
              <SummaryField
                label="Cancel scheduled"
                value={sub?.cancel_at_period_end ? 'Yes' : 'No'}
                icon={<I.Hourglass size={14} />}
              />
            </div>
            <div className="row gap-3" style={{ marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={busy || !sub}
                onClick={goPortal}
                className="btn btn-primary"
              >
                <I.Card size={18} /> Manage in Stripe
              </button>
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                Update card, view invoices, or cancel. All in Stripe's secure portal.
              </span>
            </div>
            {billingNote && (
              <p role="status" className="form-note" style={{ marginTop: 14 }}>{billingNote}</p>
            )}
          </Card>
        </motion.div>

        {/* Plan comparison */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <Card
            hero
            title="Plan comparison"
            subtitle="Same activities, same privacy. Pick what suits your family."
            action={
              <div className="seg" role="tablist" aria-label="Billing interval">
                <button
                  type="button"
                  role="tab"
                  aria-pressed={interval === 'month'}
                  className={interval === 'month' ? 'on' : ''}
                  onClick={() => setInterval('month')}
                >Monthly</button>
                <button
                  type="button"
                  role="tab"
                  aria-pressed={interval === 'year'}
                  className={interval === 'year' ? 'on' : ''}
                  onClick={() => setInterval('year')}
                >Yearly</button>
              </div>
            }
          >
            <div className="grid-2-aside">
              <PlanSummary
                preview={interval === 'month' ? previewMonth : previewYear}
                cta="Switch to this plan"
                onClick={() => goCheckout(interval)}
                busy={busy}
                featured
              />
              <BenefitsList />
            </div>
          </Card>
        </motion.div>

        {/* Billing history */}
        <Card title="Billing history" subtitle="Recent invoices, most recent first.">
          <div className="tl">
            <div className="tl-row">
              <div className="tl-emoji">💸</div>
              <div className="tl-main">
                <h4>Trial started</h4>
                <p>No charge during your 14-day trial.</p>
              </div>
              <div className="tl-meta">
                {sub?.trial_start ? new Date(sub.trial_start).toLocaleDateString() : 'Recent'}
              </div>
            </div>
            {periodEnd && (
              <div className="tl-row">
                <div className="tl-emoji">📅</div>
                <div className="tl-main">
                  <h4>Next billing date</h4>
                  <p>{centsToDisplay((interval === 'year' ? previewYear?.total_cents : previewMonth?.total_cents) ?? 499)} will be charged.</p>
                </div>
                <div className="tl-meta">{periodEnd.toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {!hasActive && (
        <p className="muted text-center" style={{ marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
          Current status: {describeSubscriptionState(subscriptionState)}
        </p>
      )}
    </ParentShell>
  );
}

function SummaryField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{icon} {label}</span>
      <div className="field-val" style={{ fontSize: 'var(--text-base)' }}>{value}</div>
    </div>
  );
}

function PlanCardWithCheckout({
  title, subtitle, priceCents, interval, featured, ribbon, onClick, busy,
}: {
  title: string;
  subtitle: string;
  priceCents: number;
  interval: 'month' | 'year';
  featured?: boolean;
  ribbon?: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <div className={`card card-pad-lg ${featured ? 'card-tint-lav' : ''}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {ribbon && (
        <span className="chip chip-sun" style={{ position: 'absolute', top: -12, right: 18 }}>
          <I.Star size={14} /> {ribbon}
        </span>
      )}
      <div>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>{title}</h3>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>{subtitle}</p>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: 'var(--track-tight)' }}>
        {centsToDisplay(priceCents)}<small style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--fg-3)' }}>/ {interval}</small>
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['14-day free trial', 'Up to 2 learners included', 'Full activity library', 'Plain-English progress reports', 'Gentle parental controls', 'Cancel anytime'].map(f => (
          <li key={f} className="row gap-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--fg-2)' }}>
            <span className="itile itile-sm itile-mint" style={{ width: 24, height: 24, borderRadius: 8 }}>
              <I.Check size={14} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className={`btn ${featured ? 'btn-primary' : 'btn-secondary'} btn-block`}
      >
        {busy ? 'Opening Stripe...' : (<>Start free trial <I.ArrowRight size={18} /></>)}
      </button>
    </div>
  );
}

function PlanSummary({
  preview, cta, onClick, busy, featured,
}: {
  preview: BillingPreview | null;
  cta: string;
  onClick: () => void;
  busy: boolean;
  featured?: boolean;
}) {
  if (!preview) {
    return <div className="card card-pad-lg"><p className="muted">Loading...</p></div>;
  }
  return (
    <div className={`card card-pad-lg ${featured ? 'card-tint-lav' : ''}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {preview.interval === 'year' && preview.annual_savings_cents > 0 && (
        <span className="chip chip-sun" style={{ position: 'absolute', top: -12, right: 18 }}>
          <I.Star size={14} /> Save {centsToDisplay(preview.annual_savings_cents, preview.currency)}
        </span>
      )}
      <div>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>
          {preview.interval === 'year' ? 'Yearly' : 'Monthly'} family plan
        </h3>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
          {preview.included_slots} learners included
        </p>
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', letterSpacing: 'var(--track-tight)' }}>
        {centsToDisplay(preview.total_cents, preview.currency)}
        <small style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--fg-3)' }}>/ {preview.interval}</small>
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <li className="row gap-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--fg-2)' }}>
          <span className="itile itile-sm itile-mint" style={{ width: 24, height: 24, borderRadius: 8 }}><I.Check size={14} /></span>
          <span>Base plan ({centsToDisplay(preview.base_cents, preview.currency)})</span>
        </li>
        {preview.extra_children > 0 && (
          <li className="row gap-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--fg-2)' }}>
            <span className="itile itile-sm itile-mint" style={{ width: 24, height: 24, borderRadius: 8 }}><I.Check size={14} /></span>
            <span>{preview.extra_children} extra learner{preview.extra_children === 1 ? '' : 's'} ({centsToDisplay(preview.addon_cents_total, preview.currency)})</span>
          </li>
        )}
        <li className="row gap-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--fg-2)' }}>
          <span className="itile itile-sm itile-mint" style={{ width: 24, height: 24, borderRadius: 8 }}><I.Check size={14} /></span>
          <span>14-day free trial</span>
        </li>
        <li className="row gap-3" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--fg-2)' }}>
          <span className="itile itile-sm itile-mint" style={{ width: 24, height: 24, borderRadius: 8 }}><I.Check size={14} /></span>
          <span>Cancel any time</span>
        </li>
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className={`btn ${featured ? 'btn-primary' : 'btn-secondary'} btn-block`}
      >
        {busy ? 'Opening Stripe...' : <>{cta} <I.ArrowRight size={18} /></>}
      </button>
    </div>
  );
}

function BenefitsList() {
  const Row = ({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body: string; tone: 'lav' | 'mint' | 'sky' | 'sun' }) => (
    <div className="row gap-4" style={{ alignItems: 'flex-start' }}>
      <span className={`itile itile-${tone}`}>{icon}</span>
      <div>
        <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)' }}>{title}</h4>
        <p style={{ margin: '4px 0 0', color: 'var(--fg-3)', fontSize: 'var(--text-sm)', fontWeight: 500, lineHeight: 1.5 }}>{body}</p>
      </div>
    </div>
  );
  return (
    <div className="card card-pad-lg">
      <h3 style={{ margin: '0 0 18px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>What's included</h3>
      <div className="stack" style={{ gap: 'var(--space-5)' }}>
        <Row tone="lav"  icon={<I.Sparkle size={20} />} title="Full activity library" body="Every game, every mode, every age band. Unlocked." />
        <Row tone="mint" icon={<I.TrendUp size={20} />} title="Plain-English progress" body="Weekly summaries written for parents." />
        <Row tone="sky"  icon={<I.Heart size={20} />}   title="Per-child controls"    body="Daily limits, sound, camera reassurance." />
        <Row tone="sun"  icon={<I.Shield size={20} />}  title="Privacy by design"     body="Camera frames never leave the device." />
      </div>
    </div>
  );
}
