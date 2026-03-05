import { ImageResponse } from '@vercel/og';

export const config = {
    runtime: 'edge',
};

// We create a standard Vercel image generator without external font fetching overhead
// to keep the cold boot extremely fast for social scrapers.
export default async function handler(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const title = searchParams.get('title') || 'Draw in the Air';
        const description = searchParams.get('desc') || 'The free, browser-based gesture drawing app for kids.';
        const emoji = searchParams.get('emoji') || '✨';
        const badge = searchParams.get('badge') || 'Free, No Download';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        backgroundColor: '#0f172a', /* slate-900 */
                        padding: '80px',
                        position: 'relative',
                    }}
                >
                    {/* Subtle background gradient overlay */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: 'radial-gradient(circle at top right, rgba(108, 71, 255, 0.4) 0%, rgba(15, 23, 42, 0) 60%), radial-gradient(circle at bottom left, rgba(34, 211, 238, 0.3) 0%, rgba(15, 23, 42, 0) 60%)',
                        }}
                    />

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            zIndex: 10,
                            alignItems: 'flex-start',
                        }}
                    >
                        {/* Badge container */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 24px',
                                borderRadius: '40px',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                border: '2px solid rgba(255, 255, 255, 0.2)',
                                marginBottom: '32px',
                            }}
                        >
                            <span style={{ fontSize: '32px', marginRight: '16px' }}>{emoji}</span>
                            <span
                                style={{
                                    fontSize: '28px',
                                    fontWeight: 700,
                                    color: '#e2e8f0', /* slate-200 */
                                    letterSpacing: '0.5px'
                                }}
                            >
                                {badge}
                            </span>
                        </div>

                        {/* Title */}
                        <div
                            style={{
                                fontSize: '84px',
                                fontWeight: 900,
                                color: '#ffffff',
                                lineHeight: 1.1,
                                marginBottom: '24px',
                                maxWidth: '900px',
                            }}
                        >
                            {title}
                        </div>

                        {/* Description */}
                        <div
                            style={{
                                fontSize: '40px',
                                fontWeight: 600,
                                color: '#94a3b8', /* slate-400 */
                                lineHeight: 1.4,
                                maxWidth: '900px',
                            }}
                        >
                            {description}
                        </div>

                        {/* Footer / Branding */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: '80px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, #6c47ff, #22d3ee)',
                                    color: 'white',
                                    fontWeight: 900,
                                    fontSize: '36px',
                                    marginRight: '20px'
                                }}
                            >
                                D
                            </div>
                            <span style={{ fontSize: '36px', fontWeight: 800, color: 'white', letterSpacing: '1px' }}>
                                DRAW IN THE AIR
                            </span>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        console.error(e);
        return new Response('Failed to generate image', { status: 500 });
    }
}
