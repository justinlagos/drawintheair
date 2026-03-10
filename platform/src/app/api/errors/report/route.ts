import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Rate limiting: max 10 errors per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function getRateLimitKey(ip: string): string {
  return `error-report:${ip}`
}

function checkRateLimit(ip: string): boolean {
  const key = getRateLimitKey(ip)
  const now = Date.now()

  const limitData = rateLimitMap.get(key)

  if (!limitData || limitData.resetAt < now) {
    // Reset limit window (1 minute)
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + 60 * 1000,
    })
    return true
  }

  if (limitData.count >= 10) {
    return false
  }

  limitData.count++
  return true
}

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
    // Get client IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      'unknown'

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body: ErrorReportBody = await request.json()

    // Validate required fields
    if (!body.message) {
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

    // Insert error report
    const { error: insertError } = await supabase
      .from('client_errors')
      .insert({
        teacher_id: teacherId,
        error_message: body.message,
        error_stack: body.error_stack || null,
        page_url: body.page_url || null,
        user_agent: body.user_agent || null,
        metadata: {
          error_type: body.error_type || 'unknown',
          session_id: body.session_id || null,
          ip_hash: hashIp(ip),
          ...body.metadata,
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

function hashIp(ip: string): string {
  // Simple hash function for IP privacy
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
