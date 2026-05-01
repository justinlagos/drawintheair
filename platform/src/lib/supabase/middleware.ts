import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip session refresh if Supabase env vars are not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // This refreshes the auth token if needed
    const { data: { user } } = await supabase.auth.getUser()

    // Expose user ID to the main middleware so it can check auth state
    if (user) {
      response.headers.set('x-user-id', user.id)
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return null
  }
}
