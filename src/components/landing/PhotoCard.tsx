import React from 'react';
import './landing.css';

interface PhotoCardProps {
  url: string;
  alt: string;
  className?: string;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ url, alt, className = '' }) => {
  return (
    <div className={`landing-photo-card ${className}`}>
      <img 
        src={url}
        srcSet={`${url} 1x, ${url} 2x`}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="landing-photo-card-img"
      />
    </div>
  );
};

