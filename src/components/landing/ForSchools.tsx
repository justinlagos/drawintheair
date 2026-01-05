import React, { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.contactName && formData.email && formData.schoolName && formData.role) {
      setIsSubmitting(true);
      try {
        // Track form submission event
        if (typeof window !== 'undefined' && (window as any).analytics) {
          (window as any).analytics.logEvent('school_pack_form_submit', {
            success: true,
            location: 'landing'
          });
        }

        // Submit to API endpoint
        const response = await fetch('/api/school-pack', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            school_name: formData.schoolName,
            contact_name: formData.contactName,
            role: formData.role,
            email: formData.email,
            year_group: formData.yearGroup,
            device_type: formData.deviceType,
            send_notes: formData.sendNotes || null,
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
        // Fallback to localStorage if API fails
        const forms = JSON.parse(localStorage.getItem('schoolPackForms') || '[]');
        forms.push({ ...formData, timestamp: new Date().toISOString() });
        localStorage.setItem('schoolPackForms', JSON.stringify(forms));
        setSubmitted(true);
        setTimeout(() => {
          setShowForm(false);
          setSubmitted(false);
        }, 3000);
      } finally {
        setIsSubmitting(false);
      }
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
        <div className="landing-mapping-modal" onClick={() => setShowForm(false)}>
          <div className="landing-mapping-content" onClick={(e) => e.stopPropagation()}>
            <button className="landing-modal-close" onClick={() => setShowForm(false)}>×</button>
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
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Contact name *"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  required
                />
                <input
                  type="email"
                  className="landing-pilot-input"
                  placeholder="Email *"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="School name *"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Your role *"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="landing-pilot-input"
                  placeholder="Year group (optional)"
                  value={formData.yearGroup}
                  onChange={(e) => setFormData({ ...formData, yearGroup: e.target.value })}
                />
                <select
                  className="landing-pilot-input"
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
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
                  rows={3}
                />
                <button 
                  type="submit" 
                  className="landing-btn landing-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
            <p className="landing-pilot-privacy">We only use this to contact you about school packs</p>
          </div>
        </div>
      )}
    </>
  );
};

