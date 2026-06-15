/**
 * Meta Conversions API (CAPI) sender — server side.
 *
 * Sends deduplicated server events to Meta. The matching client Pixel event
 * carries the SAME event_id so Events Manager shows "Deduplicated".
 *
 * Privacy: user_data is limited to a SHA-256 hash of the parent email (lower
 * cased + trimmed per Meta's normalization spec). NEVER any child data.
 *
 * No-op (returns false) unless META_PIXEL_ID and META_CAPI_ACCESS_TOKEN are
 * set, so non-configured environments never hit the Graph API.
 */

declare const Deno: { env: { get(key: string): string | undefined } };

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CapiUserData {
  email?: string | null;
  /** Pixel browser id cookie (_fbp) if forwarded from the client. */
  fbp?: string | null;
  /** Pixel click id cookie (_fbc) if forwarded from the client. */
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

export interface CapiEvent {
  eventName: string;            // 'Subscribe' | 'Purchase' | 'CompleteRegistration' | ...
  eventId: string;             // shared with the client Pixel event for dedup
  value?: number;
  currency?: string;           // ISO 4217, lower or upper case
  userData?: CapiUserData;
  eventSourceUrl?: string;
  actionSource?: 'website' | 'system_generated';
}

/** Send one CAPI event. Best-effort; never throws. Returns true on a 2xx. */
export async function sendCapiEvent(ev: CapiEvent): Promise<boolean> {
  const pixelId = Deno.env.get('META_PIXEL_ID');
  const token = Deno.env.get('META_CAPI_ACCESS_TOKEN');
  if (!pixelId || !token) return false; // not configured → no-op

  try {
    const user_data: Record<string, unknown> = {};
    if (ev.userData?.email) user_data.em = [await sha256Hex(ev.userData.email)];
    if (ev.userData?.fbp) user_data.fbp = ev.userData.fbp;
    if (ev.userData?.fbc) user_data.fbc = ev.userData.fbc;
    if (ev.userData?.clientIp) user_data.client_ip_address = ev.userData.clientIp;
    if (ev.userData?.userAgent) user_data.client_user_agent = ev.userData.userAgent;

    const custom_data: Record<string, unknown> = {};
    if (typeof ev.value === 'number') custom_data.value = ev.value;
    if (ev.currency) custom_data.currency = ev.currency.toUpperCase();

    const body: Record<string, unknown> = {
      data: [{
        event_name: ev.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        action_source: ev.actionSource ?? 'website',
        event_source_url: ev.eventSourceUrl,
        user_data,
        custom_data,
      }],
    };
    const testCode = Deno.env.get('META_TEST_EVENT_CODE');
    if (testCode) body.test_event_code = testCode;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
    if (!res.ok) console.error('[capi] non-2xx', ev.eventName, res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.error('[capi] threw', ev.eventName, (e as Error).message);
    return false;
  }
}
