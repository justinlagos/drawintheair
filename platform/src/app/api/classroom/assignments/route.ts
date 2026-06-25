import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Type for the rpc call since the existing type definitions don't cover new functions
type SupabaseRpc = ReturnType<Awaited<ReturnType<typeof createClient>>['rpc']>

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (sessionId) {
      const studentId = searchParams.get('student_id')
      if (!studentId) {
        return NextResponse.json({ error: 'student_id required with session_id' }, { status: 400 })
      }

      const { data: assignments, error } = await (supabase.rpc as any)(
        'get_student_assignments',
        { in_student_id: studentId, in_session_id: sessionId },
      )

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data: assignments })
    }

    const { data: sessions } = await supabase
      .from('sessions')
      .select(`
        id,
        session_code,
        status,
        started_at,
        ended_at,
        session_students(count)
      `)
      .eq('teacher_id', user.id as any)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ data: (sessions as any) || [] })
  } catch (error) {
    console.error('[Assignments API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { session_id, activities } = body as {
      session_id?: string
      activities?: string[]
    }

    if (!session_id || !activities || !Array.isArray(activities)) {
      return NextResponse.json({ error: 'session_id and activities array required' }, { status: 400 })
    }

    const { data, error } = await (supabase.rpc as any)(
      'set_classroom_default_activities',
      { in_session_id: session_id, in_activities: activities },
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[Assignments API] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
