/**
 * Teacher account helpers. Wraps the lightweight Supabase client in
 * src/lib/supabase.ts (PostgREST + GoTrue over fetch) so teacher signup
 * and profile-read paths don't pull in a second SDK.
 *
 * Privacy: teacher_profiles only holds adult contact info (name, school
 * name). Children never have auth accounts. See migration 0008.
 */

import {
  dbSelect,
  getUser,
  getSupabaseUrl,
  getAnonKey,
  adoptExternalSession,
  friendlyAuthError,
  type SupabaseUser,
} from './supabase';

export interface TeacherProfile {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  school_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

/**
 * Load the signed-in teacher's profile row, or null if there isn't one
 * (e.g. signup row creation lagged behind the auth trigger). RLS scopes
 * the read to the current auth.uid() so no filter is needed here.
 */
export async function getTeacherProfile(): Promise<TeacherProfile | null> {
  const user = getUser();
  if (!user) return null;
  const { data } = await dbSelect<TeacherProfile[]>(
    'teacher_profiles',
    `auth_user_id=eq.${user.id}&limit=1`,
  );
  if (Array.isArray(data) && data.length > 0) return data[0];
  return null;
}

export type TeacherSignupResult =
  | { ok: true; user: SupabaseUser; needsEmailConfirm?: boolean }
  | { ok: false; error: string };

/**
 * Create a new teacher account. We post raw_user_meta_data.role='teacher'
 * so the on_auth_user_created_teacher trigger (migration 0008) inserts
 * the matching teacher_profiles row server-side.
 *
 * Mirrors the shape of signUpWithEmail in src/lib/supabase.ts, but uses
 * the teacher signup payload so we don't have to fork that helper.
 */
export async function signUpTeacher(
  email: string,
  password: string,
  fullName: string,
  schoolName: string,
): Promise<TeacherSignupResult> {
  try {
    const res = await fetch(`${getSupabaseUrl()}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: getAnonKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
        data: {
          role: 'teacher',
          full_name: fullName.trim() || undefined,
          school_name: schoolName.trim() || undefined,
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: friendlyAuthError(res.status, json, res.statusText),
      };
    }
    // GoTrue returns either a populated session (auto-confirm on) or
    // just the user (email confirm required). The session MUST be
    // adopted through supabase.ts so the in-memory client session and
    // every auth listener (AuthContext, /class console) update too,
    // writing sb-session to localStorage alone left the app thinking
    // the brand-new teacher was signed out until a full reload.
    if (json?.access_token && json?.user) {
      const user = adoptExternalSession(json);
      if (user) return { ok: true, user };
    }
    if (json?.user) {
      // Email-confirmation flow. An obfuscated user with empty
      // identities means the email is already registered (GoTrue's
      // anti-enumeration response), surface that honestly.
      const identities = (json.user as { identities?: unknown[] }).identities;
      if (Array.isArray(identities) && identities.length === 0) {
        return {
          ok: false,
          error: 'This email already has an account. Please sign in instead, or use “Forgot password” if you can’t remember it.',
        };
      }
      return { ok: true, user: json.user as SupabaseUser, needsEmailConfirm: true };
    }
    return {
      ok: false,
      error: 'We couldn’t finish creating your account. Please try again in a moment, or sign in if you already have an account.',
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
