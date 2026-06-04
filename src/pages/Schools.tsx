/**
 * Schools, Calm design system version
 *
 * Presentational refresh June 2026: rides on the restyled
 * LegalPageLayout (Calm shell) with Calm-token cards, inputs and
 * buttons. Form fields and submission logic are unchanged.
 */

import React, { useState } from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';
import { submitFormData } from '../lib/formSubmission';

const LAVENDER = '#8A66F0';
const MINT = '#3FB87F';
const SKY = '#5A99F2';
const PEACH = '#F07A5C';
const INK = '#1F1B2E';

const VALUE_PROPS: { title: string; desc: string; color: string; bg: string; icon: string }[] = [
  { title: 'Whole-school deployment', desc: 'One license covers every classroom, no per-student counting.', color: LAVENDER, bg: '#F4EFFF', icon: '🏫' },
  { title: 'No IT setup', desc: 'Browser-based on any device with a camera. No installs.', color: SKY, bg: '#EEF6FF', icon: '⚡' },
  { title: 'EYFS & KS1 aligned', desc: 'Activities map to Physical Development, Literacy and Maths.', color: MINT, bg: '#ECFBF3', icon: '🎯' },
  { title: 'Privacy by design', desc: 'No student accounts, no recordings, no tracking. Ever.', color: PEACH, bg: '#FFF1EB', icon: '🔒' },
];

export const Schools: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [role, setRole] = useState('');
  const [size, setSize] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim() || !email.trim() || !school.trim()) { setError('Please fill name, email and school.'); return; }
    setError(''); setSending(true);
    submitFormData({ type: 'school_pack_request', name: name.trim(), email: email.trim(), school: school.trim(), role, schoolSize: size, message: notes.trim() })
      .then(() => { setSent(true); setSending(false); })
      .catch((err: { message?: string }) => { setError(err.message ?? 'Something went wrong.'); setSending(false); });
  };

  return (
    <LegalPageLayout heroTitle="Built for schools." eyebrow="For Schools">
      <p style={{ fontSize: '1.15rem', textAlign: 'center', maxWidth: 640, margin: '0 auto 36px' }}>
        Whole-school licenses, EYFS-aligned activities, and a free pilot pack for early years and KS1. No installs. No student accounts. Just play.
      </p>

      <h2>What's included</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 18, marginBottom: 36 }}>
        {VALUE_PROPS.map((v) => (
          <div key={v.title} style={{ background: '#FFFFFF', border: '1px solid rgba(31,27,46,0.10)', borderRadius: 20, padding: 20, boxShadow: '0 2px 6px rgba(64,50,90,0.08)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: v.bg, color: v.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 10 }}>
              {v.icon}
            </div>
            <h3 style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontSize: '1.05rem', fontWeight: 700, marginBottom: 4, marginTop: 0, color: INK }}>{v.title}</h3>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.55, opacity: 0.8, margin: 0 }}>{v.desc}</p>
          </div>
        ))}
      </div>

      <h2>Request a free pilot pack</h2>
      <p>Tell us about your school and we'll send a tailored pilot pack with lesson plans, EYFS mapping, a teacher quick-start, and access to Class Mode for the duration of your trial.</p>

      {sent ? (
        <div style={{ background: 'rgba(63,184,127,0.08)', border: '1px solid rgba(63,184,127,0.4)', borderRadius: 20, padding: 24, marginTop: 18, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 12px', borderRadius: '50%', background: MINT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(63,184,127,0.3)', border: '4px solid #FFFFFF' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
          </div>
          <h3 style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: INK, marginBottom: 6, marginTop: 0 }}>Request sent!</h3>
          <p style={{ fontSize: '0.95rem', opacity: 0.8, margin: 0 }}>We'll be in touch within 24 hours with your pilot pack.</p>
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          {error && (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 14, background: 'rgba(240,122,92,0.08)', border: '1px solid rgba(240,122,92,0.4)', color: '#D85E40', fontSize: '0.9rem' }}>{error}</div>
          )}
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Your name *" value={name} onChange={setName} placeholder="Jane Smith" />
            <Field label="Email *" type="email" value={email} onChange={setEmail} placeholder="jane@school.edu" />
            <Field label="School name *" value={school} onChange={setSchool} placeholder="Elm Park Primary" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <Select label="Your role" value={role} onChange={setRole} options={['Head Teacher', 'Deputy Head', 'Teacher', 'IT Coordinator', 'EYFS Lead', 'Other']} />
              <Select label="School size" value={size} onChange={setSize} options={['Under 100 pupils', '100 to 300 pupils', '300 to 600 pupils', 'Over 600 pupils', 'Multi-academy trust']} />
            </div>
            <FieldArea label="Anything else?" value={notes} onChange={setNotes} placeholder="Tell us what you'd like to try..." />
          </div>
          <div style={{ marginTop: 22 }}>
            <button type="button" className="btn btn-primary lg" onClick={submit} disabled={sending} style={sending ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}>
              {sending ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      )}
    </LegalPageLayout>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Outfit, system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.85rem',
  color: LAVENDER,
  marginBottom: 6,
};

const controlStyle: React.CSSProperties = {
  width: '100%',
  background: '#FFFDF7',
  border: '1px solid rgba(31,27,46,0.16)',
  borderRadius: 14,
  padding: '12px 14px',
  fontSize: '1rem',
  fontFamily: 'Nunito, system-ui, sans-serif',
  color: INK,
  outline: 'none',
  boxSizing: 'border-box',
};

const Field = ({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={controlStyle} />
  </div>
);
const FieldArea = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...controlStyle, resize: 'vertical' }} />
  </div>
);
const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} style={controlStyle}>
      <option value="">Select...</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  </div>
);

export default Schools;
