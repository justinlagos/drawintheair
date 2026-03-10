import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/supabase/types'

interface TeacherSessionStats extends Database['public']['Views']['v_teacher_session_stats']['Row'] {}
interface ActivityPerformance extends Database['public']['Views']['v_activity_performance']['Row'] {}

interface InsightGenerationRequest {
  teacher_id?: string
}

interface Insight {
  title: string
  body: string
  severity: 'info' | 'suggestion' | 'warning'
  insight_type: 'engagement' | 'activity' | 'timing' | 'recommendation'
}

interface InsightResponse {
  insights?: Insight[]
  summary?: string
  recommendations?: Array<{ title: string; description: string; impact: string }>
  metrics?: Record<string, unknown>
}

async function getAnthropicResponse(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>
  }
  const content = data.content[0]
  if (content.type === 'text') {
    return content.text
  }

  throw new Error('Unexpected response format from Anthropic')
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const supabase = createAdminClient()

    // Verify token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      )
    }

    const teacherId = user.id
    const body: InsightGenerationRequest = await request.json()

    // Verify teacher is requesting their own insights (or is admin)
    const requestedTeacherId = body.teacher_id || teacherId
    if (requestedTeacherId !== teacherId) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('is_admin')
        .eq('id', teacherId)
        .single()

      if (!teacher?.is_admin) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    // Check tier: Pro only (unless admin)
    const { data: requestingTeacher } = await supabase
      .from('teachers')
      .select('tier, is_admin')
      .eq('id', teacherId)
      .single()

    if (!requestingTeacher?.is_admin && requestingTeacher?.tier !== 'pro') {
      return NextResponse.json(
        { error: 'This feature is available for Pro users only' },
        { status: 403 }
      )
    }

    // Rate limit: check if teacher has generated insights in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentInsights, error: rateCheckError } = await supabase
      .from('teacher_insights')
      .select('id')
      .eq('teacher_id', requestedTeacherId)
      .eq('metric', 'ai_generated_insights')
      .gte('recorded_at', oneDayAgo)

    if (!rateCheckError && recentInsights && recentInsights.length > 0) {
      return NextResponse.json(
        { error: 'You can only generate insights once per 24 hours' },
        { status: 429 }
      )
    }

    // Query session stats for this teacher (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: sessionStats, error: statsError } = await supabase
      .from('v_teacher_session_stats')
      .select('*')
      .eq('teacher_id', requestedTeacherId)
      .gte('last_session_at', thirtyDaysAgo)
      .single()

    if (statsError || !sessionStats) {
      // Teacher has no sessions yet
      return NextResponse.json({
        insights: [],
        summary: 'No sessions yet. Start creating classroom sessions to generate insights.',
        recommendations: [],
        metrics: {},
      })
    }

    // Query activity performance
    const { data: activityData, error: activityError } = await supabase
      .from('v_activity_performance')
      .select('*')

    if (activityError) {
      console.error('Failed to fetch activity performance:', activityError)
      return NextResponse.json(
        { error: 'Failed to generate insights' },
        { status: 500 }
      )
    }

    // Build structured summary (no student names)
    const structuredData = {
      totalSessions: sessionStats.total_sessions,
      totalStudents: sessionStats.total_students,
      avgSessionDuration: sessionStats.avg_session_duration,
      lastSessionDate: sessionStats.last_session_at,
      period: 'last_30_days',
      activities: (activityData || []).map((activity: ActivityPerformance) => ({
        name: activity.gesture_name,
        attempts: activity.total_attempts,
        avgAccuracy: activity.avg_accuracy,
        completionRate: activity.completion_rate,
        lastUsed: activity.last_used_at,
      })),
    }

    // Build system prompt for AI insights
    const systemPrompt = `You are an education platform analytics assistant for Draw in the Air. You analyse PLATFORM USAGE and ENGAGEMENT PATTERNS only.

CRITICAL RULES:
- You NEVER diagnose children or assess learning ability
- You NEVER identify or discuss individual students
- Focus ONLY on aggregate patterns and teaching method recommendations
- Provide insights on: session duration optimization, activity effectiveness, engagement patterns, session frequency, and untried activities
- Keep recommendations practical and implementable in a classroom
- Be encouraging and constructive

Respond with a JSON object containing:
- insights: array of 3-5 insight objects with { title, body, severity ('info'|'suggestion'|'warning'), insight_type ('engagement'|'activity'|'timing'|'recommendation') }
- summary: brief overview of classroom activity patterns
- recommendations: array of actionable items
- metrics: object with engagement_trend, activity_diversity, retention_pattern`

    const userPrompt = `Analyze this classroom activity data from Draw in the Air and provide insights:

${JSON.stringify(structuredData, null, 2)}

Provide 3-5 actionable insights in JSON format with the specified structure. Focus on improving classroom engagement and activity effectiveness.`

    // Call Anthropic API
    const insightText = await getAnthropicResponse(systemPrompt, userPrompt)

    // Parse response (attempt to extract JSON)
    let insightData: InsightResponse = {
      insights: [],
      summary: insightText,
      recommendations: [],
      metrics: {},
    }

    try {
      const jsonMatch = insightText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        insightData = JSON.parse(jsonMatch[0]) as InsightResponse
      }
    } catch {
      // If parsing fails, return the text as summary
      insightData = {
        insights: [],
        summary: insightText,
        recommendations: [],
        metrics: {},
      }
    }

    // Store insights in database
    const { error: insertError } = await supabase
      .from('teacher_insights')
      .insert({
        teacher_id: requestedTeacherId,
        metric: 'ai_generated_insights',
        value: 1,
        period: 'week',
        recorded_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to store insights:', insertError)
    }

    return NextResponse.json({
      insights: insightData.insights || [],
      summary: insightData.summary || '',
      recommendations: insightData.recommendations || [],
      metrics: insightData.metrics || {},
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Insights generation error:', errorMessage)

    // Determine appropriate status code
    let statusCode = 500
    if (errorMessage.includes('Invalid authorization')) {
      statusCode = 401
    } else if (errorMessage.includes('Pro users only')) {
      statusCode = 403
    }

    return NextResponse.json(
      { error: 'Failed to generate insights', details: errorMessage },
      { status: statusCode }
    )
  }
}
