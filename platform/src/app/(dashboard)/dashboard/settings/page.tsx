import { requireAuth, getTeacher } from '@/lib/auth/session'
import { isPro, isTrial, getTierDescription, getTrialDaysRemaining } from '@/lib/auth/tier'
import { SettingsForm } from './settings-form'

export const metadata = {
  title: 'Settings | Draw in the Air',
  description: 'Manage your account settings and preferences',
}

export default async function SettingsPage() {
  // Require authentication
  await requireAuth()

  // Get teacher profile
  const teacher = await getTeacher()
  if (!teacher) {
    return null
  }

  const isProTier = isPro(teacher)
  const isTrialActive = isTrial(teacher)
  const trialDaysRemaining = getTrialDaysRemaining(teacher)
  const tierDesc = getTierDescription(teacher)

  return (
    <SettingsForm
      teacher={teacher}
      tierDesc={tierDesc}
      isProTier={isProTier}
      isTrialActive={isTrialActive}
      trialDaysRemaining={trialDaysRemaining}
    />
  )
}
