import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, MessageSquare, School, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Contact Us — Draw in the Air',
  description: 'Get in touch with the Draw in the Air team. We\'re here to help teachers, schools, and parents.',
}

export default function ContactPage() {
  return (
    <div className="bg-slate-50">
      {/* Header */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">
          Get in touch
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Have a question? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
      </section>

      {/* Contact Options */}
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* General Enquiries */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Mail className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">General Enquiries</h3>
              <p className="mt-2 text-slate-600">
                Questions about the platform, features, or your account.
              </p>
            </div>
            <a
              href="mailto:hello@drawintheair.app"
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 transition font-medium"
            >
              hello@drawintheair.app
            </a>
          </div>

          {/* School & Sales */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <School className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Schools & Sales</h3>
              <p className="mt-2 text-slate-600">
                Interested in a school license or multi-teacher deployment?
              </p>
            </div>
            <a
              href="mailto:schools@drawintheair.app"
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 transition font-medium"
            >
              schools@drawintheair.app
            </a>
          </div>

          {/* Support */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Technical Support</h3>
              <p className="mt-2 text-slate-600">
                Having trouble with the app? We're here to help get you back on track.
              </p>
            </div>
            <a
              href="mailto:support@drawintheair.app"
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 transition font-medium"
            >
              support@drawintheair.app
            </a>
          </div>

          {/* Press */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Press & Media</h3>
              <p className="mt-2 text-slate-600">
                Covering EdTech? We'd love to tell you more about Draw in the Air.
              </p>
            </div>
            <a
              href="mailto:press@drawintheair.app"
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 transition font-medium"
            >
              press@drawintheair.app
            </a>
          </div>
        </div>
      </section>

      {/* Response Time */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 text-center">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-900 font-medium">Response times</p>
          <p className="mt-2 text-slate-600 text-sm">
            We aim to respond to all enquiries within 1 business day. School and sales queries are prioritised.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              <a href={`${process.env.NEXT_PUBLIC_GAME_URL ?? 'https://drawintheair.com'}/play`}>Try it Free</a>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
