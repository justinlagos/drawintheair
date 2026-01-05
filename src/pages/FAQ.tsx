import React from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import { FAQAccordion, type FAQItem } from '../components/landing/FAQAccordion';
import '../components/landing/landing.css';

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const faqSections: FAQSection[] = [
  {
    title: 'General',
    items: [
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
      },
      {
        question: 'How long is a typical session?',
        answer: 'Sessions can be as short as 5 minutes or as long as 20 minutes, depending on the activity and the child\'s attention span. The activities are designed to be flexible and can be stopped at any time.'
      },
      {
        question: 'Does it work on interactive whiteboards?',
        answer: 'Yes, if the interactive whiteboard has a camera connected and the browser supports camera access. The experience works best when children can stand in front of the camera and use hand gestures.'
      }
    ]
  },
  {
    title: 'Schools',
    items: [
      {
        question: 'Do we need parent permission?',
        answer: 'No. Draw In The Air does not collect or store any child data, so parent permission is not required for data protection purposes. However, schools should follow their own policies for using new technology with pupils.'
      },
      {
        question: 'Does it work with SEND pupils?',
        answer: 'Yes. Draw In The Air is designed for inclusive play and supports children with different needs. The gesture-based interaction can be particularly helpful for children who find touch screens challenging. Adult supervision and support can help adapt the experience to individual needs.'
      }
    ]
  },
  {
    title: 'Safety and Privacy',
    items: [
      {
        question: 'Do you store any child data?',
        answer: 'No. We do not collect, store, or transmit any child data. All camera processing happens locally in the browser on the device. No video is saved, and there are no child accounts.'
      }
    ]
  },
  {
    title: 'Technical',
    items: [
      {
        question: 'What browsers are supported?',
        answer: 'Draw In The Air works best in modern browsers that support camera access, including Chrome, Firefox, Safari, and Edge. The browser must support WebRTC for camera access.'
      },
      {
        question: 'What devices are compatible?',
        answer: 'Any device with a front-facing camera and a modern browser. This includes laptops, tablets, and desktop computers with webcams. Mobile phones work but the experience is optimized for larger screens.'
      }
    ]
  }
];

export const FAQ: React.FC = () => {
  return (
    <div className="landing-page">
      <HeaderNav />
      <div className="landing-content-page">
        <section className="landing-section">
          <h1 className="landing-page-title">Frequently asked questions</h1>
          <div className="landing-faq-sections">
            {faqSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="landing-faq-section-group">
                <h2 className="landing-faq-section-title">{section.title}</h2>
                <FAQAccordion items={section.items} allowMultiple={true} />
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
      <BackToTop />
    </div>
  );
};

