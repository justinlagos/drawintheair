import React, { useState } from 'react';
import './landing.css';

export const EYFSAlignment: React.FC = () => {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  const eyfsAreas = [
    {
      id: 'physical',
      label: 'Physical',
      description: 'Gross and fine motor skills through gesture control',
      percentage: 30,
      color: '#FFD93D'
    },
    {
      id: 'literacy',
      label: 'Literacy',
      description: 'Letter formation and early writing through tracing',
      percentage: 30,
      color: '#DE3163'
    },
    {
      id: 'communication',
      label: 'Communication',
      description: 'Following instructions, listening, and shared attention',
      percentage: 25,
      color: '#00E5FF'
    },
    {
      id: 'psed',
      label: 'PSED',
      description: 'Building confidence and social interaction through play',
      percentage: 15,
      color: '#FFD93D'
    }
  ];

  return (
    <section id="eyfs" className="landing-section landing-eyfs">
      <div className="landing-eyfs-container">
        <div className="landing-eyfs-left">
          <h2 className="landing-section-title landing-eyfs-title">EYFS alignment</h2>
          <p className="landing-eyfs-text">
            Built around Early Years Foundation Stage outcomes.
          </p>
          <p className="landing-eyfs-text">
            Designed for Physical Development and early Literacy.
          </p>
          <p className="landing-eyfs-text">
            Supports focus, coordination, and confidence through play.
          </p>
        </div>
        <div className="landing-eyfs-right">
          <div className="landing-eyfs-visualization">
            <div className="landing-eyfs-glass-panel">
              <div className="landing-eyfs-blocks">
                {eyfsAreas.map((area) => {
                  const isHovered = hoveredArea === area.id;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      className={`landing-eyfs-block ${isHovered ? 'landing-eyfs-block-active' : ''}`}
                      onMouseEnter={() => setHoveredArea(area.id)}
                      onMouseLeave={() => setHoveredArea(null)}
                    >
                      <div className="landing-eyfs-block-header">
                        <span
                          className="landing-eyfs-block-dot"
                          style={{ backgroundColor: area.color }}
                        />
                        <span className="landing-eyfs-block-label">{area.label}</span>
                        <span className="landing-eyfs-block-percent">{area.percentage}%</span>
                      </div>
                      <p className="landing-eyfs-block-copy">{area.description}</p>
                    </button>
                  );
                })}
              </div>
              {hoveredArea && (
                <div className="landing-eyfs-visualization-description">
                  {eyfsAreas.find((a) => a.id === hoveredArea)?.description}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
