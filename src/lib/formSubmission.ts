/**
 * Unified Form Submission System
 *
 * All marketing forms across Draw in the Air funnel through this module.
 *
 * Submission flow:
 *   1. Supabase Edge Function `lead-capture` (owned, live). Stores the row in
 *      form_submissions; the email-dispatch cron emails the founder.
 *      URL: `${VITE_SUPABASE_URL}/functions/v1/lead-capture`
 *   2. Google Sheets endpoint (VITE_SHEETS_ENDPOINT), legacy fallback.
 *   3. Legacy leads endpoint (VITE_LEADS_ENDPOINT), if configured.
 *   Every submission is also copied to localStorage as a local backup.
 *
 * Honesty rule (WP2B.2 / DIA-013): `success` is true ONLY when a remote
 * endpoint accepted the submission. A local-only copy is NOT success and
 * callers must tell the user their message did not send.
 *
 * History: the old default endpoint was app.drawintheair.com/api/form-submission
 * on the retired platform project. It 404s, so leads were silently lost.
 */

export type FormType =
  | 'school_pack_request'
  | 'school_pilot'
  | 'parent_trial'
  | 'feedback'
  | 'newsletter'
  | 'contact'
  | 'pilot_list';

export interface FormPayload {
  type: FormType;
  email?: string;
  name?: string;
  school?: string;
  role?: string;
  message?: string;
  /** Any additional fields */
  [key: string]: string | number | boolean | undefined;
}

export type SubmissionMethod = 'lead_capture' | 'google_sheets' | 'leads_endpoint' | 'local_only';

export interface SubmissionResult {
  /** True only when a remote endpoint accepted the submission. */
  success: boolean;
  method: SubmissionMethod;
  /** Plain-English reason when success is false. */
  error?: string;
}

/** Copy shown to users when nothing remote accepted the submission. */
export const SUBMISSION_FAILED_MESSAGE =
  'We could not send your details right now. Please try again, or email partnership@drawintheair.com.';

export interface SubmissionEnv {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  sheetsEndpoint?: string;
  leadsEndpoint?: string;
}

function envFromVite(): SubmissionEnv {
  return {
    supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || '',
    supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
    sheetsEndpoint: (import.meta.env.VITE_SHEETS_ENDPOINT as string) || '',
    leadsEndpoint: (import.meta.env.VITE_LEADS_ENDPOINT as string) || '',
  };
}

