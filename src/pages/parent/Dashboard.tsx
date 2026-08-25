/**
 * /parent/dashboard. The heart of the parent experience.
 *
 * Hero greeting · learner switcher · overall snapshot · stat trio ·
 * strengths/support · recommended next · activity history.
 *
 * Voice: warm, calm, never analytical jargon.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ParentShell,
  Card,
  StateChip,
  RequireParentAuth,
  RequireSubscription,
  I,
  stagger,
} from './_shared';
import { useParent } from '../../context/ParentContext';
import { getChildDashboard, type ChildDashboard } from '../../lib/parentApi';
import {
  describeChildOverview,
  describeStrengths,
  describeNeedsSupport,
  describeRecommendation,
  describeActivity,
} from '../../lib/parent/progressNarrator';
import { logEvent } from '../../lib/analytics';

export default function ParentDashboard() {
  return (
    <RequireParentAuth>
      <RequireSubscription reason="dashboard">
        <DashboardInner />
      </RequireSubscription>
    </RequireParentAuth>
  );
}

function DashboardInner() {
  const { overview, subscriptionState, planUsage, selectedChild, selectChild, refresh } = useParent();

  useEffect(() => { logEvent('parent_dashboard_viewed'); }, []);

  useEffect(() => {
    if (!selectedChild && overview?.children?.length) {
      const firstActive = overview.children.find(c => c.status === 'active');
      if (firstActive) selectChild(firstActive.id);
    }
  }, [overview, selectedChild, selectChild]);

  const parentName = overview?.parent?.display_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const activeChildren = overview?.children.filter(c => c.status === 'active') ?? [];

  // 7-day trial countdown. trial_end comes from parent_subscriptions and is
  // the single source of truth (server-side). Shown as days + hours so the
  // counter visibly moves between visits (whole-day ceil looked stuck for
  // the first 24 hours).
  const trialEnd = overview?.subscription?.trial_end ? new Date(overview.subscription.trial_end) : null;
  const trialMsLeft = trialEnd ? Math.max(0, trialEnd.getTime() - Date.now()) : null;
  const trialCountdown = (() => {
    if (trialMsLeft === null) return null;
    const days = Math.floor(trialMsLeft / 86_400_000);
    const hours = Math.floor((trialMsLeft % 86_400_000) / 3_600_000);
    if (trialMsLeft === 0) return 'Your free trial has ended';
    if (days === 0 && hours === 0) return 'Your free trial ends within the hour';
    if (days === 0) return `${hours} hour${hours === 1 ? '' : 's'} left in your free trial`;
    return `${days} day${days === 1 ? '' : 's'}, ${hours} hour${hours === 1 ? '' : 's'} left in your free trial`;
  })();

  return (
    <ParentShell>
      <motion.div
        variants={stagger.container}
        initial="initial"
        animate="animate"
        className="stack"
      >
        {/* ── Hero greeting ───────────────────────────────────────── */}
        <motion.header variants={stagger.item}>
          <span className="eyebrow pill"><I.Heart size={14} /> Family overview</span>
          <h1 className="h-page" style={{ marginTop: 14 }}>
            {greeting}, <span className="grad-name">{parentName}</span>.
          </h1>
          <p className="lede" style={{ marginTop: 8, maxWidth: '52ch' }}>
            Here's how each of your learners is doing today, in plain English. No jargon, no scores.
          </p>
        </motion.header>

        {/* ── Trial countdown ────────────────────────────────────── */}
        {subscriptionState === 'trial_active' && trialCountdown && (
          <motion.div variants={stagger.item}>
            <Card>
              <div className="row between" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="itile itile-sun"><I.Hourglass size={20} /></span>
                  <div>
                    <strong style={{ fontFamily: 'var(--font-display)' }}>
                      {trialCountdown}
                    </strong>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)' }}>
                      Everything stays unlocked while your trial runs. Add a plan any time and
                      billing only starts when your trial ends.
                    </p>
                  </div>
                </div>
                <Link to="/parent/billing" className="btn btn-primary btn-sm">Choose a plan</Link>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Plan strip ─────────────────────────────────────────── */}
        <motion.div variants={stagger.item}>
          <Card>
            <div className="row between" style={{ flexWrap: 'wrap', gap: 16 }}>
              <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
                <StateChip state={subscriptionState} />
                <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                  <strong style={{ color: 'var(--fg-1)' }}>{planUsage.active}</strong> of {planUsage.included} learner spots used
                  {planUsage.active > planUsage.included && <> · {planUsage.active - planUsage.included} extra</>}
                </span>
              </div>
              <div className="row gap-2">
                <Link to="/parent/children" className="btn btn-ghost btn-sm">
                  <I.Users size={16} /> Manage learners
                </Link>
                <Link to="/parent/billing" className="btn btn-ghost btn-sm">
                  <I.Card size={16} /> Billing
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Empty state ────────────────────────────────────────── */}
        {activeChildren.length === 0 && (
          <motion.div variants={stagger.item}>
            <NoChildrenYet />
          </motion.div>
        )}

        {/* ── Learner picker ─────────────────────────────────────── */}
        {activeChildren.length > 0 && (
          <motion.div variants={stagger.item}>
            <Card title="Who are we checking on?" subtitle="Tap a learner to see their personalised view.">
              <div className="lswitch">
                {activeChildren.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectChild(c.id)}
                    aria-pressed={selectedChild?.id === c.id}
                    className={`lpill ${selectedChild?.id === c.id ? 'active' : ''}`}
                  >
                    <span className="avatar">{c.avatar || '🌱'}</span>
                    <span>{c.nickname}</span>
                  </button>
                ))}
                <Link to="/parent/children" className="lpill lpill-add">
                  <span className="ic"><I.Plus size={16} /></span>
                  Add learner
                </Link>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Per-child panel ────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {selectedChild && (
            <ChildPanel key={selectedChild.id} childId={selectedChild.id} onChange={refresh} />
          )}
        </AnimatePresence>
      </motion.div>
    </ParentShell>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────

