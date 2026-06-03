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
  | { ok: true; user: SupabaseUser }
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
        error: json?.error_description || json?.msg || res.statusText,
      };
    }
    // GoTrue returns either a populated session (auto-confirm on) or
    // just the user (email confirm required). We persist the session
    // when present by re-using the public sb-session storage that
    // src/lib/supabase.ts owns. To avoid duplicating that, we just
    // hand the session back via a tiny adopt step here.
    if (json?.access_token && json?.user) {
      const session = {
        access_token: json.access_token,
        refresh_token: json.refresh_token || '',
        expires_at: Math.floor(Date.now() / 1000) + (json.expires_in || 3600),
        user: json.user as SupabaseUser,
      };
      try {
        localStorage.setItem('sb-session', JSON.stringify(session));
      } catch {
        /* private mode etc. */
      }
      return { ok: true, user: json.user as SupabaseUser };
    }
    if (json?.user) return { ok: true, user: json.user as SupabaseUser };
    return { ok: false, error: 'No session returned by Supabase.' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
