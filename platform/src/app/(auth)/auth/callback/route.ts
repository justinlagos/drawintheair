import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/login?error=missing_code', request.nextUrl.origin)
    )
  }

  try {
    const supabase = await createClient()

    // Exchange code for session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Auth exchange error:', exchangeError)
      return NextResponse.redirect(
        new URL('/auth/login?error=auth_failed', request.nextUrl.origin)
      )
    }

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User fetch error:', userError)
      return NextResponse.redirect(
        new URL('/auth/login?error=auth_failed', request.nextUrl.origin)
      )
    }

    // Check if teacher profile exists
    const { data: existingTeacher, error: fetchError } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected for new users
      console.error('Teacher fetch error:', fetchError)
    }

    // If teacher doesn't exist, create one
    // The database trigger will automatically set tier='trial' and trial dates
    if (!existingTeacher) {
      const userMetadata = user.user_metadata || {}
      const { error: insertError } = await supabase
        .from('teachers')
        .insert({
          id: user.id,
          email: user.email || '',
          name: userMetadata.full_name || userMetadata.name || 'Teacher',
          avatar_url: userMetadata.avatar_url || null,
        })

      if (insertError) {
        console.error('Teacher creation error:', insertError)
        // Don't fail auth on profile creation error, let user proceed
      }
    }

    // Redirect to dashboard
    return NextResponse.redirect(
      new URL('/dashboard', request.nextUrl.origin)
    )
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=server_error', request.nextUrl.origin)
    )
  }
}
