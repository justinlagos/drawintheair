import React from 'react';
import { HeaderNav } from '../components/landing/HeaderNav';
import { Footer } from '../components/landing/Footer';
import { BackToTop } from '../components/landing/BackToTop';
import '../components/landing/landing.css';

export const Terms: React.FC = () => {
  return (
    <div className="landing-page">
      <HeaderNav />
      <div className="landing-content-page">
        <section className="landing-section">
          <h1 className="landing-page-title">Terms of Use</h1>
          <div className="landing-content-text">
            <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <h2>Acceptable use</h2>
            <p>Draw In The Air is designed for educational use in schools and early years settings. You may use the platform for:</p>
            <ul className="landing-content-list">
              <li>Educational activities with children</li>
              <li>Classroom demonstrations</li>
              <li>Pilot programs and testing</li>
            </ul>
            <p>You may not use the platform for any illegal, harmful, or inappropriate purposes.</p>
            
            <h2>School supervised use</h2>
            <p>Draw In The Air is designed to be used under adult supervision in educational settings. Schools are responsible for:</p>
            <ul className="landing-content-list">
              <li>Ensuring appropriate supervision during use</li>
              <li>Following their own safeguarding policies</li>
              <li>Obtaining any necessary permissions from parents or guardians</li>
              <li>Ensuring the platform is used in a safe and appropriate manner</li>
            </ul>
            
            <h2>No warranties</h2>
            <p>Draw In The Air is provided "as is" without any warranties, express or implied. We do not guarantee that the platform will be error free, uninterrupted, or meet your specific requirements.</p>
            
            <h2>Liability limits</h2>
            <p>To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of Draw In The Air. Our total liability is limited to the amount you have paid to use the platform (which is currently zero, as the platform is free to use).</p>
            
            <h2>Changes to service</h2>
            <p>We may modify, update, or discontinue Draw In The Air at any time. We will endeavour to provide notice of significant changes, but are not obligated to do so.</p>
            
            <h2>Contact</h2>
            <p>If you have questions about these terms, please contact us at:</p>
            <p>
              <strong>Email:</strong> <a href="mailto:terms@drawintheair.com">terms@drawintheair.com</a><br />
              <strong>Partnerships:</strong> <a href="mailto:partnership@drawintheair.com">partnership@drawintheair.com</a>
            </p>
          </div>
        </section>
      </div>
      <Footer />
      <BackToTop />
    </div>
  );
};

