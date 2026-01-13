import React from 'react';
import './landing.css';

interface ModeCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  gradient: string;
  skills: string[];
  screenshot: string;
}

const MODES: ModeCard[] = [
  {
    id: 'bubble-pop',
    icon: '🫧',
    title: 'Bubble Pop',
    subtitle: 'Warm Up',
    description: 'Pop colorful bubbles to build hand-eye coordination and get comfortable with gestures.',
    color: '#FF8C42',
    gradient: 'linear-gradient(135deg, #FF8C42 0%, #FF6B9D 100%)',
    skills: ['Hand-eye coordination', 'Reaction time', 'Focus'],
    screenshot: 'https://i.postimg.cc/RhBYpGkh/Balloons.png'
  },
  {
    id: 'free-paint',
    icon: '🎨',
    title: 'Free Paint',
    subtitle: 'Create',
    description: 'Unlimited creative canvas with colors, brushes, and no rules. Pure artistic expression.',
    color: '#9B59B6',
    gradient: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
    skills: ['Creativity', 'Fine motor control', 'Self-expression'],
    screenshot: 'https://i.postimg.cc/90Yn6Z21/Free_Paint.png'
  },
  {
    id: 'tracing',
    icon: '✏️',
    title: 'Tracing A-Z',
    subtitle: 'Learn',
    description: 'Trace letters and shapes with guided paths. Build pre-writing skills the fun way.',
    color: '#2ECC71',
    gradient: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
    skills: ['Letter formation', 'Directional control', 'Pre-writing'],
    screenshot: 'https://i.postimg.cc/rsNPBxT9/Tracing.png'
  },
  {
    id: 'sort-place',
    icon: '🗂️',
    title: 'Sort & Place',
    subtitle: 'Think',
    description: 'Categorize objects by color, size, or type. Builds logical thinking and spatial awareness.',
    color: '#3498DB',
    gradient: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)',
    skills: ['Categorization', 'Problem solving', 'Spatial reasoning'],
    screenshot: 'https://i.postimg.cc/ZnSQsjGV/sort_and_place.png'
  },
  {
    id: 'word-search',
    icon: '🔍',
    title: 'Word Search',
    subtitle: 'Focus',
    description: 'Find hidden words in letter grids. Reinforces letter recognition and concentration.',
    color: '#F1C40F',
    gradient: 'linear-gradient(135deg, #F1C40F 0%, #F39C12 100%)',
    skills: ['Letter recognition', 'Pattern spotting', 'Vocabulary'],
    screenshot: 'https://i.postimg.cc/WzwHBgVn/wordsearch.png'
  }
];

export const ModesGrid: React.FC = () => {
  return (
    <section id="modes" className="landing-section landing-modes">
      <div className="landing-container">
        <div className="section-header">
          <span className="section-badge">5 Learning Adventures</span>
          <h2 className="landing-section-title">Activities That Feel Like Play</h2>
          <p className="section-subtitle">
            Each mode targets different developmental skills while keeping kids engaged and having fun.
          </p>
        </div>
        
        <div className="modes-grid">
          {MODES.map((mode) => (
            <div 
              key={mode.id} 
              className="mode-card"
              style={{ '--mode-color': mode.color, '--mode-gradient': mode.gradient } as React.CSSProperties}
            >
              <div className="mode-card-header">
                <span className="mode-icon">{mode.icon}</span>
                <div className="mode-titles">
                  <h3 className="mode-title">{mode.title}</h3>
                  <span className="mode-subtitle">{mode.subtitle}</span>
                </div>
              </div>
              
              <p className="mode-description">{mode.description}</p>
              
              <div className="mode-skills">
                {mode.skills.map((skill, i) => (
                  <span key={i} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
