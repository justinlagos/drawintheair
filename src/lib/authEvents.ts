/**
 * authEvents — the single, PII-safe surface for auth/security telemetry.
 * (Auth Framework Phase 8.)
 *
 * Every auth funnel/security signal goes through here so the privacy
 * guarantees live in ONE place:
 *   • PostHog product event (allow-listed name + properties only).
 *   • Durable security trail via the log_security_event() RPC (Phase 6,
 *     migration 0020) — hashed UA, never raw; user_id from auth.uid()
 *     server-side, never sent by us.
 *
 * HARD RULES (enforced by redactAuthContext + the DB scrubber):
 *   • Never an email, password, token, JWT, or any child_* field.
 *   • Only coarse method/role/outcome/error_code ever leaves the device.
 *
 * Both sinks are best-effort: a telemetry failure must never break an
 * auth flow.
 */

import { trackEvent } from './observability';
import { callRpc } from './supabase';

export type AuthEventType =
  | 'auth_signup_started'
  | 'auth_signup_succeeded'
  | 'auth_signup_failed'
  | 'auth_login_succeeded'
  | 'auth_login_failed'
  | 'auth_logout'
  | 'auth_logout_all'
  | 'auth_password_reset_requested'
  | 'auth_password_reset_completed'
  | 'auth_role_switched'
  | 'auth_step_up_succeeded'
  | 'auth_step_up_failed'
  | 'auth_mfa_enrolled'
  | 'auth_mfa_removed'
  | 'auth_suspicious_redirect_blocked'
  | 'auth_login_new_context';

export type AuthMethod = 'password' | 'google' | 'magic_link' | 'passkey';
export type AuthRole = 'parent' | 'teacher' | 'school_admin' | 'platform_admin';

export interface AuthEventContext {
  method?: AuthMethod;
  role?: AuthRole;
  outcome?: 'success' | 'failed';
  /** GoTrue/app error CODE only — never a message, never an email. */
  errorCode?: string;
}

const FORBIDDEN_KEY = /(email|password|passwd|token|secret|jwt|child|ssn|dob|address|phone|name)/i;

/**
 * Strip anything that could carry PII/child data, leaving only the
 * bounded, vetted auth fields. Defence-in-depth on top of the allow-list.
 */
export function redactAuthContext(ctx: AuthEventContext = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (v == null) continue;
    if (FORBIDDEN_KEY.test(k)) continue;
    out[k] = String(v).slice(0, 64);
  }
  return out;
}

/** Stable, non-reversible hash of the UA family (FNV-1a). Never raw UA. */
function uaHash(): string {
  try {
    const ua = navigator.userAgent || '';
    let h = 0x811c9dc5;
    for (let i = 0; i < ua.length; i++) {
      h ^= ua.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return (h >>> 0).toString(16);
  } catch {
    return '';
  }
}

// Map the funnel property names to PostHog's allow-listed property keys.
function toPosthogProps(ctx: AuthEventContext): Record<string, unknown> {
  const r = redactAuthContext(ctx);
  const props: Record<string, unknown> = {};
  if (r.method) props.auth_method = r.method;
  if (r.role) props.role = r.role;
  if (r.outcome) props.outcome = r.outcome;
  if (r.errorCode) props.error_code = r.errorCode;
  return props;
}

/**
 * Emit an auth event to both sinks. Fire-and-forget; never throws.
 *
 * @param type    allow-listed auth event name
 * @param ctx     coarse, PII-free context (method/role/outcome/errorCode)
 */
export function logAuthEvent(type: AuthEventType, ctx: AuthEventContext = {}): void {
  // 1. Product analytics (PostHog) — allow-listed name + props only.
  try {
    trackEvent(type, toPosthogProps(ctx));
  } catch {
    /* never break a flow for telemetry */
  }

  // 2. Durable security trail (Supabase). Best-effort; the RPC itself is
  //    revoke-safe and scrubs metadata server-side. We send a hashed UA
  //    and the coarse context only.
  try {
    void callRpc('log_security_event', {
      in_event_type: type,
      in_metadata: redactAuthContext(ctx),
      in_ua_hash: uaHash(),
      in_ip_hash: null,
      in_country: null,
    });
  } catch {
    /* no-op */
  }
}