/** Build the lead-capture URL from the Supabase project URL, or null if unset. */
export function leadCaptureUrl(supabaseUrl: string | undefined): string | null {
  const base = (supabaseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return null;
  return `${base}/functions/v1/lead-capture`;
}

/** Turn a lead-capture HTTP status into the outcome the UI should show. */
export function interpretLeadCaptureResponse(
  status: number,
  body: { error?: string } | null,
): { accepted: boolean; error?: string; retryable: boolean } {
  if (status >= 200 && status < 300) return { accepted: true, retryable: false };
  if (status === 429) {
    return { accepted: false, retryable: false, error: 'Too many submissions from this connection. Please try again in an hour.' };
  }
  if (status === 400) {
    return { accepted: false, retryable: false, error: body?.error || 'Please check the details you entered.' };
  }
  return { accepted: false, retryable: true, error: SUBMISSION_FAILED_MESSAGE };
}

const STORAGE_KEY = 'dita_form_submissions';

export interface SubmitOptions {
  env?: SubmissionEnv;
  fetchFn?: typeof fetch;
  storeLocallyFn?: (data: Record<string, unknown>) => void;
}

/**
 * Submit form data through the unified pipeline.
 * Always stores locally; attempts remote endpoints in priority order.
 */
export async function submitFormData(payload: FormPayload, options: SubmitOptions = {}): Promise<SubmissionResult> {
  const env = options.env ?? envFromVite();
  const fetchFn = options.fetchFn ?? fetch;
  const store = options.storeLocallyFn ?? storeLocally;

  const enriched = {
    ...payload,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  // Always store locally as backup
  store(enriched);

  let lastError: string | undefined;

  // Tier 1: Supabase Edge Function lead-capture
  const captureUrl = leadCaptureUrl(env.supabaseUrl);
  if (captureUrl && env.supabaseAnonKey) {
    try {
      const res = await fetchFn(captureUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.supabaseAnonKey,
          Authorization: `Bearer ${env.supabaseAnonKey}`,
        },
        body: JSON.stringify(enriched),
      });
      let body: { error?: string } | null = null;
      try { body = await res.json(); } catch { body = null; }
      const outcome = interpretLeadCaptureResponse(res.status, body);
      if (outcome.accepted) return { success: true, method: 'lead_capture' };
      lastError = outcome.error;
      // A rejected submission (bad input, rate limited) must not be retried
      // against legacy endpoints; report it to the user as is.
      if (!outcome.retryable) return { success: false, method: 'local_only', error: outcome.error };
      console.warn('[FormSubmission] lead-capture rejected:', res.status, outcome.error);
    } catch (err) {
      console.warn('[FormSubmission] lead-capture unreachable, trying fallback:', err);
      lastError = SUBMISSION_FAILED_MESSAGE;
    }
  } else {
    console.warn('[FormSubmission] Supabase URL or anon key missing; lead-capture skipped.');
  }

  // Tier 2: Google Sheets endpoint
  if (env.sheetsEndpoint) {
    try {
      // SECURITY: Use POST to avoid leaking form data in URLs, logs, and referrer headers
      const res = await fetchFn(env.sheetsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: enriched.type, payload: enriched }),
      });
      if (res.ok || res.type === 'opaque') return { success: true, method: 'google_sheets' };
    } catch (err) {
      console.warn('[FormSubmission] Google Sheets failed, trying leads endpoint:', err);
    }
  }

  // Tier 3: Legacy leads endpoint
  if (env.leadsEndpoint) {
    try {
      const res = await fetchFn(env.leadsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enriched),
      });
      if (res.ok) return { success: true, method: 'leads_endpoint' };
    } catch (err) {
      console.warn('[FormSubmission] Leads endpoint failed:', err);
    }
  }

  // All remote endpoints failed. The local copy is a backup, not a delivery.
  console.warn('[FormSubmission] All remote endpoints unavailable. Data stored locally only.');
  return { success: false, method: 'local_only', error: lastError || SUBMISSION_FAILED_MESSAGE };
}

/**
 * Store a submission in localStorage
 */
function storeLocally(data: Record<string, unknown>): void {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    stored.push(data);
    // Keep max 500 entries to avoid quota issues
    if (stored.length > 500) stored.splice(0, stored.length - 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    // Also store in legacy keys for backward compatibility with admin dashboard
    const type = data.type as string;
    if (type === 'school_pack_request' || type === 'school_pilot') {
      const packs = JSON.parse(localStorage.getItem('schoolPackForms') || '[]');
      packs.push(data);
      localStorage.setItem('schoolPackForms', JSON.stringify(packs));
    }
    if (type === 'newsletter' || type === 'pilot_list') {
      const emails = JSON.parse(localStorage.getItem('pilotEmails') || '[]');
      emails.push({ email: data.email, timestamp: data.timestamp });
      localStorage.setItem('pilotEmails', JSON.stringify(emails));
    }
    if (type === 'feedback') {
      const fb = JSON.parse(localStorage.getItem('feedback') || '[]');
      fb.push(data);
      localStorage.setItem('feedback', JSON.stringify(fb));
    }
    // Also store in generic leads key
    const leads = JSON.parse(localStorage.getItem('leads') || '[]');
    leads.push(data);
    localStorage.setItem('leads', JSON.stringify(leads));
  } catch (err) {
    console.error('[FormSubmission] localStorage write failed:', err);
  }
}

/**
 * Get all stored form submissions (for admin dashboard)
 */
export function getStoredSubmissions(): Record<string, unknown>[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}
