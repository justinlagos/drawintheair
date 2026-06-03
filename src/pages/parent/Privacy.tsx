/**
 * /parent/privacy. Child-first privacy explanation in plain English.
 */

import { Link } from 'react-router-dom';
import { ParentShell, Card, I } from './_shared';

export default function ParentPrivacy() {
  const Item = ({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body: React.ReactNode; tone: 'lav' | 'mint' | 'sky' | 'sun' | 'peach' }) => (
    <div className="row gap-4" style={{ alignItems: 'flex-start' }}>
      <span className={`itile itile-${tone}`}>{icon}</span>
      <div>
        <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)' }}>{title}</h4>
        <p style={{ margin: '4px 0 0', color: 'var(--fg-3)', fontSize: 'var(--text-sm)', fontWeight: 500, lineHeight: 1.55 }}>{body}</p>
      </div>
    </div>
  );

  return (
    <ParentShell
      title="Child privacy at Draw in the Air"
      intro="How we keep your child's data safe, in plain English, not legalese."
    >
      <div className="stack">
        <Card title="What we ask for" subtitle="The minimum we need to track progress and personalise activities.">
          <div className="stack" style={{ gap: 'var(--space-5)' }}>
            <Item tone="lav"  icon={<I.User size={18} />}    title="A nickname per child" body="First name or a nickname. Never a full name." />
            <Item tone="mint" icon={<I.Heart size={18} />}   title="An age band"          body="So we can tune activities to your child's stage." />
            <Item tone="sun"  icon={<I.Sparkle size={18} />} title="An avatar"            body="An emoji. It never represents a real photo." />
          </div>
        </Card>

        <Card title="What we never ask for" subtitle="If it isn't useful to your child's learning, we don't collect it.">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {[
              'Full names',
              'Date of birth',
              'School name',
              'Precise location',
              'Phone number',
              'Photos of your child',
            ].map(item => (
              <li key={item} className="row gap-3" style={{ color: 'var(--fg-1)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                <span style={{ color: 'var(--peach-600)', display: 'inline-flex' }}><I.Close size={14} /></span> {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="The camera" subtitle="The most reassuring fact about how we use it.">
          <p style={{ margin: 0, fontSize: 'var(--text-md)', lineHeight: 1.6, color: 'var(--fg-1)' }}>
            Activities use your webcam to see where your child's hand is in the air.
            The actual video <strong>stays on your device</strong>. We never upload camera frames.
            Only small numbers describing hand position leave the device.
          </p>
        </Card>

        <Card title="No ads, no selling, no sharing" subtitle="A short list of things we will never do.">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {[
              'No behavioural advertising to children',
              'No selling of child data, ever',
              'No public leaderboards',
              'No child-to-child messaging',
              'No social sharing from a child account',
            ].map(item => (
              <li key={item} className="row gap-3" style={{ color: 'var(--fg-1)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                <span style={{ color: 'var(--mint-600)', display: 'inline-flex' }}><I.Check size={14} /></span> {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Your rights" subtitle="You're in control. Always.">
          <p style={{ margin: 0, fontSize: 'var(--text-md)', lineHeight: 1.6, color: 'var(--fg-1)' }}>
            You can view, export, or delete everything we hold about you and your children at any
            time from <Link to="/parent/account" style={{ color: 'var(--lavender-700)', fontWeight: 700 }}>your account page</Link>.
            You can also withdraw consent or pause access without losing learning history.
          </p>
        </Card>
      </div>
    </ParentShell>
  );
}
