import React, { useState } from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';

const platformUrl = typeof window !== 'undefined'
  ? (import.meta as any).env?.VITE_PLATFORM_URL || 'https://app.drawintheair.com'
  : 'https://app.drawintheair.com';

const PLANS = [
  {
    name: 'Free',
    description: 'For families & casual use',
    price: '£0',
    period: 'forever',
    cta: 'Play Free Now',
    ctaHref: '/play',
    external: false,
    highlight: false,
    features: [
      'All 9 activities',
      'Unlimited play sessions',
      'Hand gesture tracking',
      'Works on any device',
      'No account needed',
    ],
  },
  {
    name: 'Teacher Pro',
    description: 'Classroom mode & analytics',
    price: '£4.99',
    period: '/month',
    cta: 'Start 5-Day Free Trial',
    ctaHref: `${platformUrl}/auth/login`,
    external: true,
    highlight: true,
    tag: 'Most Popular',
    features: [
      'Everything in Free',
      'Classroom mode',
      'Live leaderboards',
      'AI learning analytics',
      'Session replay',
      'Student performance reports',
      'Up to 30 students per session',
    ],
  },
  {
    name: 'School',
    description: 'Whole-school licence',
    price: 'From £299',
    period: '/year',
    cta: 'Get in Touch',
    ctaHref: 'mailto:partnership@drawintheair.com',
    external: true,
    highlight: false,
    features: [
      'Everything in Teacher Pro',
      'Unlimited teacher accounts',
      'School-wide analytics',
      'Dedicated onboarding',
      'Priority support',
      'GDPR data agreement',
      'Custom branding',
    ],
  },
];

const COMPARISON = [
  { feature: 'All 9 activities', free: true, pro: true, school: true },
  { feature: 'Unlimited play', free: true, pro: true, school: true },
  { feature: 'Classroom mode', free: false, pro: true, school: true },
  { feature: 'Live leaderboards', free: false, pro: true, school: true },
  { feature: 'AI analytics', free: false, pro: true, school: true },
  { feature: 'Session replay', free: false, pro: true, school: true },
  { feature: 'Student reports', free: false, pro: true, school: true },
  { feature: 'Multi-teacher management', free: false, pro: false, school: true },
  { feature: 'School-wide dashboard', free: false, pro: false, school: true },
  { feature: 'Unlimited students', free: false, pro: false, school: true },
];

const FAQS = [
  { q: 'Is it really free forever?', a: 'Yes. The free plan gives unlimited access to all 9 activities — no account, no credit card, no expiry. Upgrade only for classroom tools.' },
  { q: 'What happens after the 5-day trial?', a: "After the trial ends you can upgrade to Teacher Pro or continue on the free plan. We don't auto-charge — no surprises." },
  { q: 'Do students need accounts or emails?', a: 'No. Students enter just their first name at the start of a class session. No accounts, no emails, no GDPR issues.' },
  { q: 'Does it work on school Chromebooks?', a: 'Yes. Draw in the Air is browser-based and tested on Chromebooks with the front-facing camera. No installation required.' },
  { q: 'Can we pay annually?', a: 'Yes. Annual billing for Teacher Pro saves you 2 months. Contact us for school annual invoicing and PO billing.' },
];

