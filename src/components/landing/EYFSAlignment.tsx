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
      description: 'Following instructions and understanding gestures',
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
            {/* Glass panel container */}
            <div className="landing-eyfs-glass-panel">
              {/* Circular alignment indicator */}
              <div className="landing-eyfs-circle-container">
                <svg 
                  viewBox="0 0 280 280" 
                  className="landing-eyfs-circle-svg"
                  onMouseLeave={() => setHoveredArea(null)}
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    {/* Soft glow filter */}
                    <filter id="eyfsGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
                      <feOffset in="blur" dx="0" dy="2" result="offsetBlur"/>
                      <feComponentTransfer in="offsetBlur">
                        <feFuncA type="linear" slope="0.2"/>
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    
                    {/* Subtle gradient */}
                    <radialGradient id="eyfsGradient" cx="50%" cy="50%">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.08)" />
                      <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                    </radialGradient>
                  </defs>
                  
                  {/* Background circle - glass effect */}
                  <circle
                    cx="140"
                    cy="140"
                    r="100"
                    fill="rgba(1, 12, 36, 0.4)"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="2"
                    filter="url(#eyfsGlow)"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="100"
                    fill="url(#eyfsGradient)"
                  />
                  
                  {/* Segments */}
                  {eyfsAreas.map((area, index) => {
                    const total = eyfsAreas.reduce((sum, a) => sum + a.percentage, 0);
                    let startPercent = 0;
                    for (let i = 0; i < index; i++) {
                      startPercent += eyfsAreas[i].percentage / total;
                    }
                    const endPercent = startPercent + (area.percentage / total);
                    
                    const startAngle = startPercent * 360 - 90;
                    const endAngle = endPercent * 360 - 90;
                    const startAngleRad = (startAngle * Math.PI) / 180;
                    const endAngleRad = (endAngle * Math.PI) / 180;
                    
                    const centerX = 140;
                    const centerY = 140;
                    const radius = 100;
                    const innerRadius = 62;
                    const gap = 1.5; // Subtle gap between segments
                    const gapAngle = (gap / radius) * (180 / Math.PI);
                    
                    const adjustedStartAngle = startAngle + gapAngle / 2;
                    const adjustedEndAngle = endAngle - gapAngle / 2;
                    const adjustedStartRad = (adjustedStartAngle * Math.PI) / 180;
                    const adjustedEndRad = (adjustedEndAngle * Math.PI) / 180;
                    
                    const x1 = centerX + radius * Math.cos(adjustedStartRad);
                    const y1 = centerY + radius * Math.sin(adjustedStartRad);
                    const x2 = centerX + radius * Math.cos(adjustedEndRad);
                    const y2 = centerY + radius * Math.sin(adjustedEndRad);
                    const x3 = centerX + innerRadius * Math.cos(adjustedEndRad);
                    const y3 = centerY + innerRadius * Math.sin(adjustedEndRad);
                    const x4 = centerX + innerRadius * Math.cos(adjustedStartRad);
                    const y4 = centerY + innerRadius * Math.sin(adjustedStartRad);
                    
                    const largeArcFlag = (endAngle - startAngle) > 180 ? 1 : 0;
                    const isHovered = hoveredArea === area.id;
                    
                    return (
                      <g key={area.id}>
                        {/* Outer arc */}
                        <path
                          d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`}
                          fill={area.color}
                          opacity={isHovered ? 0.22 : 0.12}
                          stroke={area.color}
                          strokeWidth={isHovered ? '2.5' : '1.5'}
                          strokeLinecap="round"
                          filter={isHovered ? 'url(#eyfsGlow)' : 'none'}
                          className="landing-eyfs-segment"
                          onMouseEnter={() => setHoveredArea(area.id)}
                          style={{
                            transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                            cursor: 'pointer'
                          }}
                        />
                        
                        {/* Label position */}
                        {(() => {
                          const midAngle = (startAngle + endAngle) / 2;
                          const midRad = (midAngle * Math.PI) / 180;
                          const labelRadius = 82;
                          const labelX = centerX + labelRadius * Math.cos(midRad);
                          const labelY = centerY + labelRadius * Math.sin(midRad);
                          
                          // Adjust font size for longer labels
                          const fontSize = area.label.length > 10 ? '9.5' : '10.5';
                          
                          return (
                            <text
                              x={labelX}
                              y={labelY}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill={isHovered ? area.color : 'rgba(255, 255, 255, 0.65)'}
                              fontSize={fontSize}
                              fontWeight="600"
                              letterSpacing="0.3px"
                              pointerEvents="none"
                              style={{
                                transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                                filter: isHovered ? `drop-shadow(0 0 10px ${area.color}80)` : 'none'
                              }}
                            >
                              {area.label}
                            </text>
                          );
                        })()}
                      </g>
                    );
                  })}
                  
                  {/* Center content */}
                  <circle
                    cx="140"
                    cy="140"
                    r="60"
                    fill="rgba(1, 12, 36, 0.5)"
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeWidth="1"
                  />
                </svg>
              </div>
              
              {/* Hover description */}
              {hoveredArea && (
                <div className="landing-eyfs-visualization-description">
                  {eyfsAreas.find(a => a.id === hoveredArea)?.description}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
