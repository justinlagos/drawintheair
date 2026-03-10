import type { Metadata } from 'next'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing — Draw in the Air',
  description: 'Start free with a 5-day trial. Upgrade to Teacher Pro for full analytics and AI insights, or get a School License for your whole team.',
  openGraph: {
    title: 'Pricing — Draw in the Air',
    description: 'Free 5-day trial. Teacher Pro and School License plans available.',
    type: 'website',
  },
}

const gameUrl = process.env.NEXT_PUBLIC_GAME_URL ?? 'https://drawintheair.com'

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      description: 'Play activities',
      price: '£0',
      period: 'forever',
      cta: 'Play Free',
      ctaHref: `${gameUrl}/play`,
      ctaExternal: true,
      highlighted: false,
      features: [
        'Access to all 9 activities',
        'Unlimited play sessions',
        'Hand gesture tracking',
        'Session summaries',
        'Mobile & desktop',
      ],
    },
    {
      name: 'Teacher Pro',
      description: 'Classroom mode + analytics',
      price: '£4.99',
      period: '/month',
      cta: 'Start 5-Day Trial',
      ctaHref: '/auth/signup?plan=teacher',
      ctaExternal: false,
      highlighted: true,
      features: [
        'Everything in Free',
        'Classroom mode',
        'Live leaderboards',
        'AI learning analytics',
        'Session replay',
        'Student performance reports',
        'Up to 30 students',
      ],
    },
    {
      name: 'School',
      description: 'Multi-teacher management',
      price: 'From £299',
      period: '/year',
      cta: 'Get Started',
      ctaHref: '/contact',
      ctaExternal: false,
      highlighted: false,
      features: [
        'Everything in Teacher Pro',
        'Multi-teacher management',
        'School-wide analytics',
        'Custom branding',
        'Unlimited students',
        'Dedicated onboarding',
        'Priority support',
      ],
    },
  ];

  const comparisonFeatures = [
    { name: 'Activities', free: true, teacher: true, school: true },
    { name: 'Classroom mode', free: false, teacher: true, school: true },
    { name: 'Live leaderboards', free: false, teacher: true, school: true },
    { name: 'AI analytics', free: false, teacher: true, school: true },
    { name: 'Session replay', free: false, teacher: true, school: true },
    { name: 'Multi-teacher management', free: false, teacher: false, school: true },
    { name: 'School-wide reports', free: false, teacher: false, school: true },
    { name: 'Unlimited students', free: false, teacher: false, school: true },
  ];

  const faqs = [
    {
      question: 'Is it really free to play?',
      answer: 'Yes! The free plan gives you unlimited access to all 9 activities with no credit card required. You only upgrade if you want classroom features like leaderboards and analytics.',
    },
    {
      question: 'What happens after the trial?',
      answer: 'After your 5-day Teacher Pro trial ends, you can either upgrade to a paid plan or continue using the free plan. No automatic charges.',
    },
    {
      question: 'Do students need accounts?',
      answer: 'No. Students just need to enter their first name at the start of a session. We don\'t store email addresses or create persistent student profiles.',
    },
    {
      question: 'Is student data stored?',
      answer: 'Teacher analytics are stored in your account. Student session data is tied to classroom sessions only and purged at the end of the academic year. We never store photos or video.',
    },
  ];

  return (
    <div className="bg-slate-50">
      {/* Header */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Choose the plan that fits your needs. Free forever for casual play, or upgrade for classroom features.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-xl border p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'border-orange-500/50 bg-orange-500 ring-2 ring-orange-500/20 md:scale-105 text-white'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-block bg-orange-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    RECOMMENDED
                  </span>
                </div>
              )}

              <div className="space-y-6">
                {/* Plan Info */}
                <div>
                  <h3 className={`text-2xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                  <p className={`text-sm mt-2 ${plan.highlighted ? 'text-white/90' : 'text-slate-600'}`}>{plan.description}</p>
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                    <span className={`text-sm ${plan.highlighted ? 'text-white/80' : 'text-slate-600'}`}>{plan.period}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  asChild
                  size="lg"
                  className={`w-full ${
                    plan.highlighted
                      ? 'bg-white hover:bg-slate-50 text-orange-600 font-semibold'
                      : 'border border-orange-500 bg-white text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  {plan.ctaExternal ? (
                    <a href={plan.ctaHref} target="_blank" rel="noopener noreferrer">{plan.cta}</a>
                  ) : (
                    <Link href={plan.ctaHref}>{plan.cta}</Link>
                  )}
                </Button>

                {/* Features */}
                <div className={`space-y-3 border-t pt-6 ${plan.highlighted ? 'border-white/30' : 'border-slate-200'}`}>
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-white' : 'text-orange-500'}`} />
                      <span className={`text-sm ${plan.highlighted ? 'text-white/90' : 'text-slate-700'}`}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Feature comparison</h2>

        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="w-full bg-white">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Feature</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">Free</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">Teacher Pro</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">School</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((feature, index) => (
                <tr key={index} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-700">{feature.name}</td>
                  <td className="px-6 py-4 text-center">
                    {feature.free ? (
                      <Check className="h-5 w-5 text-orange-500 mx-auto" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {feature.teacher ? (
                      <Check className="h-5 w-5 text-orange-500 mx-auto" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {feature.school ? (
                      <Check className="h-5 w-5 text-orange-500 mx-auto" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Frequently asked questions</h2>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group rounded-lg border border-slate-200 bg-white p-6 hover:border-slate-300 transition-colors shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-900">
                {faq.question}
                <span className="text-slate-400 group-open:rotate-180 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="relative rounded-lg border border-orange-200 bg-orange-50 p-12 space-y-6">
          <div className="relative space-y-4">
            <h2 className="text-3xl font-bold text-slate-900">
              Ready to get started?
            </h2>
            <p className="text-slate-600">
              Join teachers across the UK who are transforming early childhood education.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <a href={`${gameUrl}/play`} target="_blank" rel="noopener noreferrer">Play Free</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                <Link href="/contact">Contact sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
