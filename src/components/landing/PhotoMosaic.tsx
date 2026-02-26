import React, { useState, useEffect, useRef } from 'react';
import './landing.css';

interface Photo {
  url: string;
  alt: string;
  copy: string;
}

export const PhotoMosaic: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const photos: Photo[] = [
    {
      url: 'https://i.postimg.cc/xcT770t6/a-kid.png',
      alt: 'Child using Draw In The Air',
      copy: 'Real children, real engagement, real learning'
    },
    {
      url: 'https://i.postimg.cc/c6WPR73z/father-and-son.png',
      alt: 'Father and son using Draw In The Air together',
      copy: 'Perfect for parent-child learning moments'
    },
    {
      url: 'https://i.postimg.cc/XBnhn33C/group-of-kids.png',
      alt: 'Group of children using Draw In The Air',
      copy: 'Collaborative learning in action'
    },
    {
      url: 'https://i.postimg.cc/yWK2mh9D/mum-and-son.png',
      alt: 'Mother and son using Draw In The Air',
      copy: 'Building motor skills through play'
    },
    {
      url: 'https://i.postimg.cc/Z0mX8P3Z/teacher.png',
      alt: 'Teacher using Draw In The Air with students',
      copy: 'Trusted by educators nationwide'
    },
    {
      url: 'https://i.postimg.cc/476qCnCx/teacher-and-son.png',
      alt: 'Teacher and child using Draw In The Air',
      copy: 'Inclusive learning for every child'
    }
  ];

  // Preload next and previous images for smooth transitions
  useEffect(() => {
    const preloadImages = () => {
      photos.forEach((photo, index) => {
        if (index === currentIndex || 
            index === (currentIndex + 1) % photos.length || 
            index === (currentIndex - 1 + photos.length) % photos.length) {
          const img = new Image();
          img.src = photo.url;
          img.onload = () => {
            setImagesLoaded(prev => new Set([...prev, index]));
          };
        }
      });
    };
    preloadImages();
  }, [currentIndex]);

  // Auto-advance slider
  useEffect(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    
    autoPlayRef.current = setInterval(() => {
      if (!isTransitioning) {
        setIsTransitioning(true);
        setCurrentIndex((prev) => (prev + 1) % photos.length);
        setTimeout(() => setIsTransitioning(false), 600);
      }
    }, 6000);
    
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [currentIndex, isTransitioning, photos.length]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  return (
    <div className="landing-proof-slider">
      <div className="landing-proof-slider-container">
        {/* Navigation Buttons */}
        <button
          className="landing-proof-nav-button landing-proof-nav-prev"
          onClick={handlePrev}
          aria-label="Previous image"
          disabled={isTransitioning}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <button
          className="landing-proof-nav-button landing-proof-nav-next"
          onClick={handleNext}
          aria-label="Next image"
          disabled={isTransitioning}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Slider Track */}
        <div 
          className="landing-proof-slider-track"
          ref={sliderRef}
          style={{
            transform: `translate3d(-${currentIndex * 100}%, 0, 0)`
          }}
        >
          {photos.map((photo, index) => (
            <div
              key={index}
              className={`landing-proof-slide ${index === currentIndex ? 'active' : ''}`}
            >
              <div className="landing-proof-image-wrapper">
                <img
                  src={photo.url}
                  srcSet={`${photo.url} 1x, ${photo.url} 2x`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 1200px, 1200px"
                  alt={photo.alt}
                  className="landing-proof-image"
                  loading={index <= 1 ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{
                    opacity: imagesLoaded.has(index) ? 1 : 0,
                    transition: 'opacity 0.5s ease'
                  }}
                  onLoad={() => {
                    setImagesLoaded(prev => new Set([...prev, index]));
                  }}
                />
                {!imagesLoaded.has(index) && (
                  <div className="landing-proof-image-skeleton" />
                )}
                
                {/* Animated Text Overlay */}
                <div className="landing-proof-text-overlay">
                  <div 
                    className={`landing-proof-text-content ${index === currentIndex ? 'active' : ''}`}
                  >
                    <p className="landing-proof-copy">{photo.copy}</p>
                  </div>
                </div>

                {/* Gradient Overlay for Text Readability */}
                <div className="landing-proof-gradient-overlay" />
              </div>
            </div>
          ))}
        </div>

        {/* Slide Indicators */}
        <div className="landing-proof-indicators">
          {photos.map((_, index) => (
            <button
              key={index}
              className={`landing-proof-indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

