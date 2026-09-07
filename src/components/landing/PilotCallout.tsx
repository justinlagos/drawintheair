import React, { useState } from 'react';
import { submitFormData, SUBMISSION_FAILED_MESSAGE } from '../../lib/formSubmission';
import './landing.css';

export const PilotCallout: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || sending) return;
    setSending(true);
    setError('');
    try {
      const result = await submitFormData({ type: 'pilot_list', email: email.trim() });
      if (!result.success) {
        setError(result.error || SUBMISSION_FAILED_MESSAGE);
        return;
      }
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 5000);
    } catch {
      setError(SUBMISSION_FAILED_MESSAGE);
    } finally {
      setSending(false);
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
              aria-label="Your email"
            />
            <button type="submit" className="landing-btn landing-btn-primary" disabled={sending}>
              {sending ? 'Sending...' : 'Join the pilot list'}
            </button>
          </form>
          {error && (
            <div className="landing-pilot-error" role="alert">
              {error}
            </div>
          )}
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

