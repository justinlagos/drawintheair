// Shared Stripe + Supabase service-role client setup for edge functions.
//
// We import Stripe via the official ESM build hosted on esm.sh — the Stripe
// SDK supports Deno via its fetch transport. The service-role Supabase client
// uses the supabase-js Deno build.
//
// All env reads are wrapped so a missing var produces a clear 500 instead of
// a cryptic runtime error.

// @ts-ignore — esm.sh URL imports are valid in Deno
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4?target=deno';

declare const Deno: { env: { get(key: string): string | undefined } };

export function getEnv(key: string): string {
  const v = Deno.env.get(key);
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

export function getOptionalEnv(key: string): string | undefined {
  return Deno.env.get(key);
}

export function getStripe(): Stripe {
  return new Stripe(getEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2024-06-20',
    // Stripe's Deno-aware fetch httpClient — required when running outside Node.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/** Service-role client. RLS is bypassed — only call from edge functions. */
export function getServiceSupabase() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

/** Anon client bound to the caller's JWT — respects RLS as that user. */
export function getUserSupabase(authHeader: string | null) {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

/** Read auth.uid() for the caller, or throw 401. */
export async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Response('Missing Authorization header', { status: 401 });
  const supabase = getUserSupabase(authHeader);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Response('Unauthorized', { status: 401 });
  return { userId: data.user.id, email: data.user.email ?? null, supabase };
}
