import React, { useState, useEffect } from 'react';
import { PhotoCard } from './PhotoCard';
import './landing.css';

interface HeroSectionProps {
  onGetSchoolPack: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetSchoolPack }) => {
  const handleTryDemo = () => {
    // Track demo click
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.logEvent('demo_try_click', {
        source: 'hero'
      });
    }
    window.location.pathname = '/demo';
  };

  return (
    <section className="landing-hero">
      <div className="landing-hero-container">
        <div className="landing-hero-left">
          <h1 className="landing-hero-headline">
            Draw, trace, and learn in the air
          </h1>
          <p className="landing-hero-subhead">
            Camera-based learning for early years. Built for EYFS motor skills, early literacy, and inclusive play.
          </p>

          <div className="landing-hero-buttons">
            <button 
              className="landing-btn landing-btn-primary landing-btn-large" 
              onClick={handleTryDemo}
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
        </div>
        
        <div className="landing-hero-right">
          <div className="landing-hero-visual">
            {/* Monitor/Tablet Mockup */}
            <div className="landing-monitor-frame">
              <div className="landing-monitor-screen">
                {/* Animated UI states - drawing, tracing, popping */}
                <div className="landing-ui-animation">
                  <svg className="landing-ui-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                    {/* Background */}
                    <rect width="400" height="300" fill="#010C24" />
                    
                    {/* Drawing stroke animation */}
                    <path 
                      d="M 100 150 Q 150 100, 200 150 T 300 150" 
                      stroke="#FFD93D" 
                      strokeWidth="4" 
                      fill="none"
                      className="landing-draw-path"
                    />
                    
                    {/* Tracing path (dotted guide) */}
                    <path 
                      d="M 100 200 Q 150 180, 200 200 T 300 200" 
                      stroke="#00E5FF" 
                      strokeWidth="2" 
                      strokeDasharray="4 4"
                      fill="none"
                      opacity="0.5"
                    />
                    
                    {/* Hand cursor */}
                    <circle 
                      cx="300" 
                      cy="150" 
                      r="8" 
                      fill="#DE3163"
                      className="landing-hand-cursor-anim"
                    />
                    
                    {/* Bubble pop effect */}
                    <circle 
                      cx="150" 
                      cy="100" 
                      r="15" 
                      fill="#FFD93D"
                      className="landing-bubble-pop"
                      opacity="0.7"
                    />
                  </svg>
                </div>
              </div>
              <div className="landing-monitor-base"></div>
            </div>
            {/* Subtle photo in background - low prominence */}
            <div className="landing-hero-photo-background">
              <PhotoCard 
                url="https://i.postimg.cc/xcT770t6/a-kid.png"
                alt="Child using Draw In The Air"
                className="landing-hero-photo-subtle"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
