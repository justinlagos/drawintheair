import React, { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Landing } from './pages/Landing.tsx'
import { DemoLoader } from './pages/DemoLoader.tsx'
import { FAQ } from './pages/FAQ.tsx'
import { Schools } from './pages/Schools.tsx'
import { ParentsLanding } from './pages/ParentsLanding.tsx'
import { Pricing } from './pages/Pricing.tsx'
import Teachers from './pages/Teachers.tsx'
import { Privacy } from './pages/Privacy.tsx'
import { Terms } from './pages/Terms.tsx'
import { Cookies } from './pages/Cookies.tsx'
import { Safeguarding } from './pages/Safeguarding.tsx'
import { Accessibility } from './pages/Accessibility.tsx'
import { Training } from './pages/Training.tsx'
import { Admin } from './pages/Admin.tsx'
import { QAPage } from './pages/QAPage.tsx'
import SchoolPilot from './pages/SchoolPilot.tsx'
import ParentAccess from './pages/ParentAccess.tsx'
import { initAnalytics } from './lib/analytics.ts'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { KidStyles } from './styles/KidStyles.tsx'

// SEO Lazy Imports
const EmbedPage = React.lazy(() => import('./pages/seo/EmbedPage.tsx'));
const PressPage = React.lazy(() => import('./pages/seo/PressPage.tsx'));
const FreeResourcesPage = React.lazy(() => import('./pages/seo/FreeResourcesPage.tsx'));

const TracePage = React.lazy(() => import('./pages/seo/TracePage.tsx'));
const LearnArticlePage = React.lazy(() => import('./pages/seo/LearnArticlePage.tsx'));
const LearnHubPage = React.lazy(() => import('./pages/seo/LearnHubPage.tsx'));
const EducationPage = React.lazy(() => import('./pages/seo/EducationPage.tsx'));
const ActivityPage = React.lazy(() => import('./pages/seo/ActivityPage.tsx'));
const SpecialActivityPage = React.lazy(() => import('./pages/seo/SpecialActivityPage.tsx'));

// Education audience pages (were missing from router — critical fix)
const ForTeachersPage = React.lazy(() => import('./pages/seo/ForTeachersPage.tsx'));
const ForParentsPage = React.lazy(() => import('./pages/seo/ForParentsPage.tsx'));

// Growth Engine — Phase 1 Use-Case Landing Pages
const UseCasePage = React.lazy(() => import('./pages/seo/UseCasePage.tsx'));

// Growth Engine — Share Landing Page
const ShareLandingPage = React.lazy(() => import('./pages/seo/ShareLandingPage.tsx'));

// Admin — internal analytics insights (auth-gated, allow-list)
const InsightsDashboard = React.lazy(() => import('./pages/admin/InsightsDashboard.tsx'));

// Class Mode v2 — conductor model. One persistent surface per role.
//   /class            → TeacherClassConsole  (replaces TeacherDashboard +
//                       LobbyScreen + LiveRoundScreen + ResultsScreen)
//   /join             → StudentClassClient   (replaces StudentJoin +
//                       StudentGameScreen)
// The legacy lobby/round/results/join-play routes are kept as redirects
// to avoid breaking any in-the-wild bookmarks.
const TeacherClassConsole = React.lazy(() => import('./pages/classmode/TeacherClassConsole.tsx'));
const StudentClassClient  = React.lazy(() => import('./pages/classmode/StudentClassClient.tsx'));

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
  if (path === '/admin') return 'admin';
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
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  }

  if (route === 'app') {
    return (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
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

  if (route === 'admin') {
    return <Admin />;
  }

  if (route === 'admin-insights') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <InsightsDashboard />
      </React.Suspense>
    );
  }

  if (route === 'qa') {
    return <QAPage />;
  }

  // ── Class Mode routes (conductor v1) ──────────────────────────────────────
  if (route === 'class-console') {
    return (
      <React.Suspense fallback={<DemoLoader />}>
        <TeacherClassConsole />
      </React.Suspense>
    );
  }

  if (route === 'student-client') {
    return (
      <ErrorBoundary>
        <React.Suspense fallback={<DemoLoader />}>
          <StudentClassClient />
        </React.Suspense>
      </ErrorBoundary>
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

  return <Landing />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KidStyles />
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)

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
