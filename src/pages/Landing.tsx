import React, { useState } from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { HeroSection } from '../components/landing/HeroSection';
import { HowItWorks } from '../components/landing/HowItWorks';
import { ModesGrid } from '../components/landing/ModesGrid';
import { EYFSAlignment } from '../components/landing/EYFSAlignment';
import { ForSchools } from '../components/landing/ForSchools';
import { PrivacySafety } from '../components/landing/PrivacySafety';
import { FAQSection } from '../components/landing/FAQSection';
import { CTASection } from '../components/landing/CTASection';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import { MobileStickyCTA } from '../components/landing/MobileStickyCTA';
import '../components/landing/landing.css';

export const Landing: React.FC = () => {
  const handleGetSchoolPack = () => {
    const element = document.getElementById('schools');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="landing-page">
      <HeaderNav />
      <HeroSection onGetSchoolPack={handleGetSchoolPack} />
      <HowItWorks />
      <ModesGrid />
      <EYFSAlignment />
      <ForSchools onRequestSchoolPack={handleGetSchoolPack} />
      <FAQSection />
      <PrivacySafety />
      <CTASection onGetSchoolPack={handleGetSchoolPack} />
      <Footer />
      <BackToTop />
      <MobileStickyCTA onGetSchoolPack={handleGetSchoolPack} />
    </div>
  );
};

