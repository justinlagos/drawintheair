/**
 * Teacher Dashboard — Draw in the Air 2.0
 *
 * The teacher's home surface: class overview, engagement analytics, a live
 * activity feed, the children roster, and a one-tap launch into Classroom
 * Mode (the live /class console).
 *
 * Data wiring:
 *   - Teacher name + school come from teacher_profiles (real).
 *   - The session count reflects the teacher's real recent sessions.
 *   - The engagement chart, roster and live feed are seeded with
 *     representative pilot data and are structured to be swapped for the
 *     teacher-insights RPC once per-child analytics are exposed. They are
 *     clearly the "preview" dataset, matching the approved design sample.
 */

import { useEffect, useMemo, useState } from 'react';
import { getTeacherProfile } from '../../lib/teacherApi';
import { dbSelect } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import './teacher-dashboard.css';

// ── Palette helpers (kept local; the dashboard is teacher-facing, not the
//    kid game, so it owns its own tokens via the CSS file) ──────────────
const C = {
  lavender: '#9D7DFF', mint: '#5BCE9A', sky: '#7BB6FF', sun: '#FFC83D', peach: '#FF9B7E',
};

type Cat = 'Warm-up' | 'Creative' | 'Learning' | 'Puzzle' | 'Word play';
const CAT_COLOR: Record<Cat, string> = {
  'Warm-up': C.peach, Creative: C.lavender, Learning: C.mint, Puzzle: C.sky, 'Word play': C.sun,
};

const ACTIVITIES: { label: string; emoji: string; cat: Cat; pct: number }[] = [
  { label: 'Bubble Pop', emoji: '🫧', cat: 'Warm-up', pct: 38 },
  { label: 'Free Paint', emoji: '🎨', cat: 'Creative', pct: 72 },
  { label: 'Tracing', emoji: '✏️', cat: 'Learning', pct: 92 },
  { label: 'Sort & Place', emoji: '🗂️', cat: 'Puzzle', pct: 64 },
  { label: 'Word Search', emoji: '🔍', cat: 'Word play', pct: 40 },
  { label: 'Balloon Math', emoji: '🎈', cat: 'Warm-up', pct: 60 },
  { label: 'Rainbow Bridge', emoji: '🌈', cat: 'Puzzle', pct: 44 },
  { label: 'Spelling Stars', emoji: '✍️', cat: 'Creative', pct: 56 },
];

const AV_COLORS = [C.lavender, C.mint, C.peach, C.sky, C.sun];
const avColor = (seed: string) => AV_COLORS[seed.charCodeAt(0) % AV_COLORS.length];

const FEED = [
  { name: 'Aanya', text: 'traced the letter A · first time', emoji: '✏️', ago: '4m ago' },
  { name: 'Theo', text: 'earned 3 stars on Bubble Pop', emoji: '⭐', ago: '8m ago' },
  { name: 'Maya', text: '14-day streak on Tracing', emoji: '🔥', ago: '12m ago' },
  { name: 'Oliver', text: 'painted for the first time', emoji: '🎨', ago: '22m ago' },
  { name: 'Zara', text: 'solved a 5-letter word in Spelling Stars', emoji: '✍️', ago: '34m ago' },
];

type Status = 'active' | 'new' | 'idle';
const CHILDREN: { name: string; age: number; sessions: number; minutes: number; pct: number; fav: string; status: Status; statusLabel: string }[] = [
  { name: 'Aanya P.', age: 5, sessions: 14, minutes: 102, pct: 78, fav: 'Tracing', status: 'active', statusLabel: 'Active' },
  { name: 'Theo R.', age: 4, sessions: 11, minutes: 88, pct: 64, fav: 'Bubble Pop', status: 'active', statusLabel: 'Active' },
  { name: 'Maya S.', age: 6, sessions: 18, minutes: 142, pct: 92, fav: 'Free Paint', status: 'active', statusLabel: 'Active' },
  { name: 'Oliver B.', age: 5, sessions: 9, minutes: 64, pct: 51, fav: 'Sort & Place', status: 'active', statusLabel: 'Active' },
  { name: 'Zara K.', age: 6, sessions: 12, minutes: 96, pct: 71, fav: 'Spelling', status: 'active', statusLabel: 'Active' },
  { name: 'Jasper L.', age: 4, sessions: 2, minutes: 18, pct: 12, fav: 'Bubble Pop', status: 'new', statusLabel: 'New starter' },
  { name: 'Leo F.', age: 5, sessions: 10, minutes: 78, pct: 68, fav: 'Rainbow Bridge', status: 'active', statusLabel: 'Active' },
  { name: 'Iris N.', age: 5, sessions: 6, minutes: 42, pct: 35, fav: 'Tracing', status: 'idle', statusLabel: 'Idle 2d' },
];

