import React from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import '../components/landing/landing.css';

export const Privacy: React.FC = () => {
  return (
    <div className="landing-page">
      <HeaderNav />
      <div className="landing-content-page">
        <section className="landing-section">
          <h1 className="landing-page-title">Privacy Policy</h1>
          <div className="landing-content-text">
            <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <h2>What data is processed</h2>
            <p>Draw In The Air processes camera data locally on your device to track hand movements. This processing happens entirely in your browser and is not transmitted to our servers or stored anywhere.</p>
            
            <h2>Camera processing</h2>
            <p>Camera processing happens on device only. The camera feed is used solely for hand tracking and gesture recognition. No video is recorded, saved, or transmitted.</p>
            
            <h2>No video storage</h2>
            <p>We do not save, store, or transmit any video footage. The camera is used in real time for gesture recognition only.</p>
            
            <h2>No child accounts</h2>
            <p>Draw In The Air does not require or create any user accounts. There is no registration, login, or personal information collection.</p>
            
            <h2>Analytics</h2>
            <p>We use minimal analytics to understand how the platform is used, such as which modes are most popular. This data is anonymised and aggregated. We do not track individual users or children.</p>
            
            <h2>Contact details</h2>
            <p>If you have questions about privacy, please contact us at:</p>
            <p>
              <strong>Email:</strong> <a href="mailto:privacy@drawintheair.com">privacy@drawintheair.com</a><br />
              <strong>Partnerships:</strong> <a href="mailto:partnership@drawintheair.com">partnership@drawintheair.com</a>
            </p>
            
            <h2>Data retention</h2>
            <p>Since we do not collect or store personal data, there is no data to retain. Any analytics data is anonymised and may be retained for up to 24 months for service improvement purposes.</p>
            
            <h2>User rights</h2>
            <p>Under UK GDPR, you have the right to:</p>
            <ul className="landing-content-list">
              <li>Know what data is processed (as described above)</li>
              <li>Request access to any data we hold (we hold no personal data)</li>
              <li>Request deletion of data (not applicable as we do not store personal data)</li>
              <li>Object to processing (you can simply not use the platform)</li>
            </ul>
            
            <h2>Changes to this policy</h2>
            <p>We may update this privacy policy from time to time. The date at the top indicates when it was last updated.</p>
          </div>
        </section>
      </div>
      <Footer />
      <BackToTop />
    </div>
  );
};

