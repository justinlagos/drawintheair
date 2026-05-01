import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const publicRoutes = [
  '/',
  '/about',
  '/pricing',
  '/contact',
  '/blog',
  '/terms',
  '/privacy',
  '/for-teachers',
  '/for-schools',
]

const gameRoutes = [
  '/play',
  '/join',
]

const authRoutes = [
  '/auth/login',
  '/auth/callback',
  '/auth/reset-password',
]

const apiRoutes = [
  '/api',
]

const protectedRoutes = [
  '/dashboard',
  '/classroom',
  '/school',
  '/admin',
  '/teacher',
]

// SECURITY: Security headers applied to all responses
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-XSS-Protection': '0',
  // CSP: Allow Supabase, Stripe, Google fonts, and self
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://fmrsfjxwswzhvicylaph.supabase.co wss://fmrsfjxwswzhvicylaph.supabase.co https://api.stripe.com https://api.resend.com https://api.anthropic.com",
    "frame-src 'self' https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
}

/**
 * Validate redirect parameter is safe (relative path only).
 */
function isSafeRedirect(url: string): boolean {
  if (!url.startsWith('/')) return false
  if (url.includes('://')) return false
  if (url.includes('//')) return false
  if (url.includes('\\')) return false
  if (url.toLowerCase().includes('javascript:')) return false
  if (url.toLowerCase().includes('data:')) return false
  return true
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export async function middleware(request: NextRequest) {
  // Handle session refresh
  let response = await updateSession(request)
  if (!response) {
    response = NextResponse.next()
  }

  const pathname = request.nextUrl.pathname

  // Public routes: allow access without authentication
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return applySecurityHeaders(response)
  }

  // Game and join routes: allow anonymous access (no auth required)
  if (gameRoutes.some(route => pathname.startsWith(route))) {
    return applySecurityHeaders(response)
  }

  // Auth routes: allow access without authentication
  if (authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return applySecurityHeaders(response)
  }

  // API routes: handled by individual route handlers (middleware passes through)
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    return applySecurityHeaders(response)
  }

  // Protected routes: check authentication via server component or page component
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // Redirect unauthenticated users to login
    const user = response.headers.get('x-user-id')
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      // SECURITY: Validate redirect parameter before setting
      if (isSafeRedirect(pathname)) {
        loginUrl.searchParams.set('redirect', pathname)
      }
      const redirectResponse = NextResponse.redirect(loginUrl)
      return applySecurityHeaders(redirectResponse)
    }
  }

  // SECURITY: Remove internal header before sending to client
  response.headers.delete('x-user-id')

  return applySecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}
