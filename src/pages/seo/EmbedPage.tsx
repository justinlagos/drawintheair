// src/pages/seo/EmbedPage.tsx
// Embed page — provides iframe codes for full platform + scoped activity variants.
// Each embed variant includes UTM attribution so we can track which websites
// are driving users to Draw in the Air.

import { useState } from 'react';
import { SeoLayout, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';

// ── Embed variant definitions ─────────────────────────────────────────────────
interface EmbedVariant {
  id: string;
  label: string;
  emoji: string;
  description: string;
  height: number;
  borderColor: string;
  src: string;
  title: string;
}

const BASE_URL = 'https://drawintheair.com';

const EMBED_VARIANTS: EmbedVariant[] = [
  {
    id: 'full',
    label: 'Full Platform',
    emoji: '🎮',
    description: 'All nine activities — letters, numbers, shapes, sorting, colours, maths, and free drawing.',
    height: 620,
    borderColor: '#6c47ff',
    src: `${BASE_URL}/play?embed=true`,
    title: 'Draw in the Air — Free Gesture Learning Activities',
  },
  {
    id: 'bubble-pop',
    label: 'Bubble Pop',
    emoji: '🫧',
    description: 'The 30-second hand-eye coordination brain break. Great for embedding on a movement break page.',
    height: 540,
    borderColor: '#22d3ee',
    src: `${BASE_URL}/play?embed=true&screen=game&mode=calibration`,
    title: 'Bubble Pop — Gesture Brain Break',
  },
  {
    id: 'letter-tracing',
    label: 'Letter Tracing',
    emoji: '✏️',
    description: 'Air tracing for letters A–Z. Perfect for a phonics or handwriting blog post.',
    height: 620,
    borderColor: '#6c47ff',
    src: `${BASE_URL}/play?embed=true&screen=game&mode=pre-writing`,
    title: 'Letter Tracing A–Z — Gesture Handwriting Practice',
  },
  {
    id: 'sort-and-place',
    label: 'Sort & Place',
    emoji: '📦',
    description: 'Pinch-and-drag categorisation game. Three rounds of increasing difficulty.',
    height: 580,
    borderColor: '#a855f7',
    src: `${BASE_URL}/play?embed=true&screen=game&mode=sort-and-place`,
    title: 'Sort and Place — Gesture Categorisation Game',
  },
  {
    id: 'free-paint',
    label: 'Free Paint',
    emoji: '🎨',
    description: 'Open-ended creative drawing. Great for art or creative expression pages.',
    height: 580,
    borderColor: '#f59e0b',
    src: `${BASE_URL}/play?embed=true&screen=game&mode=free`,
    title: 'Free Paint — Air Drawing Canvas',
  },
];

function buildEmbedCode(variant: EmbedVariant): string {
  return `<iframe
  src="${variant.src}"
  width="100%"
  height="${variant.height}px"
  style="border: 2px solid ${variant.borderColor}; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); display: block;"
  allow="camera"
  title="${variant.title}">
</iframe>
<p style="text-align: center; font-family: sans-serif; font-size: 13px; color: #666; margin-top: 8px;">
  Powered by <a href="https://drawintheair.com?utm_source=embed&utm_medium=widget" target="_blank" rel="noopener noreferrer" style="color: #6c47ff; font-weight: 600;">Draw in the Air</a> — Free gesture learning for kids
</p>`;
}

// ── Copy button component ─────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy Code' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? '#22c55e' : '#6c47ff',
        color: 'white', border: 'none', borderRadius: 8,
        padding: '10px 20px', fontWeight: 700, fontSize: '0.85rem',
        cursor: 'pointer', transition: 'background 0.2s',
      }}
    >
      {copied ? '✓ Copied!' : label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmbedPage() {
  const [activeVariant, setActiveVariant] = useState<EmbedVariant>(EMBED_VARIANTS[0]);

  const embedCode = buildEmbedCode(activeVariant);

  return (
    <SeoLayout>
      <SEOMeta
        title="Embed Draw in the Air on Your School Website | Free Classroom Widget"
        description="Add Draw in the Air gesture learning activities to your classroom website, school blog, or student portal. Free to embed — copy the code and paste it anywhere. Works on Google Sites, Canvas, Seesaw, WordPress."
        canonical="/embed"
        keywords={['embed educational app', 'classroom website widget', 'free educational widget', 'google sites classroom widget', 'canvas lms embed', 'seesaw embed activity']}
      />

      <PageHero
        badge="For Teachers & Bloggers"
        emoji="🔗"
        title="Add Draw in the Air to Any Website"
        subtitle="Embed gesture learning activities directly on your class page, school blog, or student portal. Free, one-click setup — no coding required."
      />

      {/* ── Why embed ── */}
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40, alignItems: 'start' }}>
          <div>
            <h2 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: 16 }}>
              Keep Students on Your Site
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: 24 }}>
              By embedding Draw in the Air on your class page, students interact with gesture learning activities
              without leaving your controlled environment. No navigation to external websites required.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Works on Google Sites, Canvas, Seesaw, WordPress, and any HTML editor',
                'No student accounts or logins — just open and play',
                'Camera feed stays on the device — never transmitted anywhere',
                'Responsive design works on any screen size',
                'Five activity variants to embed — from brain breaks to letter tracing',
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, color: '#e2e8f0' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(108,71,255,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</div>
                  <span style={{ fontSize: '0.95rem', lineHeight: 1.55 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '⚡', label: '60 seconds', sub: 'to add to your site' },
              { icon: '0️⃣', label: 'Zero cost', sub: 'free to embed forever' },
              { icon: '5', label: 'Activity variants', sub: 'full platform or single mode' },
              { icon: '🔒', label: 'Privacy first', sub: 'no data collection, no video storage' },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#111629', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: '1.6rem' }}>{stat.icon}</span>
                <div>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>{stat.label}</div>
                  <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Activity selector + embed code ── */}
      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Choose an Activity to Embed</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: 24 }}>
          Select the activity below, then copy and paste the code into your site builder.
        </p>

        {/* Variant tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          {EMBED_VARIANTS.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveVariant(v)}
              style={{
                background: activeVariant.id === v.id ? '#6c47ff' : 'rgba(108,71,255,0.1)',
                border: `1px solid ${activeVariant.id === v.id ? '#6c47ff' : 'rgba(108,71,255,0.3)'}`,
                color: activeVariant.id === v.id ? 'white' : '#a78bfa',
                borderRadius: 24, padding: '8px 18px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {v.emoji} {v.label}
            </button>
          ))}
        </div>

        {/* Active variant info */}
        <div style={{ background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ color: 'white', fontWeight: 700, marginBottom: 4 }}>{activeVariant.emoji} {activeVariant.label}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{activeVariant.description}</div>
        </div>

        {/* Code block */}
        <div style={{ position: 'relative' }}>
          <pre style={{
            background: '#0a0e1a', padding: '20px 20px 20px 20px',
            borderRadius: 10, color: '#22d3ee', fontSize: '0.82rem',
            overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)',
            lineHeight: 1.6, margin: 0,
          }}>
            {embedCode}
          </pre>
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <CopyButton text={embedCode} />
          </div>
        </div>

        {/* Platform guides */}
        <div style={{ marginTop: 28 }}>
          <h3 style={{ color: 'white', fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>Where to paste this code</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { platform: 'Google Sites', instruction: 'Insert → Embed → paste the code' },
              { platform: 'WordPress', instruction: 'Add a Custom HTML block and paste' },
              { platform: 'Canvas LMS', instruction: 'Pages → Edit → HTML Editor → paste' },
              { platform: 'Seesaw', instruction: 'Add Activity → Embed Link → paste URL only' },
            ].map(guide => (
              <div key={guide.platform} style={{ background: '#111629', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>{guide.platform}</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>{guide.instruction}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── For creators / bloggers ── */}
      <Section>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>For Education Bloggers & Creators</h2>
        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.65, marginBottom: 20 }}>
          Writing a post about movement learning, Chromebook classroom tools, or handwriting warm-ups?
          Embed the relevant activity variant to give your readers an immediate, interactive experience.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { title: 'Movement breaks article', embed: '🫧 Bubble Pop', reason: 'Shows readers a 30-second brain break in action' },
            { title: 'Phonics resource post', embed: '✏️ Letter Tracing', reason: 'Readers can try air tracing alongside your written guide' },
            { title: 'Chromebook tools roundup', embed: '🎮 Full Platform', reason: 'Demonstrates the full experience without requiring a site visit' },
            { title: 'Fine motor activities post', embed: '📦 Sort & Place', reason: 'Interactive demonstration of pinch-and-place coordination' },
          ].map(use => (
            <div key={use.title} style={{ background: '#111629', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ color: '#22d3ee', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Article type</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>{use.title}</div>
              <div style={{ color: '#a78bfa', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Use: {use.embed}</div>
              <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{use.reason}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('/press')}
            style={{ background: 'rgba(108,71,255,0.15)', border: '1px solid rgba(108,71,255,0.4)', color: '#a78bfa', borderRadius: 24, padding: '10px 24px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
          >
            Download the Creator Pack →
          </button>
        </div>
      </Section>
    </SeoLayout>
  );
}
