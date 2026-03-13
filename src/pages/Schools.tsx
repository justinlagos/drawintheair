import React, { useState } from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';
import { submitLead } from '../lib/leads';

const platformUrl = typeof window !== 'undefined'
  ? (import.meta as any).env?.VITE_PLATFORM_URL || 'https://app.drawintheair.com'
  : 'https://app.drawintheair.com';

// ─── Design tokens ────────────────────────────────────────────────────────────
const c = {
  bg: '#f8fafc', white: '#ffffff', orange: '#f97316', orangeLight: '#fff7ed',
  orangeHover: '#ea580c', teal: '#0d9488', tealLight: '#f0fdfa',
  text: '#0f172a', textSec: '#475569', textMuted: '#94a3b8',
  border: '#e2e8f0', borderLight: '#f1f5f9',
};

const BENEFITS = [
  { icon: '📷', title: 'No Hardware Needed', desc: 'Just a device with a front-facing camera. Works on school Chromebooks, iPads, and interactive whiteboards.' },
  { icon: '🔒', title: 'GDPR Compliant', desc: 'No child data collected. No accounts. Camera processing stays entirely on the device — nothing leaves the classroom.' },
  { icon: '📚', title: 'EYFS Aligned', desc: 'Maps directly to Physical Development, Communication & Language, and Literacy in the EYFS and Reception curriculum.' },
  { icon: '♿', title: 'Inclusive by Design', desc: 'Gesture-based input supports children with motor differences, dyslexia, and those who struggle with pencil grip.' },
  { icon: '⚡', title: '30-Second Setup', desc: 'Open browser, allow camera, done. No installs, no logins for students. Run your first session in under a minute.' },
  { icon: '📊', title: 'Teacher Analytics', desc: 'Class Mode gives you live leaderboards, session scores, and performance reports for each pupil.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Open in a browser', desc: 'Visit drawintheair.com/play on any school device with a webcam. No download, no install.' },
  { step: '02', title: 'Wave to start', desc: 'Children wave their hand to wake the camera. An on-screen guide shows them how in seconds.' },
  { step: '03', title: 'Choose an activity', desc: 'Pick from 9 EYFS-aligned activities: letter tracing, number formation, shapes, bubble pop, and more.' },
  { step: '04', title: 'Run your class session', desc: 'Teachers open Class Mode on the platform, students join with a 4-digit code, and the whole class plays together.' },
];

const TRUST = [
  '✓ No child accounts', '✓ No video stored', '✓ No ads', '✓ GDPR safe', '✓ Free to try',
];

const FAQS = [
  { q: 'How much does it cost for schools?', a: 'The basic activities are free forever. Classroom Mode and analytics are part of Teacher Pro (£4.99/month) or the School Licence from £299/year for unlimited teachers.' },
  { q: 'Do we need to download anything?', a: 'No. Draw in the Air runs entirely in the browser. Nothing to install on school devices or student Chromebooks.' },
  { q: 'Is it approved for use with under-13s?', a: 'Yes. We collect zero child data. There are no student accounts, no persistent data, and no camera footage stored. Fully safe for EYFS and KS1 pupils.' },
  { q: 'Can SEND pupils use it?', a: 'Absolutely. Gesture-based input is often easier for children with motor or literacy challenges. The activities have adjustable difficulty and encouraging feedback loops.' },
  { q: 'Is there training support for staff?', a: 'Yes. We offer onboarding calls, a teacher guide PDF, and a movement break session plan. School Licence customers get dedicated onboarding.' },
];

