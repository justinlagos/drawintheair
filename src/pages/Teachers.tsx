import React, { useState } from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';

const platformUrl = typeof window !== 'undefined'
  ? (import.meta as any).env?.VITE_PLATFORM_URL || 'https://app.drawintheair.com'
  : 'https://app.drawintheair.com';

const c = {
  bg: '#f8fafc', white: '#ffffff', orange: '#f97316', orangeLight: '#fff7ed',
  text: '#0f172a', textSec: '#475569', textMuted: '#94a3b8',
  border: '#e2e8f0', green: '#22c55e',
};

const FEATURES = [
  { icon: '🏫', title: 'Class Mode', desc: 'Run whole-class sessions with a live leaderboard. Students join with a 4-digit code — no accounts, no emails.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'See per-student and session-level performance data. Track improvement over time across your class.' },
  { icon: '🤖', title: 'AI Insights', desc: 'Get AI-generated teaching suggestions based on your class\'s session data. Powered by Claude.' },
  { icon: '📋', title: 'Session Replay', desc: 'Review any previous class session. See which activities ran and how each student performed.' },
  { icon: '🎯', title: 'EYFS & KS1 Aligned', desc: 'Every activity maps to Physical Development, Literacy, and Mathematics in the EYFS and KS1 curriculum.' },
  { icon: '💻', title: 'Chromebook Ready', desc: 'Tested on school Chromebooks. Browser-based — nothing to install on student or teacher devices.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Sign up free', desc: 'Create a teacher account with your Google login. Your 5-day Teacher Pro trial starts immediately.' },
  { step: '02', title: 'Open Class Mode', desc: 'Go to the platform and create a new session. Choose an activity and configure settings.' },
  { step: '03', title: 'Students join', desc: 'Display the 4-digit code. Students go to drawintheair.com/join on their devices and enter the code.' },
  { step: '04', title: 'Play together', desc: 'Run the session with a live leaderboard. End when you\'re ready and review the results.' },
];

const TESTIMONIALS = [
  { quote: 'My class loves it. They don\'t even realise they\'re practising letter formation — they just think it\'s a game.', author: 'Miss Davies', role: 'Reception Teacher, Wiltshire' },
  { quote: 'The fact that nothing is recorded and there are no student accounts made it an instant yes from our Head.', author: 'Mr Osei', role: 'Year 1 Teacher, Birmingham' },
  { quote: 'I used it as a movement break after lunch and the focus afterwards was noticeably better.', author: 'Mrs Thornton', role: 'EYFS Lead, Bristol' },
];

const FAQS = [
  { q: 'Do I need a school IT department to set it up?', a: 'No. Draw in the Air is browser-based and runs on any device with a camera. No installation, no IT tickets, no admin rights needed.' },
  { q: 'How do students join a class session?', a: 'Students visit drawintheair.com/join on their device, enter the 4-digit code you display, and type their first name. That\'s it. No accounts or logins required.' },
  { q: 'Is there a free version?', a: 'Yes. All 9 activities are free forever. Teacher Pro (£4.99/month) unlocks Classroom Mode, analytics, and AI insights. Your 5-day trial includes everything.' },
  { q: 'Can I use it for intervention or SEND support?', a: 'Absolutely. The gesture-based input is often more accessible for children with motor difficulties, dyslexia, or attention challenges. You can use it one-to-one or in small groups.' },
  { q: 'Does it work as a movement break?', a: 'Yes — it\'s one of the most popular use cases. A 5-minute Bubble Pop or shape activity between lessons is an excellent brain break that still reinforces early skills.' },
];

export const Teachers: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const pg: React.CSSProperties = { background: c.bg, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" };
  const container: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '0 1.5rem' };
  const section: React.CSSProperties = { padding: '5rem 0' };
  const sectionSm: React.CSSProperties = { padding: '3.5rem 0' };
  const badge: React.CSSProperties = {
    display: 'inline-block', background: c.orangeLight, color: c.orange, borderRadius: 50,
    padding: '5px 16px', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', marginBottom: 16,
  };

  return (
    <div style={pg}>
      <HeaderNav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ background: c.white, borderBottom: `1px solid ${c.border}` }}>
        <div style={{ ...container, ...section, textAlign: 'center' }}>
          <span style={badge}>For Teachers</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.3rem)', fontWeight: 900, color: c.text, margin: '0 0 1.2rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Whole-Class Movement Learning,<br />
            <span style={{ color: c.orange }}>Ready in 30 Seconds</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: c.textSec, maxWidth: 620, margin: '0 auto 2rem', lineHeight: 1.65 }}>
            Run live class sessions where every child practises letters, numbers, and shapes using hand gestures. A live leaderboard, analytics, and AI insights — built for busy teachers.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
            <a href={`${platformUrl}/auth/login`} target="_blank" rel="noopener noreferrer"
              style={{ background: c.orange, color: '#fff', borderRadius: 10, padding: '15px 32px', fontSize: '1rem', fontWeight: 700, textDecoration: 'none' }}>
              Start Free 5-Day Trial
            </a>
            <a href="/play" onClick={(e) => { e.preventDefault(); window.location.pathname = '/play'; }}
              style={{ background: c.white, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: 10, padding: '15px 32px', fontSize: '1rem', fontWeight: 600, textDecoration: 'none' }}>
              See It First →
            </a>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['✓ No credit card', '✓ 5-day free trial', '✓ No student accounts', '✓ Works on Chromebooks'].map((t) => (
              <span key={t} style={{ fontSize: '0.85rem', color: c.textSec, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section style={{ ...section, background: c.bg }}>
        <div style={container}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={badge}>What you get</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: c.text, margin: '0.5rem 0 0' }}>Everything you need to run great sessions</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: c.white, borderRadius: 14, border: `1px solid ${c.border}`, padding: '1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: c.text, margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: '0.9rem', color: c.textSec, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ ...sectionSm, background: c.white, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div style={container}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={badge}>Getting started</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 800, color: c.text, margin: '0.5rem 0 0' }}>From sign-up to first class session in minutes</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: c.orangeLight, color: c.orange, fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{step.step}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: c.text, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: '0.88rem', color: c.textSec, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ───────────────────────────────────────────────── */}
      <section style={{ ...sectionSm, background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)' }}>
        <div style={{ ...container, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 860, margin: '0 auto' }}>
          {[
            { name: 'Free', price: '£0 forever', desc: 'All 9 activities, unlimited play, no account needed for students.', cta: 'Play Free', href: '/play', external: false, highlight: false },
            { name: 'Teacher Pro', price: '£4.99/month', desc: 'Class Mode, live leaderboard, analytics, AI insights, session replay.', cta: 'Start Free Trial', href: `${platformUrl}/auth/login`, external: true, highlight: true, tag: 'Recommended' },
          ].map((plan) => (
            <div key={plan.name} style={{ background: plan.highlight ? c.orange : c.white, borderRadius: 14, border: `2px solid ${plan.highlight ? c.orange : c.border}`, padding: '2rem', position: 'relative', boxShadow: plan.highlight ? '0 8px 30px rgba(249,115,22,0.2)' : '0 1px 4px rgba(0,0,0,0.05)', transform: plan.highlight ? 'scale(1.02)' : 'none' }}>
              {plan.tag && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#ea580c', color: '#fff', borderRadius: 50, padding: '3px 14px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{plan.tag}</div>}
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: plan.highlight ? '#fff' : c.text, marginBottom: 4 }}>{plan.name}</h3>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: plan.highlight ? '#fff' : c.text, margin: '8px 0 12px' }}>{plan.price}</div>
              <p style={{ fontSize: '0.88rem', color: plan.highlight ? 'rgba(255,255,255,0.88)' : c.textSec, lineHeight: 1.6, marginBottom: 20 }}>{plan.desc}</p>
              <a href={plan.external ? plan.href : '#'} {...(plan.external ? { target: '_blank', rel: 'noopener noreferrer' } : { onClick: (e) => { e.preventDefault(); window.location.pathname = plan.href; } })}
                style={{ display: 'block', textAlign: 'center', background: plan.highlight ? '#fff' : c.orange, color: plan.highlight ? c.orange : '#fff', borderRadius: 10, padding: '12px', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/pricing" onClick={(e) => { e.preventDefault(); window.location.pathname = '/pricing'; }} style={{ color: c.orange, fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
            View full pricing comparison →
          </a>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section style={{ ...sectionSm, background: c.white, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div style={container}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: c.text, textAlign: 'center', marginBottom: '2.5rem' }}>What teachers say</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.author} style={{ background: c.bg, borderRadius: 14, border: `1px solid ${c.border}`, padding: '1.75rem' }}>
                <p style={{ fontSize: '0.97rem', color: c.text, fontStyle: 'italic', lineHeight: 1.65, marginBottom: 18 }}>"{t.quote}"</p>
                <div style={{ fontSize: '0.87rem', fontWeight: 700, color: c.text }}>{t.author}</div>
                <div style={{ fontSize: '0.82rem', color: c.textMuted }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ ...sectionSm, background: c.bg }}>
        <div style={{ ...container, maxWidth: 700 }}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: c.text, textAlign: 'center', marginBottom: '2rem' }}>Teacher questions answered</h2>
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
      <section style={{ ...sectionSm, background: c.orange }}>
        <div style={{ ...container, textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: '#fff', marginBottom: 12 }}>Start your free trial today</h2>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
            5 days free. No credit card. Cancel any time. Your first class session is 5 minutes away.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`${platformUrl}/auth/login`} target="_blank" rel="noopener noreferrer"
              style={{ background: '#fff', color: c.orange, borderRadius: 10, padding: '15px 34px', fontSize: '1.05rem', fontWeight: 700, textDecoration: 'none' }}>
              Create Teacher Account
            </a>
            <a href="/schools" onClick={(e) => { e.preventDefault(); window.location.pathname = '/schools'; }}
              style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.6)', borderRadius: 10, padding: '15px 34px', fontSize: '1rem', fontWeight: 600, textDecoration: 'none' }}>
              School Licensing →
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Teachers;
