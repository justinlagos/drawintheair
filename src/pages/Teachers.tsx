/**
 * /teachers. Calm-direction public marketing page for schools and teachers.
 *
 * Sections:
 *   1. Hero ("Whole-class movement, zero setup.") + classroom photo +
 *      live leaderboard floating card
 *   2. Teacher value cards (3 + 1 ready guides card)
 *   3. Classroom mode section-ink (split with live leaderboard preview)
 *   4. Pilot programme steps (3 + ready-to-start CTA card)
 *   5. Teacher FAQ
 *   6. Teacher CTA banner
 */

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CalmFooter, FAQList, GestureTrail, SectionHead,
} from './Landing';
import { HeaderNav } from '../components/landing/HeaderNav';
import { SEOMeta } from '../seo/SEOMeta';
import {
  PAGE_META,
  buildOrganizationSchema, buildSoftwareAppSchema, buildFAQSchema, buildBreadcrumbSchema,
} from '../seo/seo-config';
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
    // Reveal content that mounts after initial load, never gate
    // visibility of new DOM on a scroll event.
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

const LEADERBOARD = [
  { m: '\u{1F947}', name: 'Amara', s: 980 },
  { m: '\u{1F948}', name: 'Jacob', s: 940 },
  { m: '\u{1F949}', name: 'Priya', s: 870 },
  { m: '4',          name: 'Leah',  s: 820 },
];

const TEACHER_VALUE = [
  { icon: '\u{1F5C2}\u{FE0F}', title: 'EYFS-mapped',           text: 'Activities tagged across communication, language, mathematics, and expressive arts.' },
  { icon: '\u{1F5A5}\u{FE0F}', title: 'One device, whole class', text: 'A single laptop, webcam and projector. The class moves together, no logins for children.' },
  { icon: '\u{1F4CA}',          title: 'Quiet analytics',        text: 'Usage by week, sessions per child, average engagement. Plain English, no dashboards to babysit.' },
];

const PILOT_STEPS = [
  { num: '01', title: 'Book a 20-minute call', text: 'We learn your setup and year group, and answer your safeguarding questions.' },
  { num: '02', title: 'We set up session one', text: 'We join your first classroom session live and calibrate the room with you.' },
  { num: '03', title: 'You run it solo',        text: 'Most teachers are independent by week two. We stay one message away.' },
];

const TEACHER_FAQ = [
  { q: 'Do children need accounts?',         a: 'No. Children never log in. You open the activity on the class device, pupils join the movement, not a system. Teacher accounts exist only for analytics and classroom mode.' },
  { q: 'Does it work on school Chromebooks?', a: 'Yes. Draw in the Air is a browser-based web app and runs on Chrome on Chromebooks. It needs only camera access, which most school Chromebooks support. No installation or admin approval is needed on most school networks.' },
  { q: 'Can I use it on an interactive whiteboard?', a: 'Absolutely. Display it on your IWB through any connected laptop. The teacher can demonstrate a gesture to the whole class while pupils follow along, or the class can play together in classroom mode.' },
  { q: 'Is any student data collected?',     a: 'No faces, audio or video are ever collected, and the camera feed never leaves the device. A child joining a class session types a first name or nickname the teacher can see and delete. No child emails or contact details are collected. Usage analytics are pseudonymous, tied to a random browser id and never to a real child, aggregated for reporting, and auto-deleted after 365 days. The platform is designed around UK GDPR.' },
  { q: 'Which curriculum frameworks does it support?', a: 'Activities are mapped to the Early Years Foundation Stage (EYFS) in the UK and fit general pre-school and kindergarten readiness goals elsewhere. See the EYFS mapping section above for the activity-by-activity breakdown.' },
  { q: 'What about our IT restrictions?',    a: 'It runs in the browser with no install. We provide a Chromebook setup guide and the exact domains to allow-list for your network team.' },
  { q: 'Can I embed it on our school website?', a: 'Yes. Visit drawintheair.com/embed for the free embed code and paste it into any school website or blog, great for homework pages or classroom portals.' },
  { q: 'Is there a cost to pilot?',          a: 'The pilot is free, and every activity is available in Class Mode sessions during the pilot. School licences are agreed with the school after the pilot.' },
];

// Curriculum alignment, migrated from the former /for-teachers page so the
// canonical /teachers page carries the EYFS content and the #eyfs-mapping
// anchor that the footer links to.
const FRAMEWORKS = [
  {
    framework: 'EYFS (UK)',
    tone: 'mint',
    areas: [
      'Communication, Language and Literacy',
      'Physical Development, Fine Motor Skills',
      'Mathematics, Numbers and Shape',
      'Understanding the World, Technology',
    ],
  },
  {
    framework: 'General Pre-K',
    tone: 'peach',
    areas: [
      'Alphabet knowledge A–Z',
      'Numeral formation 1–10',
      'Basic shape recognition',
      'Hand-eye coordination development',
    ],
  },
] as const;

