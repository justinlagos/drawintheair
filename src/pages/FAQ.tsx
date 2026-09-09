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
        answer: 'It is built for laptops, desktops, and Chromebooks with a webcam. Some tablets with a front-facing camera can run it in the browser, but tracking quality and screen size are better on a computer. Chrome and Edge work best.',
      },
      {
        question: 'Does it require a strong internet connection?',
        answer: 'You need a working internet connection while playing. Hand tracking itself runs on the device, but the app needs the connection to load, to save progress, and to run class sessions. A normal school or home broadband connection is enough.',
      },
      {
        question: 'What if the camera does not work?',
        answer: 'Check that your browser has permission to access the camera. Look for a camera icon in the address bar and ensure it is set to "Allow". Chrome and Edge work best, some browsers require HTTPS for camera access.',
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
        answer: 'Classroom Mode lets a teacher run a whole-class session with a live leaderboard. Students join with a 4-digit code and a first name or nickname, no accounts needed. The teacher sees all students\' scores in real time. It is included in the free classroom pilot.',
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
        answer: 'We never store or transmit camera video. All camera processing happens in the browser on the device and there are no child accounts. If a parent or teacher adds a learner, we store a first name or nickname, an age band, and activity progress so reports can be shown to that adult. See the Privacy Policy for details.',
      },
      {
        question: 'Is the camera recording our children?',
        answer: 'No. The camera is used only for real-time hand-tracking, it detects hand position and gesture locally on the device. No video stream is recorded, stored, or sent anywhere.',
      },
      {
        question: 'Is it GDPR compliant?',
        answer: 'We follow UK GDPR. We hold parent and teacher account details (an email address) and, for learners that an adult adds, a first name or nickname, an age band, and progress. Parents can view, export, and delete this data from their account page, and teachers can remove any child and all their data from their dashboard. Schools remain the data controller for their pupils and we act as processor.',
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
        answer: 'A laptop, desktop, or Chromebook with a webcam and a modern browser. Some tablets can run it. Phones are not supported for play; on a phone we offer to email you a link to open on a laptop.',
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
    <LegalPageLayout heroTitle="Frequently Asked Questions">
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
        <p style={s.contactP}>Our team is happy to help, especially if you're a school considering Draw in the Air.</p>
        <a href="mailto:partnership@drawintheair.com" style={s.ctaBtn}>Contact Us</a>
      </div>
    </LegalPageLayout>
  );
};
