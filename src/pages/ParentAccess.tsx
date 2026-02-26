import React from 'react';
import { getAnalytics } from '../lib/analytics';
import './school-parent-landing.css';

export const ParentAccess: React.FC = () => {
  const handlePrimaryCTA = () => {
    const analytics = getAnalytics();
    if (analytics) {
      analytics.logEvent('cta_click', {
        page: '/parent',
        cta_type: 'start_free_trial'
      }, {
        component: 'hero_primary_cta'
      });
    }
    // TODO: Implement trial signup flow
    console.log('Start Free Trial clicked');
  };

  const handleSecondaryCTA = () => {
    const analytics = getAnalytics();
    if (analytics) {
      analytics.logEvent('cta_click', {
        page: '/parent',
        cta_type: 'how_it_works'
      }, {
        component: 'hero_secondary_cta'
      });
    }
    // Scroll to "What kids do" section
    const section = document.getElementById('what-kids-do');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleParentCTA = () => {
    const analytics = getAnalytics();
    if (analytics) {
      analytics.logEvent('cta_click', {
        page: '/parent',
        cta_type: 'start_free_trial_final'
      }, {
        component: 'parent_cta'
      });
    }
    // TODO: Implement trial signup flow
    console.log('Start Free Trial (final) clicked');
  };

  return (
    <div className="conversion-landing">
      <div className="conversion-container">
        {/* Hero */}
        <section className="conversion-hero">
          <h1>Let your child learn with their hands</h1>
          <p>The same platform used in schools. At home.</p>
          <div className="conversion-hero-buttons">
            <button className="conversion-btn conversion-btn-primary" onClick={handlePrimaryCTA}>
              Start Free Trial
            </button>
            <button className="conversion-btn conversion-btn-secondary" onClick={handleSecondaryCTA}>
              How it works
            </button>
          </div>
        </section>

        {/* What kids do */}
        <section id="what-kids-do" className="conversion-section">
          <h2 className="conversion-section-title">What kids do</h2>
          <div className="conversion-cards">
            <div className="conversion-card">
              <h3>Pop bubbles</h3>
              <p>Interactive warm-up activities that build attention and reaction skills.</p>
            </div>
            <div className="conversion-card">
              <h3>Draw in the air</h3>
              <p>Creative free painting with hand movements, no touch required.</p>
            </div>
            <div className="conversion-card">
              <h3>Trace letters and shapes</h3>
              <p>Practice letter formation and early writing skills through guided tracing.</p>
            </div>
            <div className="conversion-card">
              <h3>Find words</h3>
              <p>Word search games that build reading and pattern recognition.</p>
            </div>
          </div>
        </section>

        {/* What it builds */}
        <section className="conversion-section">
          <h2 className="conversion-section-title">What it builds</h2>
          <div className="conversion-cards">
            <div className="conversion-card">
              <h3>Focus</h3>
              <p>Activities that develop sustained attention and concentration.</p>
            </div>
            <div className="conversion-card">
              <h3>Motor skills</h3>
              <p>Fine and gross motor control through precise hand movements.</p>
            </div>
            <div className="conversion-card">
              <h3>Early writing confidence</h3>
              <p>Foundation skills that prepare children for pencil and paper writing.</p>
            </div>
          </div>
        </section>

        {/* Safe and simple */}
        <section className="conversion-section">
          <h2 className="conversion-section-title">Safe and simple</h2>
          <div className="conversion-section-text">
            <p>No accounts for kids.</p>
            <p>No ads.</p>
            <p>No data sold.</p>
            <p>Camera stays on device.</p>
          </div>
        </section>

        {/* How it connects to school */}
        <section className="conversion-section">
          <h2 className="conversion-section-title">How it connects to school</h2>
          <div className="conversion-section-text">
            <p>If your child's school uses Draw In The Air, their home version matches what they do in class.</p>
          </div>
        </section>

        {/* Parent CTA */}
        <section className="conversion-cta-section">
          <button className="conversion-btn conversion-btn-primary" onClick={handleParentCTA}>
            Start Free Trial
          </button>
          <div>
            <a href="/school" className="conversion-cta-link">
              Are you a teacher? Go to School Pilot
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};
