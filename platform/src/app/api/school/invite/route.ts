import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'
import {
  sanitizeString,
  stripHtml,
  isValidEmail,
  RateLimiter,
  getClientIp,
  isJsonContentType,
} from '@/lib/security/validation'

// Rate limit: 3 invite requests per minute per IP
const inviteRateLimiter = new RateLimiter(3, 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit
    const ip = getClientIp(request)
    const { allowed } = inviteRateLimiter.check(ip)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // SECURITY: Validate content type
    if (!isJsonContentType(request)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 415 })
    }

    // Auth: verify the caller is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, school_id')
      .eq('id', user.id)
      .single()

    if (!teacher || !teacher.school_id) {
      return NextResponse.json({ error: 'You must be part of a school to invite teachers' }, { status: 403 })
    }

    // Check user is school owner/admin
    const { data: schoolTeacher } = await supabase
      .from('school_teachers')
      .select('role')
      .eq('school_id', teacher.school_id)
      .eq('teacher_id', teacher.id)
      .single()

    if (!schoolTeacher || !['owner', 'admin', 'school_admin'].includes(schoolTeacher.role)) {
      return NextResponse.json({ error: 'Only school admins can invite teachers' }, { status: 403 })
    }

    const body = await request.json()
    const { emails } = body as { emails: unknown }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'emails array is required' }, { status: 400 })
    }

    // SECURITY: Cap batch size
    if (emails.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 invites per request' }, { status: 400 })
    }

    // SECURITY: Validate and sanitize all email addresses
    const sanitizedEmails: string[] = []
    const invalidEmails: string[] = []
    for (const rawEmail of emails) {
      const cleaned = stripHtml(sanitizeString(rawEmail, 254)).toLowerCase()
      if (!isValidEmail(cleaned)) {
        invalidEmails.push(cleaned)
      } else {
        sanitizedEmails.push(cleaned)
      }
    }

    if (invalidEmails.length > 0) {
      return NextResponse.json({ error: `Invalid email(s): ${invalidEmails.slice(0, 5).join(', ')}` }, { status: 400 })
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
    if (sanitizedEmails.length > seatsRemaining) {
      return NextResponse.json({
        error: `Not enough seats. You have ${seatsRemaining} seat(s) available but tried to invite ${sanitizedEmails.length}.`
      }, { status: 400 })
    }

    const admin = createAdminClient()
    // SECURITY FIX: Do not include tokens in response — they should only be sent via email
    const results: Array<{ email: string; status: 'sent' | 'already_member' | 'error' }> = []

    for (const email of sanitizedEmails) {
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

        // Generate invite token (cryptographically secure)
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

        // SECURITY: Log invite generation for audit (no token in log)
        console.log(`[SchoolInvite] Invite generated for ${email} to school ${teacher.school_id}`)

        // TODO: Send invite email via Resend (token should ONLY go in the email link)
        // const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/join-school?token=${token}`

        results.push({ email, status: 'sent' })
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
