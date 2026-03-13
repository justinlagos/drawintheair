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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      {/* Logo */}
      <Link href="/" className="mb-8 hover:opacity-90 transition-opacity">
        <Logo size="lg" showIcon={true} />
      </Link>

      {/* Auth Card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-slate-600">
        By signing in, you agree to our{' '}
        <Link href="/terms" className="text-orange-600 hover:underline font-medium">Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy" className="text-orange-600 hover:underline font-medium">Privacy Policy</Link>.
      </p>
    </div>
  );
}