function NoChildrenYet() {
  return (
    <Card hero tint="lav">
      <div className="row between" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>Add your first learner</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            We only ask for a nickname and an age band. No full names, no dates of birth.
          </p>
        </div>
        <Link to="/parent/children" className="btn btn-primary">
          <I.Plus size={18} /> Add a learner
        </Link>
      </div>
    </Card>
  );
}

// ── Per-child panel ──────────────────────────────────────────────────────

function ChildPanel({ childId, onChange }: { childId: string; onChange: () => void }) {
  const [dash, setDash] = useState<ChildDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getChildDashboard(childId)
      .then(d => { if (!cancelled) setDash(d); })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [childId]);

  if (loading) {
    return (
      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card><p className="muted">Loading...</p></Card>
      </motion.div>
    );
  }
  if (error || !dash) {
    return (
      <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card>
          <p className="muted">Sorry, we couldn't load this learner just now. Try refreshing in a moment.</p>
        </Card>
      </motion.div>
    );
  }

  // These are ALL-TIME totals (dash.totals is a lifetime rollup; the data
  // model has no per-day figures). Label them honestly as such — never as
  // "today" — so the report doesn't mislead.
  const mins = Math.round((dash.totals?.total_seconds ?? 0) / 60);
  const activitiesPlayed = dash.totals?.activities_played ?? 0;
  const mastered = dash.totals?.mastered ?? 0;

  return (
    <motion.div
      key={childId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="stack"
    >
      {/* Overall snapshot (all-time — see totals note above) */}
      <Card hero tint="lav">
        <div className="row gap-5" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span className="avatar sz-lg ring-lav">{dash.child.avatar || '🌱'}</span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <span className="eyebrow"><I.Sparkle size={14} /> Overall</span>
            <p className="serif-quote" style={{ margin: '8px 0 14px', maxWidth: '46ch' }}>
              {describeChildOverview(dash)}
            </p>
            <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
              <span className="chip chip-mint"><I.Check size={14} /> {mastered} skills doing well</span>
              <span className="chip chip-sky"><I.Hourglass size={14} /> {mins} min total</span>
              <span className="chip chip-sun"><I.Star size={14} /> {activitiesPlayed} activities</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stat trio */}
      <div className="stat-grid">
        <div className="card stat">
          <span className="stat-label"><I.Sparkle size={16} /> Activities</span>
          <div className="stat-num">{activitiesPlayed}</div>
          <div className="stat-sub">Played in total</div>
        </div>
        <div className="card stat">
          <span className="stat-label"><I.Star size={16} /> Skills doing well</span>
          <div className="stat-num">{mastered}</div>
          <div className="stat-sub stat-trend">Mastered so far</div>
        </div>
        <div className="card stat">
          <span className="stat-label"><I.Hourglass size={16} /> Time learning</span>
          <div className="stat-num">{mins}<small style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--fg-3)', marginLeft: 6 }}>min</small></div>
          <div className="stat-sub">All sessions combined</div>
        </div>
      </div>

      {/* Strengths + needs support */}
      <div className="grid-2">
        <Card title="What's going well" subtitle="Where they're feeling confident.">
          <p style={{ margin: 0, fontSize: 'var(--text-md)', lineHeight: 1.55, color: 'var(--fg-1)' }}>
            {describeStrengths(dash)}
          </p>
        </Card>
        <Card title="What could use support" subtitle="A little extra practice will help here.">
          <p style={{ margin: 0, fontSize: 'var(--text-md)', lineHeight: 1.55, color: 'var(--fg-1)' }}>
            {describeNeedsSupport(dash)}
          </p>
        </Card>
      </div>

      {/* Recommended next */}
      <Card hero tint="sky">
        <div className="row gap-5" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span className="itile itile-grad">
            <I.Sparkle size={22} />
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <span className="eyebrow"><I.TrendUp size={14} /> Recommended next</span>
            <h2 style={{ margin: '6px 0 6px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>
              One clear next step
            </h2>
            <p className="muted" style={{ margin: 0, maxWidth: '52ch' }}>
              {describeRecommendation(dash)}
            </p>
          </div>
          <Link to="/play" className="btn btn-primary dwell">
            Start a session <I.ArrowRight size={18} />
            <svg className="dwell-ring" aria-hidden><circle cx="50%" cy="50%" r="48%"/></svg>
          </Link>
        </div>
      </Card>

      {/* Activity history */}
      <Card
        title="Activity history"
        subtitle="Most recent at the top."
        action={
          <button type="button" onClick={() => { logEvent('parent_report_viewed'); onChange(); }} className="btn btn-ghost btn-sm">
            <I.Refresh size={16} /> Refresh
          </button>
        }
      >
        {dash.activities.length === 0 ? (
          <p className="muted">No history yet. Once your child plays, their progress will appear here.</p>
        ) : (
          <div className="tl">
            {dash.activities.slice(0, 10).map(a => {
              const statusChip =
                a.status === 'mastered'   ? { tone: 'mint',  label: 'Doing well' } :
                a.status === 'struggling' ? { tone: 'peach', label: 'Needs support' } :
                a.status === 'practising' ? { tone: 'sky',   label: 'Practising' } :
                                             { tone: 'lav',   label: 'Just started' };
              return (
                <div key={a.activity_key} className="tl-row">
                  <div className="tl-emoji">{a.status === 'mastered' ? '⭐' : a.status === 'struggling' ? '🌱' : '🎯'}</div>
                  <div className="tl-main">
                    <h4>{describeActivity(a.activity_key)}</h4>
                    <p>
                      {a.attempts} attempt{a.attempts === 1 ? '' : 's'}
                      {a.last_played_at && ', ' + new Date(a.last_played_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="tl-meta row gap-3">
                    <span className={`chip chip-${statusChip.tone}`}>{statusChip.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Parent tip */}
      <Card tint="peach">
        <div className="row gap-4" style={{ alignItems: 'flex-start' }}>
          <span className="itile itile-peach"><I.Heart size={22} /></span>
          <div>
            <span className="eyebrow" style={{ color: 'var(--peach-600)' }}>Parent tip</span>
            <p style={{ margin: '6px 0 0', fontSize: 'var(--text-md)', color: 'var(--fg-1)', lineHeight: 1.55, maxWidth: '60ch' }}>
              Short sessions, often. 15 minutes a few times a week beats one long session for movement learning. Praise the effort, not the result.
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
