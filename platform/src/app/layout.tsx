import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://drawintheair.com'),
  title: {
    default: 'Draw in the Air – Gesture Learning for Early Years',
    template: '%s | Draw in the Air',
  },
  description: 'Gesture-based learning platform for early years. Children draw letters, numbers, and shapes in the air using just their hands. No apps, no downloads.',
  keywords: ['gesture learning', 'early years', 'EYFS', 'letter tracing', 'movement learning', 'classroom activities'],
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  themeColor: '#FFFAEB',
  openGraph: {
    title: 'Draw in the Air – Gesture Learning for Early Years',
    description: 'Children draw letters, numbers, and shapes in the air. No apps, no downloads.',
    type: 'website',
    siteName: 'Draw in the Air',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Draw in the Air — Movement learning for ages 3–11' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Draw in the Air – Gesture Learning for Early Years',
    description: 'Children draw letters, numbers, and shapes in the air. No apps, no downloads.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
