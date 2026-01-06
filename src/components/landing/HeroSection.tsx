import React from 'react';
import './landing.css';

interface HeroSectionProps {
  onGetSchoolPack: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetSchoolPack }) => {
  return (
    <section className="landing-hero">
      <div className="landing-hero-container">
        <div className="landing-hero-left">
          <h1 className="landing-hero-headline">
            Draw, trace, and learn in the air
          </h1>
          <p className="landing-hero-subhead">
            Camera-based activities for early years. Built for EYFS motor skills, early literacy, and inclusive play.
          </p>

          <div className="landing-hero-buttons">
            <button
              className="landing-btn landing-btn-primary landing-btn-large"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).analytics) {
                  (window as any).analytics.logEvent('demo_try_click', {
                    source: 'hero',
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
              Get the school pilot pack
            </button>
          </div>

          <div className="landing-hero-trust-strip">
            <span className="landing-hero-trust-pill">No child accounts</span>
            <span className="landing-hero-trust-pill">Works on a laptop and webcam</span>
            <span className="landing-hero-trust-pill">EYFS aligned activities</span>
          </div>
        </div>
        <div className="landing-hero-right" aria-hidden="true">
          <div className="landing-hero-gallery">
            <div className="landing-hero-card landing-hero-card-top">
              <img
                src="https://i.postimg.cc/hj6Bd7pT/teacher_and_son.png"
                srcSet="https://i.postimg.cc/hj6Bd7pT/teacher_and_son.png 1x, https://i.postimg.cc/hj6Bd7pT/teacher_and_son.png 2x"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 40vw, 420px"
                alt=""
                className="landing-hero-image landing-hero-image-main"
                loading="eager"
                decoding="async"
              />
              <div className="landing-hero-overlay" />
            </div>
            <div className="landing-hero-card landing-hero-card-middle">
              <img
                src="https://i.postimg.cc/4NzgYytR/a_kid.png"
                srcSet="https://i.postimg.cc/4NzgYytR/a_kid.png 1x, https://i.postimg.cc/4NzgYytR/a_kid.png 2x"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 30vw, 280px"
                alt=""
                className="landing-hero-image landing-hero-image-kid"
                loading="lazy"
                decoding="async"
              />
              <div className="landing-hero-overlay" />
            </div>
            <div className="landing-hero-card landing-hero-card-bottom">
              <img
                src="https://i.postimg.cc/T13pVFVY/image-gen-(3).png"
                srcSet="https://i.postimg.cc/T13pVFVY/image-gen-(3).png 1x, https://i.postimg.cc/T13pVFVY/image-gen-(3).png 2x"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 30vw, 280px"
                alt=""
                className="landing-hero-image landing-hero-image-classroom"
                loading="lazy"
                decoding="async"
              />
              <div className="landing-hero-overlay" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
