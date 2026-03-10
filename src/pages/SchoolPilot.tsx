import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';

interface FormData {
  name: string;
  role: string;
  school: string;
  email: string;
  pupils: string;
  message: string;
}

export default function SchoolPilot() {
  const [form, setForm] = useState<FormData>({ name: '', role: '', school: '', email: '', pupils: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const SHEETS_ENDPOINT = import.meta.env.VITE_SHEETS_ENDPOINT;

  function update(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.school) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await fetch(SHEETS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'school_pilot', ...form, timestamp: new Date().toISOString() }),
      });
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
        <title>School Pilot Application | Draw in the Air</title>
        <meta name="description" content="Apply for a Draw in the Air school pilot. Free for qualifying schools during our early access period." />
      </Helmet>
      <LegalPageLayout heroTitle="Apply for a School Pilot">
        <div className="max-w-2xl">
          {!submitted ? (
            <>
              <p className="text-lg text-slate-300 mb-6 leading-relaxed">
                We're inviting a small number of schools to join our pilot programme. Pilot schools get full platform access free during the pilot period, plus dedicated onboarding support.
              </p>

              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-teal-800 bg-teal-950/20 p-6 mb-8 sm:grid-cols-3">
                {[
                  { icon: '🎓', title: 'Full Access', desc: 'All activities and classroom tools' },
                  { icon: '🤝', title: 'Onboarding', desc: 'Dedicated support to get started' },
                  { icon: '💬', title: 'Direct Feedback', desc: 'Shape the product roadmap' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="text-center">
                    <div className="text-3xl mb-2">{icon}</div>
                    <p className="text-sm font-semibold text-teal-300">{title}</p>
                    <p className="text-xs text-slate-400 mt-1">{desc}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Your name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={update('name')}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Your role</label>
                    <select
                      value={form.role}
                      onChange={update('role')}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="">Select role</option>
                      <option value="teacher">Class Teacher</option>
                      <option value="senco">SENCO</option>
                      <option value="head">Head Teacher / Principal</option>
                      <option value="coordinator">Subject Coordinator</option>
                      <option value="it">IT / EdTech Lead</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">School name *</label>
                  <input
                    type="text"
                    required
                    value={form.school}
                    onChange={update('school')}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                    placeholder="Sunshine Primary School"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">School email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={update('email')}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                      placeholder="j.smith@yourschool.ac.uk"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Number of pupils</label>
                    <select
                      value={form.pupils}
                      onChange={update('pupils')}
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="">Select range</option>
                      <option value="1-30">1–30 (single class)</option>
                      <option value="31-100">31–100</option>
                      <option value="101-300">101–300</option>
                      <option value="300+">300+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Anything you'd like us to know? (optional)</label>
                  <textarea
                    value={form.message}
                    onChange={update('message')}
                    rows={3}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-teal-500 focus:outline-none resize-none"
                    placeholder="Tell us about your school, year groups, or any specific needs…"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-teal-600 px-6 py-3 text-base font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Submitting…' : 'Apply for School Pilot'}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  We respond to all applications within 2 business days.
                </p>
              </form>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-6">🏫</div>
              <h2 className="text-2xl font-bold text-slate-100 mb-3">Application received!</h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Thank you for applying. We'll review your application and be in touch within 2 business days.
              </p>
              <p className="text-sm text-slate-500 mb-8">
                While you wait, feel free to explore Draw in the Air yourself.
              </p>
              <a
                href="/play"
                className="inline-block rounded-xl bg-teal-600 px-8 py-3 text-base font-medium text-white hover:bg-teal-700 transition-colors"
              >
                Explore the Activities →
              </a>
            </div>
          )}
        </div>
      </LegalPageLayout>
    </>
  );
}
