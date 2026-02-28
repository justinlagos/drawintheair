import React, { useState } from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';
import { TryFreeModal } from '../components/TryFreeModal';
import '../components/landing/landing.css';

// Pain Points Data
const PAIN_POINTS = [
  {
    problem: "Getting them to practice letters is a daily battle",
    solution: "Turn practice into play they actually ask for",
    icon: "😫"
  },
  {
    problem: "Worried about too much passive screen time",
    solution: "Active learning — they move, not just tap",
    icon: "📱"
  },
  {
    problem: "No idea if they're actually learning anything",
    solution: "See real progress with visual feedback",
    icon: "📊"
  },
  {
    problem: "Educational apps are boring and they lose interest",
    solution: "Game-quality fun that sneaks in learning",
    icon: "🎮"
  }
];

// Benefits Data
const BENEFITS = [
  {
    icon: "✏️",
    title: "Pre-Writing Ready",
    description: "Tracing mode builds the muscle memory needed for real pencil-and-paper writing."
  },
  {
    icon: "⚡",
    title: "Zero Setup Headaches",
    description: "Open browser, allow camera, done. Works in 30 seconds on any device."
  },
  {
    icon: "🔒",
    title: "Privacy First",
    description: "No accounts, no data stored, no tracking. Camera stays 100% on device."
  },
  {
    icon: "🧒",
    title: "Made for Little Ones",
    description: "Designed for ages 3-7 with forgiving gestures and encouraging feedback."
  },
  {
    icon: "🎯",
    title: "No Ads, No Distractions",
    description: "Pure learning experience without pop-ups, ads, or in-app purchases."
  },
  {
    icon: "👨‍👩‍👧",
    title: "Adult Gate Protection",
    description: "Kids can't accidentally exit or access settings. You stay in control."
  }
];

// FAQ Data
const PARENT_FAQ = [
  {
    question: "Is it safe for my child's eyes?",
    answer: "Yes! Unlike tablets where kids stare at a close screen, children stand 1-2 meters away from the camera, similar to watching TV. The experience encourages movement and natural posture."
  },
  {
    question: "What devices work with Draw in the Air?",
    answer: "Any device with a camera and modern web browser: laptops, tablets, desktops with webcams, and even some phones. Chrome and Safari work best."
  },
  {
    question: "How long should my child use it?",
    answer: "We recommend 15-20 minute sessions. The games have natural break points, and you can use the Adult Gate to end sessions when needed."
  },
  {
    question: "Is my child's video recorded or stored?",
    answer: "Absolutely not. The camera is used only for hand tracking, processed entirely on your device. No video is ever recorded, stored, or transmitted anywhere."
  },
  {
    question: "Can my child use it alone?",
    answer: "After initial setup, most children ages 5+ can use it independently. Younger children may need help selecting modes. The Adult Gate prevents accidental exits."
  },
  {
    question: "What skills does it actually teach?",
    answer: "Fine motor control, hand-eye coordination, letter recognition, letter formation, categorization, focus, and creativity — all aligned with early years educational frameworks."
  }
];

export const ParentsLanding: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tryFreeOpen, setTryFreeOpen] = useState(false);

  return (
    <div className="landing-page parents-landing">
      <HeaderNav />

      {/* HERO SECTION */}
      <section className="landing-hero parents-hero">
        <div className="landing-container">
          <div className="parents-hero-content">
            <span className="hero-badge">Free for Families</span>
            <h1 className="landing-hero-headline">
              Screen Time That
              <span className="headline-highlight"> Actually Teaches</span>
            </h1>
            <p className="landing-hero-subhead">
              Watch your child practice handwriting, numbers, and creativity — using nothing but their hands and imagination. No guilt. No passive scrolling. Just joyful learning.
            </p>
            <div className="landing-hero-ctas">
              <button onClick={() => setTryFreeOpen(true)} className="landing-btn landing-btn-primary landing-btn-large border-none cursor-pointer">
                Try Free Now — No Signup
              </button>
            </div>
            <div className="hero-trust-badges">
              <span>✓ No account needed</span>
              <span>✓ No credit card</span>
              <span>✓ Works instantly</span>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN POINTS SECTION */}
      <section className="landing-section pain-points-section">
        <div className="landing-container">
          <h2 className="landing-section-title">Sound Familiar?</h2>
          <div className="pain-points-grid">
            {PAIN_POINTS.map((item, index) => (
              <div key={index} className="pain-point-card">
                <div className="pain-point-front">
                  <span className="pain-icon">{item.icon}</span>
                  <p className="pain-problem">"{item.problem}"</p>
                </div>
                <div className="pain-point-back">
                  <span className="solution-icon">✨</span>
                  <p className="pain-solution">{item.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section className="landing-section benefits-section">
        <div className="landing-container">
          <span className="section-badge">Why Parents Love It</span>
          <h2 className="landing-section-title">Built for Peace of Mind</h2>
          <div className="benefits-grid">
            {BENEFITS.map((benefit, index) => (
              <div key={index} className="benefit-card">
                <span className="benefit-icon">{benefit.icon}</span>
                <h3 className="benefit-title">{benefit.title}</h3>
                <p className="benefit-description">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT HELPS SECTION */}
      <section className="landing-section how-helps-section">
        <div className="landing-container">
          <div className="how-helps-content">
            <div className="how-helps-text">
              <span className="section-badge">The Magic</span>
              <h2 className="landing-section-title">Learning Disguised as Play</h2>
              <p className="section-description">
                When children pinch their fingers to draw, they're building the exact muscle memory needed for holding a pencil. When they trace letters, they're internalizing proper stroke order. When they pop bubbles, they're developing hand-eye coordination.
              </p>
              <p className="section-description">
                But to them? It's just a really fun game.
              </p>
            </div>
            <div className="how-helps-visual">
              {/* Could be an image or illustration */}
              <div className="visual-placeholder">
                <span style={{ fontSize: '4rem' }}>🎨</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="landing-section faq-section">
        <div className="landing-container">
          <h2 className="landing-section-title">Questions Parents Ask</h2>
          <div className="faq-list">
            {PARENT_FAQ.map((faq, index) => (
              <div
                key={index}
                className={`faq-item ${openFaq === index ? 'open' : ''}`}
              >
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-toggle">{openFaq === index ? '−' : '+'}</span>
                </button>
                {openFaq === index && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-section final-cta-section">
        <div className="landing-container">
          <div className="final-cta-content">
            <h2 className="cta-headline">Ready to Try It?</h2>
            <p className="cta-subhead">
              Free forever for families. Takes 30 seconds to start.
            </p>
            <button onClick={() => setTryFreeOpen(true)} className="landing-btn landing-btn-primary landing-btn-large border-none cursor-pointer">
              Launch Draw in the Air
            </button>
            <p className="cta-note">No signup • No download • No credit card</p>
          </div>
        </div>
      </section>

      <Footer />
      <TryFreeModal open={tryFreeOpen} onClose={() => setTryFreeOpen(false)} />
    </div>
  );
};
