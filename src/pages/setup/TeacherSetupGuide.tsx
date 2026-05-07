/**
 * /teachers/setup — Teacher Quick-Start guide.
 *
 * Idiot-proof. Big-numbered steps. Prints to A4 cleanly via Cmd+P.
 *
 * Design intent (per the strategist memo):
 *   • Same flow works for in-person and remote.
 *   • Reading time under 90 seconds; doing time under 60.
 *   • Distribution loop at the bottom — every page is a recruiting
 *     surface for the colleague-down-the-hall.
 */

import { useEffect } from 'react';
import { SeoLayout } from '../seo/SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { logEvent } from '../../lib/analytics';
import './setup.css';

const printGuide = () => window.print();

const SHARE_BLURB = `Hi — I've started using Draw in the Air with my class. It's a free movement-learning tool that runs in the browser, no accounts, no install. Five-minute brain breaks that actually teach something. There's a teacher quick-start at https://drawintheair.com/teachers/setup if you want a look.`;

export default function TeacherSetupGuide() {
    useEffect(() => {
        logEvent('for_teachers_page_view', { page: '/teachers/setup' });
    }, []);

    const handleEmailColleague = () => {
        const subject = encodeURIComponent('Quick movement break for our class');
        const body = encodeURIComponent(SHARE_BLURB);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    return (
        <SeoLayout>
            <SEOMeta
                title="Teacher quick-start · Draw in the Air"
                description="Run your first movement break in 60 seconds. One join code, no accounts for kids. Works in class or for remote teaching."
                canonical="https://drawintheair.com/teachers/setup"
            />

            <div className="sg-page">
                <div className="sg-wrap">
                    {/* Hero */}
                    <section className="sg-hero">
                        <p className="sg-hero-eyebrow">Teacher quick-start</p>
                        <h1>Run your first class in 60 seconds.</h1>
                        <p>
                            One join code for the whole lesson. You're in control the whole time —
                            students never click anything they shouldn't.
                        </p>
                        <div className="sg-hero-actions sg-no-print">
                            <a className="sg-btn sg-btn-primary" href="/class">
                                Start a class now →
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
                                    <p className="sg-step-title">Sign in</p>
                                    <p className="sg-step-body">
                                        Open <code>drawintheair.com/class</code> on your laptop. Sign in with your
                                        Google account (school or personal — same thing).
                                    </p>
                                </div>
                            </li>
                            <li>
                                <div>
                                    <p className="sg-step-title">Click "Start Class"</p>
                                    <p className="sg-step-body">
                                        A <strong>4-digit code</strong> appears in the top-left of your screen.
                                        That code is good for the whole lesson — no need to ever generate a new one.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <div>
                                    <p className="sg-step-title">Show the code</p>
                                    <p className="sg-step-body">
                                        Project your screen on the board, or just write the 4 digits on the whiteboard.
                                        Students go to <code>drawintheair.com/join</code> and type the code.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <div>
                                    <p className="sg-step-title">Pick an activity</p>
                                    <p className="sg-step-body">
                                        On your console, tap any activity tile. Every joined student instantly
                                        sees that activity start. They never pick — you do.
                                    </p>
                                </div>
                            </li>
                            <li>
                                <div>
                                    <p className="sg-step-title">Run the room</p>
                                    <p className="sg-step-body">
                                        Pause / resume / end / switch — students follow whatever you do. When you're
                                        done, hold "End class" for 2 seconds and you'll see a printable summary.
                                    </p>
                                </div>
                            </li>
                        </ol>
                    </section>

                    {/* What you need */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">🎒</span>What you need</h2>
                        <ul className="sg-checklist">
                            <li>A laptop or Chromebook for you (with a webcam, but you don't need to use it)</li>
                            <li>A Chromebook or tablet per child (or pairs share a screen)</li>
                            <li>A webcam on each child's device — almost all built-in webcams work</li>
                            <li>Decent lighting — natural light from a window is best</li>
                            <li>About 1 metre of clear space in front of each child</li>
                            <li>Modern browser: Chrome, Edge, Safari, Firefox — all work</li>
                            <li>No software install. No accounts for students. Ever.</li>
                        </ul>
                    </section>

                    {/* Teacher controls */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">🎛</span>Your controls during class</h2>
                        <ul className="sg-transport">
                            <li>
                                <span className="sg-transport-icon">▶</span>
                                <div className="sg-transport-title">Pick activity</div>
                                <div className="sg-transport-desc">Click a tile → all students load it together.</div>
                            </li>
                            <li>
                                <span className="sg-transport-icon">⏸</span>
                                <div className="sg-transport-title">Pause</div>
                                <div className="sg-transport-desc">Freezes everyone. Use it to give an instruction.</div>
                            </li>
                            <li>
                                <span className="sg-transport-icon">⏹</span>
                                <div className="sg-transport-title">End activity</div>
                                <div className="sg-transport-desc">Closes this activity. Pick the next one when ready.</div>
                            </li>
                            <li>
                                <span className="sg-transport-icon">✕</span>
                                <div className="sg-transport-title">Remove a student</div>
                                <div className="sg-transport-desc">Click the ✕ on a roster card. They get a kind goodbye message.</div>
                            </li>
                            <li>
                                <span className="sg-transport-icon">📊</span>
                                <div className="sg-transport-title">Student stats</div>
                                <div className="sg-transport-desc">Click any roster card → per-student session breakdown.</div>
                            </li>
                            <li>
                                <span className="sg-transport-icon">🛑</span>
                                <div className="sg-transport-title">End class</div>
                                <div className="sg-transport-desc">Press and <strong>hold</strong> for 2 seconds. Stops accidental clicks.</div>
                            </li>
                        </ul>
                    </section>

                    {/* Remote teaching */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">🏠</span>Teaching remotely?</h2>
                        <p>
                            Same flow. Sign in, click Start Class, and share the 4-digit code via your video
                            tool's chat (Zoom, Meet, Teams) or screen-share. Students at home type the code
                            and join. They appear on your roster regardless of location.
                        </p>
                        <div className="sg-callout">
                            <p className="sg-callout-title">Tip for remote</p>
                            <p>
                                Ask kids to put their laptop at eye level and stand back about an arm's length.
                                Camera + space + light = good tracking.
                            </p>
                        </div>
                    </section>

                    {/* Privacy */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">🔒</span>What you can tell parents (and SLT)</h2>
                        <p>
                            <strong>No video is recorded or transmitted, ever.</strong> The hand tracking happens
                            entirely in each child's browser — no frames leave their device.
                        </p>
                        <p>
                            We collect anonymous gameplay analytics (which activity, how long, accuracy on the
                            letter being traced). No names. No faces. No audio. No location. Auto-deleted after
                            12 months. Full detail at{' '}
                            <a href="/privacy">drawintheair.com/privacy</a>.
                        </p>
                    </section>

                    {/* Troubleshooting */}
                    <section className="sg-section sg-section-break">
                        <h2><span className="sg-h-emoji">🛠</span>If something goes wrong</h2>
                        <dl className="sg-faq">
                            <dt>"My camera isn't working."</dt>
                            <dd>
                                Refresh the page and click <strong>Allow</strong> when the browser asks for camera
                                permission. If you accidentally hit Block, click the camera icon in the address
                                bar and switch it back to Allow.
                            </dd>

                            <dt>"It says my hand isn't tracked."</dt>
                            <dd>
                                Three usual causes — too dark, too close, or too far. Face a window. Stand back
                                about an arm's length. Make sure your full hand is in the camera frame.
                            </dd>

                            <dt>"A student lost connection."</dt>
                            <dd>
                                Their tablet probably went to sleep. Tell them to refresh — they auto-rejoin with
                                the same code and name within 15 minutes; their progress is intact.
                            </dd>

                            <dt>"Two students with the same name."</dt>
                            <dd>
                                The second one becomes <em>"Lila B"</em>, the third <em>"Lila C"</em>. Easy to spot.
                            </dd>

                            <dt>"I removed the wrong student."</dt>
                            <dd>
                                They can rejoin with the same code from the same device. They'll show up on your
                                roster again.
                            </dd>

                            <dt>"How many students at once?"</dt>
                            <dd>
                                Up to 30 per class on the free plan. Need more? <a href="/schools">Get in touch</a>.
                            </dd>

                            <dt>"Can I run the same code tomorrow?"</dt>
                            <dd>
                                Once a class is ended it's archived (you'll see it in "Recent classes"). Each new
                                class gets a fresh code — but it takes one click to start.
                            </dd>

                            <dt>"Where do I see what each student did?"</dt>
                            <dd>
                                Click any roster card during class for a live breakdown. After class, the summary
                                screen lists every student's activity totals.
                            </dd>
                        </dl>
                    </section>

                    {/* Curriculum + use cases */}
                    <section className="sg-section">
                        <h2><span className="sg-h-emoji">📚</span>How teachers actually use it</h2>
                        <ul className="sg-checklist">
                            <li><strong>Brain break:</strong> 5 minutes of Bubble Pop between maths and literacy.</li>
                            <li><strong>Phonics warm-up:</strong> 10 minutes of letter tracing before a writing task.</li>
                            <li><strong>Computer-lab cover:</strong> sub plan for a tricky 30-minute slot.</li>
                            <li><strong>EYFS gross-motor goals:</strong> Sort &amp; Place + Rainbow Bridge daily.</li>
                            <li><strong>Wet-play option:</strong> indoor movement when the playground's closed.</li>
                            <li><strong>Homework extension:</strong> students play at home with the same activities.</li>
                        </ul>
                    </section>

                    {/* Distribution loop */}
                    <section className="sg-share sg-no-print">
                        <h2>Pass it on</h2>
                        <p>If it works for your class, the year-group lead next door will love you for sharing.</p>
                        <div className="sg-share-row">
                            <button className="sg-btn sg-btn-primary" onClick={handleEmailColleague}>
                                ✉ Email a colleague
                            </button>
                            <button
                                className="sg-btn sg-btn-secondary"
                                onClick={() => {
                                    navigator.clipboard?.writeText('https://drawintheair.com/teachers/setup');
                                    alert('Link copied — paste it anywhere.');
                                }}
                            >
                                🔗 Copy link
                            </button>
                            <a className="sg-btn sg-btn-secondary" href="/schools">
                                🏫 Roll out to my school
                            </a>
                        </div>
                    </section>

                    <p className="sg-footer">
                        <a href="/parents/setup">Parents' guide →</a> ·{' '}
                        <a href="/privacy">Privacy</a> ·{' '}
                        <a href="/safeguarding">Safeguarding</a> ·{' '}
                        <a href="mailto:partnership@drawintheair.com">partnership@drawintheair.com</a>
                    </p>
                </div>
            </div>
        </SeoLayout>
    );
}
