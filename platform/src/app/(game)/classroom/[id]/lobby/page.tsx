'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Copy, Check } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import QRCode from 'qrcode'

type SessionRow = Database['public']['Tables']['sessions']['Row']
type SessionStudent = Database['public']['Tables']['session_students']['Row']

export default function ClassroomLobbyPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const supabase = createClient()

  const [session, setSession] = useState<SessionRow | null>(null)
  const [students, setStudents] = useState<SessionStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrCode, setQrCode] = useState<string>('')
  const [user, setUser] = useState<{ id: string } | null>(null)

  // Load initial session data and set up realtime subscriptions
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Get current user
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession()
        if (!authSession) {
          router.push('/auth/login')
          return
        }
        setUser({ id: authSession.user.id })

        // Fetch session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessionError) {
          console.error('Session fetch failed:', sessionError)
          router.push('/classroom/start')
          return
        }

        setSession(sessionData)

        // Fetch existing students
        const { data: studentsData, error: studentsError } = await supabase
          .from('session_students')
          .select('*')
          .eq('session_id', sessionId)
          .order('joined_at', { ascending: true })

        if (!studentsError && studentsData) {
          setStudents(studentsData)
        }

        // Generate QR code
        const joinUrl = `${window.location.origin}/join/${sessionData.session_code}`
        try {
          const qr = await QRCode.toDataURL(joinUrl, { width: 200 })
          setQrCode(qr)
        } catch (qrError) {
          console.error('QR code generation failed:', qrError)
        }

        // Subscribe to new students joining
        const channel = supabase
          .channel(`session:${sessionId}:students`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'session_students',
              filter: `session_id=eq.${sessionId}`,
            },
            (payload) => {
              setStudents((prev) => [...prev, payload.new as SessionStudent])
            }
          )
          .subscribe()

        setIsLoading(false)

        return () => {
          supabase.removeChannel(channel)
        }
      } catch (error) {
        console.error('Error loading session:', error)
        setIsLoading(false)
      }
    }

    loadSession()
  }, [sessionId, supabase, router])

  const handleStartRound = async () => {
    if (students.length === 0) return

    setIsStarting(true)
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'playing' })
        .eq('id', sessionId)

      if (error) {
        console.error('Failed to start round:', error)
        alert('Failed to start round. Please try again.')
        setIsStarting(false)
        return
      }

      router.push(`/classroom/${sessionId}/round`)
    } catch (error) {
      console.error('Unexpected error:', error)
      setIsStarting(false)
    }
  }

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this session?')) return

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (error) {
        console.error('Failed to end session:', error)
        alert('Failed to end session. Please try again.')
        return
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Unexpected error:', error)
    }
  }

  const copyJoinUrl = () => {
    const joinUrl = `drawintheair.com/join/${session?.session_code}`
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  const activityName = session.metadata?.activity_name || 'Activity'
  const activityEmoji = session.metadata?.activity_emoji || '🎮'
  const roundNumber = session.metadata?.round_number || 1

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Classroom Session</h1>
          <p className="text-slate-600">{activityEmoji} {activityName} - Round {roundNumber}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Session Code */}
          <Card className="lg:col-span-2 bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Session Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8 bg-slate-100 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Students can join with</p>
                <p className="text-6xl font-bold text-orange-500 font-mono">{session.session_code}</p>
              </div>

              {/* Join URL */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-900">Join URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`drawintheair.com/join/${session.session_code}`}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded text-slate-700 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyJoinUrl}
                    className="border-slate-300 text-slate-900 hover:bg-slate-100"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          {qrCode && (
            <Card className="bg-white border-slate-200 flex flex-col items-center">
              <CardHeader className="w-full">
                <CardTitle className="text-slate-900 text-center">QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center p-6">
                <img
                  src={qrCode}
                  alt="Join session QR code"
                  className="bg-white p-2 rounded-lg"
                  width={180}
                  height={180}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Students Grid */}
        <Card className="bg-white border-slate-200 mb-8">
          <CardHeader>
            <CardTitle className="text-slate-900">{students.length} Student{students.length !== 1 ? 's' : ''} Joined</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 text-lg">Waiting for students to join...</p>
                <p className="text-slate-500 text-sm mt-2">Share the code or QR code above</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {students.map((student) => (
                  <div key={student.id} className="text-center p-3 bg-slate-100 rounded-lg border border-slate-200">
                    <div className="text-2xl mb-1">
                      {student.student_avatar || '👤'}
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate">{student.student_name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={handleStartRound}
            disabled={students.length === 0 || isStarting}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Round ({students.length} Student{students.length !== 1 ? 's' : ''})
          </Button>

          <Button
            onClick={handleEndSession}
            variant="destructive"
            className="px-8 py-3 text-white font-semibold"
          >
            End Session
          </Button>
        </div>
      </div>
    </div>
  )
}
