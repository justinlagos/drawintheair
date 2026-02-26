import React from 'react';
import { getAnalytics } from '../lib/analytics';
import './school-parent-landing.css';

export const SchoolPilot: React.FC = () => {
  const handlePrimaryCTA = () => {
    const analytics = getAnalytics();
    if (analytics) {
      analytics.logEvent('cta_click', {
        page: '/school',
        cta_type: 'join_school_pilot'
      }, {
        component: 'hero_primary_cta'
      });
    }
    // TODO: Implement signup flow
    console.log('Join School Pilot clicked');
  };

  const handleSecondaryCTA = () => {
    const analytics = getAnalytics();
    if (analytics) {
      analytics.logEvent('cta_click', {
        page: '/school',
        cta_type: 'see_how_it_works'
      }, {
        component: 'hero_secondary_cta'
      });
    }
    // Scroll to "What it is" section or navigate to demo
    const section = document.getElementById('what-it-is');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePilotCTA = () => {
    const analytics = getAnalytics();
    if (analytics) {
      analytics.logEvent('cta_click', {
        page: '/school',
        cta_type: 'apply_school_pilot'
      }, {
        component: 'pilot_cta'
      });
    }
    // TODO: Implement pilot application flow
    console.log('Apply for School Pilot clicked');
  };

  return (
    <div className="conversion-landing">
      <div className="conversion-container">
        {/* Hero */}
        <section className="conversion-hero">
          <h1>Bring hand-based learning into the classroom</h1>
          <p>Children learn through movement. Draw In The Air turns physical motion into writing, drawing, sorting, and play on screen.</p>
          <div className="conversion-hero-buttons">
            <button className="conversion-btn conversion-btn-primary" onClick={handlePrimaryCTA}>
              Join the School Pilot
            </button>
            <button className="conversion-btn conversion-btn-secondary" onClick={handleSecondaryCTA}>
              See how it works
            </button>
          </div>
        </section>

        {/* What it is */}
        <section id="what-it-is" className="conversion-section">
          <h2 className="conversion-section-title">What it is</h2>
          <div className="conversion-section-text">
            <p>Draw In The Air is a camera-based learning platform. Children use their hands in the air to draw, trace, sort, and play. No controllers. No wearables. Just movement.</p>
          </div>
        </section>

        {/* Why schools care */}
        <section className="conversion-section">
          <h2 className="conversion-section-title">Why schools care</h2>
          <div className="conversion-cards">
            <div className="conversion-card">
              <h3>Builds fine motor control</h3>
              <p>Hand tracking develops precise movements and coordination essential for writing and daily tasks.</p>
            </div>
            <div className="conversion-card">
              <h3>Supports early writing and focus</h3>
              <p>Tracing and drawing activities prepare children for pencil control and sustained attention.</p>
            </div>
            <div className="conversion-card">
              <h3>Works with EYFS and SEND learners</h3>
              <p>Accessible, adaptable activities that support diverse learning needs and developmental stages.</p>
            </div>
          </div>
        </section>

        {/* How it fits into lessons */}
        <section className="conversion-section">
          <h2 className="conversion-section-title">How it fits into lessons</h2>
          <div className="conversion-rows">
            <div className="conversion-row">
              <div className="conversion-row-label">Warm-up:</div>
              <div className="conversion-row-content">Bubble Pop</div>
            </div>
            <div className="conversion-row">
              <div className="conversion-row-label">Creative:</div>
              <div className="conversion-row-content">Free Paint</div>
            </div>
            <div className="conversion-row">
              <div className="conversion-row-label">Learning:</div>
              <div className="conversion-row-content">Tracing, Word Search, Sort and Place</div>
            </div>
          </div>
        </section>

        {/* What schools get */}
        <section className="conversion-section">
          <h2 className="conversion-section-title">What schools get</h2>
          <ul className="conversion-list">
            <li>Private pilot link</li>
            <li>Classroom onboarding</li>
            <li>Usage reports</li>
            <li>Teacher feedback channel</li>
          </ul>
        </section>

        {/* Pilot CTA */}
        <section className="conversion-cta-section">
          <button className="conversion-btn conversion-btn-primary" onClick={handlePilotCTA}>
            Apply for School Pilot
          </button>
          <div>
            <a href="/parent" className="conversion-cta-link">
              Already a parent? Go to Parent Access
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
