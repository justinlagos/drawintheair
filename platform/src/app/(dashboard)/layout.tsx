
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  LayoutDashboard,
  History,
  Settings,
  Play,
  BarChart3,
  Sparkles,
  ListMusic,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { requireAuth, getTeacher } from '@/lib/auth/session';
import { Logo } from '@/components/ui/logo';
import {
  getTrialDaysRemaining,
  isExpired,
  isTrial,
  isPro,
  canAccessAnalytics,
  canSavePlaylists,
  canAccessInsights,
} from '@/lib/auth/tier';

export const metadata = {
  title: 'Dashboard | Draw in the Air',
  description: 'Teacher dashboard for Draw in the Air',
};

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  locked?: boolean;
}

async function DashboardLayout({
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

  // Get tier information
  const trialActive = isTrial(teacher);
  const trialExpired = isExpired(teacher);
  const trialDaysRemaining = getTrialDaysRemaining(teacher);
  const isProTier = isPro(teacher);
  const hasAnalytics = canAccessAnalytics(teacher);
  const hasInsights = canAccessInsights(teacher);
  const hasPlaylists = canSavePlaylists(teacher);

  // Determine tier badge
  let tierBadge = 'Free';
  if (trialActive) tierBadge = 'Trial';
  if (isProTier) tierBadge = 'Pro';

  // Build sidebar items based on tier
  const baseItems: SidebarItem[] = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: 'Sessions',
      href: '/dashboard/sessions',
      icon: <History className="w-4 h-4" />,
    },
  ];

  const proItems: SidebarItem[] = [
    {
      label: 'Classroom',
      href: '/classroom/start',
      icon: <Play className="w-4 h-4" />,
    },
    {
      label: 'Analytics',
      href: '/dashboard/analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      locked: !hasAnalytics,
    },
    {
      label: 'Insights',
      href: '/dashboard/insights',
      icon: <Sparkles className="w-4 h-4" />,
      locked: !hasInsights,
    },
    {
      label: 'Playlists',
      href: '/dashboard/playlists',
      icon: <ListMusic className="w-4 h-4" />,
      locked: !hasPlaylists,
    },
  ];

  const settingsItem: SidebarItem = {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings className="w-4 h-4" />,
  };

  const upgradeItem: SidebarItem = {
    label: 'Upgrade',
    href: '/dashboard/upgrade',
    icon: <Zap className="w-4 h-4" />,
  };

  // Construct sidebar items list
  let sidebarItems: SidebarItem[] = [...baseItems, ...proItems, settingsItem];
  if (!isProTier && !trialActive) {
    sidebarItems.push(upgradeItem);
  }

  const gameUrl = process.env.NEXT_PUBLIC_GAME_URL || 'https://drawintheair.com';

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

          {/* Trial Banner */}
          {(trialActive || trialExpired) && (
            <div className="border-b border-slate-200 px-4 py-4">
              {trialExpired ? (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-xs font-semibold text-red-900">Trial Expired</p>
                  <p className="text-xs text-red-700 mt-1">
                    Upgrade to Pro to continue.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-xs font-semibold text-emerald-900">
                    Trial Active
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    {trialDaysRemaining} days remaining
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => (
                <li key={item.href}>
                  {item.locked ? (
                    <div
                      className="flex items-center justify-between rounded-lg px-4 py-2 text-sm text-slate-500 cursor-not-allowed opacity-50"
                      title="Upgrade to unlock"
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-orange-600"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Teacher Info */}
          <div className="border-t border-slate-200 px-4 py-4">
            <div className="rounded-lg bg-slate-100 p-3">
              <p className="text-xs font-semibold text-slate-900">
                {teacher.email?.split('@')[0] || 'Teacher'}
              </p>
              <p className="text-xs text-slate-600 mt-1">{tierBadge}</p>
            </div>
          </div>

          {/* Back to Game Link */}
          <div className="border-t border-slate-200 px-4 py-3">
            <a
              href={gameUrl}
              className="flex items-center gap-2 text-xs text-slate-600 hover:text-orange-600 transition"
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
              Welcome back, {teacher.email?.split('@')[0] || 'Teacher'}
            </h1>
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
              {teacher.email?.charAt(0).toUpperCase() || 'T'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
