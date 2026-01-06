import React from 'react';
import './landing.css';

export const HowItWorks: React.FC = () => {
  return (
    <section id="how" className="landing-section landing-how">
      <h2 className="landing-section-title">How it works</h2>
      <div className="landing-steps landing-steps-horizontal">
        <div className="landing-step-card">
          <div className="landing-step-header">
            <span className="landing-step-index">1</span>
            <div className="landing-step-icon">
              <span className="landing-step-emoji">👋</span>
            </div>
          </div>
          <h3 className="landing-step-title">Wave to start</h3>
          <p className="landing-step-text">A simple wave wakes the experience.</p>
        </div>
        <div className="landing-step-card">
          <div className="landing-step-header">
            <span className="landing-step-index">2</span>
            <div className="landing-step-icon">
              <span className="landing-step-emoji">🤏</span>
            </div>
          </div>
          <h3 className="landing-step-title">Pinch to draw and select</h3>
          <p className="landing-step-text">Natural hand gestures control every activity.</p>
        </div>
        <div className="landing-step-card">
          <div className="landing-step-header">
            <span className="landing-step-index">3</span>
            <div className="landing-step-icon">
              <span className="landing-step-emoji">🖐️</span>
            </div>
          </div>
          <h3 className="landing-step-title">Open hand to pause</h3>
          <p className="landing-step-text">An open hand pauses when children need a moment.</p>
        </div>
      </div>
    </section>
  );
};

