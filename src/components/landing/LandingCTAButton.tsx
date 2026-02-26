import React from 'react';
import './landing.css';

interface LandingCTAButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  iconLeft?: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  label: string;
  className?: string;
}

export const LandingCTAButton: React.FC<LandingCTAButtonProps> = ({
  variant,
  size = 'md',
  iconLeft,
  href,
  onClick,
  label,
  className = '',
}) => {
  const baseClasses = 'landing-cta-button';
  const variantClass = `landing-cta-button-${variant}`;
  const sizeClass = `landing-cta-button-${size}`;
  const classes = `${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    }
    if (href && !onClick) {
      e.preventDefault();
      window.location.pathname = href;
    }
  };

  const content = (
    <>
      {iconLeft && <span className="landing-cta-button-icon-left">{iconLeft}</span>}
      <span className="landing-cta-button-label">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={handleClick}
    >
      {content}
    </button>
  );
};
