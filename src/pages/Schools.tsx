/**
 * Schools — Kid-UI bright sky version
 */

import React, { useState } from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';
import { KidButton } from '../components/kid-ui';
import { tokens } from '../styles/tokens';
import { submitFormData } from '../lib/formSubmission';

const VALUE_PROPS: { title: string; desc: string; color: string; bg: string; icon: string }[] = [
  { title: 'Whole-school deployment', desc: 'One license covers every classroom, no per-student counting.', color: tokens.colors.deepPlum, bg: '#EAE0FB', icon: '🏫' },
  { title: 'No IT setup', desc: 'Browser-based on any device with a camera. No installs.', color: tokens.colors.aqua, bg: '#D6F0FF', icon: '⚡' },
  { title: 'EYFS & KS1 aligned', desc: 'Activities map to Physical Development, Literacy and Maths.', color: tokens.colors.meadowGreen, bg: '#DCF5C9', icon: '🎯' },
  { title: 'Privacy by design', desc: 'No student accounts, no recordings, no tracking. Ever.', color: tokens.colors.coral, bg: '#FFE2EC', icon: '🔒' },
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
          <div key={v.title} style={{ background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.12)', borderRadius: 20, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: v.bg, color: v.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 10 }}>
              {v.icon}
            </div>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>{v.title}</h3>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.55, opacity: 0.8, margin: 0 }}>{v.desc}</p>
          </div>
        ))}
      </div>

      <h2>Request a free pilot pack</h2>
      <p>Tell us about your school and we'll send a tailored pilot pack with lesson plans, EYFS mapping, a teacher quick-start, and access to Class Mode for the duration of your trial.</p>

      {sent ? (
        <div style={{ background: 'rgba(126,217,87,0.12)', border: '2px solid rgba(126,217,87,0.45)', borderRadius: 20, padding: 24, marginTop: 18, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 12px', borderRadius: '50%', background: tokens.colors.meadowGreen, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: tokens.shadow.glow, border: '4px solid #FFFFFF' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
          </div>
          <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.3rem', color: tokens.colors.charcoal, marginBottom: 6 }}>Request sent!</h3>
          <p style={{ fontSize: '0.95rem', opacity: 0.8, margin: 0 }}>We'll be in touch within 24 hours with your pilot pack.</p>
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          {error && (
            <div style={{ marginBottom: 14, padding: 12, borderRadius: 14, background: 'rgba(255,107,107,0.10)', border: '2px solid rgba(255,107,107,0.4)', color: tokens.colors.coral, fontSize: '0.9rem' }}>{error}</div>
          )}
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Your name *" value={name} onChange={setName} placeholder="Jane Smith" />
            <Field label="Email *" type="email" value={email} onChange={setEmail} placeholder="jane@school.edu" />
            <Field label="School name *" value={school} onChange={setSchool} placeholder="Elm Park Primary" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
              <Select label="Your role" value={role} onChange={setRole} options={['Head Teacher', 'Deputy Head', 'Teacher', 'IT Coordinator', 'EYFS Lead', 'Other']} />
              <Select label="School size" value={size} onChange={setSize} options={['Under 100 pupils', '100 to 300 pupils', '300 to 600 pupils', 'Over 600 pupils', 'Multi-academy trust']} />
            </div>
            <FieldArea label="Anything else?" value={notes} onChange={setNotes} placeholder="Tell us what you'd like to try..." />
          </div>
          <div style={{ marginTop: 22 }}>
            <KidButton variant="primary" size="lg" onClick={submit} disabled={sending}>
              {sending ? 'Sending…' : 'Send Request'}
            </KidButton>
          </div>
        </div>
      )}
    </LegalPageLayout>
  );
};

const Field = ({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <div>
    <label style={{ display: 'block', fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, marginBottom: 6 }}>{label}</label>
    <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.18)', borderRadius: 14, padding: '12px 14px', fontSize: '1rem', fontFamily: tokens.fontFamily.body, color: tokens.colors.charcoal, outline: 'none', boxSizing: 'border-box' }} />
  </div>
);
const FieldArea = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label style={{ display: 'block', fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, marginBottom: 6 }}>{label}</label>
    <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={3}
      style={{ width: '100%', background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.18)', borderRadius: 14, padding: '12px 14px', fontSize: '1rem', fontFamily: tokens.fontFamily.body, color: tokens.colors.charcoal, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
  </div>
);
const Select = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
  <div>
    <label style={{ display: 'block', fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, marginBottom: 6 }}>{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.18)', borderRadius: 14, padding: '12px 14px', fontSize: '1rem', fontFamily: tokens.fontFamily.body, color: tokens.colors.charcoal, outline: 'none', boxSizing: 'border-box' }}>
      <option value="">Select...</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  </div>
);

export default Schools;
