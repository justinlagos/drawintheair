import React from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';

export const Privacy: React.FC = () => {
  return (
    <LegalPageLayout heroTitle="Privacy Policy">
      <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <h2>Overview</h2>
      <p>Draw In The Air is built to be careful with data, and honest about the data it does use. The most important promise is simple: your child's camera video is processed on the device and is never uploaded, recorded, or stored. To make family and classroom features work, we do store some account and progress information, and we use analytics tools to understand and improve the product. This policy explains exactly what we do.</p>

      <h2>Camera and hand tracking</h2>
      <p>The application uses your device's camera to detect and track hand positions in real time. This processing runs entirely inside your browser using on-device AI (MediaPipe). The camera feed is analysed locally, no video frames, images, or hand position data are ever transmitted to our servers or stored anywhere. The moment a frame has been processed, it is discarded from memory. We have no access to what the camera sees, and we never record, save, or transmit any video.</p>

      <h2>Accounts and children</h2>
      <p>Children do not create accounts and never log in. To use classroom mode, a child joins with a short on-screen code, with no account and no personal details.</p>
      <p>A parent or teacher can create an account (email address and password) to save progress and manage settings. When a parent adds a learner, we store a nickname you choose and a coarse age band, so activities can be pitched at the right level and progress can be shown back to you. We do not ask for a child's real name, and you can delete a learner or your whole account at any time (see User rights below).</p>

      <h2>Progress and learning data</h2>
      <p>For signed-in families and classrooms, we store learning activity, such as which activities were played, attempts and completions, and simple progress summaries, so we can show reports and recommend what to try next. This data is protected by row-level security so a parent or teacher can only see their own learners.</p>

      <h2>Analytics and measurement</h2>
      <p>We use analytics to understand how the platform is used and to improve it. Alongside our own event analytics (hosted on Supabase in the EU), we use the following third-party tools: Google Analytics 4, Microsoft Clarity, PostHog, and the Meta (Facebook) Pixel for measuring the effectiveness of our marketing. These tools may set cookies and collect usage and device information.</p>
      <p>We do not send child camera video, audio, or images to any analytics tool, and we do not sell personal data. Where required, non-essential analytics and marketing tools should only run with your consent; you can also limit them using your browser and device privacy controls.</p>

      <h2>Cookies and local storage</h2>
      <p>We use essential cookies and local storage to operate the service (for example, to keep you signed in and to remember which learner is playing). We also use non-essential analytics and marketing cookies through the third-party tools listed above. You can clear cookies and site data at any time through your browser settings.</p>

      <h2>Third-party services</h2>
      <p>The hand-tracking model (MediaPipe) is loaded from Google's CDN on first use; only the model weights are downloaded to your device and no user data is sent as part of that. We also use Supabase (EU) to host our backend and Stripe to process subscription payments. The analytics and marketing providers listed above receive usage and device data as described.</p>

      <h2>Children's privacy, COPPA and UK GDPR</h2>
      <p>We take children's privacy seriously and aim to follow UK GDPR, COPPA, and similar frameworks. Accounts are created and managed by adults (parents or teachers), and children do not provide personal information directly. Schools acting as data controllers should follow their own data-protection processes when introducing new tools. If you have any questions about lawful basis or a data-processing agreement, contact us using the details below.</p>

      <h2>Data retention</h2>
      <p>Account, learner, and progress data is kept while your account is active and is deleted when you delete a learner or close your account. Event-level analytics and learning attempts are automatically deleted after 365 days by a scheduled job. We may keep anonymised, aggregated summaries for reporting.</p>

      <h2>User rights</h2>
      <p>Under UK GDPR you have the right to access the personal data we hold about you, to correct it, to request its deletion, and to object to or restrict certain processing. You can delete a learner or your account from your account settings, or contact us and we will help. For details on deletion, see your account area.</p>

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
