import React, { useState, useEffect } from 'react';
import './landing.css';

interface MobileStickyCTAProps {
  onGetSchoolPack: () => void;
}

export const MobileStickyCTA: React.FC<MobileStickyCTAProps> = ({ onGetSchoolPack }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.querySelector('.landing-hero');
      if (hero) {
        const heroBottom = hero.getBoundingClientRect().bottom;
        setIsVisible(heroBottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="landing-mobile-sticky">
      <button 
        className="landing-mobile-sticky-btn landing-mobile-sticky-primary"
        onClick={() => {
          // Track demo click
          if (typeof window !== 'undefined' && (window as any).analytics) {
            (window as any).analytics.logEvent('demo_try_click', {
              source: 'mobile_sticky'
            });
          }
          window.location.pathname = '/demo';
        }}
      >
        Try the demo
      </button>
      <button 
        className="landing-mobile-sticky-btn landing-mobile-sticky-secondary"
        onClick={onGetSchoolPack}
      >
        School pack
      </button>
    </div>
  );
};

