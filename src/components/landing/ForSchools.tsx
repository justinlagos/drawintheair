import React, { useState, useEffect, useRef } from 'react';
import './landing.css';

interface ForSchoolsProps {
  onRequestSchoolPack: () => void;
}

export const ForSchools: React.FC<ForSchoolsProps> = ({ onRequestSchoolPack }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    schoolName: '',
    role: '',
    yearGroup: '',
    deviceType: '',
    sendNotes: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Input validation and sanitization
  const validateInput = (value: string, maxLength: number = 500): string => {
    if (!value) return '';
    // Remove potentially dangerous characters and limit length
    const sanitized = value
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, ''); // Remove < and > to prevent XSS
    return sanitized;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and sanitize inputs
    const sanitizedData = {
      contactName: validateInput(formData.contactName, 100),
      email: validateInput(formData.email, 254).toLowerCase(),
      schoolName: validateInput(formData.schoolName, 200),
      role: validateInput(formData.role, 100),
      yearGroup: validateInput(formData.yearGroup, 50),
      deviceType: formData.deviceType, // From select, already validated
      sendNotes: validateInput(formData.sendNotes || '', 1000),
    };

    // Validate required fields
    if (!sanitizedData.contactName || !sanitizedData.email || !sanitizedData.schoolName || !sanitizedData.role) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate email format
    if (!validateEmail(sanitizedData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      // Track form submission event
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.logEvent('school_pack_form_submit', {
          success: true,
          location: 'landing'
        });
      }

      // Submit to API endpoint with sanitized data
      const response = await fetch('/api/school-pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_name: sanitizedData.schoolName,
          contact_name: sanitizedData.contactName,
          role: sanitizedData.role,
          email: sanitizedData.email,
          year_group: sanitizedData.yearGroup || null,
          device_type: sanitizedData.deviceType || null,
          send_notes: sanitizedData.sendNotes || null,
        }),
      });

        if (!response.ok) {
          throw new Error('Failed to submit');
        }

        setSubmitted(true);
        setFormData({ 
          contactName: '', 
          email: '', 
          schoolName: '', 
          role: '', 
          yearGroup: '', 
          deviceType: '', 
          sendNotes: '' 
        });
        setTimeout(() => {
          setShowForm(false);
          setSubmitted(false);
        }, 3000);
      } catch (error) {
        console.error('Error submitting form:', error);
        // Fallback to localStorage if API fails (with sanitized data)
        try {
          const forms = JSON.parse(localStorage.getItem('schoolPackForms') || '[]');
          forms.push({ ...sanitizedData, timestamp: new Date().toISOString() });
          localStorage.setItem('schoolPackForms', JSON.stringify(forms));
          setSubmitted(true);
          setTimeout(() => {
            setShowForm(false);
            setSubmitted(false);
          }, 3000);
        } catch (storageError) {
          setError('Failed to save form. Please try again.');
          setIsSubmitting(false);
        }
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleRequestClick = () => {
    setShowForm(true);
    onRequestSchoolPack();
    // Track form view event
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.logEvent('school_pack_form_view', {
        location: 'landing'
      });
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !submitted) {
      setShowForm(false);
    }
  };

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm && !isSubmitting && !submitted) {
        handleClose();
      }
    };

    if (showForm) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      // Focus first input
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [showForm, isSubmitting, submitted]);

  // Focus trap
  useEffect(() => {
    if (!showForm) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [showForm]);

  return (
    <>
      <section id="schools" className="landing-section landing-schools">
        <h2 className="landing-section-title">Built for classrooms and early years teams</h2>
        <div className="landing-schools-content">
          <div className="landing-schools-bullets">
            <div className="landing-schools-bullet">
              <span className="landing-bullet-icon">✓</span>
              <span>EYFS aligned activities</span>
            </div>
            <div className="landing-schools-bullet">
              <span className="landing-bullet-icon">✓</span>
              <span>Adult gate for settings and exit</span>
            </div>
            <div className="landing-schools-bullet">
              <span className="landing-bullet-icon">✓</span>
              <span>No child accounts</span>
            </div>
            <div className="landing-schools-bullet">
              <span className="landing-bullet-icon">✓</span>
              <span>No ads</span>
            </div>
            <div className="landing-schools-bullet">
              <span className="landing-bullet-icon">✓</span>
              <span>Works on a laptop and webcam</span>
            </div>
          </div>
          <div className="landing-schools-ctas">
            <button 
              className="landing-btn landing-btn-primary landing-btn-large"
              onClick={handleRequestClick}
            >
              Request school pilot pack
            </button>
          </div>
        </div>
      </section>

      {showForm && (
        <div 
          className="landing-mapping-modal" 
          onClick={handleClose}
          ref={modalRef}
        >
          <div className="landing-mapping-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="landing-modal-close" 
              onClick={handleClose}
              aria-label="Close modal"
              disabled={isSubmitting || submitted}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h3>Request School Pilot Pack</h3>
            {submitted ? (
              <div className="landing-pilot-success">
                <svg className="landing-success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Thank you! We'll be in touch soon.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="landing-pilot-form">
                {error && (
                  <div className="landing-pilot-error" role="alert">
                    {error}
                  </div>
                )}
                <input
                  ref={firstInputRef}
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Contact name *"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  required
                  aria-label="Contact name"
                />
                <input
                  type="email"
                  className="landing-pilot-input"
                  placeholder="Email *"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  aria-label="Email"
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="School name *"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  required
                  aria-label="School name"
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Your role *"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  aria-label="Your role"
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Year group (optional)"
                  value={formData.yearGroup}
                  onChange={(e) => setFormData({ ...formData, yearGroup: e.target.value })}
                  aria-label="Year group"
                />
                <select
                  className="landing-pilot-input"
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  aria-label="Device type"
                >
                  <option value="">Device type (optional)</option>
                  <option value="laptop">Laptop</option>
                  <option value="tablet">Tablet</option>
                  <option value="interactive_whiteboard">Interactive Whiteboard</option>
                  <option value="other">Other</option>
                </select>
                <textarea
                  className="landing-pilot-input"
                  placeholder="SEND notes (optional)"
                  value={formData.sendNotes}
                  onChange={(e) => setFormData({ ...formData, sendNotes: e.target.value })}
                  rows={4}
                  aria-label="SEND notes"
                />
                <button 
                  type="submit" 
                  className="landing-btn landing-btn-primary"
                  disabled={isSubmitting}
                  style={{ marginTop: 'var(--spacing-sm)' }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
            <p className="landing-pilot-privacy" style={{ marginTop: 'var(--spacing-md)', marginBottom: 0 }}>
              We only use this to contact you about school packs. Your information is kept private.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

