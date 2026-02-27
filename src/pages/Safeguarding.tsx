import React from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';

export const Safeguarding: React.FC = () => {
  return (
    <LegalPageLayout heroTitle="Safeguarding">
      <p><strong>Last updated:</strong> {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <h2>Supervised use requirement</h2>
      <p>Draw In The Air is designed to be used under adult supervision in educational settings. We recommend that an adult is present during all sessions to ensure appropriate use and to support children as needed.</p>

      <h2>Adult gate purpose</h2>
      <p>The adult gate feature requires an adult to access settings and exit the platform. This helps ensure that children cannot accidentally change settings or exit the platform without supervision.</p>

      <h2>No ads, no child profiles</h2>
      <p>Draw In The Air does not display advertisements and does not create child profiles. There is no registration, login, or personal information collection. This helps protect children from inappropriate content and data collection.</p>

      <h2>What schools should do locally</h2>
      <p>Schools using Draw In The Air should:</p>
      <ul>
        <li>Follow their own safeguarding policies and procedures</li>
        <li>Ensure appropriate supervision during all sessions</li>
        <li>Obtain any necessary permissions from parents or guardians</li>
        <li>Report any concerns through their normal safeguarding channels</li>
        <li>Ensure the platform is used in a safe and appropriate physical environment</li>
        <li>Regularly review and update their risk assessments</li>
      </ul>

      <h2>Reporting concerns</h2>
      <p>If you have safeguarding concerns related to Draw In The Air, please:</p>
      <ul>
        <li>Follow your school's normal safeguarding procedures</li>
        <li>Contact your designated safeguarding lead</li>
        <li>If the concern is about the platform itself, contact us at <a href="mailto:help@drawintheair.com">help@drawintheair.com</a></li>
      </ul>

      <h2>Contact</h2>
      <p>For safeguarding enquiries, please contact:</p>
      <p>
        <strong>Email:</strong> <a href="mailto:help@drawintheair.com">help@drawintheair.com</a>
      </p>
    </LegalPageLayout>
  );
};
