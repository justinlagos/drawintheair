import React from 'react';
import './landing.css';

export const Footer: React.FC = () => {
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

  return (
    <footer className="landing-footer">
      <div className="landing-footer-container">
        <div className="landing-footer-section">
          <h4 className="landing-footer-title">Product</h4>
          <div className="landing-footer-links">
            <a href="/" className="landing-footer-link">Draw In The Air</a>
            <a href="/#modes" className="landing-footer-link">Modes</a>
            <a href="/#schools" className="landing-footer-link" onClick={(e) => { e.preventDefault(); handleSchoolPackClick(); }}>School pilot pack</a>
            <a href="/faq" className="landing-footer-link">FAQ</a>
          </div>
        </div>
        <div className="landing-footer-section">
          <h4 className="landing-footer-title">Trust</h4>
          <div className="landing-footer-links">
            <a href="/privacy" className="landing-footer-link">Privacy</a>
            <a href="/terms" className="landing-footer-link">Terms</a>
            <a href="/safeguarding" className="landing-footer-link">Safeguarding</a>
          </div>
        </div>
        <div className="landing-footer-section">
          <h4 className="landing-footer-title">Contact</h4>
          <p className="landing-footer-text">
            <a href="mailto:partnership@drawintheair.com" className="landing-footer-link">
              partnership@drawintheair.com
            </a>
          </p>
        </div>
      </div>
      <div className="landing-footer-copyright">
        <p>© {new Date().getFullYear()} Draw In The Air. All rights reserved.</p>
      </div>
    </footer>
  );
};

