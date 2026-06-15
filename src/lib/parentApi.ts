/**
 * Typed wrappers around the parent-subscription RPCs defined in
 * supabase/migrations/0004 through 0007. The frontend should NEVER hand-roll
 * a Stripe / pricing decision. Every number flows from these calls.
 *
 * Subscription state is derived server-side by parent_subscription_state()
 * and surfaced as `subscription.state` in get_parent_overview. We never trust
 * a client-side flag (the security spec says so explicitly).
 */

import { callRpc, dbInsert, dbUpdate, dbSelect, getAccessToken, getAnonKey, getSupabaseUrl, ensureFreshSession } from './supabase';
import { consentVersion } from './consent';

// ── Types ───────────────────────────────────────────────────────────────────

export type SubscriptionState =
  | 'none'
  | 'trial_active'
  | 'trial_expired'
  | 'active_monthly'
  | 'active_annual'
  | 'cancelled_active'
  | 'payment_failed'
  | 'expired';

export interface ChildSummary {
  id: string;
  nickname: string;
  age_band: string | null;
  avatar: string | null;
  learning_focus: string | null;
  status: 'active' | 'archived';
  last_played_at: string | null;
  streak_days: number | null;
  recommended_activity_key: string | null;
}

export interface BillingPreview {
  interval: 'month' | 'year';
  currency: string;
  included_slots: number;
  active_children: number;
  extra_children: number;
  base_cents: number;
  addon_cents_per_child: number;
  addon_cents_total: number;
  total_cents: number;
  annual_savings_cents: number;
}

