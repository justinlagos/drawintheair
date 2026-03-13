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

/* ── Responsive CSS injected once ────────────────────────────────────────── */
const PRICING_CSS = `
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    align-items: start;
    max-width: 1200px;
    margin: 0 auto;
  }
  @media (max-width: 900px) {
    .pricing-grid {
      grid-template-columns: 1fr;
      max-width: 420px;
    }
  }
  .pricing-card {
    border-radius: 16px;
    padding: 2rem 1.5rem;
    position: relative;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .pricing-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.1);
  }
  .pricing-card--highlight {
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    border: 2px solid #f97316;
    box-shadow: 0 8px 32px rgba(249,115,22,0.3);
    transform: scale(1.02);
  }
  .pricing-card--highlight:hover {
    transform: scale(1.02) translateY(-4px);
    box-shadow: 0 16px 48px rgba(249,115,22,0.35);
  }
  .pricing-card--default {
    background: #fff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .pricing-cta-btn {
    display: block;
    width: 100%;
    text-align: center;
    padding: 14px 20px;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    margin: 20px 0;
    cursor: pointer;
    transition: opacity 0.15s ease, transform 0.15s ease;
    border: none;
  }
  .pricing-cta-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .pricing-table tr:nth-child(even) {
    background: #f8fafc;
  }
  .pricing-table tr:nth-child(odd) {
    background: #fff;
  }
`;

export const Pricing: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <LegalPageLayout heroTitle="Pricing">
      <style>{PRICING_CSS}</style>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{
          display: 'inline-block', background: '#fff7ed', color: '#f97316',
          borderRadius: 50, padding: '5px 16px', fontSize: '0.78rem', fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12,
        }}>
          Transparent pricing
        </span>
        <p style={{ fontSize: '1.15rem', color: '#475569', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          Free for families. Affordable for teachers. Scalable for schools.
        </p>
      </div>

      {/* Plan cards — 3 in a row */}
      <div className="pricing-grid">
        {PLANS.map((plan) => {
          const h = plan.highlight;
          return (
            <div
              key={plan.name}
              className={`pricing-card ${h ? 'pricing-card--highlight' : 'pricing-card--default'}`}
            >
              {plan.tag && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: '#ea580c', color: '#fff', borderRadius: 50, padding: '4px 16px',
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', whiteSpace: 'nowrap',
                }}>
                  {plan.tag}
                </div>
              )}

              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: h ? '#fff' : '#0f172a', marginBottom: 4 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: '0.88rem', color: h ? 'rgba(255,255,255,0.85)' : '#64748b', marginBottom: 20 }}>
                {plan.description}
              </div>

              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: h ? '#fff' : '#0f172a', lineHeight: 1 }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: '0.9rem', color: h ? 'rgba(255,255,255,0.7)' : '#64748b', marginLeft: 4 }}>
                  {plan.period}
                </span>
              </div>

              <a
                href={plan.ctaHref}
                {...(plan.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="pricing-cta-btn"
                style={{
                  background: h ? '#fff' : '#f97316',
                  color: h ? '#f97316' : '#fff',
                }}
                onClick={!plan.external ? (e) => { e.preventDefault(); window.location.pathname = plan.ctaHref; } : undefined}
              >
                {plan.cta}
              </a>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: h ? '1px solid rgba(255,255,255,0.2)' : '1px solid #f1f5f9', paddingTop: 16 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    fontSize: '0.88rem', color: h ? 'rgba(255,255,255,0.92)' : '#374151', marginBottom: 10,
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: h ? 'rgba(255,255,255,0.2)' : '#fff7ed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: h ? '#fff' : '#f97316', fontSize: 11, fontWeight: 900,
                    }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div style={{ padding: '3.5rem 0 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: '1.5rem' }}>
          Full feature comparison
        </h2>
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
          <table className="pricing-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0' }}>Feature</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0' }}>Free</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 700, color: '#f97316', borderBottom: '2px solid #e2e8f0' }}>Teacher Pro</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', borderBottom: '2px solid #e2e8f0' }}>School</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature}>
                  <td style={{ padding: '13px 20px', textAlign: 'left', fontSize: '0.88rem', color: '#374151', borderBottom: '1px solid #f1f5f9' }}>{row.feature}</td>
                  <td style={{ padding: '13px 20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    {row.free ? <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '1rem' }}>✓</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    {row.pro ? <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '1rem' }}>✓</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    {row.school ? <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '1rem' }}>✓</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: '1rem 0 2.5rem', maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: '1.5rem' }}>
          Common questions
        </h2>
        {FAQS.map((item, i) => (
          <div key={i} style={{
            borderRadius: 10,
            border: openFaq === i ? '1px solid #f97316' : '1px solid #e2e8f0',
            background: '#fff', marginBottom: 10, overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}>
            <button
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1rem', fontWeight: 600, color: '#0f172a', textAlign: 'left', gap: 12,
              }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <span>{item.q}</span>
              <span style={{ fontSize: '1.2rem', color: '#f97316', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
            </button>
            {openFaq === i && <div style={{ padding: '0 20px 18px', fontSize: '0.93rem', color: '#475569', lineHeight: 1.65 }}>{item.a}</div>}
          </div>
        ))}
      </div>

      {/* Final CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
        borderRadius: 16, padding: '3rem 2rem', textAlign: 'center', border: '1px solid #fed7aa',
      }}>
        <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
          Ready to get started?
        </h2>
        <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: 28 }}>
          Join teachers across the UK transforming early years learning.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/play"
            onClick={(e) => { e.preventDefault(); window.location.pathname = '/play'; }}
            style={{
              display: 'inline-block', background: '#f97316', color: '#fff', padding: '14px 30px',
              borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '1rem',
              transition: 'opacity 0.15s',
            }}
          >
            Play Free Now
          </a>
          <a
            href={`${platformUrl}/auth/login`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', background: '#fff', color: '#0f172a', padding: '14px 30px',
              borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '1rem',
              border: '1px solid #e2e8f0', transition: 'opacity 0.15s',
            }}
          >
            Start Free Trial
          </a>
        </div>
      </div>
    </LegalPageLayout>
  );
};
