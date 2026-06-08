/**
 * Teacher dashboard menu views — Children, Activities, Lesson plans,
 * EYFS mapping, Team, Settings. Each is a real, self-contained panel
 * rendered inside the TeacherDashboard shell.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  listChildren, addChild, deleteChild, childInsights, displayName, ACT_LABEL,
  type ClassChild, type AgeBand, type ChildInsights,
} from './roster';
import { getTeacherProfile } from '../../lib/teacherApi';
import { useAuth } from '../../context/AuthContext';

const C = { lavender: '#9D7DFF', mint: '#5BCE9A', sky: '#7BB6FF', sun: '#FFC83D', peach: '#FF9B7E' };
const AV = [C.lavender, C.mint, C.peach, C.sky, C.sun];
const avColor = (s: string) => AV[(s.charCodeAt(0) || 0) % AV.length];
const initial = (c: ClassChild) => (c.nickname?.trim() || c.first_name)[0]?.toUpperCase() ?? '?';

/* ════════════════════════════════ CHILDREN ════════════════════════════════ */
export function ChildrenView() {
  const [children, setChildren] = useState<ClassChild[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<{ child: ClassChild; data: ChildInsights | null } | null>(null);

  const reload = useCallback(async () => setChildren(await listChildren()), []);
  useEffect(() => { reload(); }, [reload]);

  const openChild = async (child: ClassChild) => {
    setOpen({ child, data: null });
    setOpen({ child, data: await childInsights(child) });
  };

  return (
    <div>
      <div className="tdash-head">
        <div>
          <h1 className="tdash-greet" style={{ fontSize: '2.4rem' }}>Children</h1>
          <p className="tdash-sub">Your persistent roster. First name or nickname only · no surnames, no DOB. You can remove a child and all their data at any time.</p>
        </div>
        <div className="tdash-head-actions">
          <button className="tdash-btn" onClick={() => setAdding(true)}>+ Add child</button>
        </div>
      </div>

      {children === null ? (
        <div className="tdash-loading">Loading roster…</div>
      ) : children.length === 0 ? (
        <section className="tdash-panel">
          <div className="tdash-empty">
            <span className="em">🧒</span>
            <b>Build your class roster</b>
            <span>Add children by first name or nickname so their progress follows them across every class. Or skip this and run quick anonymous classes — your choice.</span>
            <button className="tdash-btn" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>+ Add your first child</button>
          </div>
        </section>
      ) : (
        <div className="tdash-roster-grid">
          {children.map((c) => (
            <button key={c.id} className="tdash-roster-card" onClick={() => openChild(c)}>
              <span className="tdash-av" style={{ background: avColor(displayName(c)), width: 48, height: 48, fontSize: 20 }}>{initial(c)}</span>
              <div className="tdash-roster-meta">
                <b>{displayName(c)}</b>
                <span>{c.age_band ? `Ages ${c.age_band}` : 'Age not set'}</span>
              </div>
              <span className="tdash-roster-go">→</span>
            </button>
          ))}
        </div>
      )}

      {adding && <AddChildModal onClose={() => setAdding(false)} onAdded={() => { setAdding(false); reload(); }} />}
      {open && <ChildDrawer state={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); reload(); }} />}
    </div>
  );
}

function AddChildModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [first, setFirst] = useState('');
  const [nick, setNick] = useState('');
  const [age, setAge] = useState<AgeBand | ''>('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!first.trim() && !nick.trim()) { setErr('Enter a first name or nickname'); return; }
    setSaving(true); setErr(null);
    const r = await addChild({ first_name: first.trim() || nick.trim(), nickname: nick.trim() || undefined, age_band: age || null, notes });
    setSaving(false);
    if (!r.ok) { setErr(r.error); return; }
    onAdded();
  };

  return (
    <>
      <div className="tdash-drawer-scrim" onClick={onClose} />
      <div className="tdash-modal">
        <h2>Add a child</h2>
        <p className="tdash-modal-sub">We only store what's needed to recognise them across classes.</p>
        <label className="tdash-field"><span>First name <em>or</em> nickname</span><input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="e.g. Aanya" maxLength={40} /></label>
        <label className="tdash-field"><span>Nickname (optional)</span><input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="What the class calls them" maxLength={40} /></label>
        <div className="tdash-field"><span>Age band</span>
          <div className="tdash-chips">
            {(['3-4', '5-7'] as AgeBand[]).map((a) => (
              <button key={a} className={age === a ? 'on' : ''} onClick={() => setAge(age === a ? '' : a)}>Ages {a}</button>
            ))}
          </div>
        </div>
        <label className="tdash-field"><span>Notes (optional, private to you)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g. EAL learner, loves animals, needs extra encouragement" maxLength={2000} /></label>
        {err && <div className="tdash-err">{err}</div>}
        <div className="tdash-modal-actions">
          <button className="tdash-btn ghost" onClick={onClose}>Cancel</button>
          <button className="tdash-btn" disabled={saving} onClick={submit}>{saving ? 'Saving…' : 'Add child'}</button>
        </div>
      </div>
    </>
  );
}

