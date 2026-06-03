/**
 * progressNarrator. turns get_child_dashboard / get_weekly_summary JSON
 * into warm, plain-English sentences a parent can read in a glance.
 *
 * Rules (from the spec, kept here so they live with the code):
 *   • Never make exaggerated learning claims ("has mastered literacy").
 *   • Prefer hedged verbs: practised, improved, showed confidence,
 *     needs more support, is building familiarity.
 *   • Always use the child's nickname. never a full name (we don't have one).
 *   • Use small numbers in words ("twice"), large ones in digits ("8 minutes").
 *   • No analytics jargon. no "accuracy = 0.67".
 */

import type { ChildDashboard } from '../parentApi';

// Human-friendly names for activity keys used elsewhere in the codebase.
// Keep this map in sync with the GameMode union in src/App.tsx.
const ACTIVITY_LABELS: Record<string, string> = {
  'free': 'free drawing',
  'pre-writing': 'letter tracing',
  'calibration': 'wave-and-pop warm-up',
  'sort-and-place': 'sort and place',
  'word-search': 'word search',
  'colour-builder': 'colour building',
  'balloon-math': 'balloon math',
  'rainbow-bridge': 'rainbow bridge',
  'gesture-spelling': 'gesture spelling',
  'building': 'building blocks',
};

export function describeActivity(activityKey: string): string {
  return ACTIVITY_LABELS[activityKey] ?? activityKey.replace(/-/g, ' ');
}

// ────────────────────────────────────────────────────────────────────────────
// Small helpers
// ────────────────────────────────────────────────────────────────────────────

function nickname(d: Pick<ChildDashboard, 'child'>): string {
  return d.child?.nickname?.trim() || 'your child';
}

function smallNumberWord(n: number): string {
  return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);
}

function minutesFromSeconds(seconds: number): number {
  return Math.round(seconds / 60);
}

function joinWithAnd(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/** One-line summary suitable for a dashboard card. */
export function describeChildOverview(d: ChildDashboard): string {
  const name = nickname(d);
  const totals = d.totals;
  if (!totals || totals.total_attempts === 0) {
    return `${name} hasn't started playing yet. Pick an activity to begin.`;
  }
  const mins = minutesFromSeconds(totals.total_seconds);
  if (mins < 1) {
    return `${name} has just started exploring. every session helps.`;
  }
  return `${name} has practised ${mins === 1 ? 'about a minute' : `for ${mins} minutes`} so far across ${totals.activities_played} ${totals.activities_played === 1 ? 'activity' : 'activities'}.`;
}

/** One or two sentences highlighting strengths. */
export function describeStrengths(d: ChildDashboard): string {
  const name = nickname(d);
  const mastered = d.activities.filter(a => a.status === 'mastered');
  if (mastered.length === 0) {
    const practising = d.activities.filter(a => a.status === 'practising');
    if (practising.length === 0) return `${name} is just getting started. no strengths to report yet.`;
    return `${name} is building familiarity with ${describeActivity(practising[0].activity_key)}.`;
  }
  const labels = mastered.slice(0, 3).map(a => describeActivity(a.activity_key));
  return `${name} is doing well with ${joinWithAnd(labels)}.`;
}

/** One or two sentences highlighting where to help. */
export function describeNeedsSupport(d: ChildDashboard): string {
  const name = nickname(d);
  const struggling = d.activities.filter(a => a.status === 'struggling');
  if (struggling.length === 0) {
    return `Nothing stands out as needing extra support right now.`;
  }
  const labels = struggling.slice(0, 2).map(a => describeActivity(a.activity_key));
  return `${name} could use a little more practice with ${joinWithAnd(labels)}.`;
}

/** Plain-English recommendation. */
export function describeRecommendation(d: ChildDashboard): string {
  const name = nickname(d);
  const key = d.state?.recommended_activity_key ?? d.activities[0]?.activity_key;
  if (!key) return `Try a short ${describeActivity('free')} session to warm up.`;
  return `Next, try ${describeActivity(key)} together. it suits where ${name} is right now.`;
}

/** A short combined paragraph the dashboard hero can render. */
export function describeChildSummary(d: ChildDashboard): string {
  return [
    describeChildOverview(d),
    describeStrengths(d),
    describeNeedsSupport(d),
    describeRecommendation(d),
  ].join(' ');
}

// ────────────────────────────────────────────────────────────────────────────
// Weekly summary
// ────────────────────────────────────────────────────────────────────────────

export interface WeeklySummaryShape {
  sessions: number;
  attempts: number;
  top_strengths: { skill_key: string; mastery: number }[];
  needs_support: { skill_key: string; mastery: number }[];
  recommended_activity_key: string | null;
}

export function describeWeeklySummary(name: string, w: WeeklySummaryShape): string {
  const safeName = name?.trim() || 'your child';
  const sessions = w.sessions || 0;
  const sessionsPhrase =
    sessions === 0
      ? `${safeName} didn't play this week. a short session can rebuild momentum.`
      : `${safeName} played on ${smallNumberWord(sessions)} ${sessions === 1 ? 'day' : 'days'} this week.`;

  const strengthsPhrase =
    w.top_strengths.length > 0
      ? `Strongest skills: ${w.top_strengths.map(s => s.skill_key).slice(0, 3).join(', ')}.`
      : '';

  const supportPhrase =
    w.needs_support.length > 0
      ? `Could use a little more support with: ${w.needs_support.map(s => s.skill_key).slice(0, 3).join(', ')}.`
      : '';

  const recPhrase = w.recommended_activity_key
    ? `Next, try ${describeActivity(w.recommended_activity_key)}.`
    : '';

  return [sessionsPhrase, strengthsPhrase, supportPhrase, recPhrase].filter(Boolean).join(' ');
}
