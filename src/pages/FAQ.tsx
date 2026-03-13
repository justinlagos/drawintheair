import React, { useState } from 'react';
import { LegalPageLayout } from '../components/landing/LegalPageLayout';

interface FAQItemData {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  items: FAQItemData[];
}

const faqSections: FAQSection[] = [
  {
    title: 'General',
    items: [
      {
        question: 'Does it work on tablets?',
        answer: 'Yes. Draw In The Air works on tablets with a front-facing camera. It runs in the browser — no app installation needed. Chrome and Edge work best.',
      },
      {
        question: 'Does it require a strong internet connection?',
        answer: 'No. Once the page loads, all hand-tracking processing happens on the device. You only need internet for the initial page load.',
      },
      {
        question: 'What if the camera does not work?',
        answer: 'Check that your browser has permission to access the camera. Look for a camera icon in the address bar and ensure it is set to "Allow". Chrome and Edge work best — some browsers require HTTPS for camera access.',
      },
      {
        question: 'How long is a typical session?',
        answer: 'Sessions can be as short as 5 minutes or as long as 20 minutes, depending on the activity and the child\'s attention span. Activities are designed to be flexible and can be stopped at any time.',
      },
      {
        question: 'Does it work on interactive whiteboards?',
        answer: 'Yes, if the interactive whiteboard has a camera connected and the browser supports camera access. The experience works best when children can stand in front of the camera and use hand gestures.',
      },
    ],
  },
  {
    title: 'Schools & Teachers',
    items: [
      {
        question: 'Do we need parent permission?',
        answer: 'No. Draw In The Air does not collect or store any child data, so parent consent is not required for data protection purposes. However, schools should follow their own policies for using new technology with pupils.',
      },
      {
        question: 'Does it work with SEND pupils?',
        answer: 'Yes. Draw In The Air is designed for inclusive play and supports children with different needs. The gesture-based interaction can be particularly helpful for children who find touch screens or pencil grip challenging.',
      },
      {
        question: 'What is Classroom Mode?',
        answer: 'Classroom Mode lets a teacher run a whole-class session with a live leaderboard. Students join with a 4-digit code — no accounts needed. The teacher sees all students\' scores in real time. Available on the Teacher Pro plan.',
      },
      {
        question: 'Can we use it on school Chromebooks?',
        answer: 'Yes. Draw In The Air is specifically tested on Chromebooks and works well on the front-facing camera. Students do not need to install anything.',
      },
    ],
  },
  {
    title: 'Safety & Privacy',
    items: [
      {
        question: 'Do you store any child data?',
        answer: 'No. We do not collect, store, or transmit any child data. All camera processing happens locally in the browser on the device. No video is saved, and there are no child accounts.',
      },
      {
        question: 'Is the camera recording our children?',
        answer: 'No. The camera is used only for real-time hand-tracking — it detects hand position and gesture locally on the device. No video stream is recorded, stored, or sent anywhere.',
      },
      {
        question: 'Is it GDPR compliant?',
        answer: 'Yes. Because we do not collect or store any personal data from children or parents, there is nothing to process under GDPR. For teacher accounts on the platform, we process only the minimal data necessary to provide the service.',
      },
    ],
  },
  {
    title: 'Technical',
    items: [
      {
        question: 'What browsers are supported?',
        answer: 'Draw In The Air works best in Chrome, Edge, and Firefox. Safari on Mac and iPad is supported but may require granting camera permissions manually. Internet Explorer is not supported.',
      },
      {
        question: 'What devices are compatible?',
        answer: 'Any device with a front-facing camera and a modern browser: laptops, tablets, desktop computers with webcams, and Chromebooks. Mobile phones work but the experience is optimised for larger screens.',
      },
      {
        question: 'Does it need any software or plugins?',
        answer: 'No. Everything runs in the browser using WebAssembly and the browser\'s built-in camera API. No downloads, plugins, or software installation required.',
      },
    ],
  },
];

export const FAQ: React.FC = () => {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggle = (key: string) => setOpenItem(openItem === key ? null : key);

  const s = {
    sectionTitle: {
      fontSize: '1.05rem',
      fontWeight: 700,
      color: '#f97316',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      margin: '2.5rem 0 1rem',
      paddingBottom: '0.5rem',
      borderBottom: '2px solid #fed7aa',
    },
    item: {
      borderRadius: 10,
      border: '1px solid #e2e8f0',
      background: '#fff',
      marginBottom: 8,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    },
    itemOpen: {
      borderRadius: 10,
      border: '1px solid #f97316',
      background: '#fff',
      marginBottom: 8,
      overflow: 'hidden',
    },
    btn: {
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.97rem',
      fontWeight: 600,
      color: '#0f172a',
      textAlign: 'left' as const,
      gap: 12,
    },
    answer: {
      padding: '0 20px 18px',
      fontSize: '0.93rem',
      color: '#475569',
      lineHeight: 1.7,
    },
    toggle: (open: boolean): React.CSSProperties => ({
      fontSize: '1.3rem',
      color: open ? '#f97316' : '#94a3b8',
      fontWeight: 700,
      flexShrink: 0,
      lineHeight: 1,
    }),
    contactBox: {
      marginTop: '3rem',
      background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
      borderRadius: 14,
      padding: '2rem',
      textAlign: 'center' as const,
      border: '1px solid #fde68a',
    },
    contactH: { fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 },
    contactP: { fontSize: '0.93rem', color: '#64748b', marginBottom: 20 },
    ctaBtn: {
      display: 'inline-block',
      background: '#f97316',
      color: '#fff',
      borderRadius: 10,
      padding: '12px 28px',
      fontWeight: 700,
      textDecoration: 'none',
      fontSize: '0.95rem',
    },
  };

  return (
    <LegalPageLayout title="Frequently Asked Questions">
      {faqSections.map((section) => (
        <div key={section.title}>
          <div style={s.sectionTitle}>{section.title}</div>
          {section.items.map((item, idx) => {
            const key = `${section.title}-${idx}`;
            const open = openItem === key;
            return (
              <div key={key} style={open ? s.itemOpen : s.item}>
                <button style={s.btn} onClick={() => toggle(key)} aria-expanded={open}>
                  <span>{item.question}</span>
                  <span style={s.toggle(open)}>{open ? '−' : '+'}</span>
                </button>
                {open && <div style={s.answer}>{item.answer}</div>}
              </div>
            );
          })}
        </div>
      ))}

      <div style={s.contactBox}>
        <div style={s.contactH}>Still have a question?</div>
        <p style={s.contactP}>Our team is happy to help — especially if you're a school considering Draw in the Air.</p>
        <a href="mailto:partnership@drawintheair.com" style={s.ctaBtn}>Contact Us</a>
      </div>
    </LegalPageLayout>
  );
};