function ChildDrawer({ state, onClose, onChanged }: { state: { child: ClassChild; data: ChildInsights | null }; onClose: () => void; onChanged: () => void }) {
  const { child, data } = state;
  const remove = async () => {
    if (!window.confirm(`Remove ${displayName(child)} and all their data? This cannot be undone.`)) return;
    await deleteChild(child.id); onChanged();
  };
  return (
    <>
      <div className="tdash-drawer-scrim" onClick={onClose} />
      <aside className="tdash-drawer">
        <div className="tdash-drawer-head">
          <span className="tdash-av" style={{ background: avColor(displayName(child)) }}>{initial(child)}</span>
          <div><h2>{displayName(child)}</h2><span>{child.age_band ? `Ages ${child.age_band}` : 'Age not set'}</span></div>
          <button className="tdash-drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {!data ? <div className="tdash-loading">Reading the data…</div> : (
          <>
            <div className="tdash-mini-stats">
              <div className="tdash-mini-stat"><b>{data.classesAttended}</b><span>Classes</span></div>
              <div className="tdash-mini-stat"><b>{data.totalStars}</b><span>Stars</span></div>
              <div className="tdash-mini-stat"><b>{data.timeOnTaskMin}m</b><span>On task</span></div>
            </div>

            <h3>What this tells you</h3>
            <div className="tdash-insights">
              {data.notes.map((n, i) => <p key={i} className="tdash-insight">{n}</p>)}
            </div>

            {data.byActivity.length > 0 && (
              <>
                <h3 style={{ marginTop: 22 }}>By activity</h3>
                {data.byActivity.map((a) => (
                  <div className="tdash-act-row" key={a.activity}>
                    <span className="nm">{ACT_LABEL[a.activity] ?? a.activity}</span>
                    <span className="stars">{a.rounds ? '★'.repeat(Math.min(5, Math.round(a.stars / a.rounds))) : '—'}</span>
                    <span className="meta">{a.rounds} rounds · {a.minutes}m</span>
                  </div>
                ))}
              </>
            )}

            <div className="tdash-drawer-foot">
              <button className="tdash-btn ghost" onClick={remove} style={{ color: 'var(--t-peach-600)' }}>Remove child</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/* ════════════════════════════════ ACTIVITIES ════════════════════════════════ */
const CATALOG = [
  { id: 'calibration', emoji: '🫧', title: 'Bubble Pop', cat: 'Warm-up', skill: 'Gross-motor hand control', eyfs: 'Physical Development', desc: 'A 60-second warm-up. Children reach and pop drifting bubbles to settle into hands-in-the-air control.' },
  { id: 'pre-writing', emoji: '✏️', title: 'Tracing', cat: 'Learning', skill: 'Pre-writing letter formation', eyfs: 'Literacy · Writing', desc: 'Follow a glowing path to form letters and shapes — the gateway to handwriting.' },
  { id: 'gesture-spelling', emoji: '✍️', title: 'Spelling Stars', cat: 'Learning', skill: 'Phonics & spelling', eyfs: 'Literacy · Word reading', desc: 'Build target words letter by letter, bringing the object to life when spelled.' },
  { id: 'balloon-math', emoji: '🎈', title: 'Balloon Math', cat: 'Learning', skill: 'Early number sense', eyfs: 'Mathematics · Number', desc: 'Pop the balloon with the right answer. Sums and counting, in motion.' },
  { id: 'sort-and-place', emoji: '🗂️', title: 'Sort & Place', cat: 'Puzzle', skill: 'Sorting & classification', eyfs: 'Understanding the World', desc: 'Group what belongs together — food vs toys, colours, categories.' },
  { id: 'word-search', emoji: '🔍', title: 'Word Search', cat: 'Word play', skill: 'Letter patterns', eyfs: 'Literacy · Word reading', desc: 'Trace hidden words in a grid. Letter recognition and visual scanning.' },
  { id: 'rainbow-bridge', emoji: '🌈', title: 'Rainbow Bridge', cat: 'Puzzle', skill: 'Colour recognition & sequencing', eyfs: 'Expressive Arts & Design', desc: 'Match colours in order to build a glowing rainbow bridge.' },
  { id: 'free', emoji: '🎨', title: 'Free Paint', cat: 'Creative', skill: 'Creative expression', eyfs: 'Expressive Arts & Design', desc: 'Open creative canvas with magic brushes — no score, pure exploration.' },
];
const CAT_COLOR: Record<string, string> = { 'Warm-up': C.peach, Creative: C.lavender, Learning: C.mint, Puzzle: C.sky, 'Word play': C.sun };

export function ActivitiesView() {
  return (
    <div>
      <div className="tdash-head"><div><h1 className="tdash-greet" style={{ fontSize: '2.4rem' }}>Activities</h1><p className="tdash-sub">Every game, the skill it builds, and how it maps to the EYFS framework.</p></div></div>
      <div className="tdash-catalog">
        {CATALOG.map((a) => (
          <div className="tdash-cat-card" key={a.id}>
            <div className="tdash-cat-top">
              <span className="tdash-cat-badge" style={{ background: `${CAT_COLOR[a.cat]}22` }}>{a.emoji}</span>
              <span className="tdash-cat-pill" style={{ color: CAT_COLOR[a.cat], background: `${CAT_COLOR[a.cat]}18` }}>{a.cat}</span>
            </div>
            <h3>{a.title}</h3>
            <p className="tdash-cat-desc">{a.desc}</p>
            <div className="tdash-cat-tags"><span>🎯 {a.skill}</span><span>📘 {a.eyfs}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════ LESSON PLANS ════════════════════════════════ */
const LESSONS = [
  { title: 'Settle & Write', mins: 12, goal: 'Calm the class, then build letter-formation focus.', steps: ['Bubble Pop', 'Tracing', 'Spelling Stars'], color: C.mint },
  { title: 'Numbers in Motion', mins: 10, goal: 'Warm up gross-motor control, then early arithmetic.', steps: ['Bubble Pop', 'Balloon Math', 'Sort & Place'], color: C.sun },
  { title: 'Colour & Create', mins: 12, goal: 'Colour recognition leading into open creativity.', steps: ['Rainbow Bridge', 'Sort & Place', 'Free Paint'], color: C.lavender },
  { title: 'Literacy Hour', mins: 15, goal: 'A full literacy circuit: letters, words, patterns.', steps: ['Tracing', 'Word Search', 'Spelling Stars'], color: C.sky },
];
export function LessonsView() {
  return (
    <div>
      <div className="tdash-head"><div><h1 className="tdash-greet" style={{ fontSize: '2.4rem' }}>Lesson plans</h1><p className="tdash-sub">Ready-made activity sequences. Run them whole-class in Classroom mode or assign on devices.</p></div></div>
      <div className="tdash-lessons">
        {LESSONS.map((l) => (
          <div className="tdash-lesson" key={l.title}>
            <div className="tdash-lesson-bar" style={{ background: l.color }} />
            <div className="tdash-lesson-body">
              <div className="tdash-lesson-head"><h3>{l.title}</h3><span className="tdash-lesson-mins">{l.mins} min</span></div>
              <p className="tdash-cat-desc">{l.goal}</p>
              <div className="tdash-lesson-steps">
                {l.steps.map((s, i) => (<span key={s}>{i > 0 && <i>→</i>}{s}</span>))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════ EYFS MAPPING ════════════════════════════════ */
const EYFS = [
  { area: 'Physical Development', goal: 'Fine & gross motor control', acts: ['Bubble Pop', 'Tracing'], color: C.peach },
  { area: 'Literacy · Writing', goal: 'Letter formation', acts: ['Tracing', 'Spelling Stars'], color: C.mint },
  { area: 'Literacy · Word reading', goal: 'Phonics & letter patterns', acts: ['Spelling Stars', 'Word Search'], color: C.sky },
  { area: 'Mathematics · Number', goal: 'Counting & early arithmetic', acts: ['Balloon Math'], color: C.sun },
  { area: 'Understanding the World', goal: 'Sorting & classification', acts: ['Sort & Place'], color: C.sky },
  { area: 'Expressive Arts & Design', goal: 'Colour, sequencing & creativity', acts: ['Rainbow Bridge', 'Free Paint'], color: C.lavender },
];
export function EyfsView() {
  return (
    <div>
      <div className="tdash-head"><div><h1 className="tdash-greet" style={{ fontSize: '2.4rem' }}>EYFS mapping</h1><p className="tdash-sub">How each activity supports the Early Years Foundation Stage areas of learning.</p></div></div>
      <section className="tdash-panel">
        <table className="tdash-table">
          <thead><tr><th>Area of learning</th><th>Early learning focus</th><th>Activities</th></tr></thead>
          <tbody>
            {EYFS.map((e) => (
              <tr key={e.area}>
                <td><b style={{ fontFamily: 'var(--t-font-display)' }}>{e.area}</b></td>
                <td>{e.goal}</td>
                <td>{e.acts.map((a) => <span key={a} className="tdash-eyfs-tag" style={{ background: `${e.color}1e`, color: e.color }}>{a}</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* ════════════════════════════════ TEAM ════════════════════════════════ */
export function TeamView() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  useEffect(() => { getTeacherProfile().then((p) => p?.full_name && setName(p.full_name)); }, []);
  return (
    <div>
      <div className="tdash-head"><div><h1 className="tdash-greet" style={{ fontSize: '2.4rem' }}>Team</h1><p className="tdash-sub">Teachers with access to this class space.</p></div></div>
      <section className="tdash-panel">
        <div className="tdash-feed-item" style={{ borderBottom: '1px solid var(--t-border)' }}>
          <span className="tdash-av" style={{ background: avColor(name || 'T') }}>{(name || 'T')[0].toUpperCase()}</span>
          <div className="tdash-feed-body"><b>{name || user?.email || 'You'}</b><span>{user?.email} · Owner</span></div>
          <div className="tdash-feed-meta"><span className="tdash-badge active"><span className="dot" />You</span></div>
        </div>
        <div className="tdash-empty" style={{ paddingTop: 24 }}>
          <span className="em">👥</span>
          <b>Invite a colleague</b>
          <span>Multi-teacher class spaces are coming with the school plan. During the pilot, each teacher runs their own space.</span>
        </div>
      </section>
    </div>
  );
}

/* ════════════════════════════════ SETTINGS ════════════════════════════════ */
export function SettingsView() {
  const { signOut } = useAuth();
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  useEffect(() => { getTeacherProfile().then((p) => { if (p?.full_name) setName(p.full_name); if (p?.school_name) setSchool(p.school_name); }); }, []);
  return (
    <div>
      <div className="tdash-head"><div><h1 className="tdash-greet" style={{ fontSize: '2.4rem' }}>Settings</h1><p className="tdash-sub">Your account and privacy.</p></div></div>
      <section className="tdash-panel" style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'var(--t-font-display)', marginTop: 0 }}>Account</h3>
        <label className="tdash-field"><span>Name</span><input value={name} readOnly /></label>
        <label className="tdash-field"><span>School</span><input value={school} readOnly /></label>
      </section>
      <section className="tdash-panel" style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'var(--t-font-display)', marginTop: 0 }}>Privacy</h3>
        <p className="tdash-cat-desc">Children never have accounts. The camera is processed on-device and never stored. Your roster holds first names or nicknames only — no surnames, no dates of birth. You can remove any child and all their data instantly from the Children page.</p>
      </section>
      <section className="tdash-panel">
        <h3 style={{ fontFamily: 'var(--t-font-display)', marginTop: 0 }}>Session</h3>
        <button className="tdash-btn ghost" onClick={() => { signOut?.(); window.location.href = '/teacher/login'; }}>Sign out</button>
      </section>
    </div>
  );
}