export const Schools: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ schoolName: '', contactName: '', role: '', email: '', yearGroup: '', deviceType: '', sendConsiderations: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = '/pilot-pack.pdf';
    a.download = 'Draw-In-The-Air-Pilot-Pack.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitLead({ type: 'school_pack_request', ...form });
      setSubmitted(true);
    } catch {
      alert('There was an error. Please email us at partnership@drawintheair.com');
    } finally {
      setSubmitting(false);
    }
  };

  const pg: React.CSSProperties = { background: c.bg, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" };
  const container: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '0 1.5rem' };
  const sectionPad: React.CSSProperties = { padding: '5rem 0' };
  const sectionPadSm: React.CSSProperties = { padding: '3.5rem 0' };

  const badge: React.CSSProperties = {
    display: 'inline-block', background: c.orangeLight, color: c.orange, borderRadius: 50,
    padding: '5px 16px', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', marginBottom: 16,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', borderRadius: 10, border: `1.5px solid ${c.border}`, background: '#f8fafc',
    padding: '12px 14px', fontSize: '0.93rem', color: c.text, boxSizing: 'border-box',
    outline: 'none', transition: 'border-color 0.2s',
  };

  return (
    <div style={pg}>
      <HeaderNav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', borderBottom: `1px solid ${c.border}` }}>
        <div style={{ ...container, ...sectionPad, textAlign: 'center' }}>
          <span style={badge}>For Schools</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 900, color: c.text, margin: '0 0 1.2rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Bring Movement Learning<br />
            <span style={{ color: c.orange }}>Into Every Classroom</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: c.textSec, maxWidth: 640, margin: '0 auto 2rem', lineHeight: 1.65 }}>
            A browser-based learning platform where children practise letters, numbers, and shapes by drawing in the air with their hands. EYFS aligned. Zero setup. Completely safe.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button onClick={handleDownload} style={{ background: c.orange, color: '#fff', border: 'none', borderRadius: 10, padding: '15px 32px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
              Download School Pack (PDF)
            </button>
            <a href={`${platformUrl}/auth/login`} target="_blank" rel="noopener noreferrer" style={{ background: c.white, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: '15px 32px', fontSize: '1rem', fontWeight: 600, textDecoration: 'none' }}>
              Start Free Trial →
            </a>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {TRUST.map((t) => <span key={t} style={{ fontSize: '0.85rem', color: c.textSec, fontWeight: 600 }}>{t}</span>)}
          </div>
        </div>
      </section>

      {/* ── BENEFITS GRID ────────────────────────────────────────────────── */}
      <section style={{ ...sectionPad, background: c.bg }}>
        <div style={container}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={badge}>Why Schools Choose It</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: c.text, margin: '0.5rem 0 0' }}>Built for the classroom, safe for every child</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {BENEFITS.map((b) => (
              <div key={b.title} style={{ background: c.white, borderRadius: 14, border: `1px solid ${c.border}`, padding: '1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{b.icon}</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: c.text, margin: '0 0 8px' }}>{b.title}</h3>
                <p style={{ fontSize: '0.9rem', color: c.textSec, lineHeight: 1.65, margin: 0 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ ...sectionPadSm, background: c.white, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div style={container}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={badge}>Getting Started</span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: c.text, margin: '0.5rem 0 0' }}>Ready in 4 steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: c.orangeLight, color: c.orange, fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{step.step}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: c.text, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: '0.88rem', color: c.textSec, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PILOT FORM ───────────────────────────────────────────────────── */}
      <section style={{ ...sectionPad, background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)' }}>
        <div style={{ ...container, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <span style={badge}>Pilot Programme</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.3rem)', fontWeight: 800, color: c.text, margin: '0.5rem 0 1rem', lineHeight: 1.25 }}>Apply for a guided school pilot</h2>
            <p style={{ fontSize: '1rem', color: c.textSec, lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Join our pilot programme and get 8 weeks of supported classroom use, a dedicated teacher guide, and direct access to our team for feedback and support.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Full 8-week pilot pack', 'Staff training session', 'Weekly check-in with our team', 'Free school licence during pilot', 'Case study write-up (optional)'].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: '0.93rem', color: c.text }}>
                  <span style={{ color: '#22c55e', fontSize: '1rem', fontWeight: 700 }}>✓</span>{item}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ background: c.white, borderRadius: 16, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: `1px solid ${c.border}` }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: c.text, marginBottom: 8 }}>Application received!</h3>
                <p style={{ color: c.textSec, fontSize: '0.93rem' }}>We'll be in touch within 2 working days. Check your inbox at {form.email}.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: c.text, margin: '0 0 4px' }}>Apply for the pilot</h3>
                {[
                  { name: 'schoolName', label: 'School name', placeholder: 'e.g. Greenfield Primary School' },
                  { name: 'contactName', label: 'Your name', placeholder: 'e.g. Mrs Johnson' },
                  { name: 'role', label: 'Your role', placeholder: 'e.g. Reception Teacher, SENCo, Head' },
                  { name: 'email', label: 'School email', placeholder: 'you@school.sch.uk', type: 'email' },
                ].map((field) => (
                  <div key={field.name}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: c.textSec, marginBottom: 5 }}>{field.label}</label>
                    <input
                      type={field.type || 'text'}
                      required
                      placeholder={field.placeholder}
                      value={(form as any)[field.name]}
                      onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: c.textSec, marginBottom: 5 }}>Year group(s)</label>
                  <input value={form.yearGroup} onChange={(e) => setForm({ ...form, yearGroup: e.target.value })} placeholder="e.g. Reception, Year 1" style={inputStyle} />
                </div>
                <button type="submit" disabled={submitting} style={{ background: c.orange, color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: '0.97rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Sending…' : 'Apply for Pilot Programme →'}
                </button>
                <p style={{ fontSize: '0.78rem', color: c.textMuted, textAlign: 'center', margin: 0 }}>We'll respond within 2 working days. No spam.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ ...sectionPadSm, background: c.white, borderTop: `1px solid ${c.border}` }}>
        <div style={{ ...container, maxWidth: 720 }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: c.text, textAlign: 'center', marginBottom: '2rem' }}>Questions from schools</h2>
          {FAQS.map((item, i) => (
            <div key={i} style={{ borderRadius: 10, border: `1px solid ${openFaq === i ? c.orange : c.border}`, background: c.white, marginBottom: 8, overflow: 'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.97rem', fontWeight: 600, color: c.text, textAlign: 'left', gap: 12 }}>
                <span>{item.q}</span>
                <span style={{ color: openFaq === i ? c.orange : c.textMuted, fontSize: '1.3rem', fontWeight: 700, flexShrink: 0 }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <div style={{ padding: '0 20px 18px', fontSize: '0.93rem', color: c.textSec, lineHeight: 1.7 }}>{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={{ ...sectionPadSm, background: c.bg, borderTop: `1px solid ${c.border}` }}>
        <div style={{ ...container, textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: c.text, marginBottom: 12 }}>Ready to try it with your class?</h2>
          <p style={{ fontSize: '1rem', color: c.textSec, marginBottom: 28 }}>Download the school pack or start a free trial today.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleDownload} style={{ background: c.orange, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
              Download School Pack
            </button>
            <a href="mailto:partnership@drawintheair.com" style={{ background: c.white, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: '14px 28px', fontSize: '1rem', fontWeight: 600, textDecoration: 'none' }}>
              Email Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
