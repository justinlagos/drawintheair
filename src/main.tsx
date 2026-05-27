import React, { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// App (the game engine — camera, hand-tracking, activities) is lazy-loaded
// via lazyWithRetry below so its weight stays off the landing critical path.
// Only the /play and /app routes pull it in.
import { Landing } from './pages/Landing.tsx'
import { DemoLoader } from './pages/DemoLoader.tsx'
// NOTE: Landing + DemoLoader stay eagerly imported on purpose — Landing is
// the most common entry point (no extra round-trip on the hot path) and
// DemoLoader is the shared Suspense fallback (it can't be lazy itself).
// Every other top-level page below is lazy-loaded via lazyWithRetry so it
// no longer bloats the initial bundle; a single top-level <Suspense> in the
// render tree covers them all.
// Legacy PIN-gated /admin dashboard (src/pages/Admin.tsx) was removed
// 2026-05-21 — see docs/SECURITY_AUDIT_2026-05-21.md (C3). All /admin
// traffic now resolves to /admin/insights, which is OAuth-gated and
// (post-migration 20260521_security_lockdown.sql) backed by RPCs that
// assert is_admin server-side.
// QAPage, SchoolPilot, ParentAccess are lazy-loaded below (see lazy consts).
import { initAnalytics } from './lib/analytics.ts'
import { ErrorBoundary, ScopedErrorBoundary } from './components/ErrorBoundary.tsx'
import {
  initObservability,
  setObservabilityContext,
  trackEvent,
  captureError,
} from './lib/observability'
import { AuthProvider } from './context/AuthContext.tsx'
import { KidStyles } from './styles/KidStyles.tsx'
import { lazyWithRetry } from './lib/lazyWithRetry.tsx'

// ── Observability bootstrap ────────────────────────────────────────────────
// Initialise Sentry + PostHog BEFORE React mounts so even the very first
// render error gets reported. Safe to call when env vars are missing —
// each subsystem silently no-ops in that case.
initObservability();

// Capture global errors that escape React entirely (e.g. unhandled
// promise rejections, async listeners). React's own boundary still
// catches render errors via the ErrorBoundary tree below.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e?.error) captureError(e.error, { scope: 'unknown' });
  });
  window.addEventListener('unhandledrejection', (e) => {
    captureError(e?.reason ?? new Error('Unhandled rejection'), { scope: 'unknown' });
  });
}

// The game engine. Default export. Heaviest single route — kept out of the
// initial bundle so landing/marketing visitors never download it.
const App = lazyWithRetry(() => import('./App.tsx'));

// Top-level pages — lazy-loaded so they no longer ship in the initial
// bundle. Named exports are unwrapped to { default } for React.lazy.
const FAQ = lazyWithRetry(() => import('./pages/FAQ.tsx').then((m) => ({ default: m.FAQ })));
const Schools = lazyWithRetry(() => import('./pages/Schools.tsx').then((m) => ({ default: m.Schools })));
const ParentsLanding = lazyWithRetry(() => import('./pages/ParentsLanding.tsx').then((m) => ({ default: m.ParentsLanding })));
const Pricing = lazyWithRetry(() => import('./pages/Pricing.tsx').then((m) => ({ default: m.Pricing })));
const Teachers = lazyWithRetry(() => import('./pages/Teachers.tsx'));
const Privacy = lazyWithRetry(() => import('./pages/Privacy.tsx').then((m) => ({ default: m.Privacy })));
const Terms = lazyWithRetry(() => import('./pages/Terms.tsx').then((m) => ({ default: m.Terms })));
const Cookies = lazyWithRetry(() => import('./pages/Cookies.tsx').then((m) => ({ default: m.Cookies })));
const Safeguarding = lazyWithRetry(() => import('./pages/Safeguarding.tsx').then((m) => ({ default: m.Safeguarding })));
const Accessibility = lazyWithRetry(() => import('./pages/Accessibility.tsx').then((m) => ({ default: m.Accessibility })));
const Training = lazyWithRetry(() => import('./pages/Training.tsx').then((m) => ({ default: m.Training })));
const QAPage = lazyWithRetry(() => import('./pages/QAPage.tsx').then((m) => ({ default: m.QAPage })));
const SchoolPilot = lazyWithRetry(() => import('./pages/SchoolPilot.tsx'));
const ParentAccess = lazyWithRetry(() => import('./pages/ParentAccess.tsx'));