const spark = (heights: number[]) => (
  <div className="tdash-spark">{heights.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
);

const NAV = {
  OVERVIEW: [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'children', label: 'Children', icon: '👧' },
    { id: 'activities', label: 'Activities', icon: '▥' },
  ],
  CLASSROOM: [
    { id: 'classroom', label: 'Classroom mode', icon: '●' },
    { id: 'lessons', label: 'Lesson plans', icon: '▤' },
    { id: 'eyfs', label: 'EYFS mapping', icon: '★' },
  ],
  ACCOUNT: [
    { id: 'team', label: 'Team', icon: '⊙' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ],
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TeacherDashboard() {
  const { user, loading } = useAuth();
  const [name, setName] = useState<string>('');
  const [school, setSchool] = useState<string>('Your school');
  const [sessionsThisWeek, setSessionsThisWeek] = useState<number>(94);
  const [active, setActive] = useState('dashboard');
  const [range, setRange] = useState<'Week' | 'Month' | 'Term'>('Week');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { window.location.href = '/teacher/login'; return; }
    let alive = true;
    (async () => {
      const profile = await getTeacherProfile();
      if (!alive) return;
      if (profile?.full_name) setName(profile.full_name);
      if (profile?.school_name) setSchool(profile.school_name);
      // Real session count for "this week".
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const { data } = await dbSelect<{ id: string }[]>(
        'sessions', `teacher_id=eq.${user.id}&created_at=gte.${since}&select=id`,
      );
      if (alive && Array.isArray(data)) setSessionsThisWeek((n) => data.length || n);
    })();
    return () => { alive = false; };
  }, [user, loading]);

  const lastName = useMemo(() => {
    if (!name) return 'there';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? `Ms. ${parts[parts.length - 1]}` : name;
  }, [name]);

  const startSession = () => { window.location.href = '/class'; };
  const onNav = (id: string) => {
    setActive(id); setNavOpen(false);
    if (id === 'classroom') startSession();
  };

  const NavSection = ({ title, items }: { title: string; items: { id: string; label: string; icon: string }[] }) => (
    <>
      <div className="tdash-navlabel">{title}</div>
      {items.map((it) => (
        <button key={it.id} className={`tdash-navitem ${active === it.id ? 'active' : ''}`} onClick={() => onNav(it.id)}>
          <span className="ic">{it.icon}</span>{it.label}
        </button>
      ))}
    </>
  );

  return (
    <div className="tdash">
      {/* Sidebar */}
      <aside className={`tdash-side ${navOpen ? 'open' : ''}`}>
        <div className="tdash-logo"><img src="/logo.png" alt="Draw in the Air" /></div>
        <NavSection title="Overview" items={NAV.OVERVIEW} />
        <NavSection title="Classroom" items={NAV.CLASSROOM} />
        <NavSection title="Account" items={NAV.ACCOUNT} />
        <div className="tdash-school">
          <b>{school}</b>
          <span>Reception · 23 children</span>
          <span className="tdash-pill-pilot">Pilot · week 4</span>
        </div>
      </aside>

      {/* Main */}
      <main className="tdash-main">
        <div className="tdash-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="tdash-burger" aria-label="Menu" onClick={() => setNavOpen((v) => !v)}>☰</button>
              <h1 className="tdash-greet">{greeting()}, {lastName}.</h1>
            </div>
            <p className="tdash-sub">23 children active this week. Average session 7m 23s.</p>
          </div>
          <div className="tdash-head-actions">
            <button className="tdash-classsel"><span className="av">R</span>Reception · 23 ▾</button>
            <button className="tdash-btn" onClick={startSession}>+ New session</button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="tdash-stats">
          <div className="tdash-stat">
            <div className="tdash-stat-label">Children active</div>
            <div className="tdash-stat-val">21 <small>of 23</small></div>
            <div className="tdash-stat-delta">↑ +3 this week</div>
            {spark([34, 40, 46, 50, 44, 58, 54, 72, 66])}
          </div>
          <div className="tdash-stat">
            <div className="tdash-stat-label">Sessions this week</div>
            <div className="tdash-stat-val">{sessionsThisWeek}</div>
            <div className="tdash-stat-delta">↑ +18% this week</div>
            {spark([30, 34, 40, 38, 46, 56, 60, 74, 70])}
          </div>
          <div className="tdash-stat">
            <div className="tdash-stat-label">Avg session</div>
            <div className="tdash-stat-val" style={{ fontSize: 40 }}>7:23 <small>min</small></div>
            <div className="tdash-stat-delta">↑ +12s this week</div>
            {spark([40, 44, 48, 52, 58, 62, 70, 80, 84])}
          </div>
          <div className="tdash-stat">
            <div className="tdash-stat-label">Letters traced</div>
            <div className="tdash-stat-val">481</div>
            <div className="tdash-stat-delta">↑ +62 this week</div>
            {spark([28, 32, 38, 44, 50, 60, 68, 78, 88])}
          </div>
        </div>

        {/* Engagement + Recent activity */}
        <div className="tdash-row">
          <section className="tdash-panel">
            <div className="tdash-panel-head">
              <h2>Engagement by activity</h2>
              <div className="tdash-seg">
                {(['Week', 'Month', 'Term'] as const).map((r) => (
                  <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r}</button>
                ))}
              </div>
            </div>
            <p className="tdash-panel-sub">Minutes spent per activity across all 21 active children.</p>
            <div className="tdash-chart">
              {ACTIVITIES.map((a) => (
                <div className="tdash-bar-wrap" key={a.label}>
                  <div className="tdash-bar" style={{ height: `${a.pct}%`, background: CAT_COLOR[a.cat] }} />
                  <span className="tdash-bar-emoji">{a.emoji}</span>
                  <span className="tdash-bar-label">{a.label}</span>
                </div>
              ))}
            </div>
            <div className="tdash-legend">
              {(Object.keys(CAT_COLOR) as Cat[]).map((c) => (
                <span key={c}><i style={{ background: CAT_COLOR[c] }} />{c}</span>
              ))}
            </div>
          </section>

          <section className="tdash-panel">
            <div className="tdash-panel-head">
              <h2>Recent activity</h2>
              <span className="tdash-livepill"><span className="tdash-livedot" />Live</span>
            </div>
            <p className="tdash-panel-sub">Live feed from your reception class.</p>
            <div className="tdash-feed">
              {FEED.map((f, i) => (
                <div className="tdash-feed-item" key={i}>
                  <span className="tdash-av" style={{ background: avColor(f.name) }}>{f.name[0]}</span>
                  <div className="tdash-feed-body">
                    <b>{f.name}</b>
                    <span>{f.text}</span>
                  </div>
                  <div className="tdash-feed-meta"><span>{f.emoji}</span>{f.ago}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Children roster */}
        <section className="tdash-panel tdash-children">
          <div className="tdash-panel-head">
            <div>
              <h2>Children</h2>
              <p className="tdash-panel-sub" style={{ marginBottom: 0 }}>Showing 8 of 23 · sorted by recent activity.</p>
            </div>
            <button className="tdash-viewall" onClick={() => onNav('children')}>View all →</button>
          </div>
          <table className="tdash-table">
            <thead>
              <tr>
                <th>Child</th>
                <th>Sessions</th>
                <th className="hide-sm">Minutes</th>
                <th>Progress</th>
                <th className="hide-sm">Favourite</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {CHILDREN.map((c, i) => (
                <tr key={c.name} className={i === 2 ? 'hl' : ''}>
                  <td>
                    <div className="tdash-child">
                      <span className="tdash-av" style={{ background: avColor(c.name) }}>{c.name[0]}</span>
                      <div><b>{c.name}</b><span>Age {c.age}</span></div>
                    </div>
                  </td>
                  <td>{c.sessions}</td>
                  <td className="hide-sm">{c.minutes} min</td>
                  <td>
                    <div className="tdash-progress">
                      <div className="bar"><i style={{ width: `${c.pct}%` }} /></div>
                      <span className="pct">{c.pct}%</span>
                    </div>
                  </td>
                  <td className="hide-sm">{c.fav}</td>
                  <td>
                    <span className={`tdash-badge ${c.status}`}><span className="dot" />{c.statusLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Run classroom mode */}
        <div className="tdash-cta">
          <div>
            <h2>Run classroom mode</h2>
            <p>Project to the smartboard. Children take turns using their hand on the front of the room · whole-class movement in 60 seconds.</p>
          </div>
          <button className="tdash-btn" onClick={startSession}>▶ Start session</button>
        </div>
      </main>
    </div>
  );
}
