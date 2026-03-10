'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/ui/logo';
import { Menu, X } from 'lucide-react';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const gameUrl = process.env.NEXT_PUBLIC_GAME_URL || 'https://drawintheair.com';

  const navLinks = [
    { label: 'Activities', href: '/activities' },
    { label: 'For Schools', href: '/for-schools' },
    { label: 'For Teachers', href: '/for-teachers' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Blog', href: '/blog' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Sticky Header — white with soft border */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
              <Logo size="sm" showIcon={true} />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden items-center gap-3 md:flex">
              <a
                href={`${gameUrl}/play`}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors shadow-sm"
              >
                Try Free
              </a>
              <Link
                href="/auth/login"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-orange-400 hover:text-orange-600 transition-colors"
              >
                Teacher Login
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <nav className="space-y-1">
              {navLinks.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div className="mt-4 space-y-2 pt-4 border-t border-slate-100">
                <a
                  href={`${gameUrl}/play`}
                  className="block rounded-lg bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Try Free Activity
                </a>
                <Link
                  href="/auth/login"
                  className="block rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-medium text-slate-700 hover:border-orange-400 hover:text-orange-600 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Teacher Login
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Logo size="sm" showIcon={true} />
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                Gesture-based learning for early years. No apps. No downloads. Just a webcam and imagination.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</h3>
              <ul className="mt-4 space-y-2">
                {[
                  { label: 'Activities', href: '/activities' },
                  { label: 'Pricing', href: '/pricing' },
                  { label: 'Classroom Mode', href: '/for-teachers' },
                  { label: 'Blog', href: '/blog' },
                ].map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a href={`${gameUrl}/play`} className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                    Try Free
                  </a>
                </li>
              </ul>
            </div>

            {/* Educators */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Educators</h3>
              <ul className="mt-4 space-y-2">
                {[
                  { label: 'For Teachers', href: '/for-teachers' },
                  { label: 'For Schools', href: '/for-schools' },
                  { label: 'Teacher Login', href: '/auth/login' },
                  { label: 'Contact Us', href: '/contact' },
                ].map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legal & Support</h3>
              <ul className="mt-4 space-y-2">
                {[
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'About Us', href: '/about' },
                  { label: 'Contact', href: '/contact' },
                ].map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-slate-600 hover:text-orange-600 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} Draw in the Air. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                EYFS Aligned
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                🇬🇧 Made in the UK
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
