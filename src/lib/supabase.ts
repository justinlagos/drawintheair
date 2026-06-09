/**
 * Lightweight Supabase client, zero dependencies.
 * Uses native fetch() for PostgREST + GoTrue, and WebSocket for Realtime.
 */

// Observability, bump the health registry on RPC failure so the System
// Health panel can show "Supabase RPC failures: N" without us having to
// instrument every caller. The import is one-way (health → nothing),
// so there's no circular-import risk.
import { recordSupabaseRpcFailure } from './observability/health';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: SupabaseUser;
}

interface PostgrestResponse<T> {
  data: T | null;
  error: { message: string; code: string } | null;
}

type RealtimeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

// ─── Session management ──────────────────────────────────────────────────────

let currentSession: SupabaseSession | null = null;
const authListeners: Array<(user: SupabaseUser | null) => void> = [];

function persistSession(session: SupabaseSession | null) {
  if (session) {
    localStorage.setItem('sb-session', JSON.stringify(session));
  } else {
    localStorage.removeItem('sb-session');
  }
  currentSession = session;
}

function loadSession(): SupabaseSession | null {
  try {
    const raw = localStorage.getItem('sb-session');
    if (!raw) return null;
    const session = JSON.parse(raw) as SupabaseSession;
    // Expired access token: keep the session if we hold a refresh token
    // (scheduleTokenRefresh exchanges it on boot). Only a session with no
    // refresh token is truly dead. This is what makes "keep me signed in"
    // real — previously every session silently died after ~1 hour, which
    // also broke the Stripe checkout/portal calls with 401s.
    if (session.expires_at && Date.now() / 1000 > session.expires_at - 60) {
      if (session.refresh_token) return session;
      localStorage.removeItem('sb-session');
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ─── Token refresh ───────────────────────────────────────────────────────────

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<boolean> | null = null;

/** Exchange the refresh token for a fresh access token. Safe to call
 *  concurrently — calls coalesce onto one network request. */
export async function refreshSession(): Promise<boolean> {
  if (!currentSession?.refresh_token) return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentSession!.refresh_token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.access_token || !json?.user) {
        // Refresh token rejected (revoked / already used): session is over.
        persistSession(null);
        notifyAuthListeners(null);
        return false;
      }
      const session: SupabaseSession = {
        access_token: json.access_token,
        refresh_token: json.refresh_token || currentSession!.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 3600),
        user: json.user,
      };
      persistSession(session);
      scheduleTokenRefresh();
      return true;
    } catch {
      return false; // transient network failure — keep the session, retry later
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Keep the access token alive for as long as the tab is open. */
function scheduleTokenRefresh() {
  if (typeof window === 'undefined') return;
  if (refreshTimer) clearTimeout(refreshTimer);
  if (!currentSession?.refresh_token || !currentSession.expires_at) return;
  // Refresh 5 minutes before expiry (immediately if already past that).
  const ms = Math.max(0, (currentSession.expires_at - 300) * 1000 - Date.now());
  refreshTimer = setTimeout(() => { void refreshSession(); }, ms);
}

/** Await a valid (non-expired) access token before calling an
 *  authenticated endpoint such as the Stripe edge functions. */
export async function ensureFreshSession(): Promise<void> {
  if (!currentSession) return;
  if (currentSession.expires_at && Date.now() / 1000 > currentSession.expires_at - 60) {
    await refreshSession();
  }
}

function notifyAuthListeners(user: SupabaseUser | null) {
  authListeners.forEach(fn => fn(user));
}

// Initialize session from storage and keep it alive.
currentSession = loadSession();
if (typeof window !== 'undefined' && currentSession) {
  scheduleTokenRefresh();
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  if (currentSession?.access_token) {
    headers['Authorization'] = `Bearer ${currentSession.access_token}`;
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return headers;
}

export function getUser(): SupabaseUser | null {
  return currentSession?.user ?? null;
}

export function getAccessToken(): string {
  return currentSession?.access_token ?? SUPABASE_ANON_KEY;
}

/**
 * The project's public anon key. Use this in the `apikey` header on
 * any direct fetch to PostgREST or Edge Functions, the `apikey`
 * header MUST be the anon (or service_role) key, NEVER a user JWT.
 * Pass the user JWT only via `Authorization: Bearer` if needed.
 */
export function getAnonKey(): string {
  return SUPABASE_ANON_KEY;
}

export function onAuthStateChange(callback: (user: SupabaseUser | null) => void): () => void {
  authListeners.push(callback);
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx >= 0) authListeners.splice(idx, 1);
  };
}

/**
 * Kick off Google OAuth.
 *
 * Supabase's allow-list only contains specific redirect URLs (we
 * registered https://drawintheair.com/class), so we keep
 * redirect_to=/class and instead stash where the caller actually
 * wants to land in sessionStorage. handleAuthCallback() reads it
 * back on the next page load and navigates accordingly.
 *
 * @param returnTo  optional path the caller wants to land on after
 *                  auth completes (e.g. '/admin/insights'). Defaults
 *                  to '/class' (back-compat with teacher dashboard).
 */
export function signInWithGoogle(returnTo?: string) {
  if (returnTo) {
    try {
      sessionStorage.setItem('sb-return-to', returnTo);
    } catch { /* private mode etc. */ }
  }
  // Pass the real destination as redirect_to. The Supabase allow-list now
  // includes https://drawintheair.com/** (configured 2026-06-04), so
  // Google returns the user directly to where they started. The
  // sessionStorage stash above stays as a belt-and-braces fallback: if a
  // redirect_to is ever NOT allow-listed, Supabase falls back to the Site
  // URL and handleAuthCallback still honours the stashed path.
  const safePath = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/class';
  const redirectTo = `${window.location.origin}${safePath}`;
  const url = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&flow_type=implicit`;
  window.location.href = url;
}

export async function signOut() {
  if (currentSession?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch { /* ignore */ }
  }
  persistSession(null);
  notifyAuthListeners(null);
}

/**
 * Sign out of ALL devices (Auth Framework Phase 6). Uses GoTrue's global
 * logout scope, which revokes every refresh token for this user, not just
 * the local one. Falls back to a local sign-out if the network call fails
 * so the current tab never gets stuck signed-in.
 */
export async function signOutEverywhere(): Promise<void> {
  if (currentSession?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch { /* fall through to local clear */ }
  }
  persistSession(null);
  notifyAuthListeners(null);
}

/**
 * Step-up guard for sensitive actions (Phase 6): delete account, export
 * family data, change billing/email, view admin insights, delete learner
 * data. Returns true only if the session was minted within `maxAgeMinutes`.
 * When stale, the caller should re-prompt for the password (or, once MFA
 * lands, an AAL2 challenge) via reauthenticateWithPassword() before
 * proceeding. Server-side RPCs remain the real gate; this is the UX layer.
 */
export function isRecentlyAuthenticated(maxAgeMinutes = 15): boolean {
  if (!currentSession?.expires_at) return false;
  // expires_at = issued_at + expires_in(~3600s). Approximate issued_at and
  // measure age against it. A fresh login/refresh resets this window.
  const issuedAt = currentSession.expires_at - 3600;
  const ageMin = (Date.now() / 1000 - issuedAt) / 60;
  return ageMin <= maxAgeMinutes;
}

/**
 * Re-verify the signed-in user's password without disturbing the active
 * session (used by step-up before a sensitive action). Returns ok/error.
 */
export async function reauthenticateWithPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  const email = currentSession?.user?.email;
  if (!email) return { ok: false, error: 'You are not signed in.' };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.access_token) {
      return { ok: false, error: friendlyAuthError(res.status, json, 'Password not recognised.') };
    }
    // Adopt the fresh session so the recency window resets.
    adoptSession(json);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── MFA readiness (Auth Framework Phase 3 — staged, NOT enabled) ────────────
//
// Thin wrappers over GoTrue's native TOTP MFA endpoints. These are present
// so the UI can be built and reviewed, but enrolment requires MFA to be
// turned ON in the Supabase project's Auth settings (a console toggle, owner
// decision). Until then enroll/challenge return GoTrue's "not enabled"
// error verbatim. SMS is intentionally NOT implemented (children's platform
// policy: TOTP/passkeys only). Backup codes are app-managed (see
// docs/AUTH_FRAMEWORK_PLAN.md §PHASE 3) and not included here.

export interface MfaEnrollResult { ok: boolean; factorId?: string; qrCode?: string; secret?: string; error?: string }

/** Begin TOTP enrolment. Requires project-level MFA to be enabled. */
export async function mfaEnrollTotp(): Promise<MfaEnrollResult> {
  if (!currentSession?.access_token) return { ok: false, error: 'Sign in first.' };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/factors`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Authorization: `Bearer ${currentSession.access_token}` },
      body: JSON.stringify({ factor_type: 'totp', friendly_name: 'Authenticator app' }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: friendlyAuthError(res.status, json, 'Could not start MFA setup.') };
    return { ok: true, factorId: json.id, qrCode: json?.totp?.qr_code, secret: json?.totp?.secret };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Email + password auth (parent accounts) ────────────────────────────────
//
// These wrap Supabase's GoTrue endpoints so the parent signup / login pages
// don't need to import a separate SDK. They return either a populated
// SupabaseUser (with session persisted + listeners notified) or an error
// message safe to display in-UI.
//
// Privacy note: the email signup form is the only place we collect the
// parent's email. We never collect child emails, children don't have
// auth accounts (see migration 0004 docstring).

export type AuthResult =
  | { ok: true; user: SupabaseUser; needsEmailConfirm?: boolean }
  | { ok: false; error: string };

/**
 * Translate raw GoTrue error payloads into messages a parent or teacher
 * can act on. We keep the real failure intact (never hide errors), but:
 *   • rate limits get a clear "wait a few minutes" instruction instead of
 *     the raw "email rate limit exceeded" string,
 *   • duplicate accounts get a "sign in instead" nudge,
 *   • email-validation failures stop sounding like the user's address is
 *     broken when it's usually a typo (or a mail-delivery restriction).
 * Anything we don't recognise falls through verbatim, real errors must
 * stay visible.
 */
export function friendlyAuthError(
  status: number,
  json: { error_description?: string; msg?: string; error_code?: string; code?: string } | null,
  fallback: string,
): string {
  const raw = (json?.error_description || json?.msg || fallback || '').trim();
  const code = (json?.error_code || json?.code || '').toString().toLowerCase();
  const lower = raw.toLowerCase();

  // Email-send rate limiting. This is a SERVER-side budget (Supabase's
  // built-in mail service allows only a couple of emails per hour until
  // custom SMTP is configured), not the user clicking too much. Say so
  // honestly instead of blaming the user.
  if (code === 'over_email_send_rate_limit' || lower.includes('email rate limit')) {
    return 'We can’t send another sign-up email just yet because of a temporary sending limit on our side. Please try again in about an hour — or sign in if your account was already created.';
  }
  // General request rate limiting (HTTP 429, over_request_rate_limit).
  if (status === 429 || code.includes('rate_limit') || lower.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  // Unconfirmed email trying to sign in — a dead end unless we say what to do.
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return 'Your email isn’t confirmed yet. Tap the link in your confirmation email first — or use “Resend confirmation” if it never arrived.';
  }
  // Duplicate account.
  if (code === 'user_already_exists' || lower.includes('already registered') || lower.includes('already been registered')) {
    return 'This email already has an account. Please sign in instead, or use “Forgot password” if you can’t remember it.';
  }
  // Email validation. GoTrue says "Unable to validate email address:
  // invalid format" for malformed input, and "Email address … is invalid"
  // when the auth service refuses the address (often an SMTP/config
  // restriction, not the user's fault).
  if (lower.includes('invalid format')) {
    return 'That email address doesn’t look right. Please check for typos and try again.';
  }
  if (code === 'email_address_invalid' || /email address.*invalid/.test(lower)) {
    return 'We couldn’t accept that email address. Please double-check it, or try a different address. If this keeps happening, contact us, it may be an issue on our side.';
  }
  if (code === 'weak_password' || lower.includes('password should be')) {
    return 'Please choose a longer password (at least 8 characters).';
  }
  return raw || 'Something went wrong creating your account. Please try again.';
}

function adoptSession(json: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: SupabaseUser;
}): SupabaseUser | null {
  if (!json?.access_token || !json?.user) return null;
  const session: SupabaseSession = {
    access_token: json.access_token,
    refresh_token: json.refresh_token || '',
    expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 3600),
    user: json.user,
  };
  persistSession(session);
  notifyAuthListeners(json.user);
  scheduleTokenRefresh();
  return json.user;
}

