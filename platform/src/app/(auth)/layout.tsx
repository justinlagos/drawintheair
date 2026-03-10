import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

export const metadata = {
  title: 'Sign In | Draw in the Air',
  description: 'Access your Draw in the Air account',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      {/* Logo */}
      <Link href="/" className="mb-8 hover:opacity-90 transition-opacity">
        <Logo size="lg" showIcon={true} />
      </Link>

      {/* Auth Card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-slate-500">
        By signing in, you agree to our{' '}
        <Link href="/terms" className="text-teal-400 hover:underline">Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy" className="text-teal-400 hover:underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
