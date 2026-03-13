
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity,
  Monitor,
  TrendingUp,
  Brain,
  Users,
  Building2,
  Radio,
  CreditCard,
  Puzzle,
  Server,
  ArrowLeft,
} from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { Logo } from '@/components/ui/logo';

export const metadata = {
  title: 'Command Center | Draw in the Air',
  description: 'Platform administration dashboard for Draw in the Air',
};

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require admin access
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/');
  }

  const gameUrl = process.env.NEXT_PUBLIC_GAME_URL || 'https://drawintheair.com';

  const sidebarItems: SidebarItem[] = [
    {
      label: 'Command Center',
      href: '/admin',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      label: 'Operations',
      href: '/admin/operations',
      icon: <Monitor className="w-4 h-4" />,
    },
    {
      label: 'Growth',
      href: '/admin/growth',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      label: 'Intelligence',
      href: '/admin/intelligence',
      icon: <Brain className="w-4 h-4" />,
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: 'Schools',
      href: '/admin/schools',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      label: 'Sessions',
      href: '/admin/sessions',
      icon: <Radio className="w-4 h-4" />,
    },
    {
      label: 'Billing',
      href: '/admin/billing',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      label: 'Content',
      href: '/admin/content',
      icon: <Puzzle className="w-4 h-4" />,
    },
    {
      label: 'System',
      href: '/admin/system',
      icon: <Server className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="border-b border-slate-200 px-6 py-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Logo size="sm" showIcon={true} />
            </Link>
          </div>

          {/* Admin Status Banner */}
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="rounded-lg bg-teal-950/50 border border-teal-700 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                <p className="text-xs font-semibold text-teal-200">
                  System Live
                </p>
              </div>
              <p className="text-xs text-teal-300 mt-2">Admin Access</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-slate-700 transition hover:bg-teal-950/50 hover:text-teal-400"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Admin Info */}
          <div className="border-t border-slate-200 px-4 py-4">
            <div className="rounded-lg bg-slate-100/50 p-3">
              <p className="text-xs font-semibold text-slate-700">
                {admin.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-xs text-slate-600 mt-1">Administrator</p>
            </div>
          </div>

          {/* Back to Game Link */}
          <div className="border-t border-slate-200 px-4 py-3">
            <a
              href={gameUrl}
              className="flex items-center gap-2 text-xs text-slate-600 hover:text-teal-400 transition"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to game
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-900">
                Command Center
              </h1>
              <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            </div>
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
              {admin.email?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

export default AdminLayout;
