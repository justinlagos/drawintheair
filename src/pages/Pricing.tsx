/**
 * /pricing — lp6 redesign, Sept 2026. Audience tabs (Parents / Teachers /
 * Schools), each with its own plan grid.
 *
 * Family plan prices ($4.99/mo, $54.99/yr) are the live Stripe ones. Do NOT
 * change without updating the stripe_price_map. Local-currency figures are
 * indicative only; the real charge currency is set by Adaptive Pricing at
 * checkout.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEOMeta } from '../seo/SEOMeta';
import { buildOrganizationSchema, buildSoftwareAppSchema } from '../seo/seo-config';
import { trackMeta } from '../lib/observability';
import { logEvent } from '../lib/analytics';
import { useLocalCurrency, formatIndicative, SUPPORTED_CURRENCIES } from '../lib/currency';
import {
  Lp6Nav, Lp6Footer, Lp6GestureTrail, Lp6Faq, useLp6Reveal, ArrowIcon,
} from '../components/landing/Lp6Chrome';
import '../pages/landing-redesign.css';

type Audience = 'parents' | 'teachers' | 'schools';

const AUDIENCE_INTRO: Record<Audience, { eyebrow: string; h1: React.ReactNode; lead: string }> = {
  parents: {
    eyebrow: 'For families',
    h1: <>Honest pricing. <span className="mark">Plain language.</span></>,
    lead: 'Pick what suits your family. Either plan includes 7 days free, up to 2 learners, and full access.',
  },
  teachers: {
    eyebrow: 'For teachers',
    h1: <>A free pilot for your <span className="mark aqua">classroom.</span></>,
    lead: 'Run a free classroom pilot with live mode and the activity library. No card, no paid plan to worry about.',
  },
  schools: {
    eyebrow: 'For schools',
    h1: <>One licence for the <span className="mark">whole school.</span></>,
    lead: 'Whole-school access, admin dashboard, bulk class management and onboarding support. Pricing scales with your setting.',
  },
};

const FAMILY_FEATS = [
  '7-day free trial',
  'Up to 2 learners included',
  'Full activity library',
  'Plain-English progress reports',
  'Gentle parental controls',
  'Cancel anytime',
];

const FAMILY_PLANS = [
  { name: 'Monthly', tagline: 'Try it for a month.',      amt: '$4.99',  usd: 4.99,  per: '/month', featured: false, save: undefined as string | undefined },
  { name: 'Yearly',  tagline: 'Best value for the year.', amt: '$54.99', usd: 54.99, per: '/year',  featured: true,  save: 'Save $5' },
];

const TEACHER_PILOT_FEATS = [
  'One classroom, up to 30 learners',
  'Live classroom mode',
  'Core activity library',
  'No card required',
];

const SCHOOL_FEATS = [
  'Every teacher included',
  'Class Mode for every classroom',
  'Onboarding and priority support',
  'Annual or termly billing',
  'EYFS curriculum mapping',
];

const FAQ_BY_AUDIENCE: Record<Audience, { q: string; a: string }[]> = {
  parents: [
    { q: 'What does the Family plan cost?',          a: 'Monthly is $4.99 a month and Yearly is $54.99 a year, which saves you $5. Both include a 7-day free trial, up to 2 learners, the full activity library, and you can cancel anytime.' },
    { q: 'Do I need a card for the free trial?',     a: 'You start the 7-day trial when you create your account. We remind you before it ends, and you can cancel in one tap, no questions asked.' },
    { q: 'How many children can I add?',             a: 'Two are included on the Family plan. You can add more siblings any time for $2 per learner per month.' },
    { q: 'Can my child use it without an account?',  a: 'Yes. Anyone can play the core activities without an account. Saving progress, controls, and reports require a parent account.' },
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
    { q: 'Is there onboarding support?',             a: 'Yes, pilot schools get direct support from us while we set up your classes and gather feedback.' },
    { q: 'Can we pay annually or termly?',           a: 'Billing terms are agreed on the scoping call so they fit your school budget cycle.' },
  ],
};

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useLp6Reveal(rootRef);

  useEffect(() => {
    logEvent('landing_view', { meta: { page: 'pricing' } });
    trackMeta('ViewContent', { content_name: 'pricing' });
  }, []);

  const { currency, rate, isLocal, ready, setCurrency } = useLocalCurrency();

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

  const go = (source: string, dest: string) => () => {
    logEvent('cta_click', { meta: { source, dest } });
    navigate(dest);
  };
  const intro = AUDIENCE_INTRO[audience];

  return (
    <div ref={rootRef} className="lp6">
      <SEOMeta
        title="Pricing | Draw in the Air"
        description="Simple, honest pricing for Draw in the Air. A 7-day free family trial, a free classroom pilot for teachers, and whole-school licences. Core activities are always free."
        keywords={['draw in the air pricing', 'kids learning app price', 'classroom pilot', 'school licence']}
        canonical="/pricing"
        structuredData={[buildOrganizationSchema(), buildSoftwareAppSchema()]}
      />
      <Lp6GestureTrail />
      <Lp6Nav active="pricing" />

      {/* HERO + TABS */}
      <section className="hero sub" data-screen-label="Pricing hero">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center' }}>{intro.eyebrow}</span>
          <h1 className="h1" style={{ marginTop: 16 }}>{intro.h1}</h1>
          <p className="lead" style={{ margin: '18px auto 26px' }}>{intro.lead}</p>
          <div className="ptabs" role="tablist" aria-label="Pricing audience">
            {(['parents', 'teachers', 'schools'] as Audience[]).map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={audience === a}
                className={audience === a ? 'on' : undefined}
                onClick={() => { setAudience(a); logEvent('nav_click', { meta: { label: 'pricing_tab', dest: a } }); }}
              >
                {a === 'parents' ? 'Parents' : a === 'teachers' ? 'Teachers' : 'Schools'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section style={{ paddingTop: 24 }} data-screen-label="Plans">
        <div className="wrap">
          {audience === 'parents' && (
            <>
              <div className="plans">
                {FAMILY_PLANS.map((p) => (
                  <div className={`plan reveal ${p.featured ? 'featured' : ''}`} key={p.name}>
                    <div className="pname">{p.name}{p.save && <span className="save">{p.save}</span>}</div>
                    <div className="ptag">{p.tagline}</div>
                    <div><span className="amt">{p.amt}</span> <span className="per">{p.per}</span></div>
                    {isLocal && ready && <div className="loc">{formatIndicative(p.usd, currency, rate)}{p.per} in your local currency</div>}
                    <ul>{FAMILY_FEATS.map((f) => <li key={f}>{f}</li>)}</ul>
                    <button type="button" className={`btn ${p.featured ? '' : 'ghost'}`} onClick={go(`pricing_family_${p.name.toLowerCase()}`, '/parent/signup')}>Start free trial</button>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--flat)', fontSize: 14 }}>
                <label>Show prices in{' '}
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ fontFamily: 'var(--display)', fontWeight: 700, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--line)' }}>
                    {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <div style={{ marginTop: 10 }}>Already have an account? <Link to="/parent/login" style={{ color: 'var(--plum)', fontWeight: 700 }}>Sign in</Link></div>
              </div>
            </>
          )}

          {audience === 'teachers' && (
            <>
              <div className="plans one">
                <div className="plan featured reveal">
                  <div className="pname">Free Classroom Pilot</div>
                  <div className="ptag">Run it with a class, free.</div>
                  <div><span className="amt">Free</span></div>
                  <ul>{TEACHER_PILOT_FEATS.map((f) => <li key={f}>{f}</li>)}</ul>
                  <button type="button" className="btn" onClick={go('pricing_teacher_pilot', '/teacher/signup')}>Start free pilot</button>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--flat)', fontSize: 14 }}>
                Already teaching with us? <Link to="/teacher/login" style={{ color: 'var(--plum)', fontWeight: 700 }}>Sign in</Link>
              </div>
            </>
          )}

          {audience === 'schools' && (
            <div className="plans one">
              <div className="plan featured reveal">
                <div className="pname">School Licence</div>
                <div className="ptag">One licence, every classroom.</div>
                <div><span className="amt">Custom</span> <span className="per">per school</span></div>
                <div className="loc">Priced by school size. Book a call and we will size it with you.</div>
                <ul>{SCHOOL_FEATS.map((f) => <li key={f}>{f}</li>)}</ul>
                <a className="btn" href="mailto:hello@drawintheair.com?subject=School%20licence%20enquiry" onClick={() => logEvent('cta_click', { meta: { source: 'pricing_school', dest: 'mailto' } })}>Talk to us</a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section data-screen-label="Pricing FAQ">
        <div className="wrap">
          <span className="label">Frequently asked</span>
          <h2 className="h2" style={{ margin: '14px 0 34px' }}>Pricing questions.</h2>
          <Lp6Faq items={FAQ_BY_AUDIENCE[audience]} />
        </div>
      </section>

      {/* CTA */}
      <section data-screen-label="Pricing CTA">
        <div className="wrap">
          <div className="ctaband reveal">
            <h2 className="h2">Try it before you decide anything.</h2>
            <p>Core activities are always free to play, with no sign-up. Everything else starts with a free trial or a free pilot.</p>
            <div className="herocta">
              <button type="button" className="btn" onClick={go('pricing_final_try', '/play')}>Try it free now <ArrowIcon /></button>
              {audience === 'teachers'
                ? <button type="button" className="btn ghost" onClick={go('pricing_final_pilot', '/teacher/signup')}>Start a free pilot</button>
                : <button type="button" className="btn ghost" onClick={go('pricing_final_trial', '/parent/signup')}>Start free trial</button>}
            </div>
          </div>
        </div>
      </section>

      <Lp6Footer />
    </div>
  );
};

export default Pricing;