// SEO Lazy Imports
const EmbedPage = lazyWithRetry(() => import('./pages/seo/EmbedPage.tsx'));
const PressPage = lazyWithRetry(() => import('./pages/seo/PressPage.tsx'));
const FreeResourcesPage = lazyWithRetry(() => import('./pages/seo/FreeResourcesPage.tsx'));

const TracePage = lazyWithRetry(() => import('./pages/seo/TracePage.tsx'));
const LearnArticlePage = lazyWithRetry(() => import('./pages/seo/LearnArticlePage.tsx'));
const LearnHubPage = lazyWithRetry(() => import('./pages/seo/LearnHubPage.tsx'));
const EducationPage = lazyWithRetry(() => import('./pages/seo/EducationPage.tsx'));
const ActivityPage = lazyWithRetry(() => import('./pages/seo/ActivityPage.tsx'));
const SpecialActivityPage = lazyWithRetry(() => import('./pages/seo/SpecialActivityPage.tsx'));

// Education audience pages (were missing from router — critical fix)
const ForTeachersPage = lazyWithRetry(() => import('./pages/seo/ForTeachersPage.tsx'));
const ForParentsPage = lazyWithRetry(() => import('./pages/seo/ForParentsPage.tsx'));

// Growth Engine — Phase 1 Use-Case Landing Pages
const UseCasePage = lazyWithRetry(() => import('./pages/seo/UseCasePage.tsx'));

// Growth Engine — Share Landing Page
const ShareLandingPage = lazyWithRetry(() => import('./pages/seo/ShareLandingPage.tsx'));

// Admin — internal analytics insights (auth-gated, allow-list)
const InsightsDashboard = lazyWithRetry(() => import('./pages/admin/InsightsDashboard.tsx'));
const TeachObservePage  = lazyWithRetry(() => import('./pages/teach/TeachObservePage.tsx'));
const TransparencyPage  = lazyWithRetry(() => import('./pages/TransparencyPage.tsx'));

// Setup guides — idiot-proof quick-start, print-optimised for A4.
const TeacherSetupGuide = lazyWithRetry(() => import('./pages/setup/TeacherSetupGuide.tsx'));
const ParentSetupGuide  = lazyWithRetry(() => import('./pages/setup/ParentSetupGuide.tsx'));

// Class Mode v2 — conductor model. One persistent surface per role.
//   /class            → TeacherClassConsole  (replaces TeacherDashboard +
//                       LobbyScreen + LiveRoundScreen + ResultsScreen)
//   /join             → StudentClassClient   (replaces StudentJoin +
//                       StudentGameScreen)
// The legacy lobby/round/results/join-play routes are kept as redirects
// to avoid breaking any in-the-wild bookmarks.
const TeacherClassConsole = lazyWithRetry(() => import('./pages/classmode/TeacherClassConsole.tsx'));
const StudentClassClient  = lazyWithRetry(() => import('./pages/classmode/StudentClassClient.tsx'));

