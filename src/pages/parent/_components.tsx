/**
 * Premium reusable components for the parent area.
 *
 * Visual primitives now match the zip design system: rounded cards,
 * lavender primary, mint accents, cream surfaces. All scoped via
 * `.scrim.pa-scrim` (for portalled modals) and `.pa-shell` (for everything
 * else). See parent.css.
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { I } from './_shared';

// ── ModalShell ─────────────────────────────────────────────────────────────

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  /** Decorative leading icon on the header. */
  icon?: React.ReactNode;
  /** Optional alternate tonal palette for the head (default plum / 'aqua' for controls). */
  tone?: 'plum' | 'aqua';
  /** If true, icon tile shows a large emoji (used for the learner avatar). */
  avatarIcon?: string;
  /** Footer slot (action buttons). */
  footer?: React.ReactNode;
  /** Max width preset. */
  size?: 'lg' | 'xl';
  children: React.ReactNode;
}

export function ModalShell({
  open, onClose, title, description, icon, tone = 'plum', avatarIcon, footer, size: _size = 'lg', children,
}: ModalShellProps) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  const headTint = tone === 'aqua' ? 'tint-mint' : 'tint-lav';
  const iconClass = avatarIcon
    ? 'itile itile-avatar'
    : tone === 'aqua'
      ? 'itile itile-mint-grad'
      : 'itile itile-grad';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="scrim pa-scrim open"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.22 }}
          role="dialog" aria-modal="true" aria-label={title}
        >
          <motion.div
            className="modal modal-lg"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.32, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <header className={`modal-head ${headTint}`}>
              <div className={iconClass} aria-hidden>
                {avatarIcon ?? icon}
              </div>
              <div className="modal-head-text">
                <h3>{title}</h3>
                {description && <p>{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="modal-x"
              >
                <I.Close size={16} />
              </button>
            </header>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── AgeBandSelector ────────────────────────────────────────────────────────

export interface AgeBandSelectorProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}

export function AgeBandSelector<T extends string>({
  options, value, onChange, label, info, stepNumber, subtitle = 'years',
}: AgeBandSelectorProps<T> & { info?: string; stepNumber?: number; subtitle?: string }) {
  return (
    <div>
      {label && (
        <span className="section-label">
          {stepNumber !== undefined && <span className="step-num">{stepNumber}.</span>}
          {label}
          {info && (
            <button
              type="button"
              aria-label={info}
              title={info}
              style={{ marginLeft: 8, color: 'var(--lavender-700)' }}
            >
              <I.Info size={14} />
            </button>
          )}
        </span>
      )}
      <div className="age-grid" role="radiogroup" aria-label={label ?? 'Age band'}>
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={value === opt}
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
            className={`age-card ${value === opt ? 'sel' : ''}`}
          >
            <div className="age-n">{opt}</div>
            {subtitle && <div className="age-u">{subtitle}</div>}
            <span className="age-tick"><I.Check size={14} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── AvatarPicker ───────────────────────────────────────────────────────────

export interface AvatarPickerProps {
  avatars: readonly string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export function AvatarPicker({ avatars, value, onChange, label }: AvatarPickerProps) {
  return (
    <div>
      {label && <span className="section-label">{label}</span>}
      <div className="avatar-grid" role="radiogroup" aria-label={label ?? 'Choose an avatar'}>
        {avatars.map(a => (
          <motion.button
            key={a}
            type="button"
            role="radio"
            aria-checked={value === a}
            aria-pressed={value === a}
            aria-label={`Avatar ${a}`}
            onClick={() => onChange(a)}
            className={`av-cell ${value === a ? 'sel' : ''}`}
            whileTap={{ scale: 0.96 }}
          >
            {a}
            <span className="av-tick"><I.Check size={14} /></span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── PricingUpgradeCard ─────────────────────────────────────────────────────

export function PricingUpgradeCard({
  perLearnerLabel,
  newTotalLabel,
}: {
  perLearnerLabel: string;
  newTotalLabel: string;
}) {
  return (
    <div className="upsell" role="status">
      <span className="itile itile-sun" aria-hidden>
        <I.Star size={18} />
      </span>
      <div>
        <h4>Adding another learner</h4>
        <p>
          This learner adds <strong>{perLearnerLabel}</strong> to your plan. Your plan will be <strong>{newTotalLabel}</strong>. No surprise billing. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

// ── NumberStepper ──────────────────────────────────────────────────────────

export interface NumberStepperProps {
  value: number | null;
  onChange: (v: number | null) => void;
  /** Step size when increment/decrement. */
  step?: number;
  min?: number;
  max?: number;
  /** Label shown when null. */
  emptyLabel?: string;
  /** Suffix appended when a value is set (e.g. " min"). */
  suffix?: string;
}

export function NumberStepper({
  value, onChange, step = 15, min = 5, max = 240, emptyLabel = 'No limit', suffix = ' min',
}: NumberStepperProps) {
  const display = value == null ? emptyLabel : `${value}${suffix}`;
  const canDec = value != null && value > min;
  const canInc = value == null ? true : value < max;
  return (
    <div className="numctl" role="group" aria-label="Daily play limit">
      <button
        type="button"
        onClick={() => {
          if (value == null) return;
          const next = Math.max(min, value - step);
          onChange(next === min && value <= min + 1 ? null : next);
        }}
        disabled={!canDec}
        aria-label="Decrease"
      >
        <I.Minus size={22} />
      </button>
      <span className={`num-val ${value == null ? 'num-muted' : ''}`}>
        {display}
      </span>
      <button
        type="button"
        onClick={() => {
          const base = value ?? 0;
          onChange(Math.min(max, base + step));
        }}
        disabled={!canInc}
        aria-label="Increase"
      >
        <I.Plus size={22} />
      </button>
    </div>
  );
}

// ── PremiumToggle (iOS-style) ──────────────────────────────────────────────

export function PremiumToggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="toggle"
    />
  );
}

// ── ParentControlCard (row with icon + body + action) ──────────────────────

export interface ControlRowProps {
  icon: React.ReactNode;
  tone?: 'plum' | 'green' | 'aqua';
  title: string;
  description?: string;
  action: React.ReactNode;
}

export function ControlRow({ icon, tone = 'plum', title, description, action }: ControlRowProps) {
  const itileTone =
    tone === 'green' ? 'itile-mint' :
    tone === 'aqua'  ? 'itile-sky'  :
                       'itile-lav';
  return (
    <div className="irow">
      <span className={`itile ${itileTone}`}>{icon}</span>
      <div className="irow-body">
        <h4>{title}</h4>
        {description && <p>{description}</p>}
      </div>
      <div>{action}</div>
    </div>
  );
}

// ── TrustCard ──────────────────────────────────────────────────────────────

export function TrustCard({
  title, body, learnMoreHref,
}: { title: string; body: string; learnMoreHref?: string }) {
  return (
    <aside className="trust" role="note">
      <span className="itile" aria-hidden>
        <I.Shield size={18} />
      </span>
      <div>
        <h4>{title}</h4>
        <p>
          {body}
          {learnMoreHref && (
            <>
              {' '}
              <a href={learnMoreHref} target="_blank" rel="noopener noreferrer">
                Learn more
              </a>
            </>
          )}
        </p>
      </div>
    </aside>
  );
}
