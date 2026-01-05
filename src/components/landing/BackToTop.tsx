import React, { useState, useEffect } from 'react';
import './landing.css';

export const BackToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  return (
    <button 
      className="landing-back-to-top"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {/* Universal Access / Accessibility Icon */}
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="10" r="2.5" fill="currentColor" />
        <path d="M12 12.5v4.5m-1.5 0h3" />
      </svg>
    </button>
  );
};

