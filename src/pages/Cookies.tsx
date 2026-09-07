import React from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';

export const Cookies: React.FC = () => {
  return (
    <LegalPageLayout heroTitle="Cookie Policy">
      <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <h2>Essential cookies</h2>
      <p>Draw In The Air uses essential cookies to ensure the platform functions correctly. These cookies are necessary for the platform to work and cannot be disabled.</p>

      <h2>Analytics and marketing cookies</h2>
      <p>We also use non-essential analytics and marketing tools: Google Analytics 4, Microsoft Clarity, PostHog, and the Meta (Facebook) Pixel. These may set cookies or use local storage. They only run after you accept them in the cookie banner. If you do not accept, they are not loaded.</p>

      <h2>Cookie control</h2>
      <p>Your choice in the cookie banner is stored in your browser. To change it, clear this site's data in your browser settings and the banner will show again. Essential cookies cannot be switched off because the service does not work without them.</p>

      <h2>Third party cookies</h2>
      <p>The analytics and marketing tools listed above are third party services and may set their own cookies once you have accepted them. We do not use them to show advertising to children inside the app.</p>

      <h2>Contact</h2>
      <p>If you have questions about cookies, please contact us at:</p>
      <p>
        <strong>Email:</strong> <a href="mailto:help@drawintheair.com">help@drawintheair.com</a>
      </p>
    </LegalPageLayout>
  );
};