// Helper function to determine route from pathname
function getRouteFromPath(path: string, hash: string): string {
  // Check for debug=qa in query params
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'qa') {
      return 'qa';
    }
  }

  // Class Mode routes — all collapse to the two new persistent screens.
  // Legacy paths still resolve so old bookmarks don't 404.
  if (path === '/class' || path === '/class/lobby' || path === '/class/round' || path === '/class/results') {
    return 'class-console';
  }
  if (path === '/join' || path === '/join/play') {
    return 'student-client';
  }

  if (path === '/admin/insights') return 'admin-insights';
  // /admin is permanently retired — fold into /admin/insights, which is
  // OAuth-gated and (after migration 20260521) server-side admin-only.
  if (path === '/admin') return 'admin-insights';
  if (path === '/teach/observe') return 'teach-observe';
  if (path === '/transparency') return 'transparency';
  if (path === '/demo') return 'demo';
  if (path === '/play' || path === '/onboarding') return 'play';
  if (path === '/app' || hash === '#app') return 'app';
  if (path === '/faq') return 'faq';
  if (path === '/schools/training') return 'training';
  if (path === '/schools') return 'schools';
  if (path === '/school') return 'school';
  if (path === '/parents') return 'parents';
  if (path === '/parent') return 'parent';
  if (path === '/teachers') return 'teachers';
  if (path === '/pricing') return 'pricing';
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  if (path === '/cookies') return 'cookies';
  if (path === '/safeguarding') return 'safeguarding';
  if (path === '/accessibility') return 'accessibility';

  // Growth Engine Pages
  if (path === '/embed') return 'embed';
  if (path === '/press') return 'press';
  if (path === '/free-resources') return 'free-resources';

  // Phase 1 — Use-Case SEO Landing Pages
  if (path === '/gesture-learning') return 'usecase';
  if (path === '/classroom-movement-activities') return 'usecase';
  if (path === '/chromebook-learning-tools') return 'usecase';
  if (path === '/homeschool-movement-learning') return 'usecase';
  if (path === '/hand-eye-coordination-activities') return 'usecase';
  if (path === '/ai-learning-tools-for-kids') return 'usecase';

  // Phase 3 — Teacher Share Landing
  if (path.startsWith('/share/')) return 'share-landing';

  // Education audience pages
  if (path === '/for-teachers') return 'for-teachers';
  if (path === '/for-parents') return 'for-parents';

  // Setup guides — quick-start
  if (path === '/teachers/setup') return 'teacher-setup';
  if (path === '/parents/setup') return 'parent-setup';

  // /stem-learning — redirect to ai-learning-tools-for-kids (same audience, avoids 404)
  if (path === '/stem-learning') return 'usecase';

  // Education sub-pages
  if (path === '/for-homeschool' || path === '/for-preschool' || path === '/for-kindergarten') return 'education';

  // Activity & Viral Pages
  if (path.startsWith('/activities/')) return 'activity';
  if (path === '/free-paint') return 'activity';
  if (['/draw-number-in-air', '/air-drawing-challenge', '/draw-circle-in-air'].includes(path)) return 'viral';

  // Learn Articles
  if (path.startsWith('/learn/')) return 'learn-article';
  if (path === '/learn') return 'learn-hub';

  // Tracing Pages
  if (path.startsWith('/trace-') || path === '/letter-tracing') {
    return 'trace';
  }

  return 'landing';
}

