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
          {/* Decorative elements */}
          <div className="cta-decoration cta-deco-1">✨</div>
          <div className="cta-decoration cta-deco-2">🌟</div>
          
          <h2 className="cta-headline">Ready to Transform Screen Time?</h2>
          <p className="cta-subhead">
            Join thousands of families making learning feel like play.
          </p>
          
          <div className="cta-buttons">
            <a 
              href="/demo"
              className="landing-btn landing-btn-primary landing-btn-large"
              onClick={(e) => {
                e.preventDefault();
                // Track demo click
                if (typeof window !== 'undefined' && (window as any).analytics) {
                  (window as any).analytics.logEvent('demo_try_click', {
                    source: 'final_cta'
                  });
                }
                window.location.pathname = '/demo';
              }}
            >
              Start Free — No Signup
            </a>
            <a 
              href="/schools"
              className="landing-btn landing-btn-secondary landing-btn-large"
              onClick={(e) => {
                e.preventDefault();
                if (onGetSchoolPack) {
                  onGetSchoolPack();
                } else {
                  window.location.pathname = '/schools';
                }
              }}
            >
              Request School Pilot
            </a>
          </div>
          
          <p className="cta-note">
            Free forever for families. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
};