/**
 * Adopt a session object obtained outside this module (e.g. the teacher
 * signup helper in teacherApi.ts). Keeps the in-memory session, the
 * persisted copy, and every auth listener in sync, writing straight to
 * localStorage is NOT enough, because getUser()/authHeaders() read the
 * module-level session, not storage.
 */
export function adoptExternalSession(json: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: SupabaseUser;
}): SupabaseUser | null {
  return adoptSession(json);
}

/**
 * Create a new parent account. Sets raw_user_meta_data.role = 'parent' so the
 * on_auth_user_created_parent trigger (migration 0007) creates the matching
 * parent_profiles row.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        data: {
          role: 'parent',
          display_name: displayName?.trim() || undefined,
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: friendlyAuthError(res.status, json, res.statusText) };
    }
    const user = adoptSession(json);
    if (user) return { ok: true, user };
    // No session in the response ⇒ email confirmation is enabled.
    // IMPORTANT response shape: with auto-confirm ON, GoTrue returns a
    // session ({ access_token, user: {...} }). With email confirmation
    // ON, it returns the BARE USER at the TOP LEVEL ({ id, email,
    // confirmation_sent_at, identities, ... }), with no `user` wrapper.
    // Missing that second shape made successful signups look like
    // failures ("We couldn't finish creating your account").
    const bareUser: SupabaseUser | null =
      (json?.user as SupabaseUser | undefined) ??
      ((json as { id?: string; email?: string })?.id && (json as { email?: string })?.email
        ? (json as unknown as SupabaseUser)
        : null);
    if (bareUser) {
      // GoTrue returns an OBFUSCATED user (identities: []) when the email
      // already belongs to an account, to prevent enumeration. Treat that
      // as a duplicate so we don't strand the user on a "check your
      // email" screen for a mail that will never arrive.
      const identities = (bareUser as { identities?: unknown[] }).identities;
      if (Array.isArray(identities) && identities.length === 0) {
        return {
          ok: false,
          error: 'This email already has an account. Please sign in instead, or use “Forgot password” if you can’t remember it.',
        };
      }
      // Genuine new account awaiting email confirmation.
      return { ok: true, user: bareUser, needsEmailConfirm: true };
    }
    // Truly empty 2xx response, extremely rare; tell the user what to do
    // rather than dead-ending with an internal-sounding message.
    return {
      ok: false,
      error: 'We couldn’t finish creating your account. Please try again in a moment, or sign in if you already have an account.',
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Sign in an existing parent. */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: friendlyAuthError(res.status, json, 'Sign-in failed.') };
    }
    const user = adoptSession(json);
    if (!user) {
      return {
        ok: false,
        error: 'We couldn’t start your session. Please try signing in again.',
      };
    }
    return { ok: true, user };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Account roles (tenant isolation, migration 0013) ───────────────────────

