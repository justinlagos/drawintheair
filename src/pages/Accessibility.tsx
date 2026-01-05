import React from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import '../components/landing/landing.css';

export const Accessibility: React.FC = () => {
  return (
    <div className="landing-page">
      <HeaderNav />
      <div className="landing-content-page">
        <section className="landing-section">
          <h1 className="landing-page-title">Accessibility</h1>
          <div className="landing-content-text">
            <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <h2>Supported devices and browsers</h2>
            <p>Draw In The Air works on:</p>
            <ul className="landing-content-list">
              <li>Desktop computers with webcams (Windows, Mac, Linux)</li>
              <li>Laptops with built-in cameras</li>
              <li>Tablets with front-facing cameras (iPad, Android tablets)</li>
              <li>Modern web browsers: Chrome, Edge, Safari, Firefox</li>
            </ul>
            
            <h2>Best practice setup guidance</h2>
            <p>For the best experience:</p>
            <ul className="landing-content-list">
              <li>Ensure good lighting so the camera can clearly see hand movements</li>
              <li>Position the camera so children can stand 1-2 meters away</li>
              <li>Use a plain background if possible to help with hand tracking</li>
              <li>Ensure children have enough space to move their arms freely</li>
              <li>Test the setup before using with children</li>
            </ul>
            
            <h2>Known limitations and how to mitigate</h2>
            <p><strong>Camera quality:</strong> Lower quality cameras may have reduced tracking accuracy. Use the best available camera and ensure good lighting.</p>
            <p><strong>Lighting:</strong> Poor lighting can affect hand tracking. Ensure the room is well lit, and avoid backlighting (bright windows behind the child).</p>
            <p><strong>Background:</strong> Busy backgrounds can sometimes confuse the tracking. Use a plain background when possible.</p>
            <p><strong>Distance:</strong> Children need to be within 1-2 meters of the camera. Ensure the camera is positioned appropriately.</p>
            <p><strong>Multiple children:</strong> The platform works best with one child at a time. For group activities, take turns.</p>
            
            <h2>Accessibility features</h2>
            <p>Draw In The Air is designed to be inclusive and can be adapted for children with different needs:</p>
            <ul className="landing-content-list">
              <li>Gesture-based interaction can be helpful for children who find touch screens challenging</li>
              <li>Activities can be adapted with adult support</li>
              <li>No reading required for most activities</li>
              <li>Visual and audio feedback supports understanding</li>
            </ul>
            
            <h2>Contact</h2>
            <p>If you have questions about accessibility or need support, please contact:</p>
            <p>
              <strong>Email:</strong> accessibility@placeholder.com
            </p>
          </div>
        </section>
      </div>
      <Footer />
      <BackToTop />
    </div>
  );
};

