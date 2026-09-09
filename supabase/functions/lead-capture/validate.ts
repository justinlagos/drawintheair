/**
 * Pure validation and origin rules for the lead-capture function.
 * No Deno or network imports so vitest can test it (tests/lead-capture.test.ts).
 */

export const ALLOWED_ORIGINS = [
  'https://drawintheair.com',
  'https://www.drawintheair.com',
  'http://localhost:5173',
  'http://localhost:4173',
];
// Vercel preview deployments of the production project `drawintheair`.
const PREVIEW_ORIGIN_RE = /^https:\/\/drawintheair(-[a-z0-9-]+)?\.vercel\.app$/;

const VALID_TYPES = new Set([
  'school_pack_request',
  'school_pilot',
  'parent_trial',
  'feedback',
  'newsletter',
  'contact',
  'pilot_list',
]);

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_SHORT = 200;
const MAX_MESSAGE = 4000;
const MAX_META_KEYS = 40;
const MAX_META_VALUE = 1000;
export const RATE_LIMIT = 5;
export const RATE_WINDOW_SECONDS = 3600;

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN_RE.test(origin);
}

type Scalar = string | number | boolean;

export interface ValidLead {
  form_type: string;
  email: string | null;
  name: string | null;
  school: string | null;
  role: string | null;
  message: string | null;
  metadata: Record<string, Scalar>;
}

export type Validation =
  | { ok: true; lead: ValidLead; honeypot: false }
  | { ok: true; lead: null; honeypot: true }
  | { ok: false; error: string };

function clip(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

/** Pure validator so it can be unit tested without Deno. */
export function validateLead(body: unknown): Validation {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  // Honeypot: real forms never fill this. Pretend success, store nothing.
  if (typeof b.website === 'string' && b.website.trim() !== '') {
    return { ok: true, lead: null, honeypot: true };
  }

  const type = typeof b.type === 'string' ? b.type : '';
  if (!VALID_TYPES.has(type)) return { ok: false, error: 'Invalid form type' };

  const email = clip(b.email, 254);
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: 'Invalid email address' };

  const name = clip(b.name, MAX_SHORT);
  const school = clip(b.school, MAX_SHORT);
  const role = clip(b.role, MAX_SHORT);
  const message = clip(b.message, MAX_MESSAGE);

  if (!email && !message) return { ok: false, error: 'Provide an email address or a message' };

  const metadata: Record<string, Scalar> = {};
  let keys = 0;
  for (const [k, v] of Object.entries(b)) {
    if (['type', 'email', 'name', 'school', 'role', 'message', 'website'].includes(k)) continue;
    if (keys >= MAX_META_KEYS) break;
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t) continue;
      metadata[k.slice(0, 64)] = t.length > MAX_META_VALUE ? t.slice(0, MAX_META_VALUE) : t;
      keys++;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      metadata[k.slice(0, 64)] = v;
      keys++;
    }
  }

  return {
    ok: true,
    honeypot: false,
    lead: { form_type: type, email: email ? email.toLowerCase() : null, name, school, role, message, metadata },
  };
}

