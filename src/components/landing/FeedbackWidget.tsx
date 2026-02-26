import React, { useState } from 'react';
import './landing.css';

export const FeedbackWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setIsSubmitting(true);
        try {
            const endpoint = import.meta.env.VITE_SHEETS_ENDPOINT;
            if (!endpoint) {
                throw new Error('Endpoint not configured');
            }

            const payloadData = {
                feedback: feedback.trim(),
                email: email.trim() || undefined,
                url: window.location.href,
                userAgent: navigator.userAgent
            };

            const data = JSON.stringify({ type: 'feedback', payload: payloadData });
            const url = `${endpoint}?data=${encodeURIComponent(data)}`;

            const response = await fetch(url, { redirect: 'follow' });
            if (!response.ok) throw new Error('Failed to submit');

            setSubmitted(true);
            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
                setFeedback('');
                setEmail('');
            }, 3000);
        } catch (err) {
            console.error('Error submitting feedback:', err);
            // Fallback or error handled silently for simple widget
            setSubmitted(true);
            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
                setFeedback('');
                setEmail('');
            }, 3000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="landing-feedback-widget">
            {!isOpen ? (
                <button
                    className="landing-feedback-trigger"
                    onClick={() => setIsOpen(true)}
                    aria-label="Give feedback"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span className="landing-feedback-text">Feedback</span>
                </button>
            ) : (
                <div className="landing-feedback-panel">
                    <div className="landing-feedback-header">
                        <h4>Send Feedback</h4>
                        <button
                            className="landing-feedback-close"
                            onClick={() => setIsOpen(false)}
                        >
                            ×
                        </button>
                    </div>
                    {submitted ? (
                        <div className="landing-feedback-success">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <p>Thanks for your thought!</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="landing-feedback-form">
                            <textarea
                                placeholder="What can we do better?"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                required
                                rows={4}
                            />
                            <input
                                type="email"
                                placeholder="Email (optional)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="landing-btn landing-btn-primary"
                                disabled={isSubmitting || !feedback.trim()}
                            >
                                {isSubmitting ? 'Sending...' : 'Send'}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};
