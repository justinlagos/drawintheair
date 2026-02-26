import React, { useState, useEffect } from 'react';
import './landing.css';
import { LandingCTAButton } from './LandingCTAButton';

interface HeaderNavProps {
  variant?: 'transparent' | 'solid';
  onTryFree?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ onTryFree }) => {
  const [activeSection, setActiveSection] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = window.location.pathname;
  const isLandingPage = pathname === '/' || pathname === '';

  useEffect(() => {
    if (!isLandingPage) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Determine active section
      const sections = ['how-it-works', 'modes', 'schools', 'faq'];
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
    setMobileMenuOpen(false); // Close mobile menu on navigation
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
              src="/logo.png"
              alt="Draw In The Air"
              className="landing-logo"
            />
          </a>
        </div>

        {/* Desktop Navigation */}
        <div className="landing-nav-links desktop-only">
          <a
            href="#how-it-works"
            onClick={(e) => handleNavClick(e, '#how-it-works')}
            className={`landing-nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}
          >
            How It Works
          </a>
          <a
            href="#modes"
            onClick={(e) => handleNavClick(e, '#modes')}
            className={`landing-nav-link ${activeSection === 'modes' ? 'active' : ''}`}
          >
            Activities
          </a>
          <a
            href="#schools"
            onClick={(e) => handleNavClick(e, '#schools')}
            className={`landing-nav-link ${activeSection === 'schools' ? 'active' : ''}`}
          >
            For Schools
          </a>
          <a
            href="#faq"
            onClick={(e) => handleNavClick(e, '#faq')}
            className={`landing-nav-link ${activeSection === 'faq' ? 'active' : ''}`}
          >
            FAQ
          </a>
        </div>

        {/* CTA Buttons */}
        <div className="landing-nav-actions">
          <LandingCTAButton
            variant="primary"
            size="sm"
            href="/demo"
            label="Try Free"
            onClick={(e) => {
              e.preventDefault();
              if (onTryFree) {
                onTryFree();
              } else {
                window.location.pathname = '/demo';
              }
            }}
          />
          <LandingCTAButton
            variant="secondary"
            size="sm"
            href="/schools"
            label="School Pilot"
            className="desktop-only"
          />
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="landing-nav-hamburger mobile-only"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="landing-nav-mobile-menu">
          <a href="#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')}>How It Works</a>
          <a href="#modes" onClick={(e) => handleNavClick(e, '#modes')}>Activities</a>
          <a href="#schools" onClick={(e) => handleNavClick(e, '#schools')}>For Schools</a>
          <a href="#faq" onClick={(e) => handleNavClick(e, '#faq')}>FAQ</a>
          <LandingCTAButton
            variant="secondary"
            size="md"
            href="/schools"
            label="School Pilot"
          />
        </div>
      )}
    </nav>
  );
};
