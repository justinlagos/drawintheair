import React from 'react';
import './landing.css';

export const PrivacySafety: React.FC = () => {
  const safetyPoints = [
    'Camera is used only for hand tracking',
    'No video is saved',
    'No child accounts',
    'No ads',
    'Adult gate for settings and exit',
    'Designed for classroom friendly use',
    'Camera processing happens locally in the browser'
  ];

  return (
    <section id="privacy" className="landing-section landing-privacy">
      <h2 className="landing-section-title">Safety and privacy</h2>
      <div className="landing-privacy-grid">
        {safetyPoints.map((point, index) => (
          <div key={index} className="landing-privacy-item">
            <svg className="landing-privacy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>{point}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
