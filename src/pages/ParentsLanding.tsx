/**
 * ParentsLanding — Kid-UI bright sky version (For Families / Parent Resources)
 */

import React from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';
import { KidButton } from '../components/kid-ui';
import { tokens } from '../styles/tokens';

const REASONS: { title: string; desc: string; icon: string; color: string; bg: string }[] = [
  { title: 'No accounts, ever', desc: 'Your child never makes a profile. Nothing personal to set up or worry about.', icon: '🚫', color: tokens.colors.deepPlum, bg: '#EAE0FB' },
  { title: 'No data leaves the device', desc: 'The camera processes locally. No frames sent to servers. No cloud storage.', icon: '🔒', color: tokens.colors.aqua, bg: '#D6F0FF' },
  { title: 'No ads or tracking', desc: 'No advertisers. No third-party trackers. No commercial messages aimed at children.', icon: '✕', color: tokens.colors.coral, bg: '#FFE2EC' },
  { title: 'Movement-first design', desc: 'Replaces passive scrolling with reaching, pinching, and tracing. Real motor exercise.', icon: '🤸', color: tokens.colors.meadowGreen, bg: '#DCF5C9' },
];

const SCREEN_TIME_TIPS = [
  { tip: 'Pair sessions with a real-life follow-up. Trace letters in the air, then on paper.', icon: '✍️' },
  { tip: 'Use Bubble Pop as a "between activities" movement break. 5 minutes is plenty.', icon: '🫧' },
  { tip: 'Sort & Place reinforces categorization. Talk about the categories together afterwards.', icon: '🧩' },
  { tip: 'Tracing mode is a great alternative to letter-formation worksheets for fidgety kids.', icon: '✏️' },
];

const FAQS = [
  { q: 'What ages is this for?', a: 'Activities are designed for children aged 3 to 7 (Nursery to Year 2). The gestures are accessible for younger kids, while the activity content scales with difficulty for older ones.' },
  { q: 'Do I need to install anything?', a: "No. Draw in the Air runs in any modern browser with a camera. Open the page, allow camera access, and you're playing in 10 seconds." },
  { q: 'Is the camera feed recorded?', a: "No. The camera is processed locally inside the browser using on-device AI. Frames are discarded the moment they're processed. Nothing is sent to any server." },
  { q: 'Will it work on our family iPad / Chromebook / laptop?', a: 'Yes — any device with a camera and a modern browser. We test on Chrome, Safari, Edge, and Firefox; on Mac, Windows, iPadOS, Android, and ChromeOS.' },
  { q: 'How much time should my child spend on it?', a: 'Like all screen time, balance is key. We recommend 5 to 15 minute sessions, paired with offline activities. The platform is designed for short, active bursts, not marathon sittings.' },
];

export const ParentsLanding: React.FC = () => {
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  return (
    <LegalPageLayout heroTitle="For families." eyebrow="For Families">
      <p style={{ fontSize: '1.15rem', textAlign: 'center', maxWidth: 640, margin: '0 auto 32px' }}>
        Active screen time you don't have to feel guilty about. No accounts, no ads, no recordings, no tracking. Just movement and play.
      </p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
        <a href="/play" style={{ textDecoration: 'none' }}>
          <KidButton variant="primary" size="lg">Try Free Now</KidButton>
        </a>
        <a href="/faq" style={{ textDecoration: 'none' }}>
          <KidButton variant="secondary" size="lg">FAQ</KidButton>
        </a>
      </div>

      <h2>Why families pick us</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 18, marginBottom: 36 }}>
        {REASONS.map((r) => (
          <div key={r.title} style={{ background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.12)', borderRadius: 20, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: r.bg, color: r.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 10 }}>
              {r.icon}
            </div>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>{r.title}</h3>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.55, opacity: 0.8, margin: 0 }}>{r.desc}</p>
          </div>
        ))}
      </div>

      <h2>Screen time tips that actually work</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 18, marginBottom: 36 }}>
        {SCREEN_TIME_TIPS.map((t, i) => (
          <div key={i} style={{ background: 'linear-gradient(165deg, #F4FAFF 0%, #E8DEFB 100%)', border: '2px solid rgba(108,63,164,0.10)', borderRadius: 18, padding: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>{t.icon}</div>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.55, margin: 0 }}>{t.tip}</p>
          </div>
        ))}
      </div>

      <h2>Frequently asked questions</h2>
      <div style={{ marginTop: 18, marginBottom: 16 }}>
        {FAQS.map((item, i) => (
          <div key={i} style={{ borderRadius: 16, border: `2px solid ${openFaq === i ? tokens.colors.deepPlum : 'rgba(108,63,164,0.12)'}`, background: '#FFFFFF', marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: tokens.fontFamily.display, fontSize: '1rem', fontWeight: 700, color: tokens.colors.charcoal, textAlign: 'left' }}>
              <span>{item.q}</span>
              <span style={{ color: tokens.colors.deepPlum, fontSize: '1.4rem', fontWeight: 700, flexShrink: 0, marginLeft: 12 }}>{openFaq === i ? '−' : '+'}</span>
            </button>
            {openFaq === i && <div style={{ padding: '0 18px 16px', fontSize: '0.93rem', lineHeight: 1.65, opacity: 0.85 }}>{item.a}</div>}
          </div>
        ))}
      </div>
    </LegalPageLayout>
  );
};

export default ParentsLanding;
