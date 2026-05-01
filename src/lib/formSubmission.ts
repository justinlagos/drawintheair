/**
 * Unified Form Submission System
 *
 * All forms across Draw in the Air funnel through this module.
 *
 * Submission flow (3-tier):
 *   1. Supabase Edge Function → emails partnership@drawintheair.com + auto-reply
 *   2. Google Sheets endpoint (VITE_SHEETS_ENDPOINT) — legacy fallback
 *   3. localStorage — always stored as backup
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

const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT
  || 'https://app.drawintheair.com/api/form-submission';
const SHEETS_ENDPOINT = import.meta.env.VITE_SHEETS_ENDPOINT;
const LEADS_ENDPOINT = import.meta.env.VITE_LEADS_ENDPOINT;

const STORAGE_KEY = 'dita_form_submissions';

/**
 * Submit form data through the unified pipeline.
 * Always stores locally; attempts remote endpoints in priority order.
 */
export async function submitFormData(payload: FormPayload): Promise<{ success: boolean; method: string }> {
  const enriched = {
    ...payload,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  // Always store locally as backup
  storeLocally(enriched);

  // Tier 1: Supabase Edge Function (sends email to partnership@drawintheair.com)
  if (FORM_ENDPOINT) {
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enriched),
      });
      if (res.ok) return { success: true, method: 'edge_function' };
    } catch (err) {
      console.warn('[FormSubmission] Edge Function failed, trying fallback:', err);
    }
  }

  // Tier 2: Google Sheets endpoint
  if (SHEETS_ENDPOINT) {
    try {
      // SECURITY: Use POST to avoid leaking form data in URLs, logs, and referrer headers
      const res = await fetch(SHEETS_ENDPOINT, {
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
  if (LEADS_ENDPOINT) {
    try {
      const res = await fetch(LEADS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enriched),
      });
      if (res.ok) return { success: true, method: 'leads_endpoint' };
    } catch (err) {
      console.warn('[FormSubmission] Leads endpoint failed:', err);
    }
  }

  // All remote endpoints failed — data is safe in localStorage
  console.warn('[FormSubmission] All remote endpoints unavailable. Data stored locally.');
  return { success: true, method: 'local_only' };
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
