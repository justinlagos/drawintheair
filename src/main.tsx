import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Landing } from './pages/Landing.tsx'
import { DemoLoader } from './pages/DemoLoader.tsx'
import { FAQ } from './pages/FAQ.tsx'
import { Schools } from './pages/Schools.tsx'
import { Privacy } from './pages/Privacy.tsx'
import { Terms } from './pages/Terms.tsx'
import { Cookies } from './pages/Cookies.tsx'
import { Safeguarding } from './pages/Safeguarding.tsx'
import { Accessibility } from './pages/Accessibility.tsx'
import { Training } from './pages/Training.tsx'
import { Admin } from './pages/Admin.tsx'
import { initAnalytics } from './lib/analytics.ts'

function Root() {
  // Initialize analytics
  useEffect(() => {
    initAnalytics();
  }, []);

  const [route, setRoute] = useState(() => {
    const path = window.location.pathname;
    if (path === '/admin') return 'admin';
    if (path === '/demo') return 'demo';
    if (path === '/play' || path === '/onboarding') return 'play';
    if (path === '/app' || window.location.hash === '#app') return 'app';
    if (path === '/faq') return 'faq';
    if (path === '/schools') return 'schools';
    if (path === '/schools/training') return 'training';
    if (path === '/privacy') return 'privacy';
    if (path === '/terms') return 'terms';
    if (path === '/cookies') return 'cookies';
    if (path === '/safeguarding') return 'safeguarding';
    if (path === '/accessibility') return 'accessibility';
    return 'landing';
  });

  useEffect(() => {
    const handleNavigation = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setRoute('admin');
      } else if (path === '/demo') {
        setRoute('demo');
      } else if (path === '/play' || path === '/onboarding') {
        setRoute('play');
      } else if (path === '/app' || window.location.hash === '#app') {
        setRoute('app');
      } else if (path === '/faq') {
        setRoute('faq');
      } else if (path === '/schools') {
        setRoute('schools');
      } else if (path === '/schools/training') {
        setRoute('training');
      } else if (path === '/privacy') {
        setRoute('privacy');
      } else if (path === '/terms') {
        setRoute('terms');
      } else if (path === '/cookies') {
        setRoute('cookies');
      } else if (path === '/safeguarding') {
        setRoute('safeguarding');
      } else if (path === '/accessibility') {
        setRoute('accessibility');
      } else {
        setRoute('landing');
      }
    };

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
    return <App />;
  }

  if (route === 'app') {
    return <App />;
  }

  if (route === 'faq') {
    return <FAQ />;
  }

  if (route === 'schools') {
    return <Schools />;
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

  return <Landing />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