export interface AccountRoles {
  parent: boolean;
  teacher: boolean;
  admin: boolean;
  /** Phase 2 RBAC (migration 0019). Optional so older callers compile. */
  platform_admin?: boolean;
  school_admin?: boolean;
}

let rolesCache: { userId: string; roles: AccountRoles } | null = null;

/** Which areas this signed-in account has explicitly signed up for. */
export async function getAccountRoles(): Promise<AccountRoles | null> {
  const user = getUser();
  if (!user) return null;
  if (rolesCache && rolesCache.userId === user.id) return rolesCache.roles;
  const { data } = await callRpc<AccountRoles>('get_account_roles');
  if (!data) return null;
  rolesCache = { userId: user.id, roles: data };
  return data;
}

export function clearRolesCache() { rolesCache = null; }

/** Explicitly opt this account into the parent (family) area. */
export async function registerParentAccount(): Promise<boolean> {
  const { error } = await callRpc('register_parent');
  clearRolesCache();
  return !error;
}

/** Explicitly opt this account into the teacher (classroom) area. */
export async function registerTeacherAccount(fullName?: string, schoolName?: string): Promise<boolean> {
  const { error } = await callRpc('register_teacher', {
    in_full_name: fullName ?? null,
    in_school_name: schoolName ?? null,
  });
  clearRolesCache();
  return !error;
}

