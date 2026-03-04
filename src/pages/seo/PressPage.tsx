import React from 'react';
import { SeoLayout, PageHero, Section } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';

export default function PressPage() {
  return (
    <SeoLayout>
      <SEOMeta
        title="Draw in the Air Press Kit | EdTech for Early Childhood"
        description="Official press kit for Draw in the Air. Download high-resolution logos, screenshots, founder bios, and statistics for articles covering gesture-based educational games."
        canonical="/press"
      />
      
      <PageHero
        badge="Press Kit & Media"
        emoji="📰"
        title="Draw in the Air Press Kit"
        subtitle="We're on a mission to bring active, gesture-based learning to early childhood education without requiring expensive headsets or controllers. Below you'll find everything you need to cover our platform."
      />

      <Section>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'left' }}>
          <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, marginBottom: 24 }}>
            About Draw in the Air
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 20 }}>
            Draw in the Air is a free, web-based educational platform that turns any standard laptop or tablet camera into an interactive, spatial learning environment. We use advanced, client-side AI (Google MediaPipe) to track hand movements in real-time, allowing children ages 3-8 to trace letters, sort objects, and play cognitive-development games using only their hands.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 40 }}>
            Because everything runs purely in the browser, <strong>no video is ever recorded, sent to a server, or stored.</strong> It is 100% private by design, requiring no accounts or downloads.
          </p>

          <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: 16 }}>
            Brand Assets & Logos
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
            <div style={{ background: '#111629', padding: 30, borderRadius: 12, border: '1px solid rgba(108,71,255,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌀</div>
              <div style={{ color: 'white', fontWeight: 700 }}>Primary Logo</div>
              <a href="#" style={{ display: 'inline-block', marginTop: 12, color: '#22d3ee', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Download SVG</a>
            </div>
            <div style={{ background: '#111629', padding: 30, borderRadius: 12, border: '1px solid rgba(108,71,255,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: 12, background: 'linear-gradient(135deg, #6c47ff, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Draw in the Air</div>
              <div style={{ color: 'white', fontWeight: 700 }}>Wordmark</div>
              <a href="#" style={{ display: 'inline-block', marginTop: 12, color: '#22d3ee', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Download SVG</a>
            </div>
          </div>

          <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: 16 }}>
            Media Contact
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 20 }}>
            For interviews, quotes, or additional high-resolution screenshots, please contact our team:
            <br/><br/>
            <strong>Email:</strong> <a href="mailto:partnership@drawintheair.com" style={{ color: '#6c47ff', textDecoration: 'none', fontWeight: 600 }}>partnership@drawintheair.com</a>
          </p>

        </div>
      </Section>
    </SeoLayout>
  );
}
