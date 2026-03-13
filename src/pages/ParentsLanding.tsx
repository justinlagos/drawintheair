import React, { useState } from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';

// ─── Design tokens ────────────────────────────────────────────────────────────
const c = {
  bg: '#f8fafc', white: '#ffffff', orange: '#f97316', orangeLight: '#fff7ed',
  text: '#0f172a', textSec: '#475569', textMuted: '#94a3b8',
  border: '#e2e8f0', green: '#22c55e', teal: '#0d9488', tealLight: '#f0fdfa',
};

const PAIN_POINTS = [
  { emoji: '😤', before: '"Getting them to practise letters is a daily battle"', after: 'Draw in the Air turns it into a game they actually ask for' },
  { emoji: '📱', before: '"I feel guilty about screen time"', after: 'They\'re moving, not scrolling — it\'s active not passive' },
  { emoji: '😴', before: '"Educational apps are boring — they lose interest fast"', after: 'Game-quality engagement that sneaks in real learning' },
  { emoji: '🤔', before: '"I can\'t tell if they\'re actually learning anything"', after: 'Visible progress through letter tracing and shape recognition' },
];

const BENEFITS = [
  { icon: '✏️', title: 'Pre-Writing Skills', desc: 'Tracing letters and numbers builds the same muscle memory as holding a pencil — without the frustration.' },
  { icon: '🙌', title: 'Full-Body Learning', desc: 'Children stand 1–2 metres from the camera and draw with their whole arm. More active than any touchscreen app.' },
  { icon: '🔒', title: 'Safe & Private', desc: 'No accounts. No data collected. No video recorded. Camera processing stays entirely on your device.' },
  { icon: '🚫', title: 'Zero Ads', desc: 'Pure learning. No in-app purchases, no pop-ups, no advertising of any kind.' },
  { icon: '⚡', title: '30-Second Start', desc: 'Open the browser, allow the camera, start playing. Works on laptops, tablets, and computers with a webcam.' },
  { icon: '👨‍👩‍👧', title: 'You Stay in Control', desc: 'An adult gate prevents children from accidentally exiting. You can end any session instantly.' },
];

const ACTIVITIES = [
  { emoji: '🔤', name: 'Letter Tracing', desc: 'A–Z with phonics. Trace each letter with a finger to reinforce stroke order and letter formation.' },
  { emoji: '🔢', name: 'Number Formation', desc: 'Numbers 1–10 with formation guides. Builds the habits needed for confident handwriting.' },
  { emoji: '⭕', name: 'Shape Drawing', desc: 'Circles, triangles, squares, stars and more. Foundation of early maths and spatial awareness.' },
  { emoji: '🫧', name: 'Bubble Pop', desc: 'Pop bubbles with a pointing gesture. Develops hand-eye coordination and reaction time.' },
  { emoji: '🎨', name: 'Free Paint', desc: 'Open-ended creative drawing in the air. No right or wrong — just imagination.' },
  { emoji: '🔡', name: 'Sort & Place', desc: 'Drag and drop categorisation with hand gestures. Develops classification thinking.' },
];

const FAQS = [
  { q: 'What age is it for?', a: 'Draw in the Air is designed for ages 3–8, with activities calibrated for early years and KS1 skill levels. Younger children (3–5) will need light supervision; ages 5+ typically play independently after a quick demo.' },
  { q: 'Does it record my child on camera?', a: 'Absolutely not. The camera is only used for real-time hand detection — it processes a single video frame to find the hand position. No video is captured, stored, or sent anywhere.' },
  { q: 'What devices does it work on?', a: 'Any laptop, desktop with webcam, or tablet with a front-facing camera and a modern browser. Chrome and Safari work best. Mobile phones work but a larger screen gives a better experience.' },
  { q: 'Is my child\'s eye safe? It\'s not too close to the screen?', a: 'Children stand 1–2 metres away from the camera — similar to distance from a TV. This is much better for eye health than close-up touchscreen use.' },
  { q: 'Does it cost anything?', a: 'Draw in the Air is completely free for home use. All 9 activities are available with no account, no subscription, and no credit card.' },
];

