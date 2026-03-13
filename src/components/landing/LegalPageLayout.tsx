import React, { useState } from 'react';

interface LegalPageLayoutProps {
    children: React.ReactNode;
    heroTitle: string;
}

const platformUrl = import.meta.env.VITE_PLATFORM_URL || 'https://app.drawintheair.com';

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ children, heroTitle }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            {/* ═══════ NAV ═══════ */}
            <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0' }}>
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <a href="/#top" className="flex items-center gap-3 no-underline group cursor-pointer flex-shrink-0">
                        <img src="/logo.png" alt="Draw in the Air" className="h-8 md:h-9 w-auto object-contain flex-shrink-0 transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6" style={{ maxHeight: '36px', height: '36px' }} />
                    </a>
                    <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: '#64748b' }}>
                        <a href="/#how-it-works" className="hover:text-orange-500 transition-all no-underline cursor-pointer" style={{ color: 'inherit' }}>How It Works</a>
                        <a href="/#features" className="hover:text-orange-500 transition-all no-underline cursor-pointer" style={{ color: 'inherit' }}>Activities</a>
                        <a href="/#parents" className="hover:text-orange-500 transition-all no-underline cursor-pointer" style={{ color: 'inherit' }}>For Parents</a>
                        <a href="/#schools" className="hover:text-orange-500 transition-all no-underline cursor-pointer" style={{ color: 'inherit' }}>For Schools</a>
                        <a href="/faq" className="hover:text-orange-500 transition-all no-underline" style={{ color: 'inherit' }}>FAQ</a>
                        <a href="/play" className="text-white font-semibold px-5 py-2 rounded-lg text-sm no-underline" style={{ background: '#f97316' }}>Try Free</a>
                    </div>
                    <button className="md:hidden" style={{ background: 'none', border: 'none', boxShadow: 'none', color: '#64748b' }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>
                {mobileMenuOpen && (
                    <div className="md:hidden px-6 pb-4 space-y-3 text-sm" style={{ color: '#64748b' }}>
                        <a href="/#how-it-works" className="block py-2 no-underline hover:text-orange-500" style={{ color: 'inherit' }}>How It Works</a>
                        <a href="/#features" className="block py-2 no-underline hover:text-orange-500" style={{ color: 'inherit' }}>Activities</a>
                        <a href="/#parents" className="block py-2 no-underline hover:text-orange-500" style={{ color: 'inherit' }}>For Parents</a>
                        <a href="/#schools" className="block py-2 no-underline hover:text-orange-500" style={{ color: 'inherit' }}>For Schools</a>
                        <a href="/faq" className="block py-2 no-underline hover:text-orange-500" style={{ color: 'inherit' }}>FAQ</a>
                        <a href="/play" className="block text-white font-semibold px-5 py-2.5 rounded-lg text-center mt-2 no-underline" style={{ background: '#f97316' }}>Try Free</a>
                    </div>
                )}
            </nav>

            {/* ═══════ MAIN CONTENT ═══════ */}
            <main className="flex-grow pt-28 pb-20 relative" style={{ background: '#f8fafc' }}>
                <div className="max-w-3xl mx-auto px-6">
                    {/* Hero heading */}
                    <div className="text-center mb-10">
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: '#0f172a' }}>
                            {heroTitle}
                        </h1>
                    </div>

                    {/* Content card */}
                    <div className="legal-content-light rounded-2xl p-8 sm:p-12 shadow-sm relative" style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                    }}>
                        <div className="absolute top-0 left-0 w-full h-1 rounded-t-2xl" style={{ background: 'linear-gradient(to right, #f97316, #fb923c)' }}></div>
                        {children}
                    </div>
                </div>
            </main>

            {/* ═══════ FOOTER ═══════ */}
            <footer className="py-16 mt-auto" style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <img src="/logo.png" alt="Draw in the Air" className="h-8 md:h-9 w-auto" style={{ maxHeight: '36px', height: '36px' }} />
                                <span className="font-bold tracking-widest uppercase" style={{ color: '#0f172a' }}>Draw in the Air</span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>Gesture-based learning platform for children aged 3-7. Built with care.</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#94a3b8' }}>Product</h4>
                            <div className="space-y-2.5">
                                <a href="/play" className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>Try Free</a>
                                <a href="/schools" className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>School Pilot Pack</a>
                                <a href="/faq" className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>FAQ</a>
                                <a href={`${platformUrl}/pricing`} className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>Pricing</a>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#94a3b8' }}>Legal</h4>
                            <div className="space-y-2.5">
                                <a href="/privacy" className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>Privacy Policy</a>
                                <a href="/terms" className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>Terms of Use</a>
                                <a href="/safeguarding" className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>Safeguarding</a>
                                <a href="/accessibility" className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>Accessibility</a>
                                <a href="/cookies" className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>Cookie Policy</a>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#94a3b8' }}>Contact</h4>
                            <div className="space-y-2.5">
                                <a href="mailto:partnership@drawintheair.com" className="block text-sm hover:text-orange-500 transition-colors no-underline" style={{ color: '#64748b' }}>partnership@drawintheair.com</a>
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid #e2e8f0' }}>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>© 2026 Draw in the Air. All rights reserved.</p>
                        <p className="text-xs" style={{ color: '#cbd5e1' }}>Made with care for young learners.</p>
                    </div>
                </div>
            </footer>

            {/* Scoped styles for legal content */}
            <style>{`
                .legal-content-light h2 {
                    font-size: 1.35rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin-top: 2rem;
                    margin-bottom: 0.75rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid #fed7aa;
                }
                .legal-content-light h2:first-of-type {
                    margin-top: 0.5rem;
                }
                .legal-content-light p {
                    color: #475569;
                    line-height: 1.75;
                    margin-bottom: 1rem;
                    font-size: 0.95rem;
                }
                .legal-content-light strong {
                    color: #1e293b;
                    font-weight: 600;
                }
                .legal-content-light a {
                    color: #ea580c;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                }
                .legal-content-light a:hover {
                    color: #c2410c;
                }
                .legal-content-light ul, .legal-content-light ol {
                    color: #475569;
                    padding-left: 1.5rem;
                    margin-bottom: 1rem;
                }
                .legal-content-light li {
                    margin-bottom: 0.5rem;
                    line-height: 1.7;
                }
            `}</style>
        </div>
    );
};