const EYFS_ACTIVITY_MAP = [
  { activity: 'Letter Tracing (A–Z)', area: 'Literacy · Physical Development', goal: 'Letter formation and pre-writing movement patterns' },
  { activity: 'Number Tracing (1–10)', area: 'Mathematics', goal: 'Numeral formation and number recognition' },
  { activity: 'Shape Tracing', area: 'Mathematics, Shape, Space and Measure', goal: 'Shape recognition and controlled mark-making' },
  { activity: 'Bubble Pop', area: 'Physical Development, Gross Motor', goal: 'Hand-eye coordination, crossing the midline' },
  { activity: 'Sort and Place', area: 'Understanding the World · Mathematics', goal: 'Categorising, matching and early reasoning' },
  { activity: 'Free Paint', area: 'Expressive Arts and Design', goal: 'Creative expression through movement' },
];

const USE_CASES = [
  { icon: '📺', title: 'Interactive whiteboard demo', desc: 'Project Draw in the Air on your IWB and demonstrate letter formation to the whole class before individual practice time.' },
  { icon: '💻', title: 'Computer lab activity', desc: 'Set every computer to the Letter Tracing or Number Tracing page for a structured 10-minute finger-gym warm-up.' },
  { icon: '🏃', title: 'Brain break activity', desc: 'Use Bubble Pop for 5-minute movement breaks, pupils get physical activity without leaving their seats.' },
  { icon: '🏠', title: 'Homework extension', desc: 'Share the link with parents for at-home practice. No setup, just send the URL and the activity name.' },
  { icon: '📐', title: 'Maths warm-up', desc: 'Use Number Tracing 1–10 and Shape Tracing as a daily maths warm-up to reinforce numeral formation and geometry.' },
  { icon: '🌐', title: 'Remote / hybrid learning', desc: 'Share your screen in Zoom or Meet to demonstrate activities. Pupils follow along on their own devices from home.' },
];

const TEACHERS_STRUCTURED_DATA = [
  buildOrganizationSchema(),
  buildSoftwareAppSchema(),
  buildFAQSchema(TEACHER_FAQ),
  buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'For Teachers', path: '/teachers' }]),
];