/** Stash which role the user is explicitly signing up for before an OAuth
 *  round-trip, so the destination area can finish registration. */
export function setRoleIntent(role: 'parent' | 'teacher') {
  try { sessionStorage.setItem('dia-role-intent', role); } catch { /* ignore */ }
}
export function consumeRoleIntent(expected: 'parent' | 'teacher'): boolean {
  try {
    const v = sessionStorage.getItem('dia-role-intent');
    if (v === expected) {
      sessionStorage.removeItem('dia-role-intent');
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

/** True while the user arrived via a password-recovery email link and has
 *  not yet set a new password. Set by handleAuthCallback. */
export function hasPendingRecovery(): boolean {
  try { return sessionStorage.getItem('dia-recovery') === '1'; } catch { return false; }
}
export function clearPendingRecovery() {
  try { sessionStorage.removeItem('dia-recovery'); } catch { /* ignore */ }
}

/** Set a new password for the signed-in user (used by the recovery flow). */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!currentSession?.access_token) {
    return { ok: false, error: 'Your reset link has expired. Please request a new one.' };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: friendlyAuthError(res.status, json, 'Could not update your password.') };
    }
    clearPendingRecovery();
    return { ok: true, user: (json as SupabaseUser) ?? currentSession.user };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Re-send the signup confirmation email (GoTrue /resend). */
export async function resendConfirmation(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'signup', email: email.trim() }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, error: friendlyAuthError(res.status, json, 'Could not resend the email.') };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Send a password-reset email. Always returns ok to avoid email enumeration. */
export async function requestPasswordReset(email: string, redirectTo?: string): Promise<{ ok: true }> {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        redirect_to: redirectTo || `${window.location.origin}/parent/login`,
      }),
    });
  } catch { /* swallow, never reveal whether the address exists */ }
  return { ok: true };
}

