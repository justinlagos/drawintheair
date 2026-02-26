import React, { useState, useEffect, useCallback } from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { HeroSection } from '../components/landing/HeroSection';
import { HowItWorks } from '../components/landing/HowItWorks';
import { ModesGrid } from '../components/landing/ModesGrid';
import { SocialProof } from '../components/landing/SocialProof';
import { KidsImageSection } from '../components/landing/KidsImageSection';
import { EYFSAlignment } from '../components/landing/EYFSAlignment';
import { ForSchools } from '../components/landing/ForSchools';
import { PrivacySafety } from '../components/landing/PrivacySafety';
import { FAQSection } from '../components/landing/FAQSection';
import { CTASection } from '../components/landing/CTASection';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import { MobileStickyCTA } from '../components/landing/MobileStickyCTA';
import { TryFreeModal } from '../components/TryFreeModal';
import '../components/landing/landing.css';

export const Landing: React.FC = () => {
  const [tryFreeOpen, setTryFreeOpen] = useState(false);

  const handleGetSchoolPack = () => {
    const element = document.getElementById('schools');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTryFree = useCallback(() => {
    setTryFreeOpen(true);
  }, []);

  // Scroll animation observer
  useEffect(() => {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('landing-visible');
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll('.landing-section');
    sections.forEach((section) => {
      observer.observe(section);
    });

    // Show hero immediately
    setTimeout(() => {
      const hero = document.querySelector('.landing-hero');
      if (hero) {
        hero.classList.add('landing-visible');
      }
    }, 100);

    return () => {
      sections.forEach((section) => {
        observer.unobserve(section);
      });
    };
  }, []);

  return (
    <div className="landing-page">
      <div className="landing-shader-layer" />
      <HeaderNav onTryFree={handleTryFree} />
      <HeroSection onGetSchoolPack={handleGetSchoolPack} onTryFree={handleTryFree} />
      <HowItWorks />
      <ModesGrid />
      <SocialProof />
      <KidsImageSection onGetSchoolPack={handleGetSchoolPack} />
      <EYFSAlignment />
      <ForSchools onRequestSchoolPack={handleGetSchoolPack} />
      <FAQSection />
      <PrivacySafety />
      <CTASection onGetSchoolPack={handleGetSchoolPack} />
      <Footer />
      <BackToTop />
      <MobileStickyCTA onGetSchoolPack={handleGetSchoolPack} onTryFree={handleTryFree} />
      <TryFreeModal open={tryFreeOpen} onClose={() => setTryFreeOpen(false)} />
    </div>
  );
};

