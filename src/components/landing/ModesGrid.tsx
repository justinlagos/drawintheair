import React from 'react';
import './landing.css';

interface ModeCard {
  title: string;
  icon: string;
  whatKidsDo: string;
  whatItBuilds: string;
  screenshot: string;
  badge?: string;
}

const modes: ModeCard[] = [
  {
    title: 'Bubble Pop',
    icon: '🫧',
    whatKidsDo: 'Warm up',
    whatItBuilds: 'Focus and coordination',
    screenshot: 'https://i.postimg.cc/RhBYpGkh/Balloons.png'
  },
  {
    title: 'Free Paint',
    icon: '🎨',
    whatKidsDo: 'Create',
    whatItBuilds: 'Creative expression and confidence',
    screenshot: 'https://i.postimg.cc/90Yn6Z21/Free_Paint.png'
  },
  {
    title: 'Tracing',
    icon: '✏️',
    whatKidsDo: 'Learn',
    whatItBuilds: 'Letter formation and early writing',
    screenshot: 'https://i.postimg.cc/rsNPBxT9/Tracing.png'
  },
  {
    title: 'Sort and Place',
    icon: '🧩',
    whatKidsDo: 'Think',
    whatItBuilds: 'Maths foundations and categorising',
    screenshot: 'https://i.postimg.cc/ZnSQsjGV/sort_and_place.png'
  },
  {
    title: 'Word Search',
    icon: '🔍',
    whatKidsDo: 'Explore',
    whatItBuilds: 'Early reading and pattern spotting',
    screenshot: 'https://i.postimg.cc/WzwHBgVn/wordsearch.png'
  }
];

export const ModesGrid: React.FC = () => {
  return (
    <section id="modes" className="landing-section landing-modes">
      <h2 className="landing-section-title">Modes</h2>
      <div className="landing-modes-grid">
        {/* Top row: 3 equal-width cards */}
        <div className="landing-modes-row landing-modes-row-top">
          {modes.slice(0, 3).map((mode, index) => (
            <article key={mode.title} className="landing-mode-card">
              {mode.badge && (
                <span className="landing-mode-badge">{mode.badge}</span>
              )}
              <header className="landing-mode-header">
                <div className="landing-mode-icon-large" aria-hidden="true">
                  {mode.icon}
                </div>
                <h3 className="landing-mode-title">{mode.title}</h3>
                <p className="landing-mode-purpose">{mode.whatItBuilds}</p>
              </header>
              <div className="landing-mode-screenshot">
                <img 
                  src={mode.screenshot}
                  srcSet={`${mode.screenshot} 1x, ${mode.screenshot} 2x`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 320px"
                  alt={mode.title}
                  className="landing-mode-img"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <footer className="landing-mode-meta">
                <p className="landing-mode-what">Children: {mode.whatKidsDo}</p>
                <p className="landing-mode-builds">Builds: {mode.whatItBuilds}</p>
              </footer>
            </article>
          ))}
        </div>

        {/* Bottom row: 2 wider cards, centred */}
        <div className="landing-modes-row landing-modes-row-bottom">
          {modes.slice(3).map((mode) => (
            <article key={mode.title} className="landing-mode-card">
              {mode.badge && (
                <span className="landing-mode-badge">{mode.badge}</span>
              )}
              <header className="landing-mode-header">
                <div className="landing-mode-icon-large" aria-hidden="true">
                  {mode.icon}
                </div>
                <h3 className="landing-mode-title">{mode.title}</h3>
                <p className="landing-mode-purpose">{mode.whatItBuilds}</p>
              </header>
              <div className="landing-mode-screenshot">
                <img 
                  src={mode.screenshot}
                  srcSet={`${mode.screenshot} 1x, ${mode.screenshot} 2x`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 40vw, 420px"
                  alt={mode.title}
                  className="landing-mode-img"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <footer className="landing-mode-meta">
                <p className="landing-mode-what">Children: {mode.whatKidsDo}</p>
                <p className="landing-mode-builds">Builds: {mode.whatItBuilds}</p>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
