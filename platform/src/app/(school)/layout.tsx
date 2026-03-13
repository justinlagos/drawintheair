
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  ArrowLeft,
} from 'lucide-react';
import { requireAuth, getTeacher } from '@/lib/auth/session';
import { Logo } from '@/components/ui/logo';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'School Admin | Draw in the Air',
  description: 'School administration dashboard for Draw in the Air',
};

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require authentication
  const session = await requireAuth();
  if (!session) {
    redirect('/auth/login');
  }

  // Get teacher profile
  const teacher = await getTeacher();
  if (!teacher) {
    redirect('/auth/login');
  }

  // Verify school access
  if (!teacher.school_id) {
    redirect('/');
  }

  // Get school details from Supabase
  const supabase = createClient();
  const { data: schoolData } = await supabase
    .from('schools')
    .select('id, name')
    .eq('id', teacher.school_id)
    .single();

  const schoolName = schoolData?.name || 'School Admin';
  const gameUrl = process.env.NEXT_PUBLIC_GAME_URL || 'https://drawintheair.com';

  const sidebarItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      href: '/school',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: 'Teachers',
      href: '/school/teachers',
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: 'Analytics',
      href: '/school/analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      label: 'Settings',
      href: '/school/settings',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      label: 'Billing',
      href: '/school/billing',
      icon: <CreditCard className="w-4 h-4" />,
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

          {/* School Info Banner */}
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="rounded-lg bg-slate-100/50 p-3">
              <p className="text-xs font-semibold text-slate-700">School Admin</p>
              <p className="text-sm text-slate-600 mt-2 font-medium truncate">
                {schoolName}
              </p>
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
                {teacher.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-xs text-slate-600 mt-1">School Account</p>
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
            <h1 className="text-lg font-semibold text-slate-900">
              {schoolName}
            </h1>
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
              {schoolName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

export default SchoolLayout;
