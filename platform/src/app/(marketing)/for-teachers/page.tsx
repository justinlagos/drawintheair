import type { Metadata } from 'next'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Teachers — Draw in the Air',
  description: 'Run engaging gesture-based activities in your classroom. No apps to install for students — just a browser and a webcam. Full session analytics and AI-powered insights included.',
  openGraph: {
    title: 'For Teachers — Draw in the Air',
    description: 'Gesture activities that run in any browser. No student logins required.',
    type: 'website',
  },
}

export default function ForTeachersPage() {
  const steps = [
    {
      number: 1,
      title: 'Sign in to your dashboard',
      description: 'Create a free teacher account and set up your classroom.',
    },
    {
      number: 2,
      title: 'Start a classroom session',
      description: 'Launch an activity for your students. The app detects when each student is ready.',
    },
    {
      number: 3,
      title: 'Watch in real-time',
      description: 'See live scores, engagement metrics, and instant performance feedback.',
    },
    {
      number: 4,
      title: 'Review insights',
      description: `Access detailed analytics on each student's progress and skill development.`,
    },
  ];

  const features = [
    {
      icon: '📊',
      title: 'Live Leaderboard',
      description: 'Students see scores in real-time, creating healthy competition and motivation.',
    },
    {
      icon: '🎮',
      title: 'Activity Controls',
      description: 'Pause, resume, or switch activities mid-session without disrupting students.',
    },
    {
      icon: '🧠',
      title: 'AI Learning Insights',
      description: `Automatic analysis of each student's performance across literacy, numeracy, and motor skills.`,
    },
    {
      icon: '▶️',
      title: 'Session Replay',
      description: 'Review any past session to see exactly how students performed.',
    },
    {
      icon: '📈',
      title: 'Progress Reports',
      description: 'Exportable reports for parents and school leadership.',
    },
    {
      icon: '👥',
      title: 'Multi-Class Support',
      description: 'Manage multiple classrooms and student groups from one dashboard.',
    },
  ];

  return (
    <div className="bg-slate-50">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900">
            Turn your classroom into a
            <span className="block text-orange-500">
              movement lab
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-600">
            Classroom Mode gives you live controls, real-time analytics, and powerful insights into every student's learning journey.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
            <Link href="/auth/signup?plan=teacher">Start 5-Day Trial</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
            <Link href="/pricing">View pricing</Link>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-16">How Classroom Mode works</h2>

        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-8 items-start">
              {/* Step Number */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-2xl font-bold text-white">
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-2">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600 text-lg">{step.description}</p>
              </div>

              {/* Arrow */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center h-20">
                  <div className="text-3xl text-slate-300">↓</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-16">Features designed for teachers</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-lg border border-slate-200 bg-white p-8 hover:border-orange-300 transition-all duration-300 shadow-sm"
            >
              <div className="space-y-4">
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Real Classroom Example */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-12">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">A typical teacher's experience</h2>

            <div className="space-y-4 text-slate-700">
              <p>
                <span className="font-semibold text-orange-600">9:00 AM:</span> You log in and see your Reception class dashboard. Today you're running Word Search and Bubble Pop.
              </p>

              <p>
                <span className="font-semibold text-orange-600">9:05 AM:</span> You launch Word Search. Students gather in front of the interactive display. They wave to begin, and you see each student's name appear on the leaderboard.
              </p>

              <p>
                <span className="font-semibold text-orange-600">9:15 AM:</span> Midway through, you pause and switch to Bubble Pop (easier pacing for some students). The leaderboard resets for the new activity.
              </p>

              <p>
                <span className="font-semibold text-orange-600">9:25 AM:</span> Session ends. You instantly see analytics: Who struggled with letter recognition? Who excelled at hand-eye coordination? You download a progress report to share with parents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Teacher Testimonial */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-12 shadow-sm">
          <div className="space-y-6">
            <p className="text-xl text-slate-700 italic leading-relaxed">
              "My students are completely engaged. I can see their learning happening in real-time, and the analytics help me identify exactly who needs extra support. It's transformed how I teach literacy."
            </p>
            <div>
              <p className="font-semibold text-slate-900">Miss Sarah Thompson</p>
              <p className="text-sm text-slate-600">Reception Teacher, Kent Primary School</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="text-4xl">⏱️</div>
            <h3 className="text-xl font-bold text-slate-900">Saves Time</h3>
            <p className="text-slate-600">No manual assessment sheets. Analytics are generated instantly.</p>
          </div>

          <div className="space-y-4">
            <div className="text-4xl">😊</div>
            <h3 className="text-xl font-bold text-slate-900">Boosts Engagement</h3>
            <p className="text-slate-600">Leaderboards and live scores keep children excited and motivated.</p>
          </div>

          <div className="space-y-4">
            <div className="text-4xl">📊</div>
            <h3 className="text-xl font-bold text-slate-900">Data-Driven</h3>
            <p className="text-slate-600">Make informed decisions about differentiation and support.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Frequently asked questions</h2>

        <div className="space-y-4">
          {[
            {
              q: 'What equipment do I need?',
              a: 'Just a webcam-enabled device (laptop, tablet, or interactive display) and an internet connection. Works with any modern browser.',
            },
            {
              q: 'Can I use Classroom Mode with younger children?',
              a: 'Yes! Classroom Mode is designed for ages 3-7. You control the activity difficulty and pacing.',
            },
            {
              q: 'Do students need to log in?',
              a: `No. Students just enter their first name at the start of a session. It's simple and quick.`,
            },
            {
              q: 'How many students can I manage at once?',
              a: 'Teacher Pro supports up to 30 students. For larger schools, upgrade to School plan for unlimited students.',
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
              Join teachers revolutionizing early learning
            </h2>
            <p className="text-lg text-slate-600">
              5-day free trial. No credit card. Full access to Classroom Mode.
            </p>

            <div className="pt-4">
              <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                <Link href="/auth/signup?plan=teacher">Start Your Trial</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
