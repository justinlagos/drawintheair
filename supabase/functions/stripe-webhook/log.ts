/**
 * Structured logging for the Stripe webhook (Issue 1, task 7).
 *
 * Kept dependency-free (no Deno / Stripe / Supabase imports) so the builder
 * can be unit-tested in Node/vitest AND used by the Deno edge function.
 *
 * Every line is a single JSON object on one line so Supabase's log explorer
 * (and any downstream log drain) can filter/aggregate by field. We log the
 * full lifecycle of every event so that, the next time billing goes quiet, we
 * can answer "did the webhook even arrive, did the signature verify, did the
 * insert succeed?" from the logs alone — no guessing.
 *
 * PRIVACY: only Stripe identifiers and our own UUIDs are logged. No emails,
 * no names, no payloads. Stripe customer/subscription ids and parent_id are
 * pseudonymous identifiers, safe to log for operational debugging.
 */

export type WebhookStep =
  | 'received'
  | 'signature_failed'
  | 'signature_verified'
  | 'ignored_type'
  | 'parent_resolved'
  | 'parent_unresolved'
  | 'billing_event_logged'
  | 'billing_event_duplicate'
  | 'billing_event_insert_failed'
  | 'stale_event_skipped'
  | 'subscription_sync_ok'
  | 'subscription_sync_failed'
  | 'payment_failed_marked'
  | 'handler_error'
  | 'done';

export interface WebhookLogFields {
  /** Stripe event id (evt_...). */
  eventId?: string | null;
  /** Stripe event type, e.g. customer.subscription.updated. */
  eventType?: string | null;
  /** Stripe event.created as an ISO timestamp. */
  eventTs?: string | null;
  /** Stripe customer id (cus_...). */
  customerId?: string | null;
  /** Stripe subscription id (sub_...). */
  subscriptionId?: string | null;
  /** Resolved app parent/user UUID. */
  parentId?: string | null;
  /** Resulting subscription status when relevant. */
  status?: string | null;
  /** Error message on a failure step. */
  error?: string | null;
  /** HTTP status we are about to return. */
  httpStatus?: number | null;
}

/**
 * Build a single structured log line. Returns a JSON string. Undefined/empty
 * fields are dropped so lines stay compact. `ts` is always stamped so events
 * can be ordered even across instances.
 */
export function buildWebhookLog(step: WebhookStep, fields: WebhookLogFields = {}): string {
  const record: Record<string, unknown> = { tag: 'stripe-webhook', step, ts: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null && v !== '') record[k] = v;
  }
  return JSON.stringify(record);
}
