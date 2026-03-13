'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const features = [
  {
    title: 'Classroom Mode',
    description: 'Full control over live sessions',
  },
  {
    title: 'Live Leaderboard',
    description: 'Real-time scoring and engagement',
  },
  {
    title: 'Analytics',
    description: 'Track student progress and participation',
  },
  {
    title: 'AI Insights',
    description: 'Smart recommendations for improvements',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkAuth()
  }, [router])

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        },
      })

      if (authError) {
        setError(authError.message || 'Failed to sign in with Google')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Heading */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          Sign in to your classroom
        </h1>
        <p className="text-slate-600">
          Get started with a free 5-day trial of Teacher Pro
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Google Sign In Button */}
      <Button
        variant="primary"
        size="lg"
        onClick={handleGoogleSignIn}
        loading={isLoading}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </Button>

      {/* Features Preview */}
      <div className="space-y-3 pt-4">
        <h3 className="text-sm font-semibold text-slate-700">
          What you'll get:
        </h3>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature.title} className="flex items-start gap-3">
              <div className="mt-1 flex-shrink-0">
                <svg
                  className="h-4 w-4 text-emerald-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {feature.title}
                </p>
                <p className="text-xs text-slate-600">
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Terms and Privacy */}
      <div className="border-t border-slate-200 pt-6">
        <p className="text-center text-xs text-slate-600">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-orange-600 hover:text-orange-700 font-medium">
            Terms
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-orange-600 hover:text-orange-700 font-medium">
            Privacy Policy
          </Link>
        </p>
      </div>

      {/* Play Link */}
      <div className="border-t border-slate-200 pt-6">
        <p className="text-center text-sm text-slate-600">
          Just want to play?{' '}
          <a
            href={`${process.env.NEXT_PUBLIC_GAME_URL ?? 'https://drawintheair.com'}/play`}
            className="text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            Go to free activities
          </a>
        </p>
      </div>
    </div>
  )
}
