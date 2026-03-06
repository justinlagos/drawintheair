import React from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';

export const Privacy: React.FC = () => {
  return (
    <LegalPageLayout heroTitle="Privacy Policy">
      <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <h2>Overview</h2>
      <p>Draw In The Air is designed with privacy as a core principle, not an afterthought. We do not collect personal data about children, require accounts, or store any video footage. This policy explains exactly what we do and do not do.</p>

      <h2>Camera and hand tracking</h2>
      <p>The application uses your device's camera to detect and track hand positions in real time. This processing runs entirely inside your browser using on-device AI (MediaPipe). The camera feed is analysed locally — no video frames, images, or hand position data are ever transmitted to our servers or stored anywhere. The moment a frame has been processed, it is discarded from memory. We have no access to what the camera sees.</p>

      <h2>No video storage</h2>
      <p>We do not record, save, store, or transmit any video footage under any circumstances. The camera is used exclusively for real-time gesture recognition inside your browser session.</p>

      <h2>No child accounts or personal information</h2>
      <p>Draw In The Air does not require any user registration or login. Children do not create accounts and we do not ask for names, ages, email addresses, or any other personal information. There are no profiles, no saved progress tied to identities, and no data that could identify an individual child.</p>

      <h2>Analytics</h2>
      <p>We collect anonymised, aggregated usage analytics to help us understand how the platform is used — for example, which game modes are most popular or how long typical sessions last. These events are generated without any personally identifiable information and are transmitted securely to Draw in the Air's own analytics backend. We do not use Google Analytics, Meta Pixel, or any third-party advertising or tracking services. Analytics data cannot be tied to an individual user or child.</p>

      <h2>Cookies</h2>
      <p>We use only essential, functional cookies necessary to operate the service. We do not use advertising, tracking, or profiling cookies. No cookie data is shared with third parties.</p>

      <h2>Third-party services</h2>
      <p>The hand-tracking model (MediaPipe) is loaded from Google's CDN on first use. No user data is sent to Google as part of this process — only the model weights are downloaded to your device. Beyond this, we do not integrate any third-party advertising, analytics, or social media services that would receive user data.</p>

      <h2>School and COPPA compliance</h2>
      <p>Because we do not collect, process, or store personally identifiable information from children, Draw In The Air is designed to be inherently compliant with COPPA (US), UK GDPR, and similar child data protection frameworks. Schools and parents can use the platform without parental consent workflows for data collection, as no personal data is collected.</p>

      <h2>Data retention</h2>
      <p>Since we do not collect personal data, there is nothing personal to retain. Anonymised analytics data may be retained for up to 24 months for service improvement purposes and is then deleted.</p>

      <h2>User rights</h2>
      <p>Under UK GDPR, you have the right to: know what data is processed about you (as described above); request access to any personal data we hold (we hold none); request deletion of personal data (not applicable — we store no personal data); and object to processing (you can simply stop using the platform, which has no ongoing effect on any data).</p>

      <h2>Contact</h2>
      <p>If you have questions about this privacy policy or how we handle data, please contact:</p>
      <p>
        <strong>Email:</strong> <a href="mailto:help@drawintheair.com">help@drawintheair.com</a><br />
        <strong>Schools and partnerships:</strong> <a href="mailto:partnership@drawintheair.com">partnership@drawintheair.com</a>
      </p>

      <h2>Changes to this policy</h2>
      <p>We may update this privacy policy from time to time. The date at the top of this page reflects when it was last revised. We will not reduce your privacy protections without notice.</p>
    </LegalPageLayout>
  );
};
