import React from 'react';
import { SeoLayout, PageHero, Section } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';

export default function FreeResourcesPage() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  return (
    <SeoLayout>
      <SEOMeta
        title="Free Printable Letter Tracing Worksheets | Draw in the Air"
        description="Download free PDF templates for tracing uppercase and lowercase letters. Connect digital active learning with offline fine motor practice."
        canonical="/free-resources"
      />
      
      <PageHero
        badge="Classroom Extras"
        emoji="🖨️"
        title="Free Printables & Worksheets"
        subtitle="Bridge digital and physical learning with our free kindergarten printables. Download individual tracing sheets or full workbook PDFs for pre-K and primary grades."
      />

      <Section>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'left' }}>
          
          <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            Offline Tracing Series (A-Z)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 40 }}>
            After students master large, gross-motor arm movements using Draw in the Air's camera technology, it helps to transition those pathways into fine-motor pencil skills. We've created high-contrast, easy-to-read printable alphabet sheets for every letter. Download them absolutely free below.
          </p>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
            gap: 16, 
            marginBottom: 60 
          }}>
            {letters.map((char) => (
              <div key={char} style={{ 
                background: '#111629', 
                borderRadius: 12, 
                border: '1px solid rgba(108,71,255,0.2)', 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(108,71,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ padding: '24px 0', textAlign: 'center', background: 'rgba(108,71,255,0.05)', fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>
                  {char}{char.toLowerCase()}
                </div>
                <div style={{ padding: 12, textAlign: 'center', borderTop: '1px solid rgba(108,71,255,0.2)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#22d3ee', fontWeight: 600 }}>Download PDF</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(108,71,255,0.2), rgba(34,211,238,0.1))', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
            <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>
              Get the Full A-Z Workbook
            </h3>
            <p style={{ color: '#e2e8f0', fontSize: '1rem', marginBottom: 20, maxWidth: 500, margin: '0 auto 20px auto' }}>
              Want all 26 letters in a single, perfectly formatted 54-page document? Download the whole pack for your classroom instantly.
            </p>
            <button style={{ 
               background: '#6c47ff', 
               color: 'white', 
               border: 'none', 
               borderRadius: 24, 
               padding: '12px 32px', 
               fontWeight: 700, 
               fontSize: '1rem',
               cursor: 'pointer',
               boxShadow: '0 4px 14px rgba(108,71,255,0.4)',
               transition: 'transform 0.2s'
            }}>
              Download Complete Bundle (.ZIP)
            </button>
          </div>

        </div>
      </Section>
    </SeoLayout>
  );
}