export interface ParentOverview {
  parent: {
    id: string;
    email: string | null;
    display_name: string | null;
    marketing_opt_in: boolean;
    created_at: string;
    updated_at: string;
  } | null;
  subscription: {
    state: SubscriptionState;
    has_access: boolean;
    status: string;
    plan_interval: 'month' | 'year' | null;
    included_child_slots: number;
    billed_addon_quantity: number;
    trial_end: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  plan_usage: {
    active_children: number;
    archived_children: number;
    included_slots: number;
  };
  billing_preview: BillingPreview;
  children: ChildSummary[];
}

export interface ChildDashboard {
  child: ChildSummary & { accessibility_prefs?: Record<string, unknown> };
  state: {
    confidence_overall: number;
    streak_days: number;
    last_played_at: string | null;
    recommended_activity_key: string | null;
  } | null;
  controls: ParentControls | null;
  totals: {
    activities_played: number;
    total_attempts: number;
    total_completions: number;
    total_seconds: number;
    mastered: number;
    practising: number;
    struggling: number;
  } | null;
  activities: ActivitySummary[];
  skills: { skill_key: string; mastery: number; confidence: number; attempts: number }[];
  last_7_days: { activity_key: string; score: number; created_at: string }[];
}

export interface ActivitySummary {
  activity_key: string;
  attempts: number;
  completions: number;
  completion_rate: number;
  mastery: number;
  status: 'mastered' | 'practising' | 'struggling' | 'new';
  total_seconds: number;
  last_played_at: string | null;
}

export interface ParentControls {
  child_profile_id: string;
  parent_id: string;
  daily_play_limit_minutes: number | null;
  allowed_categories: string[] | null;
  paused: boolean;
  sound_enabled: boolean;
  camera_reassurance: 'standard' | 'gentle' | 'off';
  updated_at: string;
}

// ── Reads ──────────────────────────────────────────────────────────────────

export async function getParentOverview(): Promise<ParentOverview | null> {
  const { data, error } = await callRpc<ParentOverview>('get_parent_overview');
  if (error) return null;
  return data;
}

export async function getChildDashboard(childId: string): Promise<ChildDashboard | null> {
  const { data, error } = await callRpc<ChildDashboard>('get_child_dashboard', { p_child: childId });
  if (error) return null;
  return data;
}

export async function getBillingPreview(
  interval: 'month' | 'year',
  activeChildren: number,
): Promise<BillingPreview | null> {
  const { data, error } = await callRpc<BillingPreview>('compute_billing_preview', {
    p_interval: interval,
    p_active_children: activeChildren,
  });
  if (error) return null;
  return data;
}

export async function getWeeklySummary(childId: string): Promise<Record<string, unknown> | null> {
  const { data } = await callRpc<Record<string, unknown>>('get_weekly_summary', { p_child: childId });
  return data;
}

// ── Children ────────────────────────────────────────────────────────────────

export interface CreateChildInput {
  nickname: string;
  age_band?: string;
  learning_focus?: string;
  avatar?: string;
  preferred_hand?: 'left' | 'right';
  accessibility_prefs?: Record<string, unknown>;
}

export async function createChildProfile(input: CreateChildInput, _parentId?: string) {
  // Phase 7: route creation through the consent-enforced RPC. It records
  // the current child_privacy consent (with version + timestamp) and
  // refuses to create a child without it. parent_id is derived server-side
  // from auth.uid(), so the legacy parentId arg is ignored (kept for
  // back-compat). accessibility_prefs (not a parameter of the RPC) is
  // applied as a follow-up patch when supplied.
  const res = await callRpc<{ id: string }>('create_child_profile', {
    p_nickname: input.nickname,
    p_age_band: input.age_band ?? null,
    p_learning_focus: input.learning_focus ?? null,
    p_avatar: input.avatar ?? null,
    p_preferred_hand: input.preferred_hand ?? null,
    p_consent_version: consentVersion('child_privacy'),
  });
  if (!res.error && res.data?.id && input.accessibility_prefs) {
    await dbUpdate('child_profiles', { accessibility_prefs: input.accessibility_prefs }, `id=eq.${res.data.id}`, { single: true });
  }
  return res;
}

export async function updateChildProfile(childId: string, patch: Partial<CreateChildInput>) {
  return dbUpdate('child_profiles', patch, `id=eq.${childId}`, { single: true });
}

export async function archiveChild(childId: string) {
  return callRpc('archive_child_profile', { p_child: childId });
}

export async function restoreChild(childId: string) {
  return callRpc('restore_child_profile', { p_child: childId });
}

export async function deleteChild(childId: string) {
  return callRpc<string>('request_child_deletion', { p_child: childId });
}

// ── Parental controls ───────────────────────────────────────────────────────

export async function upsertParentControls(
  childId: string,
  parentId: string,
  patch: Partial<Omit<ParentControls, 'child_profile_id' | 'parent_id' | 'updated_at'>>,
) {
  // Try update first; if no row exists, fall back to insert.
  const updateRes = await dbUpdate('parent_controls', patch, `child_profile_id=eq.${childId}`, {
    single: true,
  });
  if (updateRes.data || updateRes.error?.code !== 'PGRST116') return updateRes;
  return dbInsert(
    'parent_controls',
    { child_profile_id: childId, parent_id: parentId, ...patch },
    { single: true },
  );
}

/**
 * Read the parent_controls row for a given child. Returns null if no row
 * exists yet (the child has never had controls set), or if the request
 * fails. Used to prefill the controls modal so changes persist across opens.
 */
export async function getParentControls(childId: string): Promise<ParentControls | null> {
  const { data, error } = await dbSelect<ParentControls>(
    'parent_controls',
    `child_profile_id=eq.${childId}`,
    { single: true },
  );
  if (error || !data) return null;
  return data;
}

// ── Consent ─────────────────────────────────────────────────────────────────

export type ConsentType =
  | 'account_terms'
  | 'child_privacy'
  | 'camera_use'
  | 'data_retention'
  | 'marketing';

export async function recordConsent(type: ConsentType, version: string, granted = true) {
  return callRpc<string>('record_consent', {
    p_consent_type: type,
    p_consent_version: version,
    p_granted: granted,
  });
}

// ── Data rights ─────────────────────────────────────────────────────────────

export async function exportParentData() {
  return callRpc<Record<string, unknown>>('export_parent_data');
}

export async function requestAccountDeletion() {
  return callRpc<string>('request_account_deletion');
}

// ── Stripe edge-function bridges ────────────────────────────────────────────
//
// These are POSTs to Supabase Edge Functions defined in supabase/functions/.
// They return a Stripe-hosted URL we redirect the browser to. The
// Authorization header carries the parent's JWT so the function can identify
// who is asking without trusting any body field.

async function callEdgeFunction<T>(fn: string, body: Record<string, unknown> = {}): Promise<T | null> {
  try {
    // Refresh the JWT if it is about to expire — an expired token here was
    // the cause of silent 401s on the Stripe checkout/portal functions.
    await ensureFreshSession();
    const res = await fetch(`${getSupabaseUrl()}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        apikey: getAnonKey(),
        Authorization: `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Start a Stripe Checkout session for either the monthly or yearly plan.
 *  `metaEventId` (optional) is stamped onto the Stripe subscription so the
 *  server CAPI Subscribe event deduplicates with the client Pixel. */
export async function startStripeCheckout(interval: 'month' | 'year', metaEventId?: string) {
  const res = await callEdgeFunction<{ url: string }>('stripe-checkout', {
    interval,
    ...(metaEventId ? { meta_event_id: metaEventId } : {}),
  });
  return res?.url ?? null;
}

/** Open the Stripe Customer Portal (manage card, plan, cancellation).
 *  Returns { url } on success, { reason: 'no_customer' } when the user is on
 *  a complimentary plan with no Stripe customer attached, or null on network
 *  failure. The frontend should show different copy for each case. */
export async function openStripePortal(): Promise<{ url: string } | { reason: 'no_customer' } | null> {
  try {
    const res = await fetch(`${getSupabaseUrl()}/functions/v1/stripe-portal`, {
      method: 'POST',
      headers: {
        apikey: getAnonKey(),
        Authorization: `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && typeof json?.url === 'string') return { url: json.url };
    if (res.status === 400 && /no stripe customer/i.test(String(json?.error || ''))) {
      return { reason: 'no_customer' };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ask the backend to reconcile the Stripe subscription with current active
 * child count (called after the parent adds / archives a learner).
 * Backend updates billed_addon_quantity + the Stripe subscription item.
 */
export async function syncSubscriptionQuantity() {
  return callEdgeFunction<{ ok: boolean; billed_addon_quantity: number }>(
    'sync-subscription',
    {},
  );
}

/**
 * Pull the caller's subscription straight from Stripe and write the full state
 * into the DB — WITHOUT waiting for a webhook. Called on the checkout-success
 * page so the account activates instantly even if the Stripe webhook is slow,
 * delayed, or not configured. Returns { ok, status } or null on failure.
 */
export async function reconcileSubscription() {
  return callEdgeFunction<{ ok: boolean; status: string | null; subscription_id?: string }>(
    'reconcile-subscription',
    {},
  );
}

/**
 * Send a deduplicated server-side Meta CAPI event (registration funnel). The
 * matching client Pixel event must use the SAME eventId. No-ops server-side
 * when the pixel/token aren't configured, or when the caller isn't signed in.
 */
export async function sendMetaCapi(eventName: 'Lead' | 'CompleteRegistration' | 'StartTrial', eventId: string) {
  return callEdgeFunction<{ ok: boolean }>('meta-capi', {
    eventName,
    eventId,
    eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

// ── Stripe price IDs (public, read from stripe_price_map) ──────────────────

export interface PriceMapEntry {
  price_key: 'base.month' | 'base.year' | 'addon.month' | 'addon.year' | string;
  stripe_price_id: string;
  interval: 'month' | 'year';
  role: 'base' | 'addon';
  description: string | null;
  active: boolean;
}

export async function getPriceMap(): Promise<PriceMapEntry[]> {
  const { data } = await dbSelect<PriceMapEntry[]>('stripe_price_map', 'active=eq.true');
  return data ?? [];
}

// ── Display helpers ────────────────────────────────────────────────────────

export function centsToDisplay(cents: number, currency = 'usd'): string {
  const major = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}

export function describeSubscriptionState(state: SubscriptionState): string {
  switch (state) {
    case 'trial_active':
      return 'Free trial';
    case 'trial_expired':
      return 'Trial ended';
    case 'active_monthly':
      return 'Monthly plan';
    case 'active_annual':
      return 'Yearly plan';
    case 'cancelled_active':
      return 'Active until period ends';
    case 'payment_failed':
      return 'Payment needs attention';
    case 'expired':
      return 'Subscription expired';
    default:
      return 'No subscription';
  }
}