export const ParentsLanding: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [sent, setSent] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const pg: React.CSSProperties = { background: c.bg, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" };
  const container: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '0 1.5rem' };
  const section: React.CSSProperties = { padding: '5rem 0' };
  const sectionSm: React.CSSProperties = { padding: '3.5rem 0' };

  const badge: React.CSSProperties = {
    display: 'inline-block', background: c.orangeLight, color: c.orange, borderRadius: 50,
    padding: '5px 16px', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', marginBottom: 16,
  };

  const h1: React.CSSProperties = {
    fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontWeight: 900, color: c.text,
    margin: '0 0 1.2rem', lineHeight: 1.15, letterSpacing: '-0.02em',
  };

  return (
    <div style={pg}>
      <HeaderNav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ background: c.white, borderBottom: `1px solid ${c.border}` }}>
        <div style={{ ...container, ...section, textAlign: 'center' }}>
          <span style={badge}>Free for Families</span>
          <h1 style={h1}>
            Screen Time That<br />
            <span style={{ color: c.orange }}>Actually Teaches</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: c.textSec, maxWidth: 580, margin: '0 auto 2rem', lineHeight: 1.65 }}>
            Your child practises handwriting, numbers, and shapes by drawing in the air with their hand. Active learning disguised as play — free, safe, and no sign-up needed.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
            <a href="/play" onClick={(e) => { e.preventDefault(); window.location.pathname = '/play'; }}
              style={{ background: c.orange, color: '#fff', borderRadius: 10, padding: '15px 34px', fontSize: '1.05rem', fontWeight: 700, textDecoration: 'none' }}>
              Try Free — No Sign-Up
            </a>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['✓ No account needed', '✓ No credit card', '✓ Works instantly', '✓ No ads'].map((t) => (
              <span key={t} style={{ fontSize: '0.85rem', color: c.textSec, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ──────────────────────────────────────────────────── */}
      <section style={{ ...section, background: c.bg }}>
        <div style={container}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={badge}>Sound familiar?</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 800, color: c.text, margin: '0.5rem 0 0' }}>We built this for real parent struggles</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {PAIN_POINTS.map((item) => (
              <div key={item.emoji} style={{ background: c.white, borderRadius: 14, border: `1px solid ${c.border}`, padding: '1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{item.emoji}</div>
                <p style={{ fontSize: '0.9rem', color: c.textMuted, fontStyle: 'italic', marginBottom: 14, lineHeight: 1.55 }}>
                  {item.before}
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: c.orange, fontWeight: 900, fontSize: '1rem', marginTop: 1, flexShrink: 0 }}>→</span>
                  <p style={{ fontSize: '0.93rem', color: c.text, fontWeight: 600, margin: 0, lineHeight: 1.55 }}>{item.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ ...sectionSm, background: c.white, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div style={container}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={badge}>How it works</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 800, color: c.text, margin: '0.5rem 0 0' }}>Playing in 3 steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, maxWidth: 860, margin: '0 auto' }}>
            {[
              { n: '1', title: 'Open on any device', desc: 'Visit drawintheair.com on a laptop or tablet. No download, no app.' },
              { n: '2', title: 'Allow the camera', desc: 'One click to allow camera access. Nothing is recorded — it\'s only for hand detection.' },
              { n: '3', title: 'Start learning', desc: 'Your child waves to start, picks an activity, and draws in the air. That\'s it.' },
            ].map((step) => (
              <div key={step.n} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: c.orangeLight, color: c.orange, fontWeight: 900, fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{step.n}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: c.text, marginBottom: 8 }}>{step.title}</h3>
                <p style={{ fontSize: '0.88rem', color: c.textSec, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACTIVITIES ───────────────────────────────────────────────────── */}
      <section style={{ ...section, background: c.bg }}>
        <div style={container}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={badge}>9 Activities</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 800, color: c.text, margin: '0.5rem 0 0' }}>Something for every learner</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {ACTIVITIES.map((a) => (
              <div key={a.name} style={{ background: c.white, borderRadius: 12, border: `1px solid ${c.border}`, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ fontSize: '1.6rem', flexShrink: 0, marginTop: 2 }}>{a.emoji}</div>
                <div>
                  <h3 style={{ fontSize: '0.97rem', fontWeight: 700, color: c.text, margin: '0 0 4px' }}>{a.name}</h3>
                  <p style={{ fontSize: '0.86rem', color: c.textSec, margin: 0, lineHeight: 1.55 }}>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ─────────────────────────────────────────────────────── */}
      <section style={{ ...sectionSm, background: c.white, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div style={container}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={badge}>Why parents love it</span>
            <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 800, color: c.text, margin: '0.5rem 0 0' }}>Built for peace of mind</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {BENEFITS.map((b) => (
              <div key={b.title} style={{ borderRadius: 12, border: `1px solid ${c.border}`, padding: '1.5rem', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>{b.icon}</span>
                <div>
                  <h3 style={{ fontSize: '0.97rem', fontWeight: 700, color: c.text, margin: '0 0 5px' }}>{b.title}</h3>
                  <p style={{ fontSize: '0.87rem', color: c.textSec, margin: 0, lineHeight: 1.6 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EMAIL SIGNUP ─────────────────────────────────────────────────── */}
      <section style={{ ...sectionSm, background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)' }}>
        <div style={{ ...container, maxWidth: 620, textAlign: 'center' }}>
          <span style={badge}>Get activity ideas</span>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: c.text, margin: '0.5rem 0 0.8rem' }}>Home activity ideas by email</h2>
          <p style={{ fontSize: '0.97rem', color: c.textSec, marginBottom: '1.75rem', lineHeight: 1.65 }}>
            A curated set of Draw in the Air activity ideas matched to your child's age, plus tips for making the most of each session.
          </p>
          {sent ? (
            <div style={{ background: c.white, borderRadius: 12, padding: '2rem', border: `1px solid ${c.border}` }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
              <h3 style={{ fontWeight: 700, color: c.text, marginBottom: 8 }}>You're all set!</h3>
              <p style={{ color: c.textSec, fontSize: '0.93rem', margin: 0 }}>Activity ideas are on their way to your inbox. In the meantime, your child can start playing right now.</p>
              <a href="/play" onClick={(e) => { e.preventDefault(); window.location.pathname = '/play'; }}
                style={{ display: 'inline-block', background: c.orange, color: '#fff', borderRadius: 10, padding: '12px 28px', fontWeight: 700, textDecoration: 'none', marginTop: 16, fontSize: '0.95rem' }}>
                Start Playing Now →
              </a>
            </div>
          ) : (
            <form onSubmit={handleSignup} style={{ background: c.white, borderRadius: 14, padding: '2rem', border: `1px solid ${c.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: c.textSec, marginBottom: 6 }}>Your email address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  style={{ width: '100%', borderRadius: 10, border: `1.5px solid ${c.border}`, background: '#f8fafc', padding: '12px 14px', fontSize: '0.93rem', color: c.text, boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: c.textSec, marginBottom: 6 }}>Child's age (optional)</label>
                <select value={age} onChange={(e) => setAge(e.target.value)}
                  style={{ width: '100%', borderRadius: 10, border: `1.5px solid ${c.border}`, background: '#f8fafc', padding: '12px 14px', fontSize: '0.93rem', color: c.text, boxSizing: 'border-box', outline: 'none' }}>
                  <option value="">Select age</option>
                  {[3, 4, 5, 6, 7, 8].map((a) => <option key={a} value={a}>{a} years old</option>)}
                </select>
              </div>
              <button type="submit" style={{ width: '100%', background: c.orange, color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: '0.97rem', fontWeight: 700, cursor: 'pointer' }}>
                Send Me Activity Ideas
              </button>
              <p style={{ fontSize: '0.78rem', color: c.textMuted, textAlign: 'center', marginTop: 12, marginBottom: 0 }}>We never share your email. Unsubscribe any time.</p>
            </form>
          )}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ ...sectionSm, background: c.white, borderTop: `1px solid ${c.border}` }}>
        <div style={{ ...container, maxWidth: 700 }}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: c.text, textAlign: 'center', marginBottom: '2rem' }}>Questions parents ask</h2>
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
      <section style={{ ...sectionSm, background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', borderTop: `1px solid ${c.border}` }}>
        <div style={{ ...container, textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 800, color: c.text, marginBottom: 12 }}>Ready to try it now?</h2>
          <p style={{ fontSize: '1rem', color: c.textSec, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>Free forever for families. Takes 30 seconds to start.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/play" onClick={(e) => { e.preventDefault(); window.location.pathname = '/play'; }}
              style={{ background: c.orange, color: '#fff', borderRadius: 10, padding: '15px 34px', fontSize: '1.05rem', fontWeight: 700, textDecoration: 'none' }}>
              Launch Draw in the Air
            </a>
          </div>
          <p style={{ marginTop: 16, fontSize: '0.85rem', color: c.textMuted }}>No signup · No download · No credit card</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};
