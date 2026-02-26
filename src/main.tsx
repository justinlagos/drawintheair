import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Landing } from './pages/Landing.tsx'
import { DemoLoader } from './pages/DemoLoader.tsx'
import { FAQ } from './pages/FAQ.tsx'
import { Schools } from './pages/Schools.tsx'
import { ParentsLanding } from './pages/ParentsLanding.tsx'
import { Privacy } from './pages/Privacy.tsx'
import { Terms } from './pages/Terms.tsx'
import { Cookies } from './pages/Cookies.tsx'
import { Safeguarding } from './pages/Safeguarding.tsx'
import { Accessibility } from './pages/Accessibility.tsx'
import { Training } from './pages/Training.tsx'
import { Admin } from './pages/Admin.tsx'
import { QAPage } from './pages/QAPage.tsx'
import { SchoolPilot } from './pages/SchoolPilot.tsx'
import { ParentAccess } from './pages/ParentAccess.tsx'
import { initAnalytics } from './lib/analytics.ts'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Helper function to determine route from pathname
function getRouteFromPath(path: string, hash: string): string {
  // Check for debug=qa in query params
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'qa') {
      return 'qa';
    }
  }

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
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  if (path === '/cookies') return 'cookies';
  if (path === '/safeguarding') return 'safeguarding';
  if (path === '/accessibility') return 'accessibility';
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
    history.pushState = function(...args) {
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

  if (route === 'qa') {
    return <QAPage />;
  }

  if (route === 'school') {
    return <SchoolPilot />;
  }

  if (route === 'parent') {
    return <ParentAccess />;
  }

  return <Landing />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
