import React from 'react';
import { FAQAccordion, type FAQItem } from './FAQAccordion';
import './landing.css';

const faqItems: FAQItem[] = [
  {
    question: 'Do we need parent permission?',
    answer: 'No. Draw In The Air does not collect or store any child data, so parent permission is not required for data protection purposes. However, schools should follow their own policies for using new technology with pupils.'
  },
  {
    question: 'Does it work on tablets?',
    answer: 'Yes, Draw In The Air works on tablets with a front-facing camera. It runs in the browser, so no app installation is needed.'
  },
  {
    question: 'Does it require a strong internet connection?',
    answer: 'No. Once the page loads, all processing happens on the device. You only need internet for the initial page load.'
  },
  {
    question: 'What if the camera does not work?',
    answer: 'Check that your browser has permission to access the camera. Look for a camera icon in the address bar and ensure it is allowed. Some browsers may require HTTPS for camera access.'
  }
];

export const FAQSection: React.FC = () => {
  const handleViewAll = () => {
    window.location.pathname = '/faq';
  };

  return (
    <section id="faq" className="landing-section landing-faq">
      <h2 className="landing-section-title">Frequently asked questions</h2>
      <FAQAccordion items={faqItems} allowMultiple={false} />
      <div className="landing-faq-cta">
        <button 
          className="landing-link-btn" 
          onClick={handleViewAll}
        >
          View all questions →
        </button>
      </div>
    </section>
  );
};

