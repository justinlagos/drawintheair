import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth/session'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { teacher, error: authError } = await requireAuth()
    if (authError || !teacher) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Must be a school admin
    if (!teacher.school_id) {
      return NextResponse.json({ error: 'You must be part of a school to invite teachers' }, { status: 403 })
    }

    const supabase = await createClient()

    // Check user is school owner/admin
    const { data: schoolTeacher } = await supabase
      .from('school_teachers')
      .select('role')
      .eq('school_id', teacher.school_id)
      .eq('teacher_id', teacher.id)
      .single()

    if (!schoolTeacher || !['owner', 'admin'].includes(schoolTeacher.role)) {
      return NextResponse.json({ error: 'Only school admins can invite teachers' }, { status: 403 })
    }

    const body = await request.json()
    const { emails } = body as { emails: string[] }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'emails array is required' }, { status: 400 })
    }

    if (emails.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 invites per request' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalid = emails.filter(e => !emailRegex.test(e))
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid email(s): ${invalid.join(', ')}` }, { status: 400 })
    }

    // Check seat availability
    const { data: school } = await supabase
      .from('schools')
      .select('seats_total, seats_used')
      .eq('id', teacher.school_id)
      .single()

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    const seatsRemaining = school.seats_total - school.seats_used
    if (emails.length > seatsRemaining) {
      return NextResponse.json({
        error: `Not enough seats. You have ${seatsRemaining} seat(s) available but tried to invite ${emails.length}.`
      }, { status: 400 })
    }

    const admin = createAdminClient()
    const results: Array<{ email: string; status: 'sent' | 'already_member' | 'error'; token?: string }> = []

    for (const email of emails) {
      try {
        // Check if already a member
        const { data: existingTeacher } = await admin
          .from('teachers')
          .select('id, school_id')
          .eq('email', email)
          .single()

        if (existingTeacher?.school_id === teacher.school_id) {
          results.push({ email, status: 'already_member' })
          continue
        }

        // Generate invite token
        const token = randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

        // Upsert invite (replace if exists)
        const { error: insertError } = await admin
          .from('school_invites')
          .upsert({
            school_id: teacher.school_id,
            email,
            token,
            invited_by: teacher.id,
            expires_at: expiresAt.toISOString(),
          }, { onConflict: 'school_id,email' })

        if (insertError) {
          results.push({ email, status: 'error' })
          continue
        }

        // TODO: Send invite email via Resend
        // For now, log the invite link (replace with email service in production)
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/join-school?token=${token}`
        console.log(`Invite link for ${email}: ${inviteUrl}`)

        results.push({ email, status: 'sent', token })
      } catch {
        results.push({ email, status: 'error' })
      }
    }

    const sent = results.filter(r => r.status === 'sent').length
    const alreadyMembers = results.filter(r => r.status === 'already_member').length
    const errors = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: true,
      summary: { sent, alreadyMembers, errors },
      results,
    })
  } catch (error) {
    console.error('School invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
