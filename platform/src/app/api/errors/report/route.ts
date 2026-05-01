import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import {
  RateLimiter,
  getClientIp,
  hashIp,
  sanitizeString,
  isValidUUID,
  isJsonContentType,
  isPayloadWithinLimit,
} from '@/lib/security/validation'

// Rate limiting: max 10 errors per minute per IP (with automatic cleanup)
const errorRateLimiter = new RateLimiter(10, 60 * 1000)

interface ErrorReportBody {
  error_type?: string
  message: string
  user_agent?: string
  session_id?: string
  metadata?: Record<string, unknown>
  error_stack?: string
  page_url?: string
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Validate content type
    if (!isJsonContentType(request)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 415 })
    }

    // SECURITY: Reject oversized payloads (50KB max for error reports)
    if (!isPayloadWithinLimit(request, 51200)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    // Get client IP
    const ip = getClientIp(request)

    // Check rate limit
    const { allowed } = errorRateLimiter.check(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body: ErrorReportBody = await request.json()

    // Validate required fields
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get teacher_id if available from session (if authenticated)
    let teacherId: string | null = null
    try {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)
        if (!userError && user) {
          teacherId = user.id
        }
      }
    } catch {
      // Ignore auth errors, report as anonymous
    }

    // SECURITY: Sanitize and truncate all inputs
    const sanitizedMessage = sanitizeString(body.message, 2000)
    const sanitizedStack = body.error_stack ? sanitizeString(body.error_stack, 5000) : null
    const sanitizedUrl = body.page_url ? sanitizeString(body.page_url, 500) : null
    const sanitizedUserAgent = body.user_agent ? sanitizeString(body.user_agent, 500) : null
    const sanitizedSessionId = body.session_id && isValidUUID(body.session_id) ? body.session_id : null

    // Insert error report
    const { error: insertError } = await supabase
      .from('client_errors')
      .insert({
        teacher_id: teacherId,
        error_message: sanitizedMessage,
        error_stack: sanitizedStack,
        page_url: sanitizedUrl,
        user_agent: sanitizedUserAgent,
        metadata: {
          error_type: sanitizeString(body.error_type || 'unknown', 50),
          session_id: sanitizedSessionId,
          ip_hash: hashIp(ip),
          // SECURITY: Do not spread arbitrary user metadata into DB
        },
      })

    if (insertError) {
      console.error('Failed to insert error report:', insertError)
      return NextResponse.json(
        { error: 'Failed to log error' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error report endpoint error:', errorMessage)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
