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

// Light-theme input styles that match the white LegalPageLayout card
const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: '2px solid #e2e8f0',
  background: '#f8fafc',
  padding: '14px 16px',
  fontSize: '0.95rem',
  color: '#1e293b',
  fontFamily: 'inherit',
  transition: 'all 0.2s ease',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const inputFocusProps = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#f97316';
    e.currentTarget.style.background = '#ffffff';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)';
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#e2e8f0';
    e.currentTarget.style.background = '#f8fafc';
    e.currentTarget.style.boxShadow = 'none';
  },
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#334155',
  marginBottom: 8,
};

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
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {!submitted ? (
            <>
              <p style={{ fontSize: '1.05rem', color: '#475569', marginBottom: 28, lineHeight: 1.75 }}>
                We're inviting a small number of schools to join our pilot programme. Pilot schools get full platform access free during the pilot period, plus dedicated onboarding support.
              </p>

              {/* Benefits strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
                border: '1px solid #fed7aa',
                padding: 20,
                marginBottom: 32,
              }}>
                {[
                  { icon: '🎓', title: 'Full Access', desc: 'All activities and tools' },
                  { icon: '🤝', title: 'Onboarding', desc: 'Dedicated setup support' },
                  { icon: '💬', title: 'Direct Input', desc: 'Shape the product roadmap' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{icon}</div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c2410c', marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: '0.72rem', color: '#92400e' }}>{desc}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{
                  marginBottom: 20,
                  borderRadius: 12,
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  padding: '12px 16px',
                  fontSize: '0.9rem',
                  color: '#dc2626',
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                  <div>
                    <label style={labelStyle}>Your name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={update('name')}
                      style={inputStyle}
                      placeholder="Jane Smith"
                      {...inputFocusProps}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Your role</label>
                    <select
                      value={form.role}
                      onChange={update('role')}
                      style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer', color: form.role ? '#1e293b' : '#94a3b8' }}
                      {...inputFocusProps}
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
                  <label style={labelStyle}>School name *</label>
                  <input
                    type="text"
                    required
                    value={form.school}
                    onChange={update('school')}
                    style={inputStyle}
                    placeholder="Sunshine Primary School"
                    {...inputFocusProps}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                  <div>
                    <label style={labelStyle}>School email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={update('email')}
                      style={inputStyle}
                      placeholder="j.smith@yourschool.ac.uk"
                      {...inputFocusProps}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Number of pupils</label>
                    <select
                      value={form.pupils}
                      onChange={update('pupils')}
                      style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer', color: form.pupils ? '#1e293b' : '#94a3b8' }}
                      {...inputFocusProps}
                    >
                      <option value="">Select range</option>
                      <option value="1-30">1-30 (single class)</option>
                      <option value="31-100">31-100</option>
                      <option value="101-300">101-300</option>
                      <option value="300+">300+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Anything you'd like us to know? (optional)</label>
                  <textarea
                    value={form.message}
                    onChange={update('message')}
                    rows={3}
                    style={{ ...inputStyle, resize: 'none' as const, lineHeight: 1.6 }}
                    placeholder="Tell us about your school, year groups, or any specific needs..."
                    {...inputFocusProps}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    borderRadius: 14,
                    border: 'none',
                    background: loading ? '#94a3b8' : '#f97316',
                    padding: '16px 24px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: loading ? 'none' : '0 4px 16px rgba(249,115,22,0.3)',
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#ea580c'; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#f97316'; }}
                >
                  {loading ? 'Submitting...' : 'Apply for School Pilot'}
                </button>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', marginTop: -8 }}>
                  We respond to all applications within 2 business days.
                </p>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px', fontSize: '2.5rem',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Application received!</h2>
              <p style={{ color: '#64748b', marginBottom: 8, maxWidth: 400, margin: '0 auto 8px', lineHeight: 1.7 }}>
                Thank you for applying. We'll review your application and be in touch within 2 business days.
              </p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 32 }}>
                While you wait, feel free to explore Draw in the Air yourself.
              </p>
              <a
                href="/play"
                style={{
                  display: 'inline-block',
                  borderRadius: 14,
                  background: '#f97316',
                  padding: '14px 32px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'white',
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
                }}
              >
                Explore the Activities
              </a>
            </div>
          )}
        </div>
      </LegalPageLayout>
    </>
  );
}
