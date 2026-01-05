import React from 'react';
import './landing.css';

interface CTASectionProps {
  onGetSchoolPack: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onGetSchoolPack }) => {
  
  return (
    <section className="landing-section landing-cta">
      <div className="landing-cta-container">
        {/* Background Image - Centered */}
        <div className="landing-cta-image-wrapper">
          <img 
            src="https://i.postimg.cc/9Qf0jyRm/boy-havingfun.png"
            srcSet="https://i.postimg.cc/9Qf0jyRm/boy-havingfun.png 1x, https://i.postimg.cc/9Qf0jyRm/boy-havingfun.png 2x"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 1200px, 1200px"
            alt="Child having fun with Draw In The Air"
            className="landing-cta-background-image"
            decoding="async"
            loading="eager"
          />
          <div className="landing-cta-overlay" />
        </div>
        
        {/* Content Overlay */}
        <div className="landing-cta-content">
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
        </div>
      </div>
    </section>
  );
};
