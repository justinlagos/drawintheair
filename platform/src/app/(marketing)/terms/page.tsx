import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Draw in the Air',
  description: 'Terms and conditions for using Draw in the Air.',
}

export default function TermsPage() {
  const lastUpdated = 'March 2026'

  return (
    <div className="bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-100">Terms of Service</h1>
          <p className="mt-3 text-slate-400">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-8">

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">1. Acceptance of Terms</h2>
            <p className="text-slate-400 leading-relaxed">
              By accessing or using Draw in the Air (&quot;the Service&quot;), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use the Service. These terms apply
              to all users including teachers, school administrators, and students.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">2. Description of Service</h2>
            <p className="text-slate-400 leading-relaxed">
              Draw in the Air is a gesture-based learning platform for children and educators. The Service
              uses MediaPipe hand-tracking technology to enable interactive learning activities. We offer
              free activities, a Teacher Pro subscription, and School License plans.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">3. User Accounts</h2>
            <p className="text-slate-400 leading-relaxed">
              Teacher accounts require a valid email address. You are responsible for maintaining the
              security of your account credentials. Student participation does not require an account —
              students join sessions using a first name only.
            </p>
            <p className="text-slate-400 leading-relaxed">
              You must not share your account credentials or allow others to access your account. Notify
              us immediately of any unauthorised use at{' '}
              <a href="mailto:support@drawintheair.app" className="text-cyan-400 hover:text-cyan-300">
                support@drawintheair.app
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">4. Subscriptions and Billing</h2>
            <p className="text-slate-400 leading-relaxed">
              The Teacher Pro plan is billed monthly or annually. The 5-day trial period is free with no
              credit card required. After the trial, you may upgrade or continue on the free plan.
              Subscriptions auto-renew unless cancelled before the renewal date.
            </p>
            <p className="text-slate-400 leading-relaxed">
              School License pricing is agreed separately. Contact us at{' '}
              <a href="mailto:schools@drawintheair.app" className="text-cyan-400 hover:text-cyan-300">
                schools@drawintheair.app
              </a>{' '}
              for details.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">5. Acceptable Use</h2>
            <p className="text-slate-400 leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-inside text-slate-400 space-y-1 pl-4">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to reverse-engineer or extract the source code</li>
              <li>Use the Service in a way that could damage, disable, or impair it</li>
              <li>Attempt to gain unauthorised access to other accounts or systems</li>
              <li>Use the Service to collect data about children beyond what is necessary</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">6. Children&apos;s Privacy</h2>
            <p className="text-slate-400 leading-relaxed">
              We are committed to protecting children&apos;s privacy. Students do not create accounts. We do
              not collect email addresses from students. Session data is associated with teacher accounts
              only and is handled in accordance with our{' '}
              <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">7. Camera and Microphone</h2>
            <p className="text-slate-400 leading-relaxed">
              The Service requires camera access for hand-tracking. All camera processing is performed
              locally in the browser using MediaPipe. We do not record, store, or transmit camera footage.
              No video data leaves the device.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">8. Intellectual Property</h2>
            <p className="text-slate-400 leading-relaxed">
              All content, features, and functionality of the Service are the exclusive property of Draw
              in the Air and are protected by copyright and other intellectual property laws. You may not
              reproduce, distribute, or create derivative works without written permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">9. Limitation of Liability</h2>
            <p className="text-slate-400 leading-relaxed">
              To the maximum extent permitted by law, Draw in the Air shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your use of
              the Service. Our total liability to you for any claims shall not exceed the fees paid by you
              in the previous 12 months.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">10. Changes to Terms</h2>
            <p className="text-slate-400 leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify you of significant
              changes via email or a notice within the Service. Continued use of the Service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">11. Governing Law</h2>
            <p className="text-slate-400 leading-relaxed">
              These terms shall be governed by and construed in accordance with the laws of England and
              Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England
              and Wales.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-100">12. Contact</h2>
            <p className="text-slate-400 leading-relaxed">
              For questions about these Terms, contact us at{' '}
              <a href="mailto:legal@drawintheair.app" className="text-cyan-400 hover:text-cyan-300">
                legal@drawintheair.app
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-4 text-sm text-slate-400">
          <Link href="/privacy" className="hover:text-slate-200 transition">
            Privacy Policy
          </Link>
          <Link href="/contact" className="hover:text-slate-200 transition">
            Contact Us
          </Link>
          <Link href="/pricing" className="hover:text-slate-200 transition">
            Pricing
          </Link>
        </div>
      </div>
    </div>
  )
}
