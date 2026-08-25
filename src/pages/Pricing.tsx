/**
 * /pricing. Calm-direction pricing page with audience toggle.
 *
 * Tabs: Parents / Teachers / Schools. Each shows its own plan grid.
 * Family plan prices ($4.99/mo, $54.99/yr) are the live Stripe ones.
 * Do not change without updating stripe_price_map.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalmFooter, FAQList, GestureTrail, SectionHead,
} from './Landing';
import { HeaderNav } from '../components/landing/HeaderNav';
import { trackMeta } from '../lib/observability';
import { useLocalCurrency, formatIndicative, SUPPORTED_CURRENCIES } from '../lib/currency';
import '../components/landing/landing-calm.css';

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function useReveal(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current; if (!root) return;
    let raf = 0, ticking = false;
    const pass = () => {
      ticking = false;
      const h = window.innerHeight;
      root.querySelectorAll('.reveal:not(.in)').forEach((el) => {
        if (el.getBoundingClientRect().top < h - 40) el.classList.add('in');
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; raf = requestAnimationFrame(pass); } };
    pass();
    const r1 = requestAnimationFrame(() => { root.classList.add('anim'); });
    const t1 = window.setTimeout(pass, 140);
    const t2 = window.setTimeout(pass, 450);
    window.addEventListener('scroll', onScroll, { passive: true });
    // Reveal content that mounts AFTER initial load (e.g. switching the
    // Parents/Teachers/Schools tabs). Without this, freshly-mounted
    // .reveal elements stayed invisible until the user scrolled.
    const mo = new MutationObserver(onScroll);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(r1);
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('scroll', onScroll);
      mo.disconnect();
    };
  }, [rootRef]);
}

// ── Tab data ────────────────────────────────────────────────────────────

type Audience = 'parents' | 'teachers' | 'schools';

const AUDIENCE_INTRO: Record<Audience, { eyebrow: string; h1: React.ReactNode; lead: string }> = {
  parents: {
    eyebrow: 'For families',
    h1: <>Honest pricing. <span className="grad">Plain language.</span></>,
    lead: 'Pick what suits your family. Either plan includes 7 days free, up to 2 learners, and full access.',
  },
  teachers: {
    eyebrow: 'For teachers',
    h1: <>A free pilot for your <span className="grad">classroom.</span></>,
    lead: 'Run a free classroom pilot with live mode and the activity library. No card, no paid plan to worry about.',
  },
  schools: {
    eyebrow: 'For schools',
    h1: <>One licence for the <span className="grad">whole school.</span></>,
    lead: 'Whole-school access, admin dashboard, bulk class management, and onboarding support. Pricing scales with your setting.',
  },
};

// Parents (Family monthly + yearly)
const FAMILY_FEATS = [
  '7-day free trial',
  'Up to 2 learners included',
  'Full activity library',
  'Plain-English progress reports',
  'Gentle parental controls',
  'Cancel anytime',
];

const FAMILY_PLANS = [
  { name: 'Monthly', tagline: 'Try it for a month.',     amt: '$4.99',  usd: 4.99,  per: '/month', cta: 'Start free trial', variant: 'secondary' as const, featured: false, save: undefined as string | undefined },
  { name: 'Yearly',  tagline: 'Best value for the year.', amt: '$54.99', usd: 54.99, per: '/year',  cta: 'Start free trial', variant: 'primary'   as const, featured: true,  save: 'Save $5' },
];

// Teachers — the free classroom pilot is the only teacher offer in this
// release. There is no paid Teacher plan yet (see src/main.tsx), so we do not
// advertise one. When teacher billing, entitlements and the advertised
// features actually exist, a paid tier can return here.
const TEACHER_PILOT_FEATS = [
  'One classroom, up to 30 learners',
  'Live classroom mode',
  'Core activity library',
  'No card required',
];

const TEACHER_PLANS = [
  { name: 'Free Classroom Pilot', tagline: 'Run it with a class, free.', amt: 'Free', per: '', desc: '', feats: TEACHER_PILOT_FEATS, cta: 'Start free pilot', variant: 'primary' as const, featured: true, to: '/teacher/signup', save: undefined as string | undefined },
];

// Schools (Whole school)
const SCHOOL_FEATS = [
  'Every teacher included',
  'Whole-school analytics',
  'Admin dashboard and reporting',
  'Bulk class management',
  'Single sign-on (SSO) options',
  'Onboarding and priority support',
  'Annual or termly billing',
  'EYFS curriculum mapping',
];

const SCHOOL_PLANS = [
  { name: 'School Licence', tagline: 'One licence, every classroom.', amt: 'Custom', per: 'per school', desc: 'Priced by school size. Book a call and we will size it with you.', feats: SCHOOL_FEATS, cta: 'Talk to us',           variant: 'primary'   as const, featured: true,  to: 'mailto:hello@drawintheair.com?subject=School%20licence%20enquiry', save: undefined as string | undefined },
];

// FAQ (audience-aware)
const FAQ_BY_AUDIENCE: Record<Audience, { q: string; a: string }[]> = {
  parents: [
    { q: 'What does the Family plan cost?',          a: 'Monthly is $4.99 a month and Yearly is $54.99 a year, which saves you $5. Both include a 7-day free trial, up to 2 learners, the full activity library, and you can cancel anytime.' },
    { q: 'Do I need a card for the free trial?',     a: 'You start the 7-day trial when you create your account. We remind you before it ends, and you can cancel in one tap, no questions asked.' },
    { q: 'How many children can I add?',             a: 'Two are included on the Family plan. You can add more siblings any time for $2 per learner per month.' },
    { q: 'Can my child use it without an account?',  a: 'Yes. Anyone can play Free Paint without an account. Saving progress, controls, and reports require a parent account.' },
  ],
  teachers: [
    { q: 'How do I start a free pilot?',             a: 'Create a teacher account and you are in. One class, up to 30 learners, no card required.' },
    { q: 'Is there a paid teacher plan?',            a: 'Not yet. The classroom pilot is free while we build out school features with our pilot teachers. We will only add a paid plan once those features actually exist.' },
    { q: 'Do children need accounts?',               a: 'No. Children join a class with a short code on the screen. They never log in, never have a profile.' },
    { q: 'Can I cancel anytime?',                    a: 'Yes. Cancel from your account page. We never auto-renew without a clear notice.' },
  ],
  schools: [
    { q: 'How is school pricing decided?',           a: 'We are onboarding schools one at a time and sizing each setup on a call. Tell us your number of classes and we will scope it with you.' },
    { q: 'Do you offer SSO?',                        a: 'SSO is on our schools roadmap rather than shipped today. Tell us your provider (Google, Microsoft, SAML) and we will confirm what is possible for your rollout.' },
    { q: 'Is there onboarding support?',             a: 'Yes — pilot schools get direct support from us while we set up your classes and gather feedback.' },
    { q: 'Can we pay annually or termly?',           a: 'Billing terms are agreed on the scoping call so they fit your school budget cycle.' },
  ],
};

// ── Page ────────────────────────────────────────────────────────────────

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useReveal(rootRef);

  // Meta ViewContent on the pricing page (spec §1a). No-op unless configured.
  useEffect(() => { trackMeta('ViewContent', { content_name: 'pricing' }); }, []);

  // Indicative local-currency display (spec §3b). USD figures are the real
  // Stripe prices; the local figure is shown for reassurance and the actual
  // charge currency is set by Adaptive Pricing at checkout.
  const { currency, rate, isLocal, ready, setCurrency } = useLocalCurrency();

  // Default tab can be deep-linked via ?for=teachers / ?for=schools.
  const [audience, setAudience] = useState<Audience>(() => {
    if (typeof window === 'undefined') return 'parents';
    const q = new URLSearchParams(window.location.search).get('for');
    return q === 'teachers' || q === 'schools' ? q : 'parents';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (audience === 'parents') url.searchParams.delete('for');
    else url.searchParams.set('for', audience);
    window.history.replaceState(null, '', url.toString());
  }, [audience]);

  const intro = AUDIENCE_INTRO[audience];

  return (
    <div ref={rootRef} className="lp-shell">
      <GestureTrail />
      <HeaderNav />
      <div className="page" data-screen-label="Pricing">

        {/* HERO */}
        <section className="hero" data-screen-label="Pricing hero" style={{ paddingBottom: 0 }}>
          <div className="hero-orb" />
          <div className="wrap">
            <div className="sec-head reveal" style={{ marginBottom: 0 }}>
              <div className="eyebrow" style={{ justifyContent: 'center' }}>
                <span className="ic-chip" aria-hidden="true">{'\u{1F4B3}'}</span> {intro.eyebrow}
              </div>
              <h1 className="h1" style={{ marginTop: 18 }}>
                {intro.h1}
              </h1>
              <p className="lead" style={{ marginTop: 16 }}>
                {intro.lead}
              </p>
              <div className="pricing-tabs reveal" role="tablist" aria-label="Pricing audience" style={{ marginTop: 28 }}>
                {(['parents', 'teachers', 'schools'] as Audience[]).map((a) => (
                  <button
                    key={a}
                    role="tab"
                    aria-selected={audience === a}
                    type="button"
                    className={`pricing-tab ${audience === a ? 'on' : ''}`}
                    onClick={() => setAudience(a)}
                  >
                    {a === 'parents' ? 'Parents' : a === 'teachers' ? 'Teachers' : 'Schools'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PARENTS PANEL */}
        {audience === 'parents' && (
          <section className="section" data-screen-label="Family plans" style={{ paddingTop: 48 }}>
            <div className="wrap" style={{ maxWidth: 920 }}>
              <div className="price-grid two">
                {FAMILY_PLANS.map((p, i) => (
                  <div key={p.name} className={`price-card reveal d${i + 1} ${p.featured ? 'featured' : ''}`}>
                    {p.save && <span className="save-badge">{'★'} {p.save}</span>}
                    <div className="price-name">{p.name}</div>
                    <div className="price-tagline">{p.tagline}</div>
                    <div className="price-tag">
                      <span className="price-amt">{p.amt}</span>
                      <span className="price-per">{p.per}</span>
                    </div>
                    {isLocal && ready && (
                      <div className="price-indicative" style={{ marginTop: 2, fontSize: 13, color: 'var(--fg-3)', fontWeight: 600 }}>
                        {formatIndicative(p.usd, currency, rate)}{p.per} in your local currency
                      </div>
                    )}
                    <ul className="price-list">
                      {FAMILY_FEATS.map((f) => (
                        <li key={f}><span className="check">{'✓'}</span>{f}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className={`btn btn-${p.variant} md`}
                      style={{ width: '100%' }}
                      onClick={() => navigate('/parent/signup')}
                    >
                      {p.cta} <ArrowIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="auth-alt" style={{ marginTop: 18, fontSize: 13, color: 'var(--fg-3)' }}>
                Prices in{' '}
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  aria-label="Display currency"
                  style={{ font: 'inherit', padding: '2px 6px', borderRadius: 8, border: '1px solid var(--line, #ddd)', background: 'transparent', color: 'inherit' }}
                >
                  {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                . Shown in your local currency for reference — you'll be billed securely in your local currency at checkout.
              </p>
              <p className="auth-alt" style={{ marginTop: 14 }}>
                Already have an account? <Link to="/parent/login">Sign in</Link>
              </p>
            </div>
          </section>
        )}

        {/* TEACHERS PANEL */}
        {audience === 'teachers' && (
          <section className="section" data-screen-label="Teacher plans" style={{ paddingTop: 48 }}>
            <div className="wrap" style={{ maxWidth: 920 }}>
              <div className="price-grid two">
                {TEACHER_PLANS.map((p, i) => (
                  <div key={p.name} className={`price-card reveal d${i + 1} ${p.featured ? 'featured' : ''}`}>
                    {p.save && <span className="save-badge">{'★'} {p.save}</span>}
                    <div className="price-name">{p.name}</div>
                    <div className="price-tagline">{p.tagline}</div>
                    <div className="price-tag">
                      <span className="price-amt">{p.amt}</span>
                      {p.per && <span className="price-per">{p.per}</span>}
                    </div>
                    <ul className="price-list">
                      {p.feats.map((f) => (
                        <li key={f}><span className="check">{'✓'}</span>{f}</li>
                      ))}
                    </ul>
                    <Link to={p.to} className={`btn btn-${p.variant} md`} style={{ width: '100%' }}>
                      {p.cta} <ArrowIcon size={16} />
                    </Link>
                  </div>
                ))}
              </div>
              <p className="auth-alt" style={{ marginTop: 28 }}>
                Already teaching with us? <Link to="/teacher/login">Sign in</Link>
              </p>
            </div>
          </section>
        )}

        {/* SCHOOLS PANEL */}
        {audience === 'schools' && (
          <section className="section" data-screen-label="School plans" style={{ paddingTop: 48 }}>
            <div className="wrap" style={{ maxWidth: 720 }}>
              {SCHOOL_PLANS.map((p, i) => (
                <div key={p.name} className={`price-card reveal d${i + 1} ${p.featured ? 'featured' : ''}`} style={{ maxWidth: 640, margin: '0 auto' }}>
                  {p.featured && <span className="price-badge">Most popular</span>}
                  <div className="price-name">{p.name}</div>
                  <div className="price-tagline">{p.tagline}</div>
                  <div className="price-tag">
                    <span className="price-amt">{p.amt}</span>
                    {p.per && <span className="price-per">{p.per}</span>}
                  </div>
                  <p className="price-desc">{p.desc}</p>
                  <ul className="price-list">
                    {p.feats.map((f) => (
                      <li key={f}><span className="check">{'✓'}</span>{f}</li>
                    ))}
                  </ul>
                  {p.to.startsWith('mailto:') ? (
                    <a href={p.to} className={`btn btn-${p.variant} md`} style={{ width: '100%' }}>
                      {p.cta} <ArrowIcon size={16} />
                    </a>
                  ) : (
                    <Link to={p.to} className={`btn btn-${p.variant} md`} style={{ width: '100%' }}>
                      {p.cta} <ArrowIcon size={16} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AUDIENCE-AWARE FAQ */}
        <section className="section section-tint" data-screen-label="Pricing FAQ">
          <div className="wrap">
            <SectionHead eyebrow="Frequently asked" title="Pricing questions." />
            <FAQList items={FAQ_BY_AUDIENCE[audience]} />
          </div>
        </section>

        {/* CTA */}
        <section className="section section-stage" data-screen-label="Pricing CTA">
          <div className="wrap">
            <div className="cta-banner reveal">
              <h2 className="h2">
                {audience === 'schools' ? 'Bring active learning to every classroom.' :
                 audience === 'teachers' ? 'Set up your classroom in under five minutes.' :
                 'Start your 7-day free trial.'}
              </h2>
              <p className="lead">
                {audience === 'schools' ? 'Whole-school access, admin reporting, and onboarding support.' :
                 audience === 'teachers' ? 'Free pilot, no card required. No paid plan to set up.' :
                 'Up to 2 learners, the full activity library, and cancel anytime.'}
              </p>
              <div className="cta-actions">
                {audience === 'parents' && (
                  <>
                    <Link to="/parent/signup" className="btn btn-secondary lg">Start free trial</Link>
                    <Link to="/teachers" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                      For teachers and schools <ArrowIcon size={17} />
                    </Link>
                  </>
                )}
                {audience === 'teachers' && (
                  <>
                    <Link to="/teacher/signup" className="btn btn-secondary lg">Start free pilot</Link>
                    <Link to="/teachers" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                      Learn how it works <ArrowIcon size={17} />
                    </Link>
                  </>
                )}
                {audience === 'schools' && (
                  <>
                    <a href="mailto:hello@drawintheair.com?subject=School%20demo%20request" className="btn btn-secondary lg">Book a school demo</a>
                    <Link to="/teachers" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                      See classroom mode <ArrowIcon size={17} />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
      <CalmFooter />
    </div>
  );
};

export default Pricing;