function Root() {
  // Initialize analytics
  useEffect(() => {
    initAnalytics();
  }, []);

  const [route, setRoute] = useState(() => {
    return getRouteFromPath(window.location.pathname, window.location.hash);
  });

  useEffect(() => {
    const handleNavigation = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const newRoute = getRouteFromPath(path, hash);
      setRoute(newRoute);

      // Tell observability about the new route so any subsequent
      // error carries it as a tag — and emit a route_view funnel
      // event for PostHog. LIOS already handles its own page events.
      try {
        setObservabilityContext({ route: path });
        trackEvent('route_view', { route: path });
      } catch {
        /* never let observability crash the router */
      }
    };

    // Handle initial load - ensure route matches current path
    handleNavigation();

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);

    // Handle programmatic navigation
    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      handleNavigation();
    };

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  if (route === 'demo') {
    return <DemoLoader />;
  }

  if (route === 'play') {
    return (
      <ScopedErrorBoundary scope="gamemode">
        <App />
      </ScopedErrorBoundary>
    );
  }

  if (route === 'app') {
    return (
      <ScopedErrorBoundary scope="gamemode">
        <App />
      </ScopedErrorBoundary>
    );
  }

  if (route === 'faq') {
    return <FAQ />;
  }

  if (route === 'schools') {
    return <Schools />;
  }

  if (route === 'parents') {
    return <ParentsLanding />;
  }

  if (route === 'teachers') {
    return <Teachers />;
  }

  if (route === 'pricing') {
    return <Pricing />;
  }

  if (route === 'privacy') {
    return <Privacy />;
  }

  if (route === 'terms') {
    return <Terms />;
  }

  if (route === 'cookies') {
    return <Cookies />;
  }

  if (route === 'safeguarding') {
    return <Safeguarding />;
  }

  if (route === 'accessibility') {
    return <Accessibility />;
  }

  if (route === 'training') {
    return <Training />;
  }

  if (route === 'admin-insights') {
    return (
      <ScopedErrorBoundary scope="insights">
        <React.Suspense fallback={<DemoLoader />}>
          <InsightsDashboard />
        </React.Suspense>
      </ScopedErrorBoundary>
    );
  }

  if (route === 'teach-observe') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <TeachObservePage />
      </React.Suspense>
    );
  }

  if (route === 'transparency') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <TransparencyPage />
      </React.Suspense>
    );
  }

  if (route === 'qa') {
    return <QAPage />;
  }

  // ── Class Mode routes (conductor v1) ──────────────────────────────────────
  if (route === 'class-console') {
    return (
      <ScopedErrorBoundary scope="classmode">
        <React.Suspense fallback={<DemoLoader />}>
          <TeacherClassConsole />
        </React.Suspense>
      </ScopedErrorBoundary>
    );
  }

  if (route === 'student-client') {
    return (
      <ScopedErrorBoundary scope="classmode">
        <React.Suspense fallback={<DemoLoader />}>
          <StudentClassClient />
        </React.Suspense>
      </ScopedErrorBoundary>
    );
  }

  if (route === 'school') {
    return <SchoolPilot />;
  }

  if (route === 'parent') {
    return <ParentAccess />;
  }

  // Growth Engine Pages
  if (route === 'embed') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <EmbedPage />
      </React.Suspense>
    );
  }

  if (route === 'press') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <PressPage />
      </React.Suspense>
    );
  }

  if (route === 'free-resources') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <FreeResourcesPage />
      </React.Suspense>
    );
  }

  if (route === 'for-teachers') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <ForTeachersPage />
      </React.Suspense>
    );
  }

  if (route === 'for-parents') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <ForParentsPage />
      </React.Suspense>
    );
  }

  if (route === 'teacher-setup') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <TeacherSetupGuide />
      </React.Suspense>
    );
  }

  if (route === 'parent-setup') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <ParentSetupGuide />
      </React.Suspense>
    );
  }

  if (route === 'learn-hub') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <LearnHubPage />
      </React.Suspense>
    );
  }

  if (route === 'learn-article') {
    const slug = window.location.pathname.replace('/learn/', '');
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <LearnArticlePage slug={slug as any} />
      </React.Suspense>
    );
  }

  if (route === 'education') {
    const slug = window.location.pathname.replace('/', '');
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <EducationPage slug={slug as any} />
      </React.Suspense>
    );
  }

  // Phase 1 — Use-Case SEO Landing Pages
  if (route === 'usecase') {
    const rawSlug = window.location.pathname.replace('/', '');
    // /stem-learning is a legacy/linked path — serve ai-learning-tools-for-kids content
    const slug = rawSlug === 'stem-learning' ? 'ai-learning-tools-for-kids' : rawSlug;
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <UseCasePage slug={slug as any} />
      </React.Suspense>
    );
  }

  // Phase 3 — Teacher Share Landing
  if (route === 'share-landing') {
    const slug = window.location.pathname.replace('/share/', '');
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <ShareLandingPage slug={slug} />
      </React.Suspense>
    );
  }

  if (route === 'activity') {
    const path = window.location.pathname;
    const slug = path === '/free-paint' ? 'free-paint' : path.replace('/activities/', '');

    // Check if it's a standard activity or special seasonal activity
    if (['bubble-pop', 'sort-and-place', 'free-paint', 'letter-tracing'].includes(slug)) {
      return (
        <React.Suspense fallback={<DemoLoader />}>
          <ActivityPage slug={slug as any} />
        </React.Suspense>
      );
    } else {
      return (
        <React.Suspense fallback={<DemoLoader />}>
          <SpecialActivityPage slug={slug as any} />
        </React.Suspense>
      );
    }
  }

  if (route === 'viral') {
    const slug = window.location.pathname.replace('/', '');
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <SpecialActivityPage slug={slug as any} />
      </React.Suspense>
    );
  }

  if (route === 'trace') {
    const path = window.location.pathname;
    let type: 'letter' | 'number' | 'shape' = 'letter';
    let value = 'a';

    // Default fallback page
    if (path === '/letter-tracing' || path === '/trace-') {
      type = 'letter';
      value = 'a';
    } else {
      const slug = path.replace('/trace-', '');
      if (slug.startsWith('number-')) {
        type = 'number';
        value = slug.replace('number-', '');
      } else if (['circle', 'triangle', 'square', 'star', 'heart', 'rectangle', 'diamond', 'oval'].includes(slug)) {
        type = 'shape';
        value = slug;
      } else if (slug.length === 1 && slug.match(/[a-z]/i)) {
        type = 'letter';
        value = slug.toLowerCase();
      }
    }

    return (
      <React.Suspense fallback={<DemoLoader />}>
        <TracePage type={type} value={value} />
      </React.Suspense>
    );
  }

  return (
    <ScopedErrorBoundary scope="landing">
      <Landing />
    </ScopedErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KidStyles />
    <AuthProvider>
      <ErrorBoundary scope="boundary">
        {/* Single top-level Suspense covers every lazy page (top-level + SEO
            routes). Individual routes may still nest their own Suspense; that
            is fine. DemoLoader is the shared, eagerly-loaded fallback. */}
        <React.Suspense fallback={<DemoLoader />}>
          <Root />
        </React.Suspense>
      </ErrorBoundary>
    </AuthProvider>
  </StrictMode>,
)

