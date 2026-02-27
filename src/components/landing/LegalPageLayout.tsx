import React, { useState } from 'react';
import './new-landing.css';

interface LegalPageLayoutProps {
    children: React.ReactNode;
    heroTitle: string;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ children, heroTitle }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="nl-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* ═══════ NAV ═══════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 nl-nav-blur" style={{ background: 'rgba(10,14,26,.7)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <a href="/#top" className="flex items-center gap-3 no-underline text-white group cursor-pointer flex-shrink-0">
                        <img src="/logo.png" alt="Draw in the Air" className="h-8 md:h-9 w-auto object-contain flex-shrink-0 transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6 group-hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={{ maxHeight: '36px', height: '36px' }} />
                    </a>
                    <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
                        <a href="/#how-it-works" className="hover:text-cyan-400 hover:scale-110 transition-all no-underline cursor-pointer">How It Works</a>
                        <a href="/#features" className="hover:text-cyan-400 hover:scale-110 transition-all no-underline cursor-pointer">Activities</a>
                        <a href="/#parents" className="hover:text-cyan-400 hover:scale-110 transition-all no-underline cursor-pointer">For Parents</a>
                        <a href="/#schools" className="hover:text-cyan-400 hover:scale-110 transition-all no-underline cursor-pointer">For Schools</a>
                        <a href="/faq" className="hover:text-cyan-400 hover:scale-110 transition-all no-underline">FAQ</a>
                        <a href="/play" className="nl-btn-primary text-white font-semibold px-5 py-2 rounded-lg text-sm no-underline">Try Free</a>
                    </div>
                    <button className="md:hidden text-gray-400" style={{ background: 'none', border: 'none', boxShadow: 'none' }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>
                {mobileMenuOpen && (
                    <div className="md:hidden px-6 pb-4 space-y-3 text-sm text-gray-400">
                        <a href="/#how-it-works" className="block py-2 no-underline text-gray-400 hover:text-cyan-400">How It Works</a>
                        <a href="/#features" className="block py-2 no-underline text-gray-400 hover:text-cyan-400">Activities</a>
                        <a href="/#parents" className="block py-2 no-underline text-gray-400 hover:text-cyan-400">For Parents</a>
                        <a href="/#schools" className="block py-2 no-underline text-gray-400 hover:text-cyan-400">For Schools</a>
                        <a href="/faq" className="block py-2 no-underline text-gray-400 hover:text-cyan-400">FAQ</a>
                        <a href="/play" className="block nl-btn-primary text-white font-semibold px-5 py-2.5 rounded-lg text-center mt-2 no-underline">Try Free</a>
                    </div>
                )}
            </nav>

            {/* ═══════ MAIN CONTENT ═══════ */}
            <main className="flex-grow pt-32 pb-20 relative nl-hero-gradient">
                <div className="max-w-3xl mx-auto px-6">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-12 text-center text-white">
                        {heroTitle}
                    </h1>
                    <div className="nl-legal-content bg-[#111629] border border-[#1e293b] rounded-2xl p-8 sm:p-12 shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-orange-400 rounded-t-2xl opacity-50"></div>
                        {children}
                    </div>
                </div>
            </main>

            {/* ═══════ FOOTER ═══════ */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,.05)', background: '#0a0e1a' }} className="py-16 mt-auto">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <img src="/logo.png" alt="Draw in the Air" className="h-8 md:h-9 w-auto" style={{ maxHeight: '36px', height: '36px' }} />
                                <span className="font-bold text-white tracking-widest uppercase">Draw in the Air</span>
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">Gesture-based learning platform for children aged 3–7. Built with care.</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-4">Product</h4>
                            <div className="space-y-2.5">
                                <a href="/play" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Try Free</a>
                                <a href="/demo" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Demo</a>
                                <a href="/schools" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">School Pilot Pack</a>
                                <a href="/faq" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">FAQ</a>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-4">Legal</h4>
                            <div className="space-y-2.5">
                                <a href="/privacy" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Privacy Policy</a>
                                <a href="/terms" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Terms of Use</a>
                                <a href="/safeguarding" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Safeguarding</a>
                                <a href="/accessibility" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Accessibility</a>
                                <a href="/cookies" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Cookie Policy</a>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-4">Contact</h4>
                            <div className="space-y-2.5">
                                <a href="mailto:partnership@drawintheair.com" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">partnership@drawintheair.com</a>
                            </div>
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,.05)' }} className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-gray-600">© 2026 Draw in the Air. All rights reserved.</p>
                        <p className="text-xs text-gray-700">Made with care for young learners.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