/**
 * Call on app init, handles OAuth redirect callback.
 * Checks URL hash for access_token (Supabase implicit flow).
 */
export async function handleAuthCallback(): Promise<SupabaseUser | null> {
  // Check hash params from OAuth redirect
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = params.get('expires_in');
  // GoTrue labels the link type: 'recovery' (password reset), 'signup'
  // (email confirmation), 'magiclink', or absent for OAuth.
  const linkType = params.get('type');

  if (accessToken) {
    // Fetch user from token
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const user = (await res.json()) as SupabaseUser;
        const session: SupabaseSession = {
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_at: Math.floor(Date.now() / 1000) + parseInt(expiresIn || '3600', 10),
          user,
        };
        persistSession(session);
        notifyAuthListeners(user);
        scheduleTokenRefresh();
        // Clean URL hash
        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        // Password recovery: remember that this session came from a reset
        // link so the login pages show the "set a new password" form
        // instead of a confusing signed-out screen. Safety net: if the
        // recovery link landed anywhere else (e.g. Supabase fell back to
        // the Site URL because the redirect wasn't allow-listed), take
        // the user to the right login page so the form actually appears.
        if (linkType === 'recovery') {
          try { sessionStorage.setItem('dia-recovery', '1'); } catch { /* ignore */ }
          const path = window.location.pathname;
          if (path !== '/parent/login' && path !== '/teacher/login') {
            const role = (user.user_metadata as { role?: string } | undefined)?.role;
            window.location.replace(role === 'teacher' ? '/teacher/login' : '/parent/login');
            return user;
          }
        }

        // Email-confirmation links redirect to the site root. Don't strand
        // a freshly confirmed parent or teacher on the landing page; take
        // them to their area based on the role they signed up with.
        if (linkType === 'signup' && window.location.pathname === '/') {
          const role = (user.user_metadata as { role?: string } | undefined)?.role;
          if (role === 'parent') { window.location.replace('/parent/dashboard'); return user; }
          if (role === 'teacher') { window.location.replace('/class'); return user; }
        }

        // Honour any return-to path stashed by signInWithGoogle.
        // Allow-list internal paths only (must start with '/') so a
        // hostile redirect_to can't bounce the user off-domain.
        try {
          const returnTo = sessionStorage.getItem('sb-return-to');
          if (returnTo) {
            sessionStorage.removeItem('sb-return-to');
            if (returnTo.startsWith('/') && returnTo !== window.location.pathname) {
              window.location.replace(returnTo);
              return user; // navigation in progress
            }
          }
        } catch { /* ignore */ }

        return user;
      }
      // Token didn't resolve to a user (revoked/expired). Clean up so the
      // app doesn't sit behind the OAuth-callback loader forever.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      try { sessionStorage.removeItem('sb-return-to'); } catch { /* ignore */ }
    } catch {
      // Network failure fetching the user, same cleanup, same reason.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      try { sessionStorage.removeItem('sb-return-to'); } catch { /* ignore */ }
    }
  }

  // No hash, try existing session
  const existing = loadSession();
  if (existing) {
    currentSession = existing;
    notifyAuthListeners(existing.user);
    return existing.user;
  }

  return null;
}