export const Pricing: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const s = {
    section: { padding: '3rem 1.5rem', maxWidth: 1100, margin: '0 auto' } as React.CSSProperties,
    badge: {
      display: 'inline-block', background: '#fff7ed', color: '#f97316',
      borderRadius: 50, padding: '4px 14px', fontSize: '0.78rem', fontWeight: 700,
      letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: 12,
    },
    h1: { fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem', lineHeight: 1.2 },
    sub: { fontSize: '1.1rem', color: '#475569', maxWidth: 560, margin: '0 auto 3rem', lineHeight: 1.6 },
    planGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' },
    card: (highlight: boolean): React.CSSProperties => ({
      background: highlight ? '#f97316' : '#fff',
      border: highlight ? '2px solid #f97316' : '1px solid #e2e8f0',
      borderRadius: 16, padding: '2rem',
      boxShadow: highlight ? '0 8px 32px rgba(249,115,22,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
      position: 'relative', transform: highlight ? 'scale(1.03)' : 'none',
    }),
    planTag: {
      position: 'absolute' as const, top: -12, left: '50%', transform: 'translateX(-50%)',
      background: '#ea580c', color: '#fff', borderRadius: 50, padding: '3px 14px',
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', whiteSpace: 'nowrap' as const,
    },
    planName: (h: boolean): React.CSSProperties => ({ fontSize: '1.35rem', fontWeight: 800, color: h ? '#fff' : '#0f172a', marginBottom: 4 }),
    planDesc: (h: boolean): React.CSSProperties => ({ fontSize: '0.88rem', color: h ? 'rgba(255,255,255,0.85)' : '#64748b', marginBottom: 20 }),
    price: (h: boolean): React.CSSProperties => ({ fontSize: '2.2rem', fontWeight: 800, color: h ? '#fff' : '#0f172a' }),
    period: (h: boolean): React.CSSProperties => ({ fontSize: '0.9rem', color: h ? 'rgba(255,255,255,0.75)' : '#64748b', marginLeft: 4 }),
    ctaBtn: (h: boolean): React.CSSProperties => ({
      display: 'block', width: '100%', textAlign: 'center', padding: '13px 20px',
      borderRadius: 10, fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none',
      margin: '20px 0',
      background: h ? '#fff' : '#f97316',
      color: h ? '#f97316' : '#fff',
      border: h ? 'none' : 'none',
      cursor: 'pointer',
    }),
    featList: { listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 16 },
    featItem: (h: boolean): React.CSSProperties => ({
      display: 'flex', alignItems: 'flex-start', gap: 8,
      fontSize: '0.88rem', color: h ? 'rgba(255,255,255,0.92)' : '#374151', marginBottom: 10,
    }),
    check: (h: boolean): React.CSSProperties => ({
      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
      background: h ? 'rgba(255,255,255,0.25)' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: h ? '#fff' : '#f97316', fontSize: 11, fontWeight: 900,
    }),
    tableWrap: { overflowX: 'auto' as const, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' },
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '14px 20px', textAlign: 'center' as const, fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #f1f5f9' },
    thLeft: { padding: '14px 20px', textAlign: 'left' as const, fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #f1f5f9' },
    td: { padding: '13px 20px', textAlign: 'center' as const, fontSize: '0.88rem', color: '#475569', borderBottom: '1px solid #f1f5f9' },
    tdLeft: { padding: '13px 20px', textAlign: 'left' as const, fontSize: '0.88rem', color: '#475569', borderBottom: '1px solid #f1f5f9' },
    faqItem: { borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', marginBottom: 10, overflow: 'hidden' },
    faqQ: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, color: '#0f172a', textAlign: 'left' as const, gap: 12 },
    faqA: { padding: '0 20px 18px', fontSize: '0.93rem', color: '#475569', lineHeight: 1.65 },
    ctaBox: { background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', borderRadius: 16, padding: '3rem 2rem', textAlign: 'center' as const, border: '1px solid #fed7aa' },
    ctaH2: { fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#0f172a', marginBottom: 12 },
    ctaP: { fontSize: '1rem', color: '#64748b', marginBottom: 28 },
    btnRow: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const },
    btnPrimary: {
      display: 'inline-block', background: '#f97316', color: '#fff', padding: '14px 30px',
      borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '1rem',
    },
    btnSecondary: {
      display: 'inline-block', background: '#fff', color: '#0f172a', padding: '14px 30px',
      borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '1rem',
      border: '1px solid #e2e8f0',
    },
  };

  return (
    <LegalPageLayout title="Pricing">
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={s.badge}>Transparent pricing</span>
        <p style={s.sub}>Free for families. Affordable for teachers. Scalable for schools.</p>
      </div>

      {/* Plan cards */}
      <div style={s.planGrid}>
        {PLANS.map((plan) => (
          <div key={plan.name} style={s.card(plan.highlight)}>
            {plan.tag && <div style={s.planTag}>{plan.tag}</div>}
            <div style={s.planName(plan.highlight)}>{plan.name}</div>
            <div style={s.planDesc(plan.highlight)}>{plan.description}</div>
            <div>
              <span style={s.price(plan.highlight)}>{plan.price}</span>
              <span style={s.period(plan.highlight)}>{plan.period}</span>
            </div>
            <a
              href={plan.ctaHref}
              {...(plan.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              style={s.ctaBtn(plan.highlight)}
              onClick={!plan.external ? (e) => { e.preventDefault(); window.location.pathname = plan.ctaHref; } : undefined}
            >
              {plan.cta}
            </a>
            <ul style={s.featList}>
              {plan.features.map((f) => (
                <li key={f} style={s.featItem(plan.highlight)}>
                  <span style={s.check(plan.highlight)}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Feature comparison table */}
      <div style={{ ...s.section, padding: '3rem 0' }}>
        <h2 style={{ ...s.h1, fontSize: '1.6rem', textAlign: 'center', marginBottom: '1.5rem' }}>Full feature comparison</h2>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thLeft}>Feature</th>
                <th style={s.th}>Free</th>
                <th style={{ ...s.th, color: '#f97316' }}>Teacher Pro</th>
                <th style={s.th}>School</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} style={{ background: 'transparent' }}>
                  <td style={s.tdLeft}>{row.feature}</td>
                  <td style={s.td}>{row.free ? <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={s.td}>{row.pro ? <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                  <td style={s.td}>{row.school ? <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: '1rem 0 2rem' }}>
        <h2 style={{ ...s.h1, fontSize: '1.6rem', textAlign: 'center', marginBottom: '1.5rem' }}>Common questions</h2>
        {FAQS.map((item, i) => (
          <div key={i} style={s.faqItem}>
            <button style={s.faqQ} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <span>{item.q}</span>
              <span style={{ fontSize: '1.2rem', color: '#f97316', flexShrink: 0 }}>{openFaq === i ? '−' : '+'}</span>
            </button>
            {openFaq === i && <div style={s.faqA}>{item.a}</div>}
          </div>
        ))}
      </div>

      {/* Final CTA */}
      <div style={s.ctaBox}>
        <h2 style={s.ctaH2}>Ready to get started?</h2>
        <p style={s.ctaP}>Join teachers across the UK transforming early years learning.</p>
        <div style={s.btnRow}>
          <a href="/play" onClick={(e) => { e.preventDefault(); window.location.pathname = '/play'; }} style={s.btnPrimary}>Play Free Now</a>
          <a href={`${platformUrl}/auth/login`} target="_blank" rel="noopener noreferrer" style={s.btnSecondary}>Start Free Trial</a>
        </div>
      </div>
    </LegalPageLayout>
  );
};
