import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 – Page Not Found | Draw in the Air',
};

const gameUrl = process.env.NEXT_PUBLIC_GAME_URL || 'https://drawintheair.com';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center">
      {/* Logo */}
      <Link href="/" className="mb-10 hover:opacity-90 transition-opacity">
        <Logo size="md" showIcon={true} />
      </Link>

      {/* 404 */}
      <div className="relative mb-6">
        <span className="text-[120px] font-black text-slate-800 leading-none select-none">404</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl">✏️</span>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-slate-100">Page not found</h1>
      <p className="mt-3 max-w-md text-slate-400 leading-relaxed">
        This page doesn't exist or may have moved. Try going back to the home page or dashboard.
      </p>

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-300 hover:border-teal-700 hover:text-teal-400 transition-colors"
        >
          Teacher Dashboard
        </Link>
        <a
          href={`${gameUrl}/play`}
          className="text-sm font-medium text-slate-400 hover:text-teal-400 transition-colors"
        >
          Play Activities →
        </a>
      </div>

      {/* Quick links */}
      <nav className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {[
          { label: 'Pricing', href: '/pricing' },
          { label: 'For Teachers', href: '/for-teachers' },
          { label: 'For Schools', href: '/for-schools' },
          { label: 'Contact', href: '/contact' },
        ].map(({ label, href }) => (
          <Link key={href} href={href} className="text-sm text-slate-500 hover:text-teal-400 transition-colors">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
