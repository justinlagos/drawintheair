import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/auth/login?error=missing_token', request.nextUrl.origin)
      )
    }

    // Check user authentication first
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // If user not logged in, redirect to login with return URL
    if (authError || !user) {
      const returnUrl = encodeURIComponent(`/api/auth/join-school?token=${token}`)
      return NextResponse.redirect(
        new URL(`/auth/login?redirect=${returnUrl}`, request.nextUrl.origin)
      )
    }

    // Use admin client to check and update school invites
    const adminSupabase = createAdminClient()

    // Find the invite token
    const { data: invite, error: inviteError } = await adminSupabase
      .from('school_invites')
      .select('id, school_id, email, expires_at, accepted_at')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_invite', request.nextUrl.origin)
      )
    }

    // Check if invite is expired
    if (invite.expires_at) {
      const expiresAt = new Date(invite.expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.redirect(
          new URL('/dashboard?error=invite_expired', request.nextUrl.origin)
        )
      }
    }

    // Check if invite already accepted
    if (invite.accepted_at) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invite_already_accepted', request.nextUrl.origin)
      )
    }

    // Verify email matches
    if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=email_mismatch`, request.nextUrl.origin)
      )
    }

    // Mark invite as accepted
    const { error: updateInviteError } = await adminSupabase
      .from('school_invites')
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      console.error('Failed to mark invite as accepted:', updateInviteError)
      return NextResponse.redirect(
        new URL('/dashboard?error=accept_failed', request.nextUrl.origin)
      )
    }

    // Create school_teachers relationship
    const { error: schoolTeacherError } = await adminSupabase
      .from('school_teachers')
      .insert({
        school_id: invite.school_id,
        teacher_id: user.id,
        status: 'active',
      })

    if (schoolTeacherError) {
      console.error('Failed to create school_teachers relationship:', schoolTeacherError)
      return NextResponse.redirect(
        new URL('/dashboard?error=setup_failed', request.nextUrl.origin)
      )
    }

    // Update teacher's school_id directly (the DB trigger will set tier to 'pro')
    const { error: updateTeacherError } = await adminSupabase
      .from('teachers')
      .update({
        school_id: invite.school_id,
      })
      .eq('id', user.id)

    if (updateTeacherError) {
      console.error('Failed to update teacher school_id:', updateTeacherError)
      return NextResponse.redirect(
        new URL('/dashboard?error=setup_failed', request.nextUrl.origin)
      )
    }

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard?joined_school=true', request.nextUrl.origin)
    )
  } catch (error) {
    console.error('Join school error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=server_error', request.nextUrl.origin)
    )
  }
}
