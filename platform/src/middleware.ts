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

export async function middleware(request: NextRequest) {
  // Handle session refresh
  let response = await updateSession(request)
  if (!response) {
    response = NextResponse.next()
  }

  const pathname = request.nextUrl.pathname

  // Public routes: allow access without authentication
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return response
  }

  // Game and join routes: allow anonymous access (no auth required)
  if (gameRoutes.some(route => pathname.startsWith(route))) {
    return response
  }

  // Auth routes: allow access without authentication
  if (authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return response
  }

  // API routes: handled by individual route handlers (middleware passes through)
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    return response
  }

  // Protected routes: check authentication via server component or page component
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // Redirect unauthenticated users to login
    const user = request.headers.get('x-user-id')
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
}
