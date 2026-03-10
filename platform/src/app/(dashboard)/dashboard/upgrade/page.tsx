import { requireAuth, getTeacher } from '@/lib/auth/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isTrial, isPro, isExpired, getTrialDaysRemaining } from '@/lib/auth/tier'
import { Check, X } from 'lucide-react'

export const metadata = {
  title: 'Upgrade | Draw in the Air',
  description: 'Upgrade your plan to unlock more features',
}

export default async function UpgradePage() {
  // Require authentication
  await requireAuth()

  // Get teacher profile
  const teacher = await getTeacher()
  if (!teacher) {
    return null
  }

  const isTrialActive = isTrial(teacher)
  const trialExpired = isExpired(teacher)
  const isProUser = isPro(teacher)
  const trialDaysRemaining = getTrialDaysRemaining(teacher)

  const features = [
    { name: 'Play Activities', free: true, pro: true, school: true },
    { name: 'Classroom Sessions', free: false, pro: true, school: true },
    { name: 'Session History', free: false, pro: true, school: true },
    { name: 'Analytics Dashboard', free: false, pro: true, school: true },
    { name: 'AI Insights', free: false, pro: true, school: true },
    { name: 'Custom Playlists', free: false, pro: true, school: true },
    { name: 'Session Export', free: false, pro: true, school: true },
    { name: 'Team Features', free: false, pro: false, school: true },
    { name: 'Custom Branding', free: false, pro: false, school: true },
    { name: 'SSO Integration', free: false, pro: false, school: true },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Upgrade Your Plan</h1>
        <p className="mt-1 text-slate-400">Choose the perfect plan for your teaching needs</p>
      </div>

      {/* Trial Status Messages */}
      {isTrialActive && !trialExpired && (
        <div className="rounded-lg bg-cyan-950/50 border border-cyan-800 p-4">
          <p className="text-sm text-cyan-200">
            Your trial data will be preserved when you upgrade. You have {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left.
          </p>
        </div>
      )}

      {trialExpired && !isProUser && (
        <div className="rounded-lg bg-red-950/50 border border-red-800 p-4">
          <p className="text-sm text-red-200">
            Your trial has expired. Upgrade now to continue using classroom features. Your data will be deleted in 30 days.
          </p>
        </div>
      )}

      {isProUser && (
        <div className="rounded-lg bg-violet-950/50 border border-violet-800 p-4">
          <p className="text-sm text-violet-200">
            You're currently on the Pro plan. Enjoy all features!
          </p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Free</CardTitle>
            <p className="mt-2 text-3xl font-bold text-slate-100">$0</p>
            <p className="mt-1 text-sm text-slate-400">Forever</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {features.slice(0, 2).map((feature) => (
                <div key={feature.name} className="flex items-center gap-3">
                  {feature.free ? (
                    <Check className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <X className="h-5 w-5 text-slate-500" />
                  )}
                  <span className={feature.free ? 'text-slate-100' : 'text-slate-500'}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              className="w-full"
              disabled
            >
              Current Plan
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan (Recommended) */}
        <Card className="ring-2 ring-violet-500 ring-offset-slate-950">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">Pro</CardTitle>
                <p className="mt-2 text-3xl font-bold text-slate-100">
                  $9<span className="text-base text-slate-400">/month</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">or $99/year</p>
              </div>
              <Badge variant="pro">Recommended</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {features.slice(0, 7).map((feature) => (
                <div key={feature.name} className="flex items-center gap-3">
                  {feature.pro ? (
                    <Check className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <X className="h-5 w-5 text-slate-500" />
                  )}
                  <span className={feature.pro ? 'text-slate-100' : 'text-slate-500'}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant={isProUser ? 'secondary' : 'primary'}
              href={isProUser ? undefined : '/api/stripe/checkout?plan=pro'}
              className="w-full"
              disabled={isProUser}
            >
              {isProUser ? 'Current Plan' : 'Start Pro'}
            </Button>
          </CardContent>
        </Card>

        {/* School Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">School</CardTitle>
            <p className="mt-2 text-3xl font-bold text-slate-100">Custom</p>
            <p className="mt-1 text-sm text-slate-400">Contact for pricing</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex items-center gap-3">
                  {feature.school ? (
                    <Check className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <X className="h-5 w-5 text-slate-500" />
                  )}
                  <span className={feature.school ? 'text-slate-100' : 'text-slate-500'}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              href="mailto:sales@drawintheair.com?subject=School%20Plan%20Inquiry"
              className="w-full"
            >
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-100">Feature</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-100">Free</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-100">Pro</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-100">School</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {features.map((feature) => (
                  <tr key={feature.name} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-100">{feature.name}</td>
                    <td className="px-4 py-3 text-center">
                      {feature.free ? (
                        <Check className="mx-auto h-5 w-5 text-emerald-400" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-slate-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {feature.pro ? (
                        <Check className="mx-auto h-5 w-5 text-emerald-400" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-slate-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {feature.school ? (
                        <Check className="mx-auto h-5 w-5 text-emerald-400" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-slate-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold text-slate-100">Can I change plans anytime?</h3>
            <p className="mt-1 text-sm text-slate-400">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-100">What payment methods do you accept?</h3>
            <p className="mt-1 text-sm text-slate-400">
              We accept all major credit cards via Stripe. Your payment information is secure and encrypted.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-100">Do you offer refunds?</h3>
            <p className="mt-1 text-sm text-slate-400">
              We offer a 14-day money-back guarantee on all subscriptions. No questions asked.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-100">What happens to my data if I downgrade?</h3>
            <p className="mt-1 text-sm text-slate-400">
              Your data is preserved when you downgrade. However, some features may become unavailable.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