// ---------- Signal first paint to the inline boot splash ----------
// index.html shows a dependency-free spinner immediately and arms a 20s
// "still loading" fallback. Tell it we've mounted so it stops that timer.
try {
  window.dispatchEvent(new Event('dia:booted'));
} catch {
  /* no-op */
}

// ---------- Deferred third-party analytics ----------
// GA4 (gtag) and Microsoft Clarity used to load synchronously in <head>,
// competing with the critical app bundle for bandwidth on slow / high-latency
// connections. We now inject them only once the page is idle or fully loaded,
// so they can never block or delay first render. Both are wrapped so a failure
// to load (e.g. the tag host is unreachable from a given ISP) never affects the
// app itself.
function loadDeferredAnalytics(): void {
  const w = window as unknown as Record<string, unknown>;
  if (w.__diaAnalyticsLoaded) return;
  w.__diaAnalyticsLoaded = true;

  // Google Analytics 4
  try {
    const GA_ID = 'G-S4XSWT6Q09';
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    const dl = (w.dataLayer = (w.dataLayer as unknown[]) || []);
    const gtag = (...args: unknown[]) => { dl.push(args); };
    w.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  } catch {
    /* analytics must never break the app */
  }

  // Microsoft Clarity
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = window as unknown as Record<string, any>;
    if (!c.clarity) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stub: any = (...args: unknown[]) => {
        (stub.q = stub.q || []).push(args);
      };
      stub.q = [];
      c.clarity = stub;
    }
    const t = document.createElement('script');
    t.async = true;
    t.src = 'https://www.clarity.ms/tag/vseevw9uck';
    const y = document.getElementsByTagName('script')[0];
    y.parentNode?.insertBefore(t, y);
  } catch {
    /* no-op */
  }
}

if (typeof window !== 'undefined') {
  const schedule = () => {
    const ric = (window as unknown as Record<string, any>).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(loadDeferredAnalytics, { timeout: 4000 });
    } else {
      setTimeout(loadDeferredAnalytics, 2500);
    }
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
}

// ---------- Service Worker Registration ----------
// Register only in production to avoid interfering with Vite HMR in dev.
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .catch(() => {
        // Service worker registration failed — non-critical, app still works
      });
  });
}
