import type { Metadata } from 'next'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Schools — Draw in the Air',
  description: 'Give every teacher in your school access to Draw in the Air with a single School License. Centralised billing, usage analytics, and priority support included.',
  openGraph: {
    title: 'For Schools — Draw in the Air',
    description: 'One School License covers your whole staff. Centralised billing and analytics.',
    type: 'website',
  },
}

export default function ForSchoolsPage() {
  const benefits = [
    {
      icon: '🎯',
      title: 'Central Management',
      description: 'Manage all teachers and classrooms from one admin dashboard. Add staff, monitor adoption, and oversee school-wide usage.',
    },
    {
      icon: '📊',
      title: 'School-Wide Analytics',
      description: 'See cohort-level insights across all classes. Identify trends, track progress towards curriculum goals, and make data-informed decisions.',
    },
    {
      icon: '👥',
      title: 'Effortless Onboarding',
      description: `Invite teachers via email. They're ready to use Classroom Mode immediately. No setup headaches.`,
    },
    {
      icon: '🔐',
      title: 'Privacy & Compliance',
      description: `GDPR and COPPA compliant. School manages all consent. Student data purged annually. Your school's reputation is safe with us.`,
    },
    {
      icon: '💳',
      title: 'Flexible Pricing',
      description: 'One bill per school year. Unlimited teachers, unlimited students. No per-student fees.',
    },
    {
      icon: '⭐',
      title: 'Dedicated Support',
      description: 'Priority support from our team. Training for staff. Regular check-ins to maximize adoption and impact.',
    },
  ];

  const features = [
    'Unlimited teacher accounts',
    'Unlimited student capacity',
    'Central admin dashboard',
    'Staff management and invitations',
    'School-wide analytics and reports',
    'Custom school branding',
    'GDPR and COPPA compliance',
    'Annual data purge',
    'Dedicated onboarding',
    'Priority email support',
    'Staff training resources',
    'Annual performance review',
  ];

  return (
    <div className="bg-slate-50">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900">
            Bring gesture learning to
            <span className="block text-orange-500">
              every classroom
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-600">
            Our School plan gives you school-wide management, analytics, and support. Everything you need to scale movement-based learning across your school.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
            <Link href="/contact">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
            <Link href="/pricing">View School Pricing</Link>
          </Button>
        </div>
      </section>

      {/* Why Schools Choose Us */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-16">Why schools choose Draw in the Air</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative rounded-lg border border-slate-200 bg-white p-8 hover:border-orange-300 transition-all duration-300 shadow-sm"
            >
              <div className="space-y-4">
                <div className="text-4xl">{benefit.icon}</div>
                <h3 className="text-lg font-bold text-slate-900">{benefit.title}</h3>
                <p className="text-slate-600">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What's Included */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-16">What's included in School plan</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <Check className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* School Admin Dashboard */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-12 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Powerful admin dashboard</h2>

          <div className="space-y-4 text-slate-700">
            <div className="flex gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <p className="font-semibold text-slate-900">Staff Management</p>
                <p className="text-sm text-slate-600">Invite teachers, assign them to classes, monitor adoption rates, and track engagement metrics.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold text-slate-900">School-Wide Analytics</p>
                <p className="text-sm text-slate-600">See which activities are most effective, which year groups are thriving, and where extra support is needed.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <p className="font-semibold text-slate-900">Compliance & Audit</p>
                <p className="text-sm text-slate-600">Built-in GDPR and COPPA compliance. Audit logs for all staff activity. Annual data purge reports.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🎨</span>
              <div>
                <p className="font-semibold text-slate-900">Custom Branding</p>
                <p className="text-sm text-slate-600">Add your school logo and colors. Students see your brand throughout the experience.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation Timeline */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-16">Implementation timeline</h2>

        <div className="space-y-6">
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-lg font-bold text-white">
                1
              </div>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-lg font-semibold text-slate-900">Week 1: Kickoff Meeting</p>
              <p className="text-slate-600">We meet with your leadership team to understand your needs, goals, and school calendar.</p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-lg font-bold text-white">
                2
              </div>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-lg font-semibold text-slate-900">Week 2-3: Staff Training</p>
              <p className="text-slate-600">We train key staff. They're equipped to onboard other teachers. Teachers start their trials.</p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-lg font-bold text-white">
                3
              </div>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-lg font-semibold text-slate-900">Week 4-6: Ramp-Up</p>
              <p className="text-slate-600">Teachers start using Classroom Mode. We provide ongoing support and answer questions.</p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-lg font-bold text-white">
                4
              </div>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-lg font-semibold text-slate-900">Month 2+: Optimize</p>
              <p className="text-slate-600">Monthly check-ins. We review adoption metrics and help maximize impact across your school.</p>
            </div>
          </div>
        </div>
      </section>

      {/* School Testimonial */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-12 space-y-6 shadow-sm">
          <p className="text-lg text-slate-700 italic leading-relaxed">
            "Draw in the Air has transformed how we approach early literacy and numeracy. Our teachers can see exactly what each child needs, and the analytics help us identify cohort-level trends. Most importantly, the children absolutely love it."
          </p>
          <div>
            <p className="font-semibold text-slate-900">Mrs. Jennifer Walsh</p>
            <p className="text-sm text-slate-600">Head of EYFS & KS1, Oakwood Primary School, Essex</p>
          </div>
        </div>
      </section>

      {/* School Pricing */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-12 space-y-8 text-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">School Plan Pricing</h2>
            <p className="text-xl text-slate-700">
              <span className="font-bold">From £299/year</span>
              <span className="text-slate-600 text-lg"> for unlimited teachers and students</span>
            </p>
          </div>

          <div className="space-y-4 text-left">
            <p className="text-slate-700">
              Pricing varies based on school size. We offer flexible annual plans and can work with your budget.
            </p>
            <div className="space-y-2 text-slate-600 text-sm">
              <p>• Small school (1-20 teachers): From £299/year</p>
              <p>• Medium school (20-50 teachers): From £499/year</p>
              <p>• Large school (50+ teachers): Custom pricing</p>
            </div>
          </div>

          <div>
            <p className="text-slate-700 mb-6">
              All plans include unlimited students, unlimited activities, and school-wide analytics.
            </p>
            <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              <Link href="/contact">Get Custom Quote</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Frequently asked questions</h2>

        <div className="space-y-4">
          {[
            {
              q: 'Do all my teachers need to upgrade?',
              a: 'Teachers can use the free plan indefinitely. The School plan is for schools that want central management and school-wide analytics. It\'s an optional upgrade.',
            },
            {
              q: 'How is student data handled?',
              a: 'Session data is retained until the end of the academic year, then permanently deleted. We never store photos or video. Full GDPR and COPPA compliance.',
            },
            {
              q: 'Can we customize it for our school?',
              a: 'Yes! School plans include custom branding. We can also work with large schools on special integrations.',
            },
            {
              q: 'What if we need more support?',
              a: 'School plans include dedicated support, staff training, and regular check-ins. We can also offer professional development sessions.',
            },
            {
              q: 'Can we try it first?',
              a: 'Absolutely. Teachers can try the free plan immediately. School admins get a demo and can trial School features before committing.',
            },
          ].map((faq, index) => (
            <details
              key={index}
              className="group rounded-lg border border-slate-200 bg-white p-6 hover:border-slate-300 transition-colors shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-900">
                {faq.q}
                <span className="text-slate-400 group-open:rotate-180 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-slate-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative rounded-lg border border-orange-200 bg-orange-50 p-12 text-center space-y-6">
          <div className="relative space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Ready to transform your school?
            </h2>
            <p className="text-lg text-slate-600">
              Let's talk about how Draw in the Air can bring gesture-based learning to your classrooms.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <Link href="/contact">Schedule a Demo</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                <Link href="/pricing">View All Plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
