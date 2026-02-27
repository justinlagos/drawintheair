import React from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';

export const Cookies: React.FC = () => {
  return (
    <LegalPageLayout heroTitle="Cookie Policy">
      <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <h2>Essential cookies</h2>
      <p>Draw In The Air uses essential cookies to ensure the platform functions correctly. These cookies are necessary for the platform to work and cannot be disabled.</p>

      <h2>Preference cookies</h2>
      <p>We do not currently use preference cookies. If we introduce them in the future, we will update this policy and provide controls to manage them.</p>

      <h2>Cookie control</h2>
      <p>Since we only use essential cookies, there are no cookie preferences to manage. All cookies used are necessary for the platform to function.</p>

      <h2>Third party cookies</h2>
      <p>We do not use third party cookies for advertising or tracking purposes.</p>

      <h2>Contact</h2>
      <p>If you have questions about cookies, please contact us at:</p>
      <p>
        <strong>Email:</strong> <a href="mailto:help@drawintheair.com">help@drawintheair.com</a>
      </p>
    </LegalPageLayout>
  );
};
