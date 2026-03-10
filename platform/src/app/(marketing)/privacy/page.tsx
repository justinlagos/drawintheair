import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Draw in the Air',
  description: 'Draw in the Air is built privacy-first. No student accounts. No persistent student data. COPPA and GDPR aligned. Camera data never leaves the device.',
  robots: { index: false },
}

export default function PrivacyPage() {
  return (
    <div className="bg-slate-950">
      {/* Header */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 mb-4">Privacy Policy</h1>
        <p className="text-slate-400">
          Last updated: March 2026. Draw in the Air is committed to protecting child privacy and GDPR compliance.
        </p>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8 space-y-12">
        {/* Section 1: Overview */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">Privacy at the Heart of Learning</h2>
          <p className="text-slate-300 leading-relaxed">
            Draw in the Air is designed with child privacy as a foundational principle. We collect minimal data, never store photos or video, and purge student information at the end of the academic year. This policy explains exactly what we collect and why.
          </p>
        </div>

        {/* Section 2: Data We Collect */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">What Data We Collect</h2>

          <div className="space-y-6">
            {/* Teacher Data */}
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6">
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">For Teachers (Account Holders)</h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex gap-3">
                  <span className="text-cyan-400">•</span>
                  <span><strong>Name and email</strong> — From Google OAuth or manual signup</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">•</span>
                  <span><strong>School affiliation</strong> — Optional, for school dashboard access</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">•</span>
                  <span><strong>Activity and session data</strong> — Which activities you run, when, and with how many students</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">•</span>
                  <span><strong>Analytics</strong> — Class engagement metrics and learning insights</span>
                </li>
              </ul>
            </div>

            {/* Student Data */}
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6">
              <h3 className="text-lg font-semibold text-purple-400 mb-3">For Students</h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex gap-3">
                  <span className="text-purple-400">•</span>
                  <span><strong>First name only</strong> — Entered at the start of each session</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">•</span>
                  <span><strong>Session-scoped performance data</strong> — Scores, time, accuracy during activities (not stored between sessions)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">•</span>
                  <span><strong>Classroom assignment (teachers only)</strong> — Which teacher's classroom they're in during a session</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 3: What We Don't Collect */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">What We Explicitly Do NOT Collect</h2>

          <div className="rounded-lg border border-cyan-500/30 bg-cyan-900/20 p-6">
            <ul className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                <span>No photos or images of children</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                <span>No video recordings</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                <span>No last names</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                <span>No email addresses from children</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                <span>No persistent student profiles (each session is independent)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                <span>No student behavior tracking across sessions</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-400">✓</span>
                <span>No location data</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Section 4: Camera Usage */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">How We Use the Camera</h2>

          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              Draw in the Air uses <strong>MediaPipe</strong>, Google's hand detection model, which runs entirely on your device (in the browser). Here's what happens:
            </p>

            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6 space-y-3">
              <p className="font-semibold text-slate-100">No frames are transmitted to our servers.</p>
              <p>
                MediaPipe analyzes the camera stream locally and extracts only hand position and gesture data (coordinate points). Raw video is never sent to us, stored, or transmitted.
              </p>
              <p className="font-semibold text-slate-100">Teachers control camera access.</p>
              <p>
                The browser requests camera permission. Teachers can see when the camera is active and can disable it at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Data Retention */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">How Long We Keep Data</h2>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">Teacher Data</h3>
              <p className="text-slate-300">
                Kept for the lifetime of your account. Deleted upon request or 2 years of inactivity.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">Student Session Data</h3>
              <p className="text-slate-300">
                Retained until the end of the academic year (31 August), then permanently deleted. This gives teachers time to review end-of-year analytics, then we purge everything.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">Camera Frames</h3>
              <p className="text-slate-300">
                Never stored. Hand position coordinates are extracted locally and only session summaries are saved.
              </p>
            </div>
          </div>
        </div>

        {/* Section 6: COPPA Compliance */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">COPPA Compliance (US)</h2>

          <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6 space-y-3 text-slate-300">
            <p>
              Although Draw in the Air is designed for UK classrooms, we comply with the US Children's Online Privacy Protection Act (COPPA) for users under 13:
            </p>
            <ul className="space-y-2">
              <li className="flex gap-3">
                <span className="text-cyan-400">•</span>
                <span>No persistent profiles for children</span>
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400">•</span>
                <span>No email collection from children</span>
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400">•</span>
                <span>Teachers (acting as school officials) provide implicit consent</span>
              </li>
              <li className="flex gap-3">
                <span className="text-cyan-400">•</span>
                <span>Data deletion upon request</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Section 7: GDPR Rights */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">GDPR Rights for Teachers</h2>

          <p className="text-slate-300 leading-relaxed mb-4">
            If you're based in the UK or EU, you have the following rights under GDPR:
          </p>

          <div className="space-y-3">
            {[
              { title: 'Right of Access', desc: 'Request a copy of personal data we hold about you' },
              { title: 'Right to Rectification', desc: 'Correct inaccurate data' },
              { title: 'Right to Erasure', desc: 'Request deletion of your account and data' },
              { title: 'Right to Restrict Processing', desc: 'Limit how we use your data' },
              { title: 'Right to Data Portability', desc: 'Export your data in a machine-readable format' },
              { title: 'Right to Object', desc: 'Opt out of certain processing activities' },
            ].map((right, index) => (
              <div key={index} className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                <h3 className="font-semibold text-slate-100">{right.title}</h3>
                <p className="text-slate-400 text-sm mt-1">{right.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-slate-300 leading-relaxed mt-6">
            To exercise any of these rights, contact us at <strong>privacy@drawintheair.co.uk</strong>.
          </p>
        </div>

        {/* Section 8: Third-Party Services */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">Third-Party Services</h2>

          <div className="space-y-3 text-slate-300">
            <p>We use the following third-party services:</p>

            <div className="space-y-3">
              <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                <h3 className="font-semibold text-slate-100">Google OAuth</h3>
                <p className="text-sm text-slate-400 mt-1">For secure teacher authentication. Google does not share student data.</p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                <h3 className="font-semibold text-slate-100">Stripe</h3>
                <p className="text-sm text-slate-400 mt-1">For payment processing. We never see your credit card details.</p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                <h3 className="font-semibold text-slate-100">Analytics</h3>
                <p className="text-sm text-slate-400 mt-1">Anonymous, aggregated usage data only. No tracking of individual students.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 9: Contact */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">Contact Us</h2>

          <div className="rounded-lg border border-cyan-500/30 bg-cyan-900/20 p-6 space-y-3 text-slate-300">
            <p className="font-semibold text-slate-100">Privacy & Data Protection</p>
            <p>Email: <strong>privacy@drawintheair.co.uk</strong></p>
            <p className="text-sm">
              Response time: Within 30 days for data access requests; within 5 working days for other inquiries.
            </p>
          </div>
        </div>

        {/* Section 10: Changes to Policy */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-100">Changes to This Policy</h2>

          <p className="text-slate-300">
            We may update this policy to reflect changes in our practices or legal requirements. We'll notify you of material changes via email and request re-consent if necessary.
          </p>
        </div>
      </section>
    </div>
  );
}
