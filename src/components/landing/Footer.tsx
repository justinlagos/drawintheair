import React, { useState } from 'react';
import './landing.css';

export const Footer: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const handleSchoolPackClick = () => {
    if (window.location.pathname === '/') {
      const element = document.getElementById('schools');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.location.pathname = '/';
      setTimeout(() => {
        const element = document.getElementById('schools');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <footer className="landing-footer">
      <div className="landing-footer-container">
        {/* Brand Block */}
        <div className="landing-footer-section landing-footer-brand">
          <div className="landing-footer-brand-content">
            <h3 className="landing-footer-brand-title">Draw In The Air</h3>
            <p className="landing-footer-brand-description">
              Camera-based activities for early years. Built for EYFS motor skills, early literacy, and inclusive play.
            </p>
            <p className="landing-footer-trust-line">
              No child accounts • No ads • EYFS aligned
            </p>
          </div>
        </div>

        {/* Product Links */}
        <div className="landing-footer-section">
          <button 
            className="landing-footer-accordion-toggle"
            onClick={() => toggleSection('product')}
            aria-expanded={openSection === 'product'}
            aria-controls="footer-product"
          >
            <h4 className="landing-footer-title">Product</h4>
            <span className="landing-footer-accordion-icon" aria-hidden="true">
              {openSection === 'product' ? '−' : '+'}
            </span>
          </button>
          <div 
            id="footer-product"
            className={`landing-footer-accordion-content ${openSection === 'product' ? 'open' : ''}`}
          >
            <div className="landing-footer-links">
              <a href="/" className="landing-footer-link">Home</a>
              <a href="/#modes" className="landing-footer-link">Modes</a>
              <a href="/#schools" className="landing-footer-link" onClick={(e) => { e.preventDefault(); handleSchoolPackClick(); }}>School Pilot Pack</a>
              <a href="/faq" className="landing-footer-link">FAQ</a>
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <div className="landing-footer-section">
          <button 
            className="landing-footer-accordion-toggle"
            onClick={() => toggleSection('legal')}
            aria-expanded={openSection === 'legal'}
            aria-controls="footer-legal"
          >
            <h4 className="landing-footer-title">Legal</h4>
            <span className="landing-footer-accordion-icon" aria-hidden="true">
              {openSection === 'legal' ? '−' : '+'}
            </span>
          </button>
          <div 
            id="footer-legal"
            className={`landing-footer-accordion-content ${openSection === 'legal' ? 'open' : ''}`}
          >
            <div className="landing-footer-links">
              <a href="/privacy" className="landing-footer-link">Privacy</a>
              <a href="/terms" className="landing-footer-link">Terms</a>
              <a href="/safeguarding" className="landing-footer-link">Safeguarding</a>
            </div>
          </div>
        </div>

        {/* Contact Block */}
        <div className="landing-footer-section">
          <button 
            className="landing-footer-accordion-toggle"
            onClick={() => toggleSection('contact')}
            aria-expanded={openSection === 'contact'}
            aria-controls="footer-contact"
          >
            <h4 className="landing-footer-title">Contact</h4>
            <span className="landing-footer-accordion-icon" aria-hidden="true">
              {openSection === 'contact' ? '−' : '+'}
            </span>
          </button>
          <div 
            id="footer-contact"
            className={`landing-footer-accordion-content ${openSection === 'contact' ? 'open' : ''}`}
          >
            <p className="landing-footer-text">
              <a 
                href="mailto:partnership@drawintheair.com" 
                className="landing-footer-link landing-footer-email"
                style={{ display: 'block', width: '100%', maxWidth: '100%' }}
              >
                partnership@drawintheair.com
              </a>
            </p>
          </div>
        </div>
      </div>
      <div className="landing-footer-copyright">
        <p>© {new Date().getFullYear()} Draw In The Air. All rights reserved.</p>
      </div>
    </footer>
  );
};