// ─── PostgREST (database queries) ────────────────────────────────────────────

const REST_URL = `${SUPABASE_URL}/rest/v1`;

export async function dbSelect<T = Record<string, unknown>>(
  table: string,
  query: string = '',
  options?: { single?: boolean }
): Promise<PostgrestResponse<T>> {
  try {
    const headers: Record<string, string> = {
      ...authHeaders(),
      'Accept': 'application/json',
    };
    if (options?.single) {
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }
    const url = `${REST_URL}/${table}${query ? `?${query}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText, code: String(res.status) }));
      return { data: null, error: { message: err.message || res.statusText, code: err.code || String(res.status) } };
    }
    const data = await res.json();
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message, code: 'FETCH_ERROR' } };
  }
}

export async function dbInsert<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>,
  options?: { returning?: boolean; single?: boolean; ignoreDuplicates?: boolean }
): Promise<PostgrestResponse<T>> {
  try {
    // Prefer header composition: returning + duplicate resolution.
    //
    //   • returning=minimal vs representation  → existing behaviour
    //   • resolution=ignore-duplicates         → LIOS idempotency
    //
    // PostgREST accepts multiple Prefer values comma-separated. When
    // ignoreDuplicates is set and the table has a UNIQUE constraint
    // (we add one on event_uid in 20260519_lios_event_envelope.sql),
    // duplicate rows in a bulk insert are silently skipped instead
    // of failing the whole batch, exactly what an offline-queue
    // retry needs.
    const preferParts = [
      options?.returning !== false ? 'return=representation' : 'return=minimal',
    ];
    if (options?.ignoreDuplicates) preferParts.push('resolution=ignore-duplicates');
    const headers: Record<string, string> = {
      ...authHeaders(),
      'Prefer': preferParts.join(', '),
    };
    if (options?.single) {
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }
    const res = await fetch(`${REST_URL}/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText, code: String(res.status) }));
      return { data: null, error: { message: err.message || res.statusText, code: err.code || String(res.status) } };
    }
    if (options?.returning === false) return { data: null, error: null };
    const data = await res.json();
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message, code: 'FETCH_ERROR' } };
  }
}

export async function dbUpdate<T = Record<string, unknown>>(
  table: string,
  updates: Record<string, unknown>,
  query: string,
  options?: { returning?: boolean; single?: boolean }
): Promise<PostgrestResponse<T>> {
  try {
    const headers: Record<string, string> = {
      ...authHeaders(),
      'Prefer': options?.returning !== false ? 'return=representation' : 'return=minimal',
    };
    if (options?.single) {
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }
    const res = await fetch(`${REST_URL}/${table}?${query}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText, code: String(res.status) }));
      return { data: null, error: { message: err.message || res.statusText, code: err.code || String(res.status) } };
    }
    if (options?.returning === false) return { data: null, error: null };
    const data = await res.json();
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message, code: 'FETCH_ERROR' } };
  }
}

// ─── PostgREST RPC ───────────────────────────────────────────────────────────

/**
 * Call a Postgres RPC (SECURITY DEFINER function) via PostgREST.
 *
 * The `apikey` header MUST be the project anon key, this is what
 * PostgREST authenticates the request with. The `Authorization` header
 * carries the user JWT when available so SECURITY DEFINER functions
 * can see auth.uid() and so Supabase request logs attribute the call.
 *
 * For server-gated admin RPCs (post-migration 20260521), unauthenticated
 * callers will receive HTTP 401/403 + an SQLSTATE 42501 body. The
 * caller is responsible for handling that as "forbidden".
 */
export async function callRpc<T = unknown>(
  fn: string,
  args: Record<string, unknown> = {},
): Promise<PostgrestResponse<T>> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({
        message: res.statusText,
        code: String(res.status),
      }));
      // 401/403 are expected for non-admin callers of admin RPCs, those
      // are auth gates, not failures. Only count 5xx + 4xx-other as
      // health-relevant failures.
      const status = res.status;
      const isAuthGate = status === 401 || status === 403;
      if (!isAuthGate) {
        try { recordSupabaseRpcFailure(fn); } catch { /* never break the rpc */ }
      }
      return {
        data: null,
        error: {
          message: err.message || res.statusText,
          code: err.code || String(res.status),
        },
      };
    }
    const data = await res.json();
    return { data: data as T, error: null };
  } catch (e) {
    try { recordSupabaseRpcFailure(fn); } catch { /* never break the rpc */ }
    return { data: null, error: { message: (e as Error).message, code: 'FETCH_ERROR' } };
  }
}

