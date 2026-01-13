import React from 'react';
import './landing.css';

interface HeroSectionProps {
  onGetSchoolPack?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetSchoolPack }) => {
  return (
    <section className="landing-hero">
      <div className="landing-hero-container">
        {/* Left Column: Text Content */}
        <div className="landing-hero-content">
          {/* Trust Badge */}
          <div className="landing-hero-badge">
            <span className="badge-icon">✓</span>
            <span>EYFS Aligned</span>
            <span className="badge-separator">•</span>
            <span>Free for Families</span>
          </div>
          
          {/* Main Headline */}
          <h1 className="landing-hero-headline">
            Screen Time That 
            <span className="headline-highlight"> Makes You Smile</span>
          </h1>
          
          {/* Subheadline */}
          <p className="landing-hero-subhead">
            Watch your child practice letters, numbers, and creativity using just their hands. 
            No touchscreen. No controller. Just natural movement and imagination.
          </p>
          
          {/* CTA Buttons */}
          <div className="landing-hero-ctas">
            <a 
              href="/demo"
              className="landing-btn landing-btn-primary landing-btn-large"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== 'undefined' && (window as any).analytics) {
                  (window as any).analytics.logEvent('demo_try_click', {
                    source: 'hero',
                  });
                }
                window.location.pathname = '/demo';
              }}
            >
              <span className="btn-icon">▶</span>
              Try Free Now
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
              For Schools
            </a>
          </div>
          
          {/* Trust Indicators */}
          <div className="landing-hero-trust">
            <div className="trust-item">
              <span className="trust-icon">🔒</span>
              <span>No data stored</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">💳</span>
              <span>No credit card</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">⚡</span>
              <span>Works instantly</span>
            </div>
          </div>
        </div>
        
        {/* Right Column: Visual Demo */}
        <div className="landing-hero-visual">
          {/* Animated demo or video placeholder */}
          <div className="hero-demo-container">
            <div className="hero-demo-screen">
              {/* Fallback static image */}
              <img 
                src="https://i.postimg.cc/hj6Bd7pT/teacher_and_son.png" 
                alt="Child drawing in the air" 
                className="hero-demo-image"
                loading="eager"
                decoding="async"
              />
            </div>
            
            {/* Floating UI Elements (decorative) */}
            <div className="hero-floating-element hero-float-1">🫧</div>
            <div className="hero-floating-element hero-float-2">🎨</div>
            <div className="hero-floating-element hero-float-3">✏️</div>
          </div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="landing-hero-scroll">
        <span>Scroll to explore</span>
        <div className="scroll-arrow">↓</div>
      </div>
    </section>
  );
};
