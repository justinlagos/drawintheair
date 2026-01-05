import React from 'react';
import './landing.css';

interface ModeCard {
  title: string;
  whatKidsDo: string;
  whatItBuilds: string;
  screenshot: string;
  badge?: string;
}

const modes: ModeCard[] = [
  {
    title: 'Bubble Pop',
    whatKidsDo: 'Warm up',
    whatItBuilds: 'Focus and coordination',
    screenshot: 'https://i.postimg.cc/RhBYpGkh/Balloons.png'
  },
  {
    title: 'Free Paint',
    whatKidsDo: 'Create',
    whatItBuilds: 'Creative expression and confidence',
    screenshot: 'https://i.postimg.cc/90Yn6Z21/Free_Paint.png'
  },
  {
    title: 'Tracing',
    whatKidsDo: 'Learn',
    whatItBuilds: 'Letter formation and early writing',
    screenshot: 'https://i.postimg.cc/rsNPBxT9/Tracing.png'
  },
  {
    title: 'Sort and Place',
    whatKidsDo: 'Think',
    whatItBuilds: 'Maths foundations and categorising',
    screenshot: 'https://i.postimg.cc/ZnSQsjGV/sort_and_place.png'
  },
  {
    title: 'Word Search',
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
        {modes.map((mode, index) => (
          <div key={index} className="landing-mode-card">
            {mode.badge && (
              <span className="landing-mode-badge">{mode.badge}</span>
            )}
            <div className="landing-mode-screenshot">
              <img 
                src={mode.screenshot}
                alt={mode.title}
                className="landing-mode-img"
                loading="lazy"
              />
            </div>
            <h3 className="landing-mode-title">{mode.title}</h3>
            <p className="landing-mode-what">{mode.whatKidsDo}</p>
            <p className="landing-mode-builds">{mode.whatItBuilds}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
