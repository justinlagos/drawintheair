import React from 'react';
import './landing.css';

interface KidsImageSectionProps {
  onGetSchoolPack: () => void;
}

export const KidsImageSection: React.FC<KidsImageSectionProps> = ({ onGetSchoolPack }) => {
  
  return (
    <section className="landing-section landing-kids-image">
      <div className="landing-kids-image-container">
        {/* Image Side */}
        <div className="landing-kids-image-left">
          <img 
            src="https://i.postimg.cc/L6gd0v8M/group-of-kids.png"
            srcSet="https://i.postimg.cc/L6gd0v8M/group-of-kids.png 1x, https://i.postimg.cc/L6gd0v8M/group-of-kids.png 2x"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            alt="Children using Draw In The Air"
            className="landing-kids-image-img"
            decoding="async"
            loading="lazy"
          />
        </div>
        
        {/* Content Side */}
        <div className="landing-kids-image-right">
          <h2 className="landing-kids-image-headline">Learning through play</h2>
          <p className="landing-kids-image-text">
            Watch children discover the joy of drawing in the air, developing fine motor skills and creativity.
          </p>
          <div className="landing-kids-image-buttons">
            <button 
              className="landing-btn landing-btn-primary landing-btn-large" 
              onClick={() => {
                // Track demo click
                if (typeof window !== 'undefined' && (window as any).analytics) {
                  (window as any).analytics.logEvent('demo_try_click', {
                    source: 'kids_image_section'
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

