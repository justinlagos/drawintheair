import React, { useState, useEffect } from 'react';
import './landing.css';

export const HeaderNav: React.FC = () => {
  const [activeSection, setActiveSection] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = window.location.pathname;
  const isLandingPage = pathname === '/' || pathname === '';

  useEffect(() => {
    if (!isLandingPage) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      
      // Determine active section
      const sections = ['how', 'modes', 'schools', 'faq'];
      const scrollPosition = window.scrollY + 150;
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i]);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLandingPage]);

  const scrollTo = (id: string) => {
    if (!isLandingPage) {
      window.location.pathname = '/';
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          const offset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 100);
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for sticky nav
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.pathname = '/';
  };

  const handleNavClick = (e: React.MouseEvent, target: string) => {
    e.preventDefault();
    if (target.startsWith('#')) {
      scrollTo(target.substring(1));
    } else {
      window.location.pathname = target;
    }
  };

  return (
    <nav className={`landing-nav ${isScrolled ? 'landing-nav-scrolled' : ''}`}>
      <div className="landing-nav-container">
        <div className="landing-nav-left">
          <a href="/" onClick={handleLogoClick} style={{ display: 'block', cursor: 'pointer' }}>
            <img 
              src="https://i.postimg.cc/d3nR91sy/logo.png" 
              alt="Draw In The Air" 
              className="landing-logo"
            />
          </a>
        </div>
        <div className="landing-nav-right">
          <a 
            href="#how" 
            onClick={(e) => handleNavClick(e, '#how')} 
            className={`landing-nav-link ${activeSection === 'how' ? 'active' : ''}`}
          >
            How it works
          </a>
          <a 
            href="#modes" 
            onClick={(e) => handleNavClick(e, '#modes')} 
            className={`landing-nav-link ${activeSection === 'modes' ? 'active' : ''}`}
          >
            Modes
          </a>
          <a 
            href="#schools" 
            onClick={(e) => handleNavClick(e, '#schools')} 
            className={`landing-nav-link ${activeSection === 'schools' ? 'active' : ''}`}
          >
            For schools
          </a>
          <a 
            href="#faq" 
            onClick={(e) => handleNavClick(e, '#faq')} 
            className={`landing-nav-link ${activeSection === 'faq' ? 'active' : ''}`}
          >
            FAQ
          </a>
          <button 
            className="landing-btn landing-btn-primary landing-btn-small" 
            onClick={() => {
              // Track demo click
              if (typeof window !== 'undefined' && (window as any).analytics) {
                (window as any).analytics.logEvent('demo_try_click', {
                  source: 'nav'
                });
              }
              window.location.pathname = '/demo';
            }}
          >
            Try the demo
          </button>
        </div>
      </div>
    </nav>
  );
};
