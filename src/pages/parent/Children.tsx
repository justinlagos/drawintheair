/**
 * /parent/children. Add, archive, restore, delete learners + per-child controls.
 *
 * Family language ("learners", "spots", "your family"). Adding a 3rd learner
 * shows the new total before the parent confirms. No surprise billing, ever.
 */

import React, { useEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ParentShell, Card, RequireParentAuth, RequireSubscription, I, stagger,
} from './_shared';
import { ModalShell } from './_components';
import { useParent } from '../../context/ParentContext';
import {
  archiveChild,
  centsToDisplay,
  createChildProfile,
  deleteChild,
  getBillingPreview,
  getParentControls,
  restoreChild,
  syncSubscriptionQuantity,
  upsertParentControls,
  type BillingPreview,
} from '../../lib/parentApi';
import { logEvent } from '../../lib/analytics';

const AGE_BANDS = ['3-4', '5-6', '7-8'] as const;
const AVATARS = ['🌱', '🐢', '🦊', '🐝', '🐙', '🦄', '🐼', '🐰', '🦉', '🐬', '⭐', '🦖'];

export default function ParentChildren() {
  return (
    <RequireParentAuth>
      <RequireSubscription reason="dashboard">
        <ChildrenInner />
      </RequireSubscription>
    </RequireParentAuth>
  );
}

