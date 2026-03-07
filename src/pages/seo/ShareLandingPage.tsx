// src/pages/seo/ShareLandingPage.tsx
// Handles /share/:activitySlug — a teacher-friendly share landing page.
// When a teacher shares an activity link, this page explains the activity,
// provides a "Try It" CTA, and tracks the share funnel.

import { useEffect } from 'react';
import { SeoLayout, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { SITE } from '../../seo/seo-config';

// ── Activity metadata for each shareable route ────────────────────────────────
interface ActivityMeta {
  title: string;
  description: string;
  emoji: string;
  badge: string;
  playPath: string;
  heroTitle: string;
  heroSub: string;
  whatItIs: string;
  howToPlay: string[];
  skills: string[];
}

const ACTIVITY_MAP: Record<string, ActivityMeta> = {
  'bubble-pop': {
    title: 'Bubble Pop — Gesture Brain Break | Draw in the Air',
    description: 'A fast-paced hand-eye coordination game where children point at bubbles to pop them using just a webcam. Free, browser-based, no download.',
    emoji: '🫧',
    badge: 'Brain Break Activity',
    playPath: '/play?screen=game&mode=calibration',
    heroTitle: 'Bubble Pop — Your Colleague Shared This Activity',
    heroSub: 'A 30-second hand-eye coordination game where children point at bubbles using their webcam. Perfect for movement breaks between lessons.',
    whatItIs: 'Bubble Pop is a fast-paced reaction game that uses webcam hand tracking. Children point their index finger at floating bubbles to pop them — no mouse, no touchscreen. The activity runs for 30 seconds per round and works on any laptop or Chromebook with a built-in camera.',
    howToPlay: [
      'Open drawintheair.com on any device with a webcam',
      'Allow camera access — no video is recorded or transmitted',
      'Wave at the camera to activate hand tracking',
      'Point your index finger at the bubbles to pop them',
      'See how many you can pop in 30 seconds',
    ],
    skills: ['Hand-eye coordination', 'Reaction speed', 'Visual tracking', 'Focus and attention'],
  },
  'letter-tracing': {
    title: 'Letter Tracing A–Z — Air Writing Practice | Draw in the Air',
    description: 'Children trace letters A–Z in the air using their finger and webcam. Builds handwriting readiness through gross motor air tracing. Free, browser-based.',
    emoji: '✏️',
    badge: 'Literacy Activity',
    playPath: '/play?screen=game&mode=pre-writing',
    heroTitle: 'Letter Tracing — Your Colleague Shared This Activity',
    heroSub: 'Children trace letters A–Z in the air using hand gestures detected by webcam. Builds handwriting readiness through gross motor movement.',
    whatItIs: 'Letter Tracing uses AI hand tracking to guide children through the correct stroke sequence for every letter of the alphabet. Children trace the path in the air with their finger, receiving real-time visual feedback as they follow the guided route. Available for all 26 uppercase letters plus phonics sounds and example words.',
    howToPlay: [
      'Open drawintheair.com on any device with a webcam',
      'Allow camera access — no video leaves the device',
      'Wave to activate hand tracking',
      'Choose a letter from the alphabet selector',
      'Follow the path on screen by tracing with your index finger',
    ],
    skills: ['Letter formation', 'Handwriting readiness', 'Fine motor planning', 'Phonics awareness'],
  },
  'sort-and-place': {
    title: 'Sort and Place — Categorisation Game | Draw in the Air',
    description: 'Children sort and place objects into categories using pinch-and-drag hand gestures. Develops logical thinking and spatial reasoning. Free, browser-based.',
    emoji: '📦',
    badge: 'Cognitive Activity',
    playPath: '/play?screen=game&mode=sort-and-place',
    heroTitle: 'Sort and Place — Your Colleague Shared This Activity',
    heroSub: 'Children pinch, drag, and drop objects into the correct categories using hand gestures detected by webcam. Develops logical thinking through physical play.',
    whatItIs: 'Sort and Place is a gesture-controlled categorisation game. Children use a pinch gesture to pick up objects and drag them to the correct sorting bin. Three rounds of increasing difficulty cover sorting by colour, category, and a mystery rule that children must discover themselves.',
    howToPlay: [
      'Open drawintheair.com and allow camera access',
      'Wave to activate hand tracking',
      'Pinch your thumb and index finger to grab an object',
      'Move your hand to drag the object to the correct bin',
      'Open your hand to drop and place it',
    ],
    skills: ['Categorisation', 'Logical thinking', 'Spatial reasoning', 'Manipulative coordination'],
  },
  'free-paint': {
    title: 'Free Paint — Creative Air Drawing | Draw in the Air',
    description: 'Children draw anything they like in the air using hand gestures and webcam. Creative expression through gesture-based digital art. Free, browser-based.',
    emoji: '🎨',
    badge: 'Creative Activity',
    playPath: '/play?screen=game&mode=free',
    heroTitle: 'Free Paint — Your Colleague Shared This Activity',
    heroSub: 'An open-ended creative drawing mode where children paint in the air using hand gestures. No right or wrong — just movement and colour.',
    whatItIs: 'Free Paint gives children an open canvas to draw anything using hand gestures detected by webcam. Pinch thumb and index finger to draw, open the hand to lift. Multiple colours and brush sizes are available. Great for creative warm-ups, art sessions, or unstructured movement time.',
    howToPlay: [
      'Open drawintheair.com and allow camera access',
      'Wave to start hand tracking',
      'Pinch your thumb and index finger together to draw',
      'Open your hand to stop drawing (like lifting a brush)',
      'Choose different colours from the palette',
    ],
    skills: ['Creative expression', 'Fine motor control', 'Spatial awareness', 'Bilateral coordination'],
  },
  'gesture-learning': {
    title: 'Gesture Learning Activities | Draw in the Air',
    description: 'Gesture-controlled learning activities for children ages 3–8. Trace letters, pop bubbles, sort objects, and more using hand movements. Free, browser-based.',
    emoji: '✋',
    badge: 'Gesture Learning',
    playPath: SITE.appPath,
    heroTitle: 'Gesture Learning — Your Colleague Shared This Platform',
    heroSub: 'Nine gesture-controlled learning activities for children ages 3–8. Everything runs in the browser — no installation, no accounts, no cost.',
    whatItIs: 'Draw in the Air uses AI hand tracking to let children interact with learning activities through natural hand movements. Nine modes cover letters, numbers, shapes, sorting, colours, maths, and creative drawing. Works on any laptop or Chromebook with a webcam.',
    howToPlay: [
      'Open drawintheair.com on any device with a webcam',
      'Allow camera access',
      'Wave to activate hand tracking',
      'Choose any activity from the menu',
      'Interact using hand gestures',
    ],
    skills: ['Letters A–Z', 'Numbers 0–10', 'Shapes', 'Sorting', 'Colours', 'Maths', 'Creative drawing'],
  },
};

// Fallback for unknown slugs — maps to the full app
const FALLBACK_META: ActivityMeta = {
  title: 'Draw in the Air — Gesture Learning Activity',
  description: 'Your colleague shared a gesture learning activity. Try it free in your browser — no download, no account, no cost.',
  emoji: '🎮',
  badge: 'Shared Activity',
  playPath: SITE.appPath,
  heroTitle: 'A Colleague Shared This Learning Activity',
  heroSub: 'Draw in the Air offers gesture-controlled educational activities for children ages 3–8. Everything runs in the browser — no installation needed.',
  whatItIs: 'Draw in the Air uses AI hand tracking to let children interact with learning activities through natural hand movements. Nine modes cover letters, numbers, shapes, sorting, and creative drawing. Works on any Chromebook or laptop with a webcam.',
  howToPlay: [
    'Open drawintheair.com on any device with a webcam',
    'Allow camera access — no video is recorded or transmitted',
    'Wave to activate hand tracking',
    'Choose an activity and start learning through movement',
  ],
  skills: ['Letter formation', 'Number recognition', 'Hand-eye coordination', 'Creative expression'],
};

// ── Share tracking ─────────────────────────────────────────────────────────────
function trackShareLanding(slug: string) {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || 'unknown';
    // Fire analytics event if the global analytics function exists
    if (typeof (window as any).__dita_track === 'function') {
      (window as any).__dita_track('share_landing', { activitySlug: slug, ref, timestamp: Date.now() });
    }
    // Store in sessionStorage for conversion tracking
    sessionStorage.setItem('dita_share_landing', JSON.stringify({ slug, ref, ts: Date.now() }));
  } catch {
    // Non-critical — tracking failure should not affect UX
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShareLandingPage({ slug }: { slug: string }) {
  const meta = ACTIVITY_MAP[slug] ?? FALLBACK_META;

  useEffect(() => {
    trackShareLanding(slug);
  }, [slug]);

  return (
    <SeoLayout>
      <SEOMeta
        title={meta.title}
        description={meta.description}
        canonical={`/share/${slug}`}
      />

      {/* Shared-by notice */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(108,71,255,0.15), rgba(34,211,238,0.1))',
        borderBottom: '1px solid rgba(108,71,255,0.25)',
        padding: '10px 24px',
        textAlign: 'center',
      }}>
        <span style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600 }}>
          👩‍🏫 A colleague shared this activity with you · Free to try · No account needed
        </span>
      </div>

      <PageHero
        badge={meta.badge}
        emoji={meta.emoji}
        title={meta.heroTitle}
        subtitle={meta.heroSub}
        cta={{ label: 'Try This Activity — Free ✨', path: meta.playPath }}
      />

      {/* What it is */}
      <Section>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>What Is This Activity?</h2>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: 32 }}>{meta.whatItIs}</p>

        {/* Skills grid */}
        <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>Skills Developed</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
          {meta.skills.map(skill => (
            <span
              key={skill}
              style={{ background: 'rgba(108,71,255,0.2)', border: '1px solid rgba(108,71,255,0.35)', color: '#c4b5fd', borderRadius: 20, padding: '6px 16px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {skill}
            </span>
          ))}
        </div>
      </Section>

      {/* How to play */}
      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>How to Get Started</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {meta.howToPlay.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'rgba(108,71,255,0.25)',
                border: '1px solid rgba(108,71,255,0.5)', color: '#a78bfa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
              }}>{i + 1}</div>
              <p style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6, margin: 0, paddingTop: 4 }}>{step}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate(meta.playPath)}
            style={{ background: 'linear-gradient(135deg, #6c47ff, #22d3ee)', color: 'white', border: 'none', borderRadius: 32, padding: '16px 40px', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 4px 24px rgba(108,71,255,0.3)' }}
          >
            Try It Now — It's Free ✨
          </button>
          <div style={{ marginTop: 12, color: '#64748b', fontSize: '0.82rem' }}>
            No download · No login · Works on any laptop with a camera
          </div>
        </div>
      </Section>

      {/* Trust signals */}
      <Section>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>Why Teachers Use Draw in the Air</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: '🔒', title: 'Privacy First', detail: 'Camera processing happens on the device. No video is recorded, transmitted, or stored.' },
            { icon: '💸', title: 'Completely Free', detail: 'No premium tier, no payment wall, no trial limit. Every activity is free forever.' },
            { icon: '💻', title: 'Chromebook Ready', detail: 'Runs in the browser with no installation. Works immediately on any school device.' },
            { icon: '⚡', title: 'No Setup', detail: 'No accounts, no student logins, no IT requests. Open the browser and start.' },
          ].map(item => (
            <div key={item.title} style={{ background: '#111629', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{item.icon}</div>
              <div style={{ color: 'white', fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.55 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        {/* Share this yourself */}
        <div style={{ marginTop: 40, background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 16, padding: '28px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📤</div>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Found this useful? Share it with another teacher.</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 16 }}>
            After you try an activity, use the share button in the app to send it to a colleague.
          </p>
          <button
            onClick={() => navigate(SITE.appPath)}
            style={{ background: '#6c47ff', color: 'white', border: 'none', borderRadius: 24, padding: '10px 28px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            Explore All Activities
          </button>
        </div>
      </Section>
    </SeoLayout>
  );
}
