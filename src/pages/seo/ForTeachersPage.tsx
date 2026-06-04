/**
 * /for-teachers, teacher value proposition + EYFS curriculum mapping.
 *
 * Rebuilt 2026-06 on the Calm design system (landing-calm.css) to match
 * the redesigned marketing pages. Content (use cases, curriculum
 * alignment, FAQ, resources) is preserved from the previous SEO-theme
 * version; presentation is new. The #eyfs-mapping section is the
 * canonical target for the footer "EYFS mapping" link.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalmFooter, FAQList, GestureTrail, SectionHead } from '../Landing';
import { HeaderNav } from '../../components/landing/HeaderNav';
import { SEOMeta } from '../../seo/SEOMeta';
import { PAGE_META, buildFAQSchema, buildBreadcrumbSchema } from '../../seo/seo-config';
import { logEvent } from '../../lib/analytics';
import '../../components/landing/landing-calm.css';

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const FAQ = [
  { q: 'Does Draw in the Air require student accounts?', a: 'No. Children never need accounts, logins, or registrations. They join with a short class code on screen, making it ideal for any classroom environment.' },
  { q: 'Does it work on school Chromebooks?', a: 'Yes! Draw in the Air is built as a browser-based web app and works on all modern browsers including Chrome on Chromebooks. It requires only camera access, which most school Chromebooks support. No installation or admin approval needed in most school networks.' },
  { q: 'Can I use it on an interactive whiteboard?', a: 'Absolutely. Draw in the Air can be displayed on an interactive whiteboard through any connected laptop. The teacher can demonstrate gestures to the whole class while students follow along on individual devices.' },
  { q: 'Is student data collected?', a: 'No personally-identifying student data is collected, no names, emails, faces, audio, or video. The camera feed never leaves the device. We do collect anonymised, aggregated usage analytics (which game modes are popular, whether hand tracking started successfully, which letters were practised) tied to a randomly-generated browser identifier, never to a real child. Anonymised analytics are auto-deleted after 365 days. See our Privacy Policy for the full detail. The platform is designed to be GDPR and COPPA compliant for children.' },
  { q: 'Which curriculum frameworks does it support?', a: 'Draw in the Air supports Early Years Foundation Stage (EYFS) in the UK, Common Core early learning standards in the US, and general pre-school/kindergarten readiness frameworks globally. Letter and number tracing are aligned with typical curriculum sequences.' },
  { q: 'Can the whole class use it simultaneously?', a: 'Yes! Each student uses Draw in the Air independently on their own device, or the whole class can move together in live classroom mode with one laptop, webcam and projector.' },
  { q: 'Can I embed it on our school website?', a: 'Yes! Visit drawintheair.com/embed to get the free embed code. Paste it into any school website or blog and it runs directly in the page, great for homework pages or classroom portals.' },
];

const USE_CASES = [
  { icon: '📺', title: 'Interactive whiteboard demo', desc: 'Project Draw in the Air on your IWB and demonstrate letter formation to the whole class before individual practice time.' },
  { icon: '💻', title: 'Computer lab activity', desc: 'Set up every computer on the Letter Tracing or Number Tracing page for a structured 10-minute finger gym warm-up.' },
  { icon: '🏃', title: 'Brain break activity', desc: 'Use Bubble Pop for 5-minute movement breaks, children pop bubbles in the air, getting physical activity without leaving their seats.' },
  { icon: '🏠', title: 'Homework extension', desc: 'Share the link with parents for at-home practice. No setup needed, just send the URL and the activity name.' },
  { icon: '📐', title: 'Maths warm-up', desc: 'Use Number Tracing 1–10 and Shape Tracing as a daily maths warm-up to reinforce numeral formation and geometry concepts.' },
  { icon: '🌐', title: 'Remote / hybrid learning', desc: 'Share your screen in Zoom or Meet to demonstrate activities. Students follow along on their own devices from home.' },
];

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
    framework: 'Common Core (US)',
    tone: 'sky',
    areas: [
      'Print Concepts, Letter Recognition',
      'Counting and Cardinality K.CC',
      'Geometry, Shape Identification',
      'Physical Development, Fine Motor',
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

const RESOURCES = [
  { icon: '📥', label: 'Free printable worksheets', path: '/free-resources', desc: 'Letter and number tracing worksheets to complement air drawing practice.' },
  { icon: '🔗', label: 'Embed on your school website', path: '/embed', desc: 'Add a Draw in the Air widget to your classroom blog or school portal.' },
  { icon: '🏠', label: 'Share with parents', path: '/for-parents', desc: 'A parent-friendly guide to setting up Draw in the Air at home.' },
  { icon: '🤖', label: 'AI for kids guide', path: '/learn/ai-for-kids', desc: 'Explain hand tracking technology to students in simple terms.' },
  { icon: '🏃', label: 'Classroom movement activities', path: '/classroom-movement-activities', desc: 'Brain break and movement ideas that pair perfectly with Draw in the Air.' },
  { icon: '💻', label: 'Chromebook learning tools', path: '/chromebook-learning-tools', desc: 'How to use Draw in the Air on school Chromebook carts and labs.' },
];

const STATS: Array<[string, string]> = [
  ['0', 'Accounts needed for children'],
  ['0', 'Downloads required'],
  ['26', 'Letter activities'],
  ['10', 'Number activities'],
  ['8', 'Shape activities'],
  ['4', 'Interactive games'],
];

export default function ForTeachersPage() {
  const structuredData = [
    buildFAQSchema(FAQ),
    buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'For Teachers', path: '/for-teachers' }]),
  ];

  // B2B funnel: page-view event fires once per mount.
  useEffect(() => { logEvent('for_teachers_page_view', { page: '/for-teachers' }); }, []);

  // Honour deep links like /for-teachers#eyfs-mapping (footer link).
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="lp-shell">
      <SEOMeta {...PAGE_META.forTeachers} structuredData={structuredData} />
      <GestureTrail />
      <HeaderNav />
      <div className="page" data-screen-label="For Teachers">

        {/* HERO */}
        <section className="hero" data-screen-label="For Teachers hero" style={{ paddingBottom: 24 }}>
          <div className="hero-orb" />
          <div className="wrap">
            <div className="sec-head" style={{ marginBottom: 0 }}>
              <div className="eyebrow" style={{ justifyContent: 'center' }}>
                <span className="ic-chip" aria-hidden="true">{'\u{1F469}\u{200D}\u{1F3EB}'}</span> For teachers and educators
              </div>
              <h1 className="h1" style={{ marginTop: 18 }}>
                Bring movement learning into <span className="grad">your classroom.</span>
              </h1>
              <p className="lead" style={{ marginTop: 16 }}>
                Draw in the Air works on any device with a webcam, no installation,
                no accounts for children, no IT tickets. Perfect for Chromebooks,
                computer labs, interactive whiteboards, and remote learning.
              </p>
              <div className="cta-actions" style={{ justifyContent: 'center', marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/teacher/signup" className="btn btn-primary lg">Start your free pilot</Link>
                <Link to="/pricing?for=teachers" className="btn btn-ghost lg">
                  See teacher pricing <ArrowIcon size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK STATS */}
        <section className="section" data-screen-label="Stats" style={{ paddingTop: 36 }}>
          <div className="wrap">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
              {STATS.map(([num, label]) => (
                <div key={label} className="card" style={{ textAlign: 'center', padding: '22px 14px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--lavender-600, #7A55E0)' }}>{num}</div>
                  <div style={{ fontSize: '0.82rem', marginTop: 4, opacity: 0.75 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* USE CASES */}
        <section className="section section-tint" data-screen-label="Use cases">
          <div className="wrap">
            <SectionHead
              eyebrow="In the classroom"
              tone="mint"
              title="How teachers already use it."
              lead="Six ways Draw in the Air slots into the school day you already run."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {USE_CASES.map(u => (
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
        <section className="section" id="eyfs-mapping" data-screen-label="EYFS mapping">
          <div className="wrap">
            <SectionHead
              eyebrow="Curriculum alignment"
              tone="sky"
              title="EYFS mapping and curriculum links."
              lead="Every activity is designed to support early childhood curriculum objectives across multiple frameworks."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 36 }}>
              {FRAMEWORKS.map(fw => (
                <div key={fw.framework} className="card" style={{ padding: '24px 22px' }}>
                  <div className={`eyebrow is-${fw.tone}`} style={{ marginBottom: 14 }}>{fw.framework}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {fw.areas.map(a => (
                      <li key={a} style={{ fontSize: '0.88rem', marginBottom: 8, display: 'flex', gap: 8, lineHeight: 1.5 }}>
                        <span aria-hidden="true" style={{ color: 'var(--mint-600, #2E9D68)', fontWeight: 700 }}>{'✓'}</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Activity → EYFS area map */}
            <div className="card" style={{ padding: '26px 24px', overflowX: 'auto' }}>
              <h3 className="h3" style={{ fontSize: '1.1rem', marginBottom: 14 }}>Activity-by-activity EYFS map</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: 560 }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    {['Activity', 'EYFS area', 'Learning goal'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', borderBottom: '2px solid var(--border-2, rgba(31,27,46,0.12))', fontFamily: 'var(--font-display)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EYFS_ACTIVITY_MAP.map(row => (
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

        {/* TRUST / PRIVACY */}
        <section className="section section-tint" data-screen-label="Privacy">
          <div className="wrap">
            <SectionHead
              eyebrow="Safe by design"
              tone="peach"
              title="Privacy your safeguarding lead will sign off."
              lead="Built for classrooms first, which means child safety is not a feature. It is the foundation."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { icon: '🎥', title: 'Camera stays on-device', desc: 'Hand tracking runs in the browser. No video is ever recorded, transmitted, or stored.' },
                { icon: '🪪', title: 'No child accounts', desc: 'Children never log in and never have a profile. They join with a short class code.' },
                { icon: '🛡️', title: 'GDPR & COPPA aligned', desc: 'Anonymised, aggregated analytics only, auto-deleted after 365 days.' },
                { icon: '🔍', title: 'Publicly auditable', desc: 'Our live transparency page shows exactly what we measure and what we don’t claim.' },
              ].map(p => (
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

        {/* FREE RESOURCES */}
        <section className="section" data-screen-label="Teacher resources">
          <div className="wrap">
            <SectionHead
              eyebrow="Free for your classroom"
              tone="sun"
              title="Resources to take with you."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
              {RESOURCES.map(r => (
                <Link key={r.path} to={r.path} className="card hoverable" style={{ padding: '20px 18px', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }} aria-hidden="true">{r.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 4, fontFamily: 'var(--font-display)' }}>{r.label}</div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.55, opacity: 0.75 }}>{r.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section section-tint" data-screen-label="Teacher FAQ">
          <div className="wrap">
            <SectionHead eyebrow="Frequently asked" title="The questions teachers ask first." />
            <FAQList items={FAQ} />
          </div>
        </section>

        {/* CTA */}
        <section className="section section-stage" data-screen-label="Teacher CTA">
          <div className="wrap">
            <div className="cta-banner">
              <h2 className="h2">Set up your classroom in under five minutes.</h2>
              <p className="lead">Free pilot, one class, up to 30 learners. No card required.</p>
              <div className="cta-actions">
                <Link to="/teacher/signup" className="btn btn-secondary lg">Start your free pilot</Link>
                <Link to="/teachers" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                  See classroom mode <ArrowIcon size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
      <CalmFooter />
    </div>
  );
}
