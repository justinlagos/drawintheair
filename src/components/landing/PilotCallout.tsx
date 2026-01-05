import React, { useState } from 'react';
import './landing.css';

export const PilotCallout: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      const emails = JSON.parse(localStorage.getItem('pilotEmails') || '[]');
      emails.push({ email, timestamp: new Date().toISOString() });
      localStorage.setItem('pilotEmails', JSON.stringify(emails));
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 5000);
    }
  };

  return (
    <section id="schools" className="landing-section landing-pilot">
      <div className="landing-pilot-content">
        <div className="landing-pilot-reactions">
          <h2 className="landing-section-title">Social proof and pilot</h2>
          <p className="landing-pilot-text">
            Kids light up when they see it
          </p>
          <p className="landing-pilot-text">
            Built and tested at home with my kids, refined through real use
          </p>
          <p className="landing-pilot-text">
            Now moving into school validation and pilots
          </p>
        </div>
        <div className="landing-pilot-callout">
          <h3 className="landing-pilot-title">Looking for 3 to 5 schools to trial the platform and shape the next release</h3>
          <p className="landing-pilot-subtitle">Short form, no commitment</p>
          <form className="landing-pilot-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="landing-pilot-input"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="landing-btn landing-btn-primary">
              Join the pilot list
            </button>
          </form>
          {submitted && (
            <div className="landing-pilot-success">
              <svg className="landing-success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Thank you! We'll be in touch soon.</span>
            </div>
          )}
          <p className="landing-pilot-privacy">We only use this to contact you about pilots</p>
        </div>
      </div>
    </section>
  );
};

