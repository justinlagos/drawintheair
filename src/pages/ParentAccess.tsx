import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';
import { submitFormData } from '../lib/formSubmission';

export default function ParentAccess() {
  const [email, setEmail] = useState('');
  const [childAge, setChildAge] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await submitFormData({ type: 'parent_trial', email: email.trim(), childAge });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Free Home Trial | Draw in the Air</title>
        <meta name="description" content="Try Draw in the Air free at home. Gesture-based learning for children aged 3–8 — no apps, no downloads needed." />
      </Helmet>
      <LegalPageLayout heroTitle="Free Home Trial for Parents">
        <div className="max-w-2xl">
          {!submitted ? (
            <>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                Draw in the Air is free to try at home. Your child can explore letter tracing, shape drawing, and colour activities using just their hand and your laptop or tablet camera.
              </p>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 mb-8">
                <h2 className="text-lg font-semibold text-slate-100 mb-4">What you need</h2>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-center gap-3">
                    <span className="text-teal-400">✓</span>
                    A laptop, desktop, or tablet with a webcam
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-teal-400">✓</span>
                    A modern browser (Chrome or Edge works best)
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-teal-400">✓</span>
                    A child aged 3–8 ready to draw in the air!
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-teal-700 bg-teal-950/30 p-6 mb-8">
                <h2 className="text-lg font-semibold text-slate-100 mb-2">Try it right now — no sign-up needed</h2>
                <p className="text-slate-400 text-sm mb-4">
                  You can start playing immediately. Leave your email below if you'd like activity ideas and updates sent to you.
                </p>
                <a
                  href="/play"
                  className="inline-block rounded-xl bg-teal-600 px-6 py-3 text-base font-medium text-white hover:bg-teal-700 transition-colors"
                >
                  Start Playing Free →
                </a>
              </div>

              <h2 className="text-lg font-semibold text-slate-100 mb-4">Get home activity ideas by email</h2>
              <p className="text-slate-400 text-sm mb-6">
                We'll send you a curated set of Draw in the Air activities matched to your child's age, plus tips for making the most of each session.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Your email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label htmlFor="childAge" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Child's age (optional)
                  </label>
                  <select
                    id="childAge"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">Select age</option>
                    <option value="3">3 years</option>
                    <option value="4">4 years</option>
                    <option value="5">5 years</option>
                    <option value="6">6 years</option>
                    <option value="7">7 years</option>
                    <option value="8">8 years</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-teal-600 px-6 py-3 text-base font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send Me Activity Ideas'}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  We never share your email. Unsubscribe any time.
                </p>
              </form>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-6">🎉</div>
              <h2 className="text-2xl font-bold text-slate-100 mb-3">You're all set!</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Activity ideas are on their way to your inbox. In the meantime, your child can start playing right now.
              </p>
              <a
                href="/play"
                className="inline-block rounded-xl bg-teal-600 px-8 py-3 text-base font-medium text-white hover:bg-teal-700 transition-colors"
              >
                Start Playing Now →
              </a>
            </div>
          )}
        </div>
      </LegalPageLayout>
    </>
  );
}
