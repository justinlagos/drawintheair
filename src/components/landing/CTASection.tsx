import React from 'react';
import './landing.css';

interface CTASectionProps {
  onGetSchoolPack: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onGetSchoolPack }) => {
  
  return (
    <section className="landing-section landing-cta">
      <h2 className="landing-cta-headline">Ready to try it</h2>
      <div className="landing-cta-buttons">
        <button 
          className="landing-btn landing-btn-primary landing-btn-large" 
          onClick={() => {
            // Track demo click
            if (typeof window !== 'undefined' && (window as any).analytics) {
              (window as any).analytics.logEvent('demo_try_click', {
                source: 'final_cta'
              });
            }
            window.location.pathname = '/demo';
          }}
        >
          Try the demo
        </button>
        <button 
          className="landing-btn landing-btn-secondary landing-btn-large" 
          onClick={onGetSchoolPack}
        >
          Request school pack
        </button>
      </div>
    </section>
  );
};
