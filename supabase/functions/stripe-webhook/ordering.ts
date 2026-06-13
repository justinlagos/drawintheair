/**
 * Pure decision helpers for the Stripe webhook (H3). Kept dependency-free
 * (no Deno / Stripe / Supabase imports) so the same logic can be imported by
 * the Deno edge function AND unit-tested in Node/vitest.
 */

/** Postgres unique-violation SQLSTATE — surfaced by PostgREST as `code`. */
export const PG_UNIQUE_VIOLATION = '23505';

/** True when an insert error means the event was already logged (a replay). */
export function isDuplicateEventError(code: string | undefined | null): boolean {
  return code === PG_UNIQUE_VIOLATION;
}

/**
 * True when an incoming event is older than the last one we applied, so it
 * must be skipped (Stripe does not guarantee delivery order). Equal timestamps
 * are NOT stale (the idempotency gate already drops exact duplicates by id).
 *
 * @param eventTs     ISO timestamp of the incoming event (Stripe event.created)
 * @param lastEventAt ISO timestamp last applied for this row, or null/undefined
 */
export function isStaleEvent(
  eventTs: string,
  lastEventAt: string | null | undefined,
): boolean {
  return !!lastEventAt && eventTs < lastEventAt;
}
