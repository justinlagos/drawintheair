import React, { useState } from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import { submitLead } from '../lib/leads';
import '../components/landing/landing.css';

export const Schools: React.FC = () => {
  const [formData, setFormData] = useState({
    schoolName: '',
    contactName: '',
    role: '',
    email: '',
    yearGroup: '',
    deviceType: '',
    sendConsiderations: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/pilot-pack.pdf';
    link.download = 'Draw-In-The-Air-Pilot-Pack.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await submitLead({
        type: 'school_pack_request',
        ...formData
      });
      setSubmitted(true);
      setFormData({
        schoolName: '',
        contactName: '',
        role: '',
        email: '',
        yearGroup: '',
        deviceType: '',
        sendConsiderations: ''
      });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Failed to submit:', error);
      alert('There was an error submitting your request. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="landing-page">
      <HeaderNav />
      <div className="landing-content-page">
        {/* Hero */}
        <section className="landing-section">
          <h1 className="landing-page-title">For Schools</h1>
          <p className="landing-hero-subhead" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 2rem' }}>
            A camera based learning playground designed for early years classrooms. EYFS aligned, inclusive, and safe.
          </p>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <button 
              className="landing-btn landing-btn-primary landing-btn-large"
              onClick={handleDownload}
            >
              Download the pilot pack
            </button>
          </div>
        </section>

        {/* What it is */}
        <section className="landing-section">
          <h2 className="landing-section-title">What it is</h2>
          <div className="landing-content-text">
            <p>Draw In The Air is a browser based learning platform that uses hand tracking to let children draw, trace, and play without touching a screen. It works with any device that has a camera and runs in a web browser.</p>
            <p>Children use simple hand gestures to interact: wave to start, pinch to draw and select, open hand to pause. No touch screens, no controllers, just natural movement.</p>
          </div>
        </section>

        {/* Who it's for */}
        <section className="landing-section">
          <h2 className="landing-section-title">Who it is for</h2>
          <div className="landing-content-text">
            <p>Designed for early years settings, particularly Reception and Year 1, but can be adapted for younger or older children. The activities support:</p>
            <ul className="landing-content-list">
              <li>Physical Development: Gross and fine motor skills through gesture control</li>
              <li>Literacy: Letter formation and early writing through tracing activities</li>
              <li>Communication and Language: Following instructions and understanding gestures</li>
              <li>PSED: Building confidence and social interaction through play</li>
            </ul>
          </div>
        </section>

        {/* Gesture Controls */}
        <section className="landing-section">
          <h2 className="landing-section-title">Gesture controls</h2>
          <div className="landing-content-text">
            <div className="landing-gesture-grid">
              <div className="landing-gesture-item">
                <h3>Wave to start</h3>
                <p>Move hand side to side to begin</p>
              </div>
              <div className="landing-gesture-item">
                <h3>Pinch to draw and select</h3>
                <p>Bring thumb and index finger together to activate</p>
              </div>
              <div className="landing-gesture-item">
                <h3>Open hand to pause</h3>
                <p>Spread fingers wide to pause the activity</p>
              </div>
            </div>
          </div>
        </section>

        {/* Modes Overview */}
        <section className="landing-section">
          <h2 className="landing-section-title">Modes overview</h2>
          <div className="landing-modes-overview">
            <div className="landing-mode-overview-item">
              <img 
                src="https://i.postimg.cc/90Yn6Z21/Free_Paint.png" 
                srcSet="https://i.postimg.cc/90Yn6Z21/Free_Paint.png 1x, https://i.postimg.cc/90Yn6Z21/Free_Paint.png 2x"
                alt="Free Paint" 
                className="landing-mode-overview-img"
                decoding="async"
              />
              <h3>Free Paint</h3>
              <p>Creative drawing, control, confidence</p>
            </div>
            <div className="landing-mode-overview-item">
              <img 
                src="https://i.postimg.cc/rsNPBxT9/Tracing.png" 
                srcSet="https://i.postimg.cc/rsNPBxT9/Tracing.png 1x, https://i.postimg.cc/rsNPBxT9/Tracing.png 2x"
                alt="Tracing" 
                className="landing-mode-overview-img"
                decoding="async"
              />
              <h3>Tracing A to Z</h3>
              <p>Letter formation, fine motor, early writing</p>
            </div>
            <div className="landing-mode-overview-item">
              <img 
                src="https://i.postimg.cc/RhBYpGkh/Balloons.png" 
                srcSet="https://i.postimg.cc/RhBYpGkh/Balloons.png 1x, https://i.postimg.cc/RhBYpGkh/Balloons.png 2x"
                alt="Bubble Pop" 
                className="landing-mode-overview-img"
                decoding="async"
              />
              <h3>Bubble Pop</h3>
              <p>Attention, reaction, hand control</p>
            </div>
            <div className="landing-mode-overview-item">
              <img 
                src="https://i.postimg.cc/ZnSQsjGV/sort_and_place.png" 
                srcSet="https://i.postimg.cc/ZnSQsjGV/sort_and_place.png 1x, https://i.postimg.cc/ZnSQsjGV/sort_and_place.png 2x"
                alt="Sort and Place" 
                className="landing-mode-overview-img"
                decoding="async"
              />
              <h3>Sort and Place</h3>
              <p>Maths foundations, categorising, spatial awareness</p>
            </div>
            <div className="landing-mode-overview-item">
              <img 
                src="https://i.postimg.cc/WzwHBgVn/wordsearch.png" 
                srcSet="https://i.postimg.cc/WzwHBgVn/wordsearch.png 1x, https://i.postimg.cc/WzwHBgVn/wordsearch.png 2x"
                alt="Word Search" 
                className="landing-mode-overview-img"
                decoding="async"
              />
              <h3>Word Search</h3>
              <p>Early reading and pattern spotting (In development)</p>
            </div>
          </div>
        </section>

        {/* EYFS Alignment */}
        <section id="eyfs-mapping" className="landing-section">
          <h2 className="landing-section-title">EYFS alignment</h2>
          <div className="landing-content-text">
            <p>Draw In The Air is built around Early Years Foundation Stage outcomes, with a focus on Physical Development and early Literacy.</p>
            <div className="landing-eyfs-tiles" style={{ marginTop: '2rem' }}>
              <div className="landing-eyfs-tile">Physical Development</div>
              <div className="landing-eyfs-tile">Literacy</div>
              <div className="landing-eyfs-tile">Communication and Language</div>
              <div className="landing-eyfs-tile">PSED</div>
            </div>
          </div>
        </section>

        {/* Classroom Routines */}
        <section className="landing-section">
          <h2 className="landing-section-title">Classroom routines</h2>
          <div className="landing-content-text">
            <p>Draw In The Air works best when integrated into your existing classroom routines:</p>
            <ul className="landing-content-list">
              <li>Use during focused activity time, with small groups or individual children</li>
              <li>Can be used as a reward or transition activity</li>
              <li>Works well for children who need movement breaks</li>
              <li>Adult supervision recommended, especially for first sessions</li>
            </ul>
          </div>
        </section>

        {/* Setup Requirements */}
        <section className="landing-section">
          <h2 className="landing-section-title">Setup requirements</h2>
          <div className="landing-content-text">
            <ul className="landing-content-list">
              <li>Device with a camera (laptop, tablet, or desktop with webcam)</li>
              <li>Modern web browser (Chrome, Edge, Safari, or Firefox)</li>
              <li>Camera permission granted in browser</li>
              <li>Good lighting so the camera can see hand movements clearly</li>
              <li>Space for children to stand 1-2 meters from the camera</li>
            </ul>
          </div>
        </section>

        {/* Safety and Privacy */}
        <section className="landing-section">
          <h2 className="landing-section-title">Safety and privacy</h2>
          <div className="landing-content-text">
            <ul className="landing-content-list">
              <li>Camera is used only for hand tracking</li>
              <li>No video is saved</li>
              <li>No child accounts</li>
              <li>No ads</li>
              <li>Adult gate for settings and exit</li>
              <li>Camera processing happens locally in the browser</li>
            </ul>
            <p style={{ marginTop: '1.5rem' }}>
              <a href="/privacy" className="landing-link-btn">Read our full privacy policy</a>
            </p>
          </div>
        </section>

        {/* Partnership */}
        <section className="landing-section">
          <h2 className="landing-section-title">Partnership</h2>
          <div className="landing-content-text">
            <p>We are looking for 3 to 5 schools to trial the platform and help shape the next release. As a pilot partner, you will:</p>
            <ul className="landing-content-list">
              <li>Get early access to new features</li>
              <li>Have direct input into development priorities</li>
              <li>Receive dedicated support</li>
              <li>Help us understand what works best in real classrooms</li>
            </ul>
          </div>
        </section>

        {/* Timeline */}
        <section className="landing-section">
          <h2 className="landing-section-title">Timeline</h2>
          <div className="landing-content-text">
            <p>The pilot program runs for 6-8 weeks, with regular check-ins and feedback sessions. We will work with you to understand how Draw In The Air fits into your setting and what improvements would be most valuable.</p>
          </div>
        </section>

        {/* Pilot CTA */}
        <section className="landing-section">
          <h2 className="landing-section-title">Request a pilot</h2>
          <div className="landing-pilot-form-container">
            {submitted ? (
              <div className="landing-pilot-success">
                <svg className="landing-success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Thank you! We'll be in touch soon.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="landing-pilot-form-full">
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="School name *"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Contact name *"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Role *"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                />
                <input
                  type="email"
                  className="landing-pilot-input"
                  placeholder="Email *"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Year group"
                  value={formData.yearGroup}
                  onChange={(e) => setFormData({ ...formData, yearGroup: e.target.value })}
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Device type"
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                />
                <textarea
                  className="landing-pilot-input"
                  placeholder="SEND considerations (optional)"
                  value={formData.sendConsiderations}
                  onChange={(e) => setFormData({ ...formData, sendConsiderations: e.target.value })}
                  rows={3}
                />
                <button 
                  type="submit" 
                  className="landing-btn landing-btn-primary landing-btn-large"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Request school pilot pack'}
                </button>
              </form>
            )}
            <p className="landing-pilot-privacy">We only use this to contact you about pilots</p>
          </div>
        </section>
      </div>
      <Footer />
      <BackToTop />
    </div>
  );
};

