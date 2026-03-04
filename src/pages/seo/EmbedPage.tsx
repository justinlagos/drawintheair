import React, { useState } from 'react';
import { SeoLayout, PageHero, Section } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';

export default function EmbedPage() {
  const [copied, setCopied] = useState(false);
  
  const embedCode = `<iframe 
  src="https://drawintheair.com/app" 
  width="100%" 
  height="600px" 
  style="border: 2px solid #6c47ff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);" 
  allow="camera; microphone"
  title="Draw in the Air - Free Educational Game">
</iframe>
<p style="text-align: center; font-family: sans-serif; font-size: 14px; margin-top: 8px;">
  Powered by <a href="https://drawintheair.com" target="_blank" rel="noopener">Draw in the Air</a>
</p>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <SeoLayout>
      <SEOMeta
        title="Embed Draw in the Air on Your School Website"
        description="Get the free embed code to add Draw in the Air to your classroom blog, school website, or educational portal. No download required for students."
        canonical="/embed"
      />
      
      <PageHero
        badge="For Teachers & Schools"
        emoji="💻"
        title="Add Draw in the Air to Your Website"
        subtitle="Bring our gesture-controlled learning games directly to your school website, classroom blog, or student portal. It's completely free and takes 60 seconds."
      />

      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
          <div>
            <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, marginBottom: 16 }}>
              The Perfect Classroom Widget
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 24 }}>
              Thousands of teachers use Draw in the Air for morning brain breaks, 
              indoor recess, and fine motor skills practice. By embedding it on your 
              class page, students can safely play without navigating to external sites.
            </p>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Requires only an internet browser and webcam',
                'No student accounts or logins needed',
                'Privacy-first: the camera feed strictly stays on the device',
                'Responsive design fits any screen or whiteboard'
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, color: '#e2e8f0' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(108,71,255,0.2)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>✓</div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div style={{ background: '#111629', borderRadius: 16, padding: 32, border: '1px solid rgba(108,71,255,0.2)' }}>
            <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>
              Copy the Embed Code
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20 }}>
              Paste this HTML directly into your site builder (Wordpress, Google Sites, Canvas, Seesaw, etc.)
            </p>
            
            <div style={{ position: 'relative' }}>
              <pre style={{ 
                background: '#0a0e1a', 
                padding: '20px', 
                borderRadius: 8, 
                color: '#22d3ee',
                fontSize: '0.85rem',
                overflowX: 'auto',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                {embedCode}
              </pre>
              
              <button 
                onClick={copyToClipboard}
                style={{ 
                  position: 'absolute', 
                  top: 12, 
                  right: 12, 
                  background: copied ? '#22c55e' : '#6c47ff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6, 
                  padding: '8px 16px', 
                  fontWeight: 600, 
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>
      </Section>
    </SeoLayout>
  );
}
