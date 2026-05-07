/**
 * /parents/setup — Parent quick-start guide.
 *
 * Different audience to the teacher version: parents need
 * reassurance about privacy + safety, not classroom controls. Same
 * skeleton, different copy. Prints to A4.
 */

import { useEffect } from 'react';
import { SeoLayout } from '../seo/SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { logEvent } from '../../lib/analytics';
import './setup.css';

const printGuide = () => window.print();

export default function ParentSetupGuide() {
    useEffect(() => {
        logEvent('for_parents_page_view', { page: '/parents/setup' });
    }, []);

    const handleShareTeacher = () => {
        const subject = encodeURIComponent("Something my kid loves — could you try it in class?");
        const body = encodeURIComponent(
            `Hi — my child has been using Draw in the Air at home and really loves it. It's a free, browser-based movement tool — no accounts, no install. Five-minute activities that teach letter tracing, sorting, colour matching. Could be a nice fit for the classroom too. There's a teacher quick-start at https://drawintheair.com/teachers/setup if you want a look.`,
        );
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    return (
        <SeoLayout>
            <SEOMeta
                title="Parents' quick-start · Draw in the Air"
                description="Set up your kid for movement learning at home. No app, no accounts, no cost. Camera-based hand tracking that runs entirely on your device."
                canonical="https://drawintheair.com/parents/setup"
            />

            <div className="sg-page">
                <div className="sg-wrap">
                    {/* Hero */}
                    <section className="sg-hero">
                        <p className="sg-hero-eyebrow">Parents' quick-start</p>
                        <h1>Set your kid up at home in under a minute.</h1>
                        <p>
                            Movement-based learning that runs in your browser. No app to install, no accounts
                            to create, no charge. Your kid waves their hand at the screen and the screen
                            responds — that's the whole interaction.
                        </p>
                        <div className="sg-hero-actions sg-no-print">
                            <a className="sg-btn sg-btn-primary" href="/">
                                Try it now →
                            </a>
                            <button className="sg-btn sg-btn-secondary" onClick={printGuide}>
                                🖨 Print this guide
                            </button>
                        </div>
                    </section>

                    {/* The 60-second version */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">⏱</span>The 60-second version</h2>
                        <ol className="sg-steps">
                            <li>
                                <div>
                                    <p className="sg-step-title">Open the site</p>
                                    <p className="sg-step-body">
                                        Go to <code>drawintheair.com</code> on a laptop or computer with a webcam.
                                        Any modern browser works — Chrome, Edge, Safari, Firefox.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <div>
                                    <p className="sg-step-title">Click "Try Free"</p>
                                    <p className="sg-step-body">
                                        Pick your child's age band (4–5, 6–7, etc.). This just sets the difficulty —
                                        no name, no email, no account.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <div>
                                    <p className="sg-step-title">Allow the camera</p>
                                    <p className="sg-step-body">
                                        Your browser will ask permission to use the webcam. Click <strong>Allow</strong>.
                                        The camera feed never leaves your device — see the privacy panel below.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <div>
                                    <p className="sg-step-title">Wave at the screen</p>
                                    <p className="sg-step-body">
                                        A friendly "wave to start" screen appears. Your child waves their hand a
                                        few times and the activities open up. That's it.
                                    </p>
                                </div>
                            </li>
                        </ol>
                    </section>

                    {/* What you need */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">🏠</span>What you need at home</h2>
                        <ul className="sg-checklist">
                            <li>A laptop or computer (Mac, Windows, Chromebook — anything modern)</li>
                            <li>A built-in or USB webcam — most laptops already have one</li>
                            <li>About 1 metre of clear space in front of the screen</li>
                            <li>Decent lighting — face a window if you can; avoid backlighting</li>
                            <li>Modern browser (Chrome, Edge, Safari, Firefox)</li>
                            <li>That's it. No app store. No login. No subscription.</li>
                        </ul>
                    </section>

                    {/* Setup tips */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">💡</span>Tips for the first session</h2>
                        <ul className="sg-checklist">
                            <li>Sit the laptop on a table at roughly your child's eye level</li>
                            <li>Stand back about an arm's length — so the camera sees their full hand</li>
                            <li>Bright room, lit from in front (window behind the laptop, not behind your kid)</li>
                            <li>Pinch thumb and index finger together to "click" or "draw"</li>
                            <li>If tracking feels off, tell them to step back a little — almost always fixes it</li>
                            <li>Keep first sessions short. 5 minutes is plenty for a 4-year-old.</li>
                        </ul>
                    </section>

                    {/* Privacy */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">🔒</span>Privacy — the honest version</h2>
                        <div className="sg-callout">
                            <p className="sg-callout-title">No video is ever recorded, transmitted, or stored.</p>
                            <p>
                                The hand tracking runs entirely inside your browser, frame by frame. Frames are
                                analysed locally and immediately discarded. We have no servers that see your camera.
                            </p>
                        </div>
                        <h3>What we DO collect</h3>
                        <p>
                            Anonymous gameplay analytics: which activity, how long, accuracy on the letter being
                            traced. We tag these with a random browser identifier (no name, no email, no face)
                            so we can see if the same browser comes back. <strong>Auto-deleted after 12 months.</strong>
                        </p>
                        <h3>What we DON'T collect</h3>
                        <ul className="sg-checklist">
                            <li>No names, emails, or addresses</li>
                            <li>No faces, audio, or video</li>
                            <li>No geolocation</li>
                            <li>No cross-site tracking, no advertising IDs</li>
                            <li>No data shared with any third party</li>
                        </ul>
                        <p>
                            Full detail and how to opt out / clear your local data:{' '}
                            <a href="/privacy">drawintheair.com/privacy</a>
                        </p>
                    </section>

                    {/* What it teaches */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">🎓</span>What your kid is actually learning</h2>
                        <p>
                            This isn't another tablet game. The activities target real early-learning skills,
                            but through movement — which is how preschool brains learn fastest.
                        </p>
                        <ul className="sg-checklist">
                            <li><strong>Letter tracing:</strong> the same fine-motor + recognition pattern they'll do with a pencil — but bigger, slower, and with instant feedback.</li>
                            <li><strong>Bubble Pop:</strong> hand-eye coordination warm-up, also great as a pre-bedtime brain calmer.</li>
                            <li><strong>Sort &amp; Place:</strong> categorisation (food vs. toys, recyclable vs. trash) — a foundation for early reasoning.</li>
                            <li><strong>Balloon Math:</strong> number recognition + early arithmetic, with the answer-balloon you have to physically reach for.</li>
                            <li><strong>Rainbow Bridge:</strong> colour matching + memory.</li>
                            <li><strong>Spelling Stars:</strong> letter order, simple words.</li>
                            <li>Aligned with EYFS (UK) and US Common Core early-learning standards.</li>
                        </ul>
                    </section>

                    {/* Troubleshooting */}
                    <section className="sg-section sg-section-break">
                        <h2><span className="sg-h-emoji">🛠</span>If something goes wrong</h2>
                        <dl className="sg-faq">
                            <dt>"It can't find the hand."</dt>
                            <dd>
                                Three usual causes — too dark, too close, or too far away. Face a window. Step
                                back about an arm's length so your full hand fits in the frame.
                            </dd>

                            <dt>"My browser blocked the camera."</dt>
                            <dd>
                                Click the camera icon next to the address bar and switch it back to Allow. Then
                                refresh the page.
                            </dd>

                            <dt>"It runs slowly on our laptop."</dt>
                            <dd>
                                Close other browser tabs and apps. The hand tracking is processor-heavy. If it's
                                still slow, try Chrome — it's typically the fastest browser for this kind of work.
                            </dd>

                            <dt>"My child can't pinch their fingers."</dt>
                            <dd>
                                For very young kids (3–4), an open palm wave or a finger point still triggers most
                                activities. Pinching is a "draw" trigger, not a join trigger.
                            </dd>

                            <dt>"How long should they play?"</dt>
                            <dd>
                                5–10 minutes per session for under-7s. Movement learning fatigues differently from
                                screen-watching — it's a real workout for small bodies.
                            </dd>

                            <dt>"Two siblings, one screen?"</dt>
                            <dd>
                                Take turns. The camera tracks one person at a time today. Twin-mode is on the
                                roadmap.
                            </dd>

                            <dt>"Will it cost anything?"</dt>
                            <dd>
                                No. It's free for home use, forever. Schools pay if they use it across multiple
                                classrooms; that subsidises the home tier.
                            </dd>

                            <dt>"My kid's school doesn't use it — should I tell them?"</dt>
                            <dd>
                                Yes please. Use the "Show your kid's teacher" button at the bottom of this page.
                            </dd>
                        </dl>
                    </section>

                    {/* Distribution loop */}
                    <section className="sg-share sg-no-print">
                        <h2>Show your kid's teacher</h2>
                        <p>
                            One email, two minutes. If they like it, the whole class plays — and you've just
                            given the teacher a shiny new brain-break tool.
                        </p>
                        <div className="sg-share-row">
                            <button className="sg-btn sg-btn-primary" onClick={handleShareTeacher}>
                                ✉ Email your kid's teacher
                            </button>
                            <button
                                className="sg-btn sg-btn-secondary"
                                onClick={() => {
                                    navigator.clipboard?.writeText('https://drawintheair.com/parents/setup');
                                    alert('Link copied — paste it anywhere.');
                                }}
                            >
                                🔗 Copy link
                            </button>
                        </div>
                    </section>

                    <p className="sg-footer">
                        <a href="/teachers/setup">Teachers' guide →</a> ·{' '}
                        <a href="/privacy">Privacy</a> ·{' '}
                        <a href="/safeguarding">Safeguarding</a> ·{' '}
                        <a href="mailto:help@drawintheair.com">help@drawintheair.com</a>
                    </p>
                </div>
            </div>
        </SeoLayout>
    );
}
