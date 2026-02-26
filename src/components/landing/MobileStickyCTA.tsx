import React, { useState, useEffect } from 'react';
import './landing.css';

interface MobileStickyCTAProps {
  onGetSchoolPack: () => void;
  onTryFree?: () => void;
}

export const MobileStickyCTA: React.FC<MobileStickyCTAProps> = ({ onGetSchoolPack, onTryFree }) => {
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
          if (onTryFree) {
            onTryFree();
          } else {
            window.location.pathname = '/demo';
          }
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

