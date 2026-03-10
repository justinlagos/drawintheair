'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier, type TierLevel } from '@/lib/auth/tier'
import type { Database } from '@/lib/supabase/types'

type Teacher = Database['public']['Tables']['teachers']['Row']

/**
 * Get the current Supabase session.
 * This is a server-side function that should be called in Server Components or API routes.
 */
export async function getSession() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

/**
 * Get the current authenticated teacher profile with full tier information.
 * Returns null if user is not authenticated.
 */
export async function getTeacher(): Promise<Teacher | null> {
  const session = await getSession()
  if (!session?.user?.id) {
    return null
  }

  const supabase = await createClient()
  const { data: teacher, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error) {
    console.error('Failed to fetch teacher:', error)
    return null
  }

  return teacher
}

/**
 * Require authentication. Redirects to /auth/login if not authenticated.
 * Returns the session if authenticated.
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/login')
  }
  return session
}

/**
 * Require a minimum tier level. Redirects to /dashboard/upgrade if insufficient.
 * Returns the teacher if they have the required tier or higher.
 * Common tiers from lowest to highest: free < trial < pro < school/admin
 */
export async function requireTier(minTier: TierLevel) {
  const teacher = await getTeacher()

  if (!teacher) {
    redirect('/auth/login')
  }

  const effectiveTier = getEffectiveTier(teacher)

  const tierHierarchy: Record<TierLevel, number> = {
    free: 0,
    trial: 1,
    pro: 2,
    school: 3,
    admin: 4,
  }

  if (tierHierarchy[effectiveTier] < tierHierarchy[minTier]) {
    redirect('/dashboard/upgrade')
  }

  return teacher
}

/**
 * Require admin access. Redirects to / if not an admin.
 * Returns the teacher if they are an admin.
 */
export async function requireAdmin() {
  const teacher = await getTeacher()

  if (!teacher || !teacher.is_admin) {
    redirect('/')
  }

  return teacher
}

/**
 * Check if the current user is authenticated without redirecting.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return !!session
}

/**
 * Check if the current teacher has a specific tier without redirecting.
 * Returns false if not authenticated.
 */
export async function hasTier(minTier: TierLevel): Promise<boolean> {
  const teacher = await getTeacher()
  if (!teacher) {
    return false
  }

  const effectiveTier = getEffectiveTier(teacher)

  const tierHierarchy: Record<TierLevel, number> = {
    free: 0,
    trial: 1,
    pro: 2,
    school: 3,
    admin: 4,
  }

  return tierHierarchy[effectiveTier] >= tierHierarchy[minTier]
}

/**
 * Check if the current user is an admin without redirecting.
 */
export async function isAdmin(): Promise<boolean> {
  const teacher = await getTeacher()
  return teacher?.is_admin ?? false
}

/**
 * Sign out the current user and clear the session.
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