function ChildrenInner() {
  const { overview, planUsage, refresh, selectChild } = useParent();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [editingControlsId, setEditingControlsId] = useState<string | null>(null);
  const activeChildren = overview?.children.filter(c => c.status === 'active') ?? [];
  const archivedChildren = overview?.children.filter(c => c.status === 'archived') ?? [];

  function startSessionFor(childId: string) {
    selectChild(childId);
    navigate('/play');
  }

  return (
    <ParentShell>
      <header style={{ marginBottom: 'var(--space-7)' }}>
        <span className="eyebrow pill"><I.Users size={14} /> Your learners</span>
        <h1 className="h-page" style={{ marginTop: 14 }}>Children</h1>
        <p className="lede" style={{ marginTop: 8, maxWidth: '54ch' }}>
          Add, archive, or remove learners. Archived children keep their progress and can return any time.
        </p>
      </header>

      <div className="stack">
        {/* Seats strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Card tint="lav">
            <div className="row between" style={{ flexWrap: 'wrap', gap: 16 }}>
              <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
                <span className="chip chip-lav"><I.Users size={14} /> Family plan</span>
                <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                  <strong style={{ color: 'var(--fg-1)' }}>{planUsage.active}</strong> of {planUsage.included} learner spots used
                  {planUsage.active > planUsage.included && (
                    <> · {planUsage.active - planUsage.included} extra</>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="btn btn-primary"
              >
                <I.Plus size={18} /> Add learner
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Active learners */}
        {activeChildren.length === 0 ? (
          <Card>
            <p className="muted" style={{ margin: 0 }}>
              No active learners yet. Add one to start tracking their progress.
            </p>
          </Card>
        ) : (
          <motion.div
            variants={stagger.container}
            initial="initial"
            animate="animate"
            className="grid-2"
          >
            {activeChildren.map(c => (
              <motion.div key={c.id} variants={stagger.item}>
                <div className="card card-pad-lg card-hover">
                  <div className="row gap-4" style={{ alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                    <span className="avatar sz-lg">{c.avatar || '🌱'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-xl)', letterSpacing: 'var(--track-snug)' }}>{c.nickname}</h3>
                      <div className="row gap-2" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                        <span className="chip chip-lav">Age {c.age_band || 'Not set'}</span>
                        <span className="chip chip-mint"><span className="dot" /> Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                    <div className="field">
                      <span className="field-label"><I.Star size={14} /> Focus</span>
                      <div className="field-val" style={{ fontSize: 'var(--text-base)' }}>{c.learning_focus || 'All areas'}</div>
                    </div>
                    <div className="field">
                      <span className="field-label"><I.Hourglass size={14} /> Last seen</span>
                      <div className="field-val" style={{ fontSize: 'var(--text-base)' }}>
                        {c.last_played_at ? new Date(c.last_played_at).toLocaleDateString() : 'Not yet'}
                      </div>
                    </div>
                  </div>
                  <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => startSessionFor(c.id)}
                      className="btn btn-primary btn-sm"
                    >
                      {c.last_played_at ? <>Continue session <I.ArrowRight size={14} /></> : <>Start session <I.ArrowRight size={14} /></>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingControlsId(c.id)}
                      className="btn btn-ghost btn-sm"
                    >
                      <I.Settings size={14} /> Controls
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await archiveChild(c.id);
                        await syncSubscriptionQuantity();
                        logEvent('parent_child_profile_archived');
                        refresh();
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      <I.Archive size={14} /> Archive
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Remove ${c.nickname}'s profile and all their learning history? This can't be undone.`)) return;
                        await deleteChild(c.id);
                        await syncSubscriptionQuantity();
                        logEvent('parent_child_profile_deleted');
                        refresh();
                      }}
                      className="btn btn-danger btn-sm"
                    >
                      <I.Trash size={14} /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {/* Dashed "Add a learner" placeholder card */}
            {planUsage.active < planUsage.included + 4 && (
              <motion.button
                variants={stagger.item}
                type="button"
                onClick={() => setAdding(true)}
                className="card card-dashed"
                style={{ cursor: 'pointer' }}
              >
                <div style={{ textAlign: 'center' }}>
                  <span className="itile itile-lav" style={{ margin: '0 auto var(--space-4)' }}>
                    <I.Plus size={24} />
                  </span>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                    Add a learner
                  </h3>
                  <p className="muted" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>
                    Sibling, cousin, classmate. One safe space for everyone.
                  </p>
                </div>
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Archived */}
        {archivedChildren.length > 0 && (
          <Card title="Archived learners" subtitle="Archived learners keep their full learning history and don't count toward your plan.">
            <div className="tl">
              {archivedChildren.map(c => (
                <div key={c.id} className="tl-row">
                  <span className="avatar sz-sm">{c.avatar || '🌱'}</span>
                  <div className="tl-main">
                    <h4>{c.nickname}</h4>
                    <p>Archived</p>
                  </div>
                  <div className="row gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await restoreChild(c.id);
                        await syncSubscriptionQuantity();
                        logEvent('parent_child_profile_restored');
                        refresh();
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      <I.Refresh size={14} /> Restore
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Permanently delete ${c.nickname}'s profile?`)) return;
                        await deleteChild(c.id);
                        logEvent('parent_child_profile_deleted');
                        refresh();
                      }}
                      className="btn btn-danger btn-sm"
                    >
                      <I.Trash size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {adding && <AddChildModal onClose={() => setAdding(false)} onDone={refresh} />}
      {editingControlsId && (
        <ControlsModal
          childId={editingControlsId}
          onClose={() => setEditingControlsId(null)}
          onDone={refresh}
        />
      )}
    </ParentShell>
  );
}

// ── Sparkle burst (ported from /tmp/dia-design-v2 app.js) ────────────────

function sparkBurst(host: HTMLElement, x: number, y: number) {
  if (typeof window === 'undefined') return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.5 8.5L23 11l-8.5 2.5L12 22l-2.5-8.5L1 11l8.5-2.5z"/></svg>`;
    const a = (Math.PI * 2 * i) / n;
    const d = 40 + Math.random() * 36;
    s.style.position = 'absolute';
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.transform = 'translate(-50%,-50%)';
    s.style.color = 'var(--sun-400)';
    s.style.pointerEvents = 'none';
    host.appendChild(s);
    const el = s.firstChild as HTMLElement | null;
    if (!el) continue;
    el.animate(
      [
        { transform: 'translate(0,0) scale(0) rotate(0)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(2.2) rotate(70deg)`, opacity: 0 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.22,1,0.36,1)' },
    ).onfinish = () => s.remove();
  }
}

function triggerButtonSparkle(btn: HTMLElement | null) {
  if (!btn) return;
  const host = btn.closest('.modal') as HTMLElement | null;
  if (!host) return;
  const rect = btn.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  sparkBurst(host, rect.left + rect.width / 2 - hostRect.left, rect.top + rect.height / 2 - hostRect.top);
}

// ── Add child (4-step stepper) ────────────────────────────────────────────

const STEP_LABELS = ['Name', 'Age', 'Avatar', 'Done'] as const;

function AddChildModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { overview, planUsage } = useParent();
  const [step, setStep] = useState(0); // 0..3
  const [nickname, setNickname] = useState('');
  const [ageBand, setAgeBand] = useState<typeof AGE_BANDS[number]>('5-6');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Upfront paywall acknowledgement: when both included learner spots are
  // used, the parent must explicitly accept the extra-learner price BEFORE
  // the wizard starts (the cost note at the final step alone was too easy
  // to miss).
  const [ackExtra, setAckExtra] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  const newActive = planUsage.active + 1;
  const interval = overview?.subscription?.plan_interval ?? 'month';
  const onTrial = overview?.subscription?.state === 'trial_active';

  useEffect(() => {
    let cancelled = false;
    getBillingPreview(interval, newActive).then(p => { if (!cancelled) setPreview(p); });
    return () => { cancelled = true; };
  }, [interval, newActive]);

  const willCostExtra = newActive > planUsage.included;
  const canContinue =
    (step === 0 && !!nickname.trim()) ||
    (step === 1 && !!ageBand) ||
    (step === 2 && !!avatar) ||
    step === 3;

  async function handleFinalAdd(e: FormEvent) {
    e.preventDefault();
    if (!overview?.parent?.id) return;
    triggerButtonSparkle(addBtnRef.current);
    setLoading(true);
    setError(null);
    const res = await createChildProfile(
      { nickname: nickname.trim(), age_band: ageBand, avatar },
      overview.parent.id,
    );
    if (res.error) { setError(res.error.message); setLoading(false); return; }
    await syncSubscriptionQuantity();
    logEvent('parent_child_profile_created', { meta: { active_count: newActive } });
    onDone();
    onClose();
  }

  function next() {
    if (step < 3) setStep(s => s + 1);
  }
  function back() {
    if (step > 0) setStep(s => s - 1);
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Add a learner"
      description={<>Create a profile for your child. A few quick taps. That's it.</>}
      icon={<I.User size={28} strokeWidth={2.2} />}
      tone="plum"
      size="lg"
      footer={
        willCostExtra && !ackExtra ? (
          <>
            <button type="button" onClick={onClose} className="btn btn-secondary">Not now</button>
            <button type="button" onClick={() => setAckExtra(true)} className="btn btn-primary">
              Add an extra learner <I.ArrowRight size={16} />
            </button>
          </>
        ) : (
        <>
          {step > 0 && (
            <button type="button" onClick={back} className="btn btn-ghost foot-left">
              <I.ArrowLeft size={16} /> Back
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canContinue}
              className="btn btn-primary"
            >
              Continue <I.ArrowRight size={16} />
            </button>
          ) : (
            <button
              ref={addBtnRef}
              type="button"
              onClick={handleFinalAdd}
              disabled={loading || !nickname.trim()}
              className="btn btn-primary"
            >
              {loading ? 'Adding...' : (<>Add learner <I.Check size={16} /></>)}
            </button>
          )}
        </>
        )
      }
    >
      {/* Extra-learner paywall gate: both included spots are used, so the
          parent must see and accept the price BEFORE the wizard starts. */}
      {willCostExtra && !ackExtra ? (
        <div>
          <div className="card card-pad card-tint-sun" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="row gap-4">
              <span className="itile itile-sun"><I.Users size={20} /></span>
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, margin: '0 0 6px', fontSize: 'var(--text-lg)' }}>
                  Both included learner spots are used
                </h4>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--fg-2)' }}>
                  Your plan includes <strong>{planUsage.included} learners</strong>, and{' '}
                  <strong>{planUsage.active}</strong> {planUsage.active === 1 ? 'is' : 'are'} active.
                  Each additional learner costs{' '}
                  <strong>{preview ? `${centsToDisplay(preview.addon_cents_per_child, preview.currency)}/${preview.interval}` : '$2/month'}</strong>,
                  added to your plan.
                </p>
              </div>
            </div>
          </div>
          {preview && (
            <p style={{ margin: '0 0 4px', fontSize: 'var(--text-sm)', color: 'var(--fg-2)' }}>
              With this learner your plan becomes{' '}
              <strong>{centsToDisplay(preview.total_cents, preview.currency)}/{preview.interval}</strong>. No surprise billing, remove a learner anytime to drop the charge.
            </p>
          )}
          {onTrial && (
            <p style={{ margin: '8px 0 0', fontSize: 'var(--text-sm)', color: 'var(--fg-3)' }}>
              You're on your free trial, so nothing is charged today. The extra learner
              joins your plan price when billing starts after the trial.
            </p>
          )}
        </div>
      ) : (
      <>
      {/* Stepper */}
      <div className="stepper">
        {STEP_LABELS.map((label, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : '';
          return (
            <span key={label} style={{ display: 'contents' }}>
              <div className={`step-node ${state}`}>
                <span className="step-dot">
                  {i < step ? <I.Check size={14} /> : i + 1}
                </span>
                <span className="step-label">{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <span className="step-line">
                  <i style={{ width: i < step ? '100%' : '0%' }} />
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Plain keyed div — NOT AnimatePresence/motion. `mode="wait"` here
          could freeze the panel on a stale step when framer-motion's exit
          callback didn't fire (React 19 + framer 11, timing-sensitive): the
          stepper advanced but the panel stayed behind, so Continue looked
          dead on the avatar step for some users. A CSS-only fade on remount
          (keyed by step) is robust and can never desync from `step`. */}
      <div key={step} className="step-panel show">
          {step === 0 && (
            <>
              <h4 className="step-q">What should we call them?</h4>
              <p className="step-hint">First name or nickname only. No full names. This is what your child will see when they sign in.</p>
              <input
                id="pa-add-nickname"
                className="input"
                type="text"
                required
                maxLength={32}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Amara"
                autoFocus
                style={{ fontSize: 'var(--text-xl)', padding: 20 }}
              />
            </>
          )}

          {step === 1 && (
            <>
              <h4 className="step-q">How old are they?</h4>
              <p className="step-hint">We use this to pick activities at just the right level. You can change it any time.</p>
              <div className="age-grid">
                {AGE_BANDS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAgeBand(opt)}
                    className={`age-card ${ageBand === opt ? 'sel' : ''}`}
                  >
                    <span className="age-tick"><I.Check size={14} /></span>
                    <div className="age-n">{opt}</div>
                    <div className="age-u">years</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h4 className="step-q">Pick an avatar</h4>
              <p className="step-hint">Tap a friendly face. Your child can change it later from their own screen.</p>
              <div className="avatar-grid">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`av-cell ${avatar === a ? 'sel' : ''}`}
                    aria-label={`Avatar ${a}`}
                  >
                    <span className="av-tick"><I.Check size={14} /></span>
                    {a}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="confirm-hero">
                <span className="avatar sz-xl tint-lav ring-lav">{avatar}</span>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)', margin: '0 0 8px' }}>
                  Say hello to <span className="grad-name">{nickname.trim() || 'your learner'}</span>
                </h4>
                <div className="row center gap-2">
                  <span className="chip chip-lav">{ageBand} years</span>
                  <span className="chip chip-mint"><I.Check size={14} /> Ready to learn</span>
                </div>
              </div>
              {willCostExtra && preview && (
                <div className="card card-pad card-tint-sun" style={{ marginTop: 'var(--space-5)' }}>
                  <div className="row gap-4">
                    <span className="itile itile-sun"><I.Star size={18} /></span>
                    <div>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 4px' }}>
                        Adding an extra learner
                      </h4>
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--fg-2)' }}>
                        This adds <strong>{centsToDisplay(preview.addon_cents_per_child, preview.currency)}/{preview.interval}</strong>.
                        Your plan becomes <strong>{centsToDisplay(preview.total_cents, preview.currency)}/{preview.interval}</strong>.
                        No surprise billing, cancel anytime.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
      </>
      )}

      {error && <p className="form-error" role="alert" style={{ marginTop: 16 }}>{error}</p>}
    </ModalShell>
  );
}

// ── Per-child controls ──────────────────────────────────────────────────

type CamMode = 'standard' | 'gentle' | 'off';
const LIMIT_STEP = 5;
const LIMIT_MIN = 0;
const LIMIT_MAX = 120;

function ControlsModal({
  childId,
  onClose,
  onDone,
}: { childId: string; onClose: () => void; onDone: () => void }) {
  const { overview } = useParent();
  const child = overview?.children.find(c => c.id === childId);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [dailyLimit, setDailyLimit] = useState<number | null>(20);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [cameraReassurance, setCameraReassurance] = useState<CamMode>('standard');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  // Load existing controls so changes persist across opens.
  useEffect(() => {
    let cancelled = false;
    setLoadingPrefs(true);
    getParentControls(childId).then(c => {
      if (cancelled) return;
      if (c) {
        setDailyLimit(c.daily_play_limit_minutes ?? null);
        setPaused(!!c.paused);
        setSound(c.sound_enabled !== false);
        setCameraReassurance((c.camera_reassurance as CamMode) ?? 'standard');
      }
      setLoadingPrefs(false);
    });
    return () => { cancelled = true; };
  }, [childId]);

  async function handleSave() {
    if (!overview?.parent?.id) return;
    triggerButtonSparkle(saveBtnRef.current);
    setSaving(true);
    await upsertParentControls(childId, overview.parent.id, {
      daily_play_limit_minutes: dailyLimit,
      paused,
      sound_enabled: sound,
      camera_reassurance: cameraReassurance,
    });
    logEvent('parent_controls_updated');
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => {
      onDone();
      onClose();
    }, 950);
  }

  function decLimit() {
    if (dailyLimit === null) return;
    const next = dailyLimit - LIMIT_STEP;
    setDailyLimit(next <= LIMIT_MIN ? null : next);
  }
  function incLimit() {
    setDailyLimit(prev => {
      if (prev === null) return LIMIT_MIN + LIMIT_STEP; // 5
      return Math.min(LIMIT_MAX, prev + LIMIT_STEP);
    });
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Learning preferences"
      description={
        <>Settings that help <strong>{child?.nickname ?? 'this learner'}</strong> learn safely. Changes save when you're ready.</>
      }
      avatarIcon={child?.avatar || '🌱'}
      tone="aqua"
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            ref={saveBtnRef}
            type="button"
            onClick={handleSave}
            disabled={saving || loadingPrefs}
            className="btn btn-primary"
          >
            {savedFlash ? (<>Saved <I.Check size={16} /></>) : saving ? 'Saving...' : (<>Save changes <I.Check size={16} /></>)}
          </button>
        </>
      }
    >
      {loadingPrefs ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 220, color: 'var(--fg-3)' }}>
          Loading...
        </div>
      ) : (
        <div className="stack" style={{ ['--space-6' as string]: '28px' } as React.CSSProperties}>

          {/* Daily play time */}
          <div>
            <div className="row gap-3" style={{ marginBottom: 'var(--space-4)' }}>
              <span className="itile itile-mint" style={{ width: 42, height: 42 }}>
                <I.Hourglass size={20} />
              </span>
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', margin: 0 }}>Daily play time</h4>
                <p className="muted" style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)' }}>
                  A gentle nudge when time's up. Never an abrupt stop.
                </p>
              </div>
            </div>
            <div className="numctl" role="group" aria-label="Daily play limit">
              <button type="button" onClick={decLimit} aria-label="Less time" disabled={dailyLimit === null}>
                <I.Minus size={22} />
              </button>
              <span className="num-val">
                {dailyLimit === null ? 'No limit' : `${dailyLimit} min`}
              </span>
              <button type="button" onClick={incLimit} aria-label="More time" disabled={dailyLimit === LIMIT_MAX}>
                <I.Plus size={22} />
              </button>
            </div>
            <p className="muted" style={{ margin: '10px 0 0', fontSize: 'var(--text-sm)' }}>
              Tip: 15-20 minutes is plenty for this age. Go all the way down for <strong>No limit</strong>.
            </p>
          </div>

          {/* Sound */}
          <div className="irow">
            <span className="itile itile-sky" style={{ width: 46, height: 46 }}>
              <I.Speaker size={22} />
            </span>
            <div className="irow-body">
              <h4>Sound &amp; voice prompts</h4>
              <p>Friendly voice cues and game sounds during activities.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sound}
              aria-label="Sound"
              onClick={() => setSound(s => !s)}
              className="toggle"
            />
          </div>

          {/* Camera reassurance */}
          <div className="irow" style={{ alignItems: 'flex-start' }}>
            <span className="itile itile-lav" style={{ width: 46, height: 46 }}>
              <I.Camera size={22} />
            </span>
            <div className="irow-body" style={{ paddingTop: 2 }}>
              <h4>Camera reassurance</h4>
              <p style={{ marginBottom: 12 }}>Show your child a small preview of themselves while they play.</p>
              <div className="seg" role="radiogroup" aria-label="Camera reassurance">
                {(['off', 'standard', 'gentle'] as CamMode[]).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={cameraReassurance === opt}
                    onClick={() => setCameraReassurance(opt)}
                    className={cameraReassurance === opt ? 'on' : ''}
                  >
                    {opt === 'off' ? 'Off' : opt === 'standard' ? 'Standard' : 'Always on'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pause */}
          <div className="irow">
            <span className="itile itile-peach" style={{ width: 46, height: 46 }}>
              <I.Pause size={22} />
            </span>
            <div className="irow-body">
              <h4>Pause access for now</h4>
              <p>Temporarily turn off gameplay. Handy at dinner or bedtime.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={paused}
              aria-label="Pause access"
              onClick={() => setPaused(p => !p)}
              className="toggle tone-lav"
            />
          </div>

          {/* Privacy reassurance */}
          <div className="card card-pad card-tint-sky">
            <div className="row gap-4">
              <span
                className="itile itile-grad"
                style={{ background: 'linear-gradient(150deg, var(--sky-400), var(--sky-600))' }}
              >
                <I.Shield size={22} />
              </span>
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', margin: '0 0 4px' }}>
                  We protect your child's privacy
                </h4>
                <p style={{ margin: '0 0 8px', fontSize: 'var(--text-base)', color: 'var(--fg-2)' }}>
                  The camera is processed only on this device. No video ever leaves it. No facial recognition. No uploads, ever.
                </p>
                <a
                  href="/parent/privacy"
                  style={{ color: 'var(--sky-700)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Learn more <I.ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>

        </div>
      )}
    </ModalShell>
  );
}