export const Teachers: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useReveal(rootRef);

  // Honour deep links like /teachers#eyfs-mapping (footer link).
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div ref={rootRef} className="lp-shell">
      <SEOMeta
        title={PAGE_META.teachers.title}
        description={PAGE_META.teachers.description}
        keywords={PAGE_META.teachers.keywords}
        canonical="/teachers"
        structuredData={TEACHERS_STRUCTURED_DATA}
      />
      <GestureTrail />
      <HeaderNav />
      <div className="page" data-screen-label="For Teachers">

        {/* HERO */}
        <section className="hero" data-screen-label="Teachers hero">
          <div className="hero-orb" />
          <div className="wrap">
            <div className="hero-grid">
              <div>
                <div className="eyebrow is-sky reveal">
                  <span className="dot" />For teachers and schools
                </div>
                <h1 className="h1 reveal d1">
                  Whole-class movement, <span className="grad">zero setup.</span>
                </h1>
                <p className="lead reveal d2">
                  Run an EYFS-aligned movement break or literacy starter from one laptop and a webcam. No installs, no child accounts, no IT ticket. Open the URL, the class plays.
                </p>
                <div className="hero-actions reveal d3">
                  <Link to="/teacher/signup" className="btn btn-primary hero-cta lg">Start a pilot</Link>
                  <Link to="/pricing" className="btn btn-secondary lg">View school plans</Link>
                </div>
                <div className="hero-trust reveal d4">
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{1F3EB}'}</span> EYFS aligned</span>
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{1F512}'}</span> GDPR compliant</span>
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{26A1}'}</span> No installs</span>
                </div>
              </div>
              <div className="hero-visual reveal d2">
                <div className="photo hero-photo float">
                  <img src="/landing-assets/classroom.jpg" alt="A teacher running Draw in the Air with a class" />
                </div>
                <div className="hero-floater fl-1 float s2" style={{ minWidth: 190 }}>
                  <div style={{ width: '100%' }}>
                    <div className="meta" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Live, 28 active
                    </div>
                    {LEADERBOARD.slice(0, 3).map((r) => (
                      <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{r.m} {r.name}</span>
                        <span style={{ fontWeight: 700, color: 'var(--lavender-600)', fontFamily: 'var(--font-mono)' }}>{r.s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VALUE */}
        <section className="section" data-screen-label="Teacher value">
          <div className="wrap">
            <SectionHead eyebrow="Built for the classroom" tone="sky" title="Less admin. More movement." />
            <div className="steps">
              {TEACHER_VALUE.map((v, i) => (
                <div key={v.title} className={`step reveal d${i + 1}`}>
                  <div className="step-icon">{v.icon}</div>
                  <div className="step-title">{v.title}</div>
                  <p className="step-text">{v.text}</p>
                </div>
              ))}
              <div
                className="step reveal d4"
                style={{ background: 'var(--sky-50)', borderColor: 'var(--sky-200)' }}
              >
                <div className="step-icon">{'\u{1F4DA}'}</div>
                <div className="step-title">Ten ready guides</div>
                <p className="step-text">Quick-start, five-day movement plan, SEND inclusion, Chromebook setup. All printable.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CLASSROOM MODE */}
        <section className="section section-ink" data-screen-label="Classroom mode">
          <div className="wrap">
            <div className="split">
              <div className="reveal">
                <div className="eyebrow is-sky" style={{ color: 'var(--sky-300)' }}>
                  <span className="dot" style={{ background: 'var(--sky-400)' }} />Classroom mode
                </div>
                <h2 className="h2" style={{ color: '#fff', marginTop: 16 }}>Run your whole class at once.</h2>
                <p className="lead" style={{ color: 'rgba(255,255,255,0.74)', marginTop: 16 }}>
                  A live class view shows energy in the room in real time. Start an activity, watch engagement, and print a session summary when you are done.
                </p>
                <div className="bullets">
                  {[
                    'Live class energy view',
                    'A single shared device, no child logins',
                    'Session analytics after every class',
                    'Plain-English insights and suggestions',
                  ].map((b) => (
                    <div className="bullet" key={b}>
                      <span className="check" style={{ background: 'rgba(91,206,154,0.2)' }}>{'✓'}</span>
                      <span className="txt" style={{ color: 'rgba(255,255,255,0.8)' }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="reveal d2">
                <div
                  className="card"
                  style={{ padding: 24, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff' }}>Reception, Letter A</span>
                    <span className="pill-note" style={{ color: 'var(--mint-300)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--mint-400)', display: 'inline-block' }} />
                      28 active
                    </span>
                  </div>
                  {LEADERBOARD.map((r) => (
                    <div
                      key={r.name}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{r.m} {r.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--sky-300)' }}>{r.s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 56 }} className="reveal">
              <div className="demo-frame">
                <video
                  poster="/landing-videos/tracing.jpg"
                  autoPlay muted loop playsInline preload="metadata"
                >
                  <source src="/landing-videos/tracing.webm" type="video/webm" />
                  <source src="/landing-videos/tracing.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section className="section" data-screen-label="Use cases">
          <div className="wrap">
            <SectionHead
              eyebrow="In the classroom"
              tone="mint"
              title="How teachers already use it."
              lead="Six ways Draw in the Air slots into the school day you already run."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {USE_CASES.map((u) => (
                <div key={u.title} className="card hoverable" style={{ padding: '22px 20px' }}>
                  <div style={{ fontSize: '1.7rem', marginBottom: 10 }} aria-hidden="true">{u.icon}</div>
                  <h3 className="h3" style={{ fontSize: '1.05rem', marginBottom: 6 }}>{u.title}</h3>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6, margin: 0, opacity: 0.8 }}>{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EYFS / CURRICULUM MAPPING, canonical target of the footer link */}
        <section className="section section-tint" id="eyfs-mapping" data-screen-label="EYFS mapping">
          <div className="wrap">
            <SectionHead
              eyebrow="Curriculum alignment"
              tone="sky"
              title="EYFS mapping and curriculum links."
              lead="Every activity is designed to support early childhood curriculum objectives across multiple frameworks."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 36 }}>
              {FRAMEWORKS.map((fw) => (
                <div key={fw.framework} className="card" style={{ padding: '24px 22px' }}>
                  <div className={`eyebrow is-${fw.tone}`} style={{ marginBottom: 14 }}>{fw.framework}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {fw.areas.map((a) => (
                      <li key={a} style={{ fontSize: '0.88rem', marginBottom: 8, display: 'flex', gap: 8, lineHeight: 1.5 }}>
                        <span aria-hidden="true" style={{ color: 'var(--mint-600, #2E9D68)', fontWeight: 700 }}>{'✓'}</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: '26px 24px', overflowX: 'auto' }}>
              <h3 className="h3" style={{ fontSize: '1.1rem', marginBottom: 14 }}>Activity-by-activity EYFS map</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 560 }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    {['Activity', 'EYFS area', 'Learning goal'].map((h) => (
                      <th key={h} style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-2, rgba(31,27,46,0.12))', fontFamily: 'var(--font-display)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EYFS_ACTIVITY_MAP.map((row) => (
                    <tr key={row.activity}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-1, rgba(31,27,46,0.08))', fontWeight: 700 }}>{row.activity}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-1, rgba(31,27,46,0.08))' }}>{row.area}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-1, rgba(31,27,46,0.08))', opacity: 0.8 }}>{row.goal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '0.85rem', marginTop: 16, marginBottom: 0, opacity: 0.75 }}>
                Want the full Development Matters mapping with a ready-to-run session plan?{' '}
                <a href="/classroom-guides/08-eyfs-reception-activity-guide.pdf" download style={{ fontWeight: 700 }}>
                  Download the EYFS &amp; Reception Activity Guide (PDF)
                </a>{' '}
                , free, print-ready, no email required.
              </p>
            </div>
          </div>
        </section>

        {/* PRIVACY / SAFEGUARDING */}
        <section className="section" data-screen-label="Privacy">
          <div className="wrap">
            <SectionHead
              eyebrow="Safe by design"
              tone="peach"
              title="Privacy your safeguarding lead will sign off."
              lead="Built for classrooms first, which means child safety is the foundation, not a feature."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { icon: '🎥', title: 'Camera stays on-device', desc: 'Hand tracking runs in the browser. No video is ever recorded, transmitted, or stored.' },
                { icon: '🪪', title: 'No child accounts', desc: 'Children never log in. They join with a short class code and a first name or nickname, which the teacher controls and can delete.' },
                { icon: '🛡️', title: 'UK GDPR by design', desc: 'Event analytics are pseudonymous, aggregated for reporting, and auto-deleted after 365 days.' },
                { icon: '🔍', title: 'Publicly auditable', desc: 'Our live transparency page shows exactly what we measure and what we do not claim.' },
              ].map((p) => (
                <div key={p.title} className="card" style={{ padding: '22px 20px' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: 10 }} aria-hidden="true">{p.icon}</div>
                  <h3 className="h3" style={{ fontSize: '1rem', marginBottom: 6 }}>{p.title}</h3>
                  <p style={{ fontSize: '0.86rem', lineHeight: 1.6, margin: 0, opacity: 0.8 }}>{p.desc}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: 22 }}>
              <Link to="/transparency" className="btn btn-ghost md">Read our transparency report <ArrowIcon size={15} /></Link>
            </p>
          </div>
        </section>

        {/* PILOT */}
        <section className="section section-tint" data-screen-label="Pilot programme">
          <div className="wrap">
            <SectionHead
              eyebrow="Pilot programme"
              tone="mint"
              title="We set up session one with you."
              lead="No procurement maze. Three light steps from first call to a class that runs it themselves."
            />
            <div className="steps">
              {PILOT_STEPS.map((s, i) => (
                <div key={s.num} className={`step reveal d${i + 1}`} style={{ gridColumn: 'span 1' }}>
                  <div className="step-num">{s.num}</div>
                  <div className="step-title" style={{ marginTop: 14 }}>{s.title}</div>
                  <p className="step-text">{s.text}</p>
                </div>
              ))}
              <div
                className="step reveal d4"
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  background: 'var(--lavender-500)', borderColor: 'var(--lavender-500)',
                }}
              >
                <div className="step-title" style={{ color: '#fff' }}>Ready to start?</div>
                <p className="step-text" style={{ color: 'rgba(255,255,255,0.85)' }}>Book your pilot call this week.</p>
                <Link
                  to="/teacher/signup"
                  className="btn btn-reward sm"
                  style={{ marginTop: 12, alignSelf: 'flex-start' }}
                >
                  Start a pilot
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* TEACHER FAQ */}
        <section className="section" data-screen-label="Teacher FAQ">
          <div className="wrap">
            <SectionHead eyebrow="Frequently asked" title="What schools ask first." />
            <FAQList items={TEACHER_FAQ} />
          </div>
        </section>

        {/* CTA */}
        <section className="section" data-screen-label="Teacher CTA">
          <div className="wrap">
            <div className="cta-banner reveal">
              <h2 className="h2">Bring movement into your classroom.</h2>
              <p className="lead">
                Start a free pilot. We will run your first session with you and leave you a printable activity pack.
              </p>
              <div className="cta-actions">
                <Link to="/teacher/signup" className="btn btn-secondary lg">Start a pilot</Link>
                <Link to="/pricing" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                  View school plans <ArrowIcon size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
      <CalmFooter />
    </div>
  );
};

export default Teachers;
