import type { Database } from '@/lib/supabase/types'

type Teacher = Database['public']['Tables']['teachers']['Row']

export type TierLevel = 'free' | 'trial' | 'pro' | 'school' | 'admin'

/**
 * Compute the effective tier for a teacher, considering trial status and expiration.
 * Mirrors the database function get_effective_tier logic.
 */
export function getEffectiveTier(teacher: Teacher): TierLevel {
  // Admins always have admin tier
  if (teacher.is_admin) {
    return 'admin'
  }

  // If teacher has an explicit tier set, use it (handles legacy data)
  if (teacher.tier === 'school' || teacher.tier === 'pro') {
    return teacher.tier
  }

  // Check if trial is active and not expired
  if (teacher.tier === 'trial' && teacher.trial_expires_at) {
    const now = new Date()
    const expiresAt = new Date(teacher.trial_expires_at)
    if (expiresAt > now) {
      return 'trial'
    }
    // Trial has expired, fall back to free
    return 'free'
  }

  // Default to free
  return 'free'
}

/**
 * Check if teacher is actively in a trial period.
 */
export function isTrial(teacher: Teacher): boolean {
  return getEffectiveTier(teacher) === 'trial'
}

/**
 * Check if teacher has pro access (including school-inherited).
 */
export function isPro(teacher: Teacher): boolean {
  const tier = getEffectiveTier(teacher)
  return tier === 'pro' || tier === 'school' || tier === 'admin'
}

/**
 * Check if teacher is admin.
 */
export function isAdmin(teacher: Teacher): boolean {
  return teacher.is_admin
}

/**
 * Check if trial period has expired.
 */
export function isExpired(teacher: Teacher): boolean {
  if (teacher.tier !== 'trial' || !teacher.trial_expires_at) {
    return false
  }

  const now = new Date()
  const expiresAt = new Date(teacher.trial_expires_at)
  return expiresAt <= now
}

/**
 * Get remaining days in trial period. Returns 0 if not in trial or expired.
 */
export function getTrialDaysRemaining(teacher: Teacher): number {
  if (!isTrial(teacher) || !teacher.trial_expires_at) {
    return 0
  }

  const now = new Date()
  const expiresAt = new Date(teacher.trial_expires_at)
  const diffMs = expiresAt.getTime() - now.getTime()

  if (diffMs <= 0) {
    return 0
  }

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Check if teacher can create a new session.
 * Free tier cannot create sessions, trial and pro can.
 */
export function canCreateSession(teacher: Teacher): boolean {
  const tier = getEffectiveTier(teacher)
  return tier !== 'free'
}

/**
 * Check if teacher can access advanced analytics.
 * Only pro (including school and admin) can. Trial gets limited analytics.
 */
export function canAccessAnalytics(teacher: Teacher): boolean {
  const tier = getEffectiveTier(teacher)
  return tier === 'pro' || tier === 'school' || tier === 'admin'
}

/**
 * Check if teacher can access limited analytics (trial feature).
 * Trial and pro can access analytics, free cannot.
 */
export function canAccessLimitedAnalytics(teacher: Teacher): boolean {
  return isTrial(teacher) || canAccessAnalytics(teacher)
}

/**
 * Check if teacher can access detailed insights dashboard.
 * Only pro (including school and admin) can.
 */
export function canAccessInsights(teacher: Teacher): boolean {
  const tier = getEffectiveTier(teacher)
  return tier === 'pro' || tier === 'school' || tier === 'admin'
}

/**
 * Check if teacher can save custom playlists.
 * Only pro (including school and admin) can. Free and trial cannot.
 */
export function canSavePlaylists(teacher: Teacher): boolean {
  const tier = getEffectiveTier(teacher)
  return tier === 'pro' || tier === 'school' || tier === 'admin'
}

/**
 * Check if teacher can export session data.
 * Only pro (including school and admin) can.
 */
export function canExportData(teacher: Teacher): boolean {
  const tier = getEffectiveTier(teacher)
  return tier === 'pro' || tier === 'school' || tier === 'admin'
}

/**
 * Check if teacher can access classroom features.
 * Trial and pro (including school and admin) can. Free cannot.
 */
export function canAccessClassroom(teacher: Teacher): boolean {
  const tier = getEffectiveTier(teacher)
  return tier !== 'free'
}

/**
 * Get a human-readable description of the teacher's current tier status.
 */
export function getTierDescription(teacher: Teacher): string {
  const tier = getEffectiveTier(teacher)

  if (tier === 'admin') {
    return 'Administrator'
  }

  if (tier === 'school') {
    return 'School Account'
  }

  if (tier === 'pro') {
    return 'Pro'
  }

  if (tier === 'trial') {
    const daysRemaining = getTrialDaysRemaining(teacher)
    if (daysRemaining === 0) {
      return 'Trial Expired'
    }
    if (daysRemaining === 1) {
      return 'Trial (1 day left)'
    }
    return `Trial (${daysRemaining} days left)`
  }

  return 'Free'
}