// ─── Realtime (WebSocket) ────────────────────────────────────────────────────

interface RealtimeChannel {
  topic: string;
  callbacks: Array<{ event: string; table: string; filter?: string; callback: RealtimeCallback }>;
}

let realtimeSocket: WebSocket | null = null;
let realtimeRef = 0;
const channels = new Map<string, RealtimeChannel>();
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function connectRealtime() {
  if (realtimeSocket?.readyState === WebSocket.OPEN) return;

  const wsUrl = SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  realtimeSocket = new WebSocket(
    `${wsUrl}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`
  );

  realtimeSocket.onopen = () => {
    // Re-subscribe all channels
    channels.forEach((_ch, topic) => {
      sendPhxJoin(topic);
    });
    // Heartbeat every 30s
    heartbeatInterval = setInterval(() => {
      sendPhx('heartbeat', 'phoenix', {});
    }, 30000);
  };

  realtimeSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const [_joinRef, _ref, topic, eventName, payload] = [
        msg.join_ref, msg.ref, msg.topic, msg.event, msg.payload,
      ];
      if (eventName === 'postgres_changes' && payload?.data) {
        const data = payload.data;
        const channel = channels.get(topic);
        channel?.callbacks.forEach(cb => {
          if (data.table === cb.table) {
            const matchesFilter = !cb.filter || matchesPostgresFilter(cb.filter, data.record);
            if (matchesFilter) {
              cb.callback({
                eventType: data.type as 'INSERT' | 'UPDATE' | 'DELETE',
                new: data.record || {},
                old: data.old_record || {},
              });
            }
          }
        });
      }
    } catch { /* ignore parse errors */ }
  };

  realtimeSocket.onclose = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    // Reconnect after 2s
    setTimeout(connectRealtime, 2000);
  };
}

function matchesPostgresFilter(filter: string, record: Record<string, unknown>): boolean {
  // Parse filter like "session_id=eq.some-uuid"
  const match = filter.match(/^(\w+)=eq\.(.+)$/);
  if (match) {
    return String(record[match[1]]) === match[2];
  }
  return true;
}

function sendPhx(event: string, topic: string, payload: Record<string, unknown>) {
  if (realtimeSocket?.readyState !== WebSocket.OPEN) return;
  realtimeRef++;
  realtimeSocket.send(JSON.stringify({
    topic,
    event,
    payload,
    ref: String(realtimeRef),
  }));
}

function sendPhxJoin(topic: string) {
  const channel = channels.get(topic);
  if (!channel) return;

  const postgresChanges = channel.callbacks.map((cb, i) => ({
    id: i,
    event: cb.event,
    schema: 'public',
    table: cb.table,
    filter: cb.filter ? cb.filter : undefined,
  }));

  realtimeRef++;
  const msg = {
    topic,
    event: 'phx_join',
    payload: {
      config: {
        broadcast: { self: false },
        presence: { key: '' },
        postgres_changes: postgresChanges,
      },
    },
    ref: String(realtimeRef),
    join_ref: String(realtimeRef),
  };
  realtimeSocket?.send(JSON.stringify(msg));
}

export function subscribeToTable(
  channelName: string,
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: RealtimeCallback,
  filter?: string,
): () => void {
  const topic = `realtime:${channelName}`;

  if (!channels.has(topic)) {
    channels.set(topic, { topic, callbacks: [] });
  }

  const channel = channels.get(topic)!;
  const entry = { event, table, filter, callback };
  channel.callbacks.push(entry);

  // Connect and subscribe
  connectRealtime();
  if (realtimeSocket?.readyState === WebSocket.OPEN) {
    sendPhxJoin(topic);
  }

  // Return unsubscribe function
  return () => {
    const idx = channel.callbacks.indexOf(entry);
    if (idx >= 0) channel.callbacks.splice(idx, 1);
    if (channel.callbacks.length === 0) {
      channels.delete(topic);
      sendPhx('phx_leave', topic, {});
    }
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}
