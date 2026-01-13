import React, { useState, useEffect } from 'react';
import './landing.css';

const TESTIMONIALS = [
  {
    quote: "My daughter asks to practice her letters now. I never thought I'd see the day!",
    author: "Sarah M.",
    role: "Parent of 5-year-old",
    avatar: "👩"
  },
  {
    quote: "Finally, screen time I don't feel guilty about. The kids are actually learning.",
    author: "James K.",
    role: "Father of two",
    avatar: "👨"
  },
  {
    quote: "The hand tracking is so intuitive. Even our 4-year-olds picked it up immediately.",
    author: "Emma R.",
    role: "Reception Teacher",
    avatar: "👩‍🏫"
  },
  {
    quote: "EYFS-aligned and zero IT setup? This is exactly what we needed.",
    author: "David L.",
    role: "Primary School Head",
    avatar: "👨‍💼"
  }
];

const STATS = [
  { value: '10,000+', label: 'Letters Traced' },
  { value: '50+', label: 'Pilot Schools' },
  { value: '4.8★', label: 'Parent Rating' },
  { value: '2 min', label: 'Setup Time' }
];

export const SocialProof: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <section className="landing-section landing-social-proof">
      <div className="landing-container">
        {/* Stats Row */}
        <div className="proof-stats">
          {STATS.map((stat, i) => (
            <div key={i} className="stat-item">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
        
        {/* Testimonials Carousel */}
        <div className="testimonials-section">
          <h2 className="landing-section-title">Loved by Families & Educators</h2>
          
          <div className="testimonials-carousel">
            {TESTIMONIALS.map((testimonial, index) => (
              <div 
                key={index}
                className={`testimonial-card ${index === activeIndex ? 'active' : ''}`}
              >
                <div className="testimonial-quote">"{testimonial.quote}"</div>
                <div className="testimonial-author">
                  <span className="author-avatar">{testimonial.avatar}</span>
                  <div className="author-info">
                    <span className="author-name">{testimonial.author}</span>
                    <span className="author-role">{testimonial.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Carousel Indicators */}
          <div className="carousel-indicators">
            {TESTIMONIALS.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
