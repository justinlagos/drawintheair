/**
 * Teachers — Kid-UI bright sky version
 * Wrapped in LegalPageLayout so it inherits the new theme automatically.
 */

import React, { useState } from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';
import { KidButton } from '../components/kid-ui';
import { tokens } from '../styles/tokens';

const platformUrl = typeof window !== 'undefined'
  ? (import.meta as { env?: { VITE_PLATFORM_URL?: string } }).env?.VITE_PLATFORM_URL || 'https://app.drawintheair.com'
  : 'https://app.drawintheair.com';

const FEATURES: { icon: string; title: string; desc: string; color: string; bg: string }[] = [
  { icon: '🏫', title: 'Class Mode', desc: 'Run whole-class sessions with a live leaderboard. Students join with a 4-digit code, no accounts.', color: tokens.colors.deepPlum, bg: '#EAE0FB' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Per-student and session-level performance data. Track improvement over time.', color: tokens.colors.aqua, bg: '#D6F0FF' },
  { icon: '🤖', title: 'AI Insights', desc: 'AI-generated teaching suggestions based on your class data. Powered by Claude.', color: tokens.colors.coral, bg: '#FFE2EC' },
  { icon: '📋', title: 'Session Replay', desc: 'Review any previous class session. See exactly which activities ran and how students performed.', color: tokens.colors.warmOrange, bg: '#FFE9CF' },
  { icon: '🎯', title: 'EYFS & KS1 Aligned', desc: 'Every activity maps to Physical Development, Literacy, and Mathematics curricula.', color: tokens.colors.meadowGreen, bg: '#DCF5C9' },
  { icon: '💻', title: 'Chromebook Ready', desc: 'Tested on school Chromebooks. Browser-based, nothing to install.', color: tokens.colors.sunshine, bg: '#FFF1B5' },
];

const STEPS = [
  { step: '1', title: 'Sign up free', desc: 'Create a teacher account with Google. Your 5-day Pro trial starts immediately.' },
  { step: '2', title: 'Open Class Mode', desc: 'Create a new session, choose an activity, and configure settings.' },
  { step: '3', title: 'Students join', desc: 'Display the 4-digit code. Students go to drawintheair.com/join and enter it.' },
  { step: '4', title: 'Play together', desc: 'Run the session with a live leaderboard. Review results when finished.' },
];

const TESTIMONIALS = [
  { quote: "My class loves it. They don't even realise they're practising letter formation, they just think it's a game.", author: 'Miss Davies', role: 'Reception Teacher, Wiltshire', tint: tokens.colors.coral },
  { quote: 'The fact that nothing is recorded and there are no student accounts made it an instant yes from our Head.', author: 'Mr Osei', role: 'Year 1 Teacher, Birmingham', tint: tokens.colors.aqua },
  { quote: 'I used it as a movement break after lunch and the focus afterwards was noticeably better.', author: 'Mrs Thornton', role: 'EYFS Lead, Bristol', tint: tokens.colors.meadowGreen },
];

const FAQS = [
  { q: 'Do I need a school IT department to set it up?', a: 'No. Draw in the Air is browser-based and runs on any device with a camera. No installation, no IT tickets, no admin rights needed.' },
  { q: 'How do students join a class session?', a: "Students visit drawintheair.com/join, enter the 4-digit code you display, and type their first name. That's it. No accounts." },
  { q: 'Is there a free version?', a: 'Yes. All 9 activities are free forever. Teacher Pro (£4.99/month) unlocks Classroom Mode, analytics, and AI insights.' },
  { q: 'Can I use it for intervention or SEND support?', a: 'Absolutely. The gesture-based input is often more accessible for children with motor difficulties, dyslexia, or attention challenges.' },
  { q: 'Does it work as a movement break?', a: 'Yes — one of the most popular use cases. A 5-minute Bubble Pop or shape activity between lessons is an excellent brain break.' },
];

export const Teachers: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <LegalPageLayout heroTitle="Built for teachers." eyebrow="For Teachers">
      <p style={{ fontSize: '1.15rem', textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
        Run live class sessions where every child practises letters, numbers, and shapes using hand gestures. Live leaderboard, analytics, and AI insights — built for busy teachers.
      </p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
        <a href={`${platformUrl}/auth/login`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <KidButton variant="primary" size="lg">Start Free 5-Day Trial</KidButton>
        </a>
        <a href="/play" style={{ textDecoration: 'none' }}>
          <KidButton variant="secondary" size="lg">See It First →</KidButton>
        </a>
      </div>
      <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56, fontSize: '0.9rem', fontWeight: 600, opacity: 0.85 }}>
        <span>✓ No credit card</span>
        <span>✓ 5-day free trial</span>
        <span>✓ No student accounts</span>
        <span>✓ Works on Chromebooks</span>
      </div>

      <h2>Everything you need to run great sessions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 18, marginBottom: 36 }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.12)', borderRadius: 20, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: f.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 10, boxShadow: tokens.shadow.inset }}>
              {f.icon}
            </div>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontSize: '1.05rem', fontWeight: 700, color: tokens.colors.charcoal, marginBottom: 4 }}>{f.title}</h3>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.55, opacity: 0.8, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <h2>From sign-up to first class session in minutes</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 18, marginBottom: 36 }}>
        {STEPS.map((s) => (
          <div key={s.step} style={{ textAlign: 'center', background: '#F4FAFF', border: '2px solid rgba(108,63,164,0.10)', borderRadius: 18, padding: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(180deg, #7E4FB8 0%, #6C3FA4 100%)', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: tokens.fontFamily.display, fontWeight: 700, marginBottom: 10 }}>{s.step}</div>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontSize: '1rem', fontWeight: 700, color: tokens.colors.charcoal, marginBottom: 4 }}>{s.title}</h3>
            <p style={{ fontSize: '0.86rem', lineHeight: 1.55, opacity: 0.78, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <h2>What teachers say</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 18, marginBottom: 36 }}>
        {TESTIMONIALS.map((t) => (
          <div key={t.author} style={{ background: 'linear-gradient(165deg, #FFFFFF 0%, #F4FAFF 100%)', border: '2px solid rgba(108,63,164,0.10)', borderRadius: 20, padding: 18 }}>
            <p style={{ fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 12 }}>"{t.quote}"</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.tint, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: tokens.fontFamily.display, fontWeight: 700 }}>{t.author.charAt(0)}</div>
              <div>
                <div style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.88rem' }}>{t.author}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2>Teacher questions answered</h2>
      <div style={{ marginTop: 18, marginBottom: 16 }}>
        {FAQS.map((item, i) => (
          <div key={i} style={{ borderRadius: 16, border: `2px solid ${openFaq === i ? tokens.colors.deepPlum : 'rgba(108,63,164,0.12)'}`, background: '#FFFFFF', marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: tokens.fontFamily.display, fontSize: '1rem', fontWeight: 700, color: tokens.colors.charcoal, textAlign: 'left' }}>
              <span>{item.q}</span>
              <span style={{ color: tokens.colors.deepPlum, fontSize: '1.4rem', fontWeight: 700, flexShrink: 0, marginLeft: 12 }}>{openFaq === i ? '−' : '+'}</span>
            </button>
            {openFaq === i && <div style={{ padding: '0 18px 16px', fontSize: '0.93rem', lineHeight: 1.65, opacity: 0.85 }}>{item.a}</div>}
          </div>
        ))}
      </div>
    </LegalPageLayout>
  );
};

export default Teachers;
