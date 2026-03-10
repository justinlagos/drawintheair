import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'Draw in the Air – Gesture Learning for Early Years',
    template: '%s | Draw in the Air',
  },
  description: 'Gesture-based learning platform for early years. Children draw letters, numbers, and shapes in the air using just their hands. No apps, no downloads.',
  keywords: ['gesture learning', 'early years', 'EYFS', 'letter tracing', 'movement learning', 'classroom activities'],
  openGraph: {
    title: 'Draw in the Air – Gesture Learning for Early Years',
    description: 'Children draw letters, numbers, and shapes in the air. No apps, no downloads.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
