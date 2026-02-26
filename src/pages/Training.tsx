import React from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import '../components/landing/landing.css';

export const Training: React.FC = () => {
  return (
    <div className="landing-page">
      <HeaderNav />
      <div className="landing-content-page">
        <section className="landing-section">
          <h1 className="landing-page-title">Teacher Training Manual</h1>
          <div className="landing-content-text">
            <p><strong>Version:</strong> 1.0</p>
            <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <h2>Introduction</h2>
            <p>This manual provides comprehensive guidance for teachers and early years practitioners using Draw In The Air in their settings.</p>
            
            <h2>Getting Started</h2>
            <p>Before your first session, ensure you have:</p>
            <ul className="landing-content-list">
              <li>A device with a camera (laptop, tablet, or desktop with webcam)</li>
              <li>A modern web browser (Chrome, Edge, Safari, or Firefox)</li>
              <li>Camera permission granted in the browser</li>
              <li>Good lighting in the space</li>
              <li>Enough room for children to stand 1-2 meters from the camera</li>
            </ul>
            
            <h2>Setting Up</h2>
            <p>1. Open Draw In The Air in your browser</p>
            <p>2. Grant camera permission when prompted</p>
            <p>3. Position the camera so it can see the child's hands clearly</p>
            <p>4. Ensure good lighting - avoid backlighting from windows</p>
            <p>5. Test the setup by waving your hand - you should see the cursor respond</p>
            
            <h2>Using the Platform</h2>
            <p>Draw In The Air uses simple hand gestures:</p>
            <ul className="landing-content-list">
              <li><strong>Wave to start:</strong> Move hand side to side to begin</li>
              <li><strong>Pinch to draw and select:</strong> Bring thumb and index finger together</li>
              <li><strong>Open hand to pause:</strong> Spread fingers wide</li>
            </ul>
            
            <h2>Activity Modes</h2>
            <p>Each mode supports different learning outcomes:</p>
            <ul className="landing-content-list">
              <li><strong>Free Paint:</strong> Creative expression and motor control</li>
              <li><strong>Tracing A to Z:</strong> Letter formation and early writing</li>
              <li><strong>Bubble Pop:</strong> Attention, reaction, and hand control</li>
              <li><strong>Sort and Place:</strong> Categorising and spatial awareness</li>
              <li><strong>Word Search:</strong> Early reading and pattern recognition (in development)</li>
            </ul>
            
            <h2>Best Practices</h2>
            <ul className="landing-content-list">
              <li>Start with short sessions (5-10 minutes) and build up</li>
              <li>Use during focused activity time with small groups</li>
              <li>Provide clear instructions and demonstrate gestures</li>
              <li>Encourage children and celebrate their efforts</li>
              <li>Adapt activities to individual needs and abilities</li>
            </ul>
            
            <h2>Troubleshooting</h2>
            <p><strong>Camera not working:</strong> Check browser permissions and ensure camera is not in use by another application.</p>
            <p><strong>Tracking not accurate:</strong> Improve lighting, ensure child is within 1-2 meters, use a plain background.</p>
            <p><strong>Child struggling:</strong> Provide encouragement, demonstrate gestures, consider starting with easier activities.</p>
            
            <h2>Support</h2>
            <p>For additional support or questions, contact:</p>
            <p>
              <strong>Email:</strong> support@placeholder.com<br />
              <strong>Training enquiries:</strong> training@placeholder.com
            </p>
          </div>
        </section>
      </div>
      <Footer />
      <BackToTop />
    </div>
  );
};

