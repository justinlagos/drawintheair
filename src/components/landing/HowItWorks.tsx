import React from 'react';
import './landing.css';

const STEPS = [
  {
    number: 1,
    icon: '👋',
    title: 'Wave to Start',
    description: 'Wave your hand in front of the camera to wake up the app. No buttons needed.',
  },
  {
    number: 2,
    icon: '🎯',
    title: 'Choose Your Adventure',
    description: 'Pick from Bubble Pop, Free Paint, Tracing, Sort & Place, or Word Search.',
  },
  {
    number: 3,
    icon: '🤏',
    title: 'Pinch to Draw',
    description: 'Pinch your thumb and finger together like holding a pencil. That\'s how you draw!',
  },
  {
    number: 4,
    icon: '📈',
    title: 'Watch Them Grow',
    description: 'See progress over time as fine motor skills and letter recognition improve.',
  }
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="landing-section landing-how-it-works">
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header">
          <span className="section-badge">Simple as 1-2-3-4</span>
          <h2 className="landing-section-title">How It Works</h2>
          <p className="section-subtitle">
            Set up in under a minute. No downloads, no accounts, no fuss.
          </p>
        </div>
        
        {/* Steps Grid */}
        <div className="how-it-works-steps">
          {STEPS.map((step) => (
            <div key={step.number} className="step-card">
              <div className="step-number">{step.number}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

