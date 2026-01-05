import React from 'react';
import './landing.css';

export const HowItWorks: React.FC = () => {
  return (
    <section id="how" className="landing-section landing-how">
      <h2 className="landing-section-title">How it works</h2>
      <div className="landing-steps">
        <div className="landing-step-card">
          <div className="landing-step-icon">
            <span className="landing-step-emoji">👋</span>
          </div>
          <h3 className="landing-step-title">Wave to start</h3>
          <p className="landing-step-text">Simple gesture recognition gets you started</p>
        </div>
        <div className="landing-step-card">
          <div className="landing-step-icon">
            <span className="landing-step-emoji">🤏</span>
          </div>
          <h3 className="landing-step-title">Pinch to draw and select</h3>
          <p className="landing-step-text">Natural hand gestures control everything</p>
        </div>
        <div className="landing-step-card">
          <div className="landing-step-icon">
            <span className="landing-step-emoji">🖐️</span>
          </div>
          <h3 className="landing-step-title">Open hand to pause</h3>
          <p className="landing-step-text">Easy control when you need a break</p>
        </div>
      </div>
    </section>
  );
};

