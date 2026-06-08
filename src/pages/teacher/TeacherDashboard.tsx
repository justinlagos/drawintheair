/**
 * Teacher Dashboard — Draw in the Air 2.0 (real data)
 *
 * Wired end-to-end to the teacher's own Class Mode data:
 *   - teacher_profiles → name + school
 *   - sessions          → classes run, live state, history
 *   - session_students  → roster, joins, who's live
 *   - session_activities→ which games were launched (engagement)
 *   - class_student_stats RPC → per-child rounds / stars / time-on-task
 *
 * Everything shown is the signed-in teacher's real data (RLS-scoped).
 * Where no score data exists yet (round_scores is populated as classes are
 * scored), panels show honest empty states rather than invented numbers.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTeacherProfile } from '../../lib/teacherApi';
import { dbSelect } from '../../lib/supabase';
import { conductorApi } from '../../features/classmode/conductor/api';
import { useAuth } from '../../context/AuthContext';
import { ChildrenView, ActivitiesView, LessonsView, EyfsView, ResourcesView, TeamView, SettingsView } from './TeacherViews';
import './teacher-dashboard.css';

// nav id ⇄ URL path (deep-linkable)
const NAV_PATH: Record<string, string> = {
  dashboard: '/teacher/dashboard', children: '/teacher/children', activities: '/teacher/activities',
  lessons: '/teacher/lessons', eyfs: '/teacher/eyfs', resources: '/teacher/resources',
  team: '/teacher/team', settings: '/teacher/settings',
};
const viewFromPath = (): string => {
  const p = typeof window !== 'undefined' ? window.location.pathname : '';
  const hit = Object.entries(NAV_PATH).find(([, path]) => p === path);
  return hit ? hit[0] : 'dashboard';
};

const C = { lavender: '#9D7DFF', mint: '#5BCE9A', sky: '#7BB6FF', sun: '#FFC83D', peach: '#FF9B7E' };
const AV = [C.lavender, C.mint, C.peach, C.sky, C.sun];
const avColor = (s: string) => AV[(s.charCodeAt(0) || 0) % AV.length];

type Cat = 'Warm-up' | 'Creative' | 'Learning' | 'Puzzle' | 'Word play';
const CAT_COLOR: Record<Cat, string> = { 'Warm-up': C.peach, Creative: C.lavender, Learning: C.mint, Puzzle: C.sky, 'Word play': C.sun };
const ACT: Record<string, { label: string; emoji: string; cat: Cat }> = {
  'calibration': { label: 'Bubble Pop', emoji: '🫧', cat: 'Warm-up' },
  'free': { label: 'Free Paint', emoji: '🎨', cat: 'Creative' },
  'pre-writing': { label: 'Tracing', emoji: '✏️', cat: 'Learning' },
  'sort-and-place': { label: 'Sort & Place', emoji: '🗂️', cat: 'Puzzle' },
  'word-search': { label: 'Word Search', emoji: '🔍', cat: 'Word play' },
  'balloon-math': { label: 'Balloon Math', emoji: '🎈', cat: 'Learning' },
  'rainbow-bridge': { label: 'Rainbow Bridge', emoji: '🌈', cat: 'Puzzle' },
  'gesture-spelling': { label: 'Spelling Stars', emoji: '✍️', cat: 'Creative' },
  'colour-builder': { label: 'Colour Builder', emoji: '🎨', cat: 'Creative' },
  'building': { label: 'Building', emoji: '🧱', cat: 'Puzzle' },
};
const actMeta = (id: string) => ACT[id] ?? { label: id, emoji: '🎮', cat: 'Learning' as Cat };

interface SessionRow { id: string; code: string; class_state: string; status: string; created_at: string; started_at: string | null; ended_at: string | null; class_name: string | null; }
interface StudentRow { id: string; session_id: string; name: string; avatar_seed: string | null; joined_at: string; is_active: boolean | null; kicked_at: string | null; }
interface ActivityRow { session_id: string; activity: string; ordinal: number; started_at: string | null; }

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function greeting(): string { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
const isLive = (s?: SessionRow) => !!s && s.class_state !== 'ended' && s.status !== 'ended';

// ── Clean line icons (stroke = currentColor) ──────────────────────────
const I = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  children: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6"/><path d="M18 19a5 5 0 0 0-3-4.6"/></svg>,
  activities: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18M9 3v18"/></svg>,
  classroom: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/></svg>,
  lessons: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h11l3 3v13H5z"/><path d="M8 9h7M8 13h7M8 17h4"/></svg>,
  eyfs: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 17.8 6.9 21l1.2-5.6L4 11.6 9.6 11z"/></svg>,
  team: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M18 8v6M21 11h-6"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 12a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L16.6 2h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z"/></svg>,
  resources: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M13 3v5h5M8 13h8M8 17h5"/></svg>,
};
const NAV = [
  { title: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: I.dashboard }, { id: 'children', label: 'Children', icon: I.children }, { id: 'activities', label: 'Activities', icon: I.activities }] },
  { title: 'Classroom', items: [{ id: 'classroom', label: 'Classroom mode', icon: I.classroom }, { id: 'lessons', label: 'Lesson plans', icon: I.lessons }, { id: 'eyfs', label: 'EYFS mapping', icon: I.eyfs }] },
  { title: 'Resources', items: [{ id: 'resources', label: 'Teacher resources', icon: I.resources }] },
  { title: 'Account', items: [{ id: 'team', label: 'Team', icon: I.team }, { id: 'settings', label: 'Settings', icon: I.settings }] },
];

interface StudentStats { name: string; avatar_seed?: string; activities?: { activity: string; rounds?: { round: number; stars: number; raw_score: number; duration_seconds: number }[] }[]; totals?: { rounds: number; stars: number; time_on_task_s: number }; }

export default function TeacherDashboard() {
  const { user, loading } = useAuth();
  const [name, setName] = useState('');
  const [school, setSchool] = useState('Your school');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [acts, setActs] = useState<ActivityRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [active, setActive] = useState<string>(viewFromPath);
  const [navOpen, setNavOpen] = useState(false);
  const [classFilter, setClassFilter] = useState<string>('all'); // session id or 'all'
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawer, setDrawer] = useState<{ student: StudentRow; stats: StudentStats | null; loading: boolean } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { window.location.href = '/teacher/login'; return; }
    let alive = true;
    (async () => {
      const profile = await getTeacherProfile();
      if (alive && profile?.full_name) setName(profile.full_name);
      if (alive && profile?.school_name) setSchool(profile.school_name);

      const { data: sess } = await dbSelect<SessionRow[]>(
        'sessions', `teacher_id=eq.${user.id}&order=created_at.desc&limit=60&select=id,code,class_state,status,created_at,started_at,ended_at,class_name`,
      );
      const sList = Array.isArray(sess) ? sess : [];
      if (!alive) return;
      setSessions(sList);

      if (sList.length) {
        const ids = sList.map((s) => s.id).join(',');
        const [stu, ac] = await Promise.all([
          dbSelect<StudentRow[]>('session_students', `session_id=in.(${ids})&order=joined_at.desc&select=id,session_id,name,avatar_seed,joined_at,is_active,kicked_at`),
          dbSelect<ActivityRow[]>('session_activities', `session_id=in.(${ids})&select=session_id,activity,ordinal,started_at`),
        ]);
        if (!alive) return;
        if (Array.isArray(stu.data)) setStudents(stu.data);
        if (Array.isArray(ac.data)) setActs(ac.data);
      }
      if (alive) setDataLoading(false);
    })();
    return () => { alive = false; };
  }, [user, loading]);

  const sessionById = useMemo(() => Object.fromEntries(sessions.map((s) => [s.id, s])), [sessions]);
  const inFilter = useCallback((sid: string) => classFilter === 'all' || sid === classFilter, [classFilter]);

  const fStudents = useMemo(() => students.filter((s) => inFilter(s.session_id)), [students, inFilter]);
  const fActs = useMemo(() => acts.filter((a) => inFilter(a.session_id)), [acts, inFilter]);
  const fSessions = useMemo(() => sessions.filter((s) => classFilter === 'all' || s.id === classFilter), [sessions, classFilter]);

  // ── Real aggregates ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const classesRun = fSessions.filter((s) => s.started_at || s.class_state !== 'lobby' || students.some((st) => st.session_id === s.id)).length || fSessions.length;
    const liveNow = fStudents.filter((s) => !s.kicked_at && isLive(sessionById[s.session_id])).length;
    const distinctNames = new Set(fStudents.map((s) => s.name.toLowerCase())).size;
    return { classesRun, joins: fStudents.length, liveNow, distinctNames, activitiesRun: fActs.length };
  }, [fSessions, fStudents, fActs, students, sessionById]);

  // engagement by activity (real launch counts)
  const engagement = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of fActs) counts.set(a.activity, (counts.get(a.activity) ?? 0) + 1);
    const rows = [...counts.entries()].map(([id, n]) => ({ id, n, ...actMeta(id) }));
    rows.sort((a, b) => b.n - a.n);
    const max = Math.max(1, ...rows.map((r) => r.n));
    return { rows, max };
  }, [fActs]);

  const recent = useMemo(() => fStudents.slice(0, 6), [fStudents]);
  const roster = useMemo(() => fStudents.slice(0, 10), [fStudents]);

  const openStudent = useCallback(async (student: StudentRow) => {
    setDrawer({ student, stats: null, loading: true });
    try {
      const stats = await conductorApi.studentStats<StudentStats>(student.session_id, student.id);
      setDrawer({ student, stats, loading: false });
    } catch {
      setDrawer({ student, stats: null, loading: false });
    }
  }, []);

  const lastName = useMemo(() => {
    if (!name) return 'there';
    const p = name.trim().split(/\s+/);
    return p.length > 1 ? `${p[p.length - 1]}` : name;
  }, [name]);

  const startSession = () => { window.location.href = '/class'; };
  const onNav = (id: string) => {
    setNavOpen(false);
    if (id === 'classroom') { startSession(); return; }
    setActive(id);
    if (NAV_PATH[id] && typeof window !== 'undefined') window.history.pushState(null, '', NAV_PATH[id]);
    window.scrollTo?.(0, 0);
  };
  // keep view in sync with browser back/forward
  useEffect(() => {
    const onPop = () => setActive(viewFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const selectedClassLabel = classFilter === 'all' ? `All classes · ${sessions.length}` : `Class ${sessionById[classFilter]?.code ?? ''}`;

  return (
    <div className="tdash">
      <aside className={`tdash-side ${navOpen ? 'open' : ''}`}>
        <div className="tdash-logo"><img src="/logo.png" alt="Draw in the Air" /></div>
        {NAV.map((sec) => (
          <div key={sec.title}>
            <div className="tdash-navlabel">{sec.title}</div>
            {sec.items.map((it) => (
              <button key={it.id} className={`tdash-navitem ${active === it.id ? 'active' : ''}`} onClick={() => onNav(it.id)}>
                <span className="ic">{it.icon}</span>{it.label}
              </button>
            ))}
          </div>
        ))}
        <div className="tdash-school">
          <b>{school}</b>
          <span>{stats.distinctNames} children · {sessions.length} classes</span>
          <span className="tdash-pill-pilot">Pilot</span>
        </div>
      </aside>

      <button className="tdash-burger tdash-burger-fixed" aria-label="Menu" onClick={() => setNavOpen((v) => !v)}>☰</button>
      <main className="tdash-main">
        {active !== 'dashboard' ? (
          active === 'children' ? <ChildrenView />
            : active === 'activities' ? <ActivitiesView />
              : active === 'lessons' ? <LessonsView />
                : active === 'eyfs' ? <EyfsView />
                  : active === 'resources' ? <ResourcesView />
                    : active === 'team' ? <TeamView />
                      : active === 'settings' ? <SettingsView />
                        : null
        ) : (
        <>
        <div className="tdash-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="tdash-greet">{greeting()}{name ? `, ${lastName}` : ''}.</h1>
            </div>
            <p className="tdash-sub">
              {dataLoading ? 'Loading your classes…'
                : sessions.length === 0 ? 'No classes yet. Start your first one to see live insights here.'
                : `${stats.distinctNames} ${stats.distinctNames === 1 ? 'child has' : 'children have'} joined across ${sessions.length} ${sessions.length === 1 ? 'class' : 'classes'}.`}
            </p>
          </div>
          <div className="tdash-head-actions">
            <div className="tdash-classmenu">
              <button className="tdash-classsel" onClick={() => setMenuOpen((v) => !v)}>
                <span className="av">{(sessionById[classFilter]?.code ?? 'AL')[0]}</span>{selectedClassLabel} ▾
              </button>
              {menuOpen && (
                <div className="tdash-dropdown" onMouseLeave={() => setMenuOpen(false)}>
                  <button className={classFilter === 'all' ? 'on' : ''} onClick={() => { setClassFilter('all'); setMenuOpen(false); }}>All classes <small>{sessions.length}</small></button>
                  {sessions.map((s) => (
                    <button key={s.id} className={classFilter === s.id ? 'on' : ''} onClick={() => { setClassFilter(s.id); setMenuOpen(false); }}>
                      Class {s.code} {isLive(s) && '· live'}<small>{new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="tdash-btn" onClick={startSession}>+ New session</button>
          </div>
        </div>

        {/* Real stat cards */}
        <div className="tdash-stats">
          <Stat label="Classes run" value={String(stats.classesRun)} delta={`${sessions.length} total`} />
          <Stat label="Children joined" value={String(stats.distinctNames)} delta={`${stats.joins} joins`} />
          <Stat label="Live now" value={String(stats.liveNow)} delta={stats.liveNow ? 'in session' : 'no live class'} />
          <Stat label="Activities run" value={String(stats.activitiesRun)} delta={`${engagement.rows.length} games`} />
        </div>

        <div className="tdash-row">
          <section className="tdash-panel">
            <div className="tdash-panel-head"><h2>Engagement by activity</h2></div>
            <p className="tdash-panel-sub">How many times each game was launched in your classes.</p>
            {engagement.rows.length === 0 ? (
              <div className="tdash-empty"><span className="em">🎮</span><b>No activities run yet</b><span>Start a class and launch a game · engagement will appear here.</span></div>
            ) : (
              <>
                <div className="tdash-chart">
                  {engagement.rows.map((a) => (
                    <div className="tdash-bar-wrap" key={a.id}>
                      <span className="tdash-bar-val">{a.n}</span>
                      <div className="tdash-bar" style={{ height: `${Math.max(8, (a.n / engagement.max) * 100)}%`, background: CAT_COLOR[a.cat] }} />
                      <span className="tdash-bar-emoji">{a.emoji}</span>
                      <span className="tdash-bar-label">{a.label}</span>
                    </div>
                  ))}
                </div>
                <div className="tdash-legend">{(Object.keys(CAT_COLOR) as Cat[]).map((c) => (<span key={c}><i style={{ background: CAT_COLOR[c] }} />{c}</span>))}</div>
              </>
            )}
          </section>

          <section className="tdash-panel">
            <div className="tdash-panel-head"><h2>Recent activity</h2>{stats.liveNow > 0 && <span className="tdash-livepill"><span className="tdash-livedot" />Live</span>}</div>
            <p className="tdash-panel-sub">Latest children to join your classes.</p>
            {recent.length === 0 ? (
              <div className="tdash-empty"><span className="em">👋</span><b>No one has joined yet</b><span>Share a class code and joins will stream in here.</span></div>
            ) : (
              <div className="tdash-feed">
                {recent.map((f) => {
                  const live = isLive(sessionById[f.session_id]);
                  return (
                    <button className="tdash-feed-item" key={f.id} onClick={() => openStudent(f)} style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderBottom: '1px solid var(--t-border)' }}>
                      <span className="tdash-av" style={{ background: avColor(f.name) }}>{f.name[0]?.toUpperCase()}</span>
                      <div className="tdash-feed-body"><b>{f.name}</b><span>joined class {sessionById[f.session_id]?.code ?? ''}{f.kicked_at ? ' · removed' : live ? ' · live now' : ''}</span></div>
                      <div className="tdash-feed-meta">{timeAgo(f.joined_at)}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Real roster */}
        <section className="tdash-panel tdash-children">
          <div className="tdash-panel-head">
            <div><h2>Children</h2><p className="tdash-panel-sub" style={{ marginBottom: 0 }}>{roster.length ? `Showing ${roster.length} of ${fStudents.length} · tap a child for their stats.` : 'Your roster will appear here.'}</p></div>
          </div>
          {roster.length === 0 ? (
            <div className="tdash-empty"><span className="em">🧒</span><b>No children yet</b><span>When children join your classes by code they'll show up here with their progress.</span></div>
          ) : (
            <table className="tdash-table">
              <thead><tr><th>Child</th><th>Class</th><th className="hide-sm">Joined</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {roster.map((c) => {
                  const sess = sessionById[c.session_id];
                  const live = isLive(sess) && !c.kicked_at;
                  return (
                    <tr key={c.id} className="clickable" onClick={() => openStudent(c)}>
                      <td><div className="tdash-child"><span className="tdash-av" style={{ background: avColor(c.name) }}>{c.name[0]?.toUpperCase()}</span><div><b>{c.name}</b><span>joined by code</span></div></div></td>
                      <td><span className="pct" style={{ fontFamily: 'var(--t-font-mono)' }}>{sess?.code ?? '—'}</span></td>
                      <td className="hide-sm">{timeAgo(c.joined_at)}</td>
                      <td>{c.kicked_at ? <span className="tdash-badge idle"><span className="dot" />Removed</span> : live ? <span className="tdash-badge active"><span className="dot" />Live</span> : <span className="tdash-badge idle"><span className="dot" />Past</span>}</td>
                      <td style={{ textAlign: 'right', color: 'var(--t-ink-400)' }}>→</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <div className="tdash-cta">
          <div><h2>Run classroom mode</h2><p>Project to the smartboard. Children take turns using their hand on the front of the room · whole-class movement in 60 seconds.</p></div>
          <button className="tdash-btn" onClick={startSession}>▶ Start session</button>
        </div>
        </>
        )}
      </main>

      {/* Per-student deep stats drawer */}
      {drawer && (
        <>
          <div className="tdash-drawer-scrim" onClick={() => setDrawer(null)} />
          <aside className="tdash-drawer">
            <div className="tdash-drawer-head">
              <span className="tdash-av" style={{ background: avColor(drawer.student.name) }}>{drawer.student.name[0]?.toUpperCase()}</span>
              <div><h2>{drawer.student.name}</h2><span>Class {sessionById[drawer.student.session_id]?.code} · joined {timeAgo(drawer.student.joined_at)}</span></div>
              <button className="tdash-drawer-close" onClick={() => setDrawer(null)} aria-label="Close">✕</button>
            </div>
            {drawer.loading ? (
              <div className="tdash-loading">Loading stats…</div>
            ) : (
              <>
                <div className="tdash-mini-stats">
                  <div className="tdash-mini-stat"><b>{drawer.stats?.totals?.rounds ?? 0}</b><span>Rounds</span></div>
                  <div className="tdash-mini-stat"><b>{drawer.stats?.totals?.stars ?? 0}</b><span>Stars</span></div>
                  <div className="tdash-mini-stat"><b>{Math.round((drawer.stats?.totals?.time_on_task_s ?? 0) / 60)}m</b><span>On task</span></div>
                </div>
                <h3>Activities</h3>
                {(drawer.stats?.activities ?? []).length === 0 ? (
                  <div className="tdash-empty"><span className="em">📊</span><b>No scored rounds recorded yet</b><span>Stars and time-on-task appear here once this child plays a scored activity in class.</span></div>
                ) : (
                  (drawer.stats?.activities ?? []).map((a, i) => {
                    const m = actMeta(a.activity);
                    const rounds = a.rounds ?? [];
                    const stars = rounds.reduce((n, r) => n + (r.stars || 0), 0);
                    const secs = rounds.reduce((n, r) => n + (r.duration_seconds || 0), 0);
                    return (
                      <div className="tdash-act-row" key={i}>
                        <span className="em">{m.emoji}</span>
                        <span className="nm">{m.label}</span>
                        <span className="stars">{stars ? '★'.repeat(Math.min(5, Math.round(stars / Math.max(1, rounds.length)))) : '—'}</span>
                        <span className="meta">{rounds.length} rounds · {Math.round(secs / 60)}m</span>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="tdash-stat">
      <div className="tdash-stat-label">{label}</div>
      <div className="tdash-stat-val">{value}</div>
      <div className="tdash-stat-delta">{delta}</div>
    </div>
  );
}
