/**
 * Teacher roster + per-child analytics.
 *
 * The persistent Class-Mode child identity (class_children) lets a teacher
 * recognise a child across classes while honouring the privacy framework:
 * first name OR nickname only, no surname / DOB / contact data, teacher-
 * scoped via RLS, archivable and deletable on demand.
 *
 * Analytics are aggregated from the child's linked in-class joins
 * (session_students.class_child_id) and any scored rounds, then distilled
 * into plain-English, pedagogically useful notes.
 */

import {
  dbSelect, dbInsert, dbUpdate, getUser,
  getSupabaseUrl, getAnonKey, getAccessToken,
} from '../../lib/supabase';

export type AgeBand = '3-4' | '5-7';
export interface ClassChild {
  id: string;
  teacher_id: string;
  first_name: string;
  nickname: string | null;
  age_band: AgeBand | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

const displayName = (c: ClassChild) => c.nickname?.trim() || c.first_name;

export async function listChildren(): Promise<ClassChild[]> {
  const { data } = await dbSelect<ClassChild[]>(
    'class_children', 'archived=eq.false&order=first_name.asc&select=*',
  );
  return Array.isArray(data) ? data : [];
}

export async function addChild(input: {
  first_name: string; nickname?: string; age_band?: AgeBand | null; notes?: string;
}): Promise<{ ok: true; child: ClassChild } | { ok: false; error: string }> {
  const user = getUser();
  if (!user) return { ok: false, error: 'Not signed in' };
  const { data, error } = await dbInsert<ClassChild>('class_children', {
    teacher_id: user.id,
    first_name: input.first_name.trim(),
    nickname: input.nickname?.trim() || null,
    age_band: input.age_band ?? null,
    notes: input.notes?.trim() || null,
  }, { single: true });
  if (error || !data) return { ok: false, error: error?.message ?? 'Could not add child' };
  return { ok: true, child: data };
}

export async function updateChild(id: string, patch: Partial<Pick<ClassChild, 'first_name' | 'nickname' | 'age_band' | 'notes' | 'archived'>>) {
  return dbUpdate<ClassChild>('class_children', patch, `id=eq.${id}`, { single: true });
}

export async function archiveChild(id: string) {
  return updateChild(id, { archived: true });
}

/** Hard-delete a child (GDPR "remove all data"). */
export async function deleteChild(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${getSupabaseUrl()}/rest/v1/class_children?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: getAnonKey(), Authorization: `Bearer ${getAccessToken()}` },
    });
    return res.ok;
  } catch { return false; }
}

// ── Per-child analytics ────────────────────────────────────────────────
interface LinkRow { id: string; session_id: string; joined_at: string; kicked_at: string | null; }
interface SessRow { id: string; code: string; created_at: string; class_state: string; }
interface RoundRow { student_id: string; session_activity_id: string; stars: number; duration_seconds: number; raw_score: number; completed: boolean; submitted_at: string; }
interface ActRow { id: string; session_id: string; activity: string; }

export interface ChildInsights {
  child: ClassChild;
  classesAttended: number;
  lastSeen: string | null;
  totalStars: number;
  timeOnTaskMin: number;
  roundsPlayed: number;
  byActivity: { activity: string; rounds: number; stars: number; minutes: number }[];
  /** Plain-English, pedagogically-framed notes. */
  notes: string[];
  hasScores: boolean;
}

const ACT_LABEL: Record<string, string> = {
  'calibration': 'Bubble Pop', 'free': 'Free Paint', 'pre-writing': 'Tracing',
  'sort-and-place': 'Sort & Place', 'word-search': 'Word Search', 'balloon-math': 'Balloon Math',
  'rainbow-bridge': 'Rainbow Bridge', 'gesture-spelling': 'Spelling Stars', 'colour-builder': 'Colour Builder',
};
const SKILL: Record<string, string> = {
  'pre-writing': 'pre-writing letter control', 'gesture-spelling': 'phonics and spelling',
  'balloon-math': 'early number sense', 'sort-and-place': 'sorting and classification',
  'rainbow-bridge': 'colour recognition and sequencing', 'word-search': 'letter patterns',
  'calibration': 'gross-motor hand control', 'free': 'creative expression',
};

export async function childInsights(child: ClassChild): Promise<ChildInsights> {
  // 1. all in-class joins linked to this child
  const { data: links } = await dbSelect<LinkRow[]>(
    'session_students', `class_child_id=eq.${child.id}&select=id,session_id,joined_at,kicked_at&order=joined_at.desc`,
  );
  const linkRows = Array.isArray(links) ? links : [];
  const sessionIds = [...new Set(linkRows.map((l) => l.session_id))];
  const studentIds = linkRows.map((l) => l.id);

  let sessions: SessRow[] = [];
  let rounds: RoundRow[] = [];
  let activities: ActRow[] = [];
  if (sessionIds.length) {
    const ids = sessionIds.join(',');
    const [s, a] = await Promise.all([
      dbSelect<SessRow[]>('sessions', `id=in.(${ids})&select=id,code,created_at,class_state`),
      dbSelect<ActRow[]>('session_activities', `session_id=in.(${ids})&select=id,session_id,activity`),
    ]);
    sessions = Array.isArray(s.data) ? s.data : [];
    activities = Array.isArray(a.data) ? a.data : [];
  }
  if (studentIds.length) {
    const sid = studentIds.join(',');
    const { data: r } = await dbSelect<RoundRow[]>(
      'round_scores', `student_id=in.(${sid})&select=student_id,session_activity_id,stars,duration_seconds,raw_score,completed,submitted_at`,
    );
    rounds = Array.isArray(r) ? r : [];
  }

  const actBySaId = Object.fromEntries(activities.map((a) => [a.id, a.activity]));
  const byMap = new Map<string, { rounds: number; stars: number; secs: number }>();
  for (const r of rounds) {
    const act = actBySaId[r.session_activity_id] ?? 'unknown';
    const cur = byMap.get(act) ?? { rounds: 0, stars: 0, secs: 0 };
    cur.rounds += 1; cur.stars += r.stars || 0; cur.secs += r.duration_seconds || 0;
    byMap.set(act, cur);
  }
  const byActivity = [...byMap.entries()].map(([activity, v]) => ({
    activity, rounds: v.rounds, stars: v.stars, minutes: Math.round(v.secs / 60),
  })).sort((a, b) => b.minutes - a.minutes);

  const totalStars = rounds.reduce((n, r) => n + (r.stars || 0), 0);
  const timeOnTaskMin = Math.round(rounds.reduce((n, r) => n + (r.duration_seconds || 0), 0) / 60);
  const lastSeen = linkRows[0]?.joined_at ?? null;

  // 2. plain-English, pedagogical notes
  const notes: string[] = [];
  const nm = displayName(child);
  if (linkRows.length === 0) {
    notes.push(`${nm} hasn't joined a class yet. Add them to your next class by code, or link them after they join.`);
  } else {
    notes.push(`${nm} has taken part in ${sessions.length} ${sessions.length === 1 ? 'class' : 'classes'} so far.`);
  }
  if (byActivity.length) {
    const top = byActivity[0];
    notes.push(`Spends the most time in ${ACT_LABEL[top.activity] ?? top.activity}, building ${SKILL[top.activity] ?? 'core skills'}.`);
    const strong = byActivity.filter((a) => a.rounds > 0 && a.stars / a.rounds >= 2.5);
    if (strong.length) notes.push(`Confident in ${strong.map((a) => ACT_LABEL[a.activity] ?? a.activity).join(', ')} — earning high stars consistently.`);
    const tried = byActivity.map((a) => ACT_LABEL[a.activity] ?? a.activity);
    const untried = Object.keys(SKILL).map((k) => ACT_LABEL[k]).filter((l) => !tried.includes(l));
    if (untried.length) notes.push(`Hasn't tried ${untried.slice(0, 3).join(', ')} yet — a good next step to broaden skills.`);
  } else if (linkRows.length) {
    notes.push('No scored activities recorded yet — once they play a scored game in class, stars and time-on-task will appear here.');
  }
  if (child.notes) notes.push(`Your note: ${child.notes}`);

  return {
    child,
    classesAttended: sessions.length,
    lastSeen,
    totalStars,
    timeOnTaskMin,
    roundsPlayed: rounds.length,
    byActivity,
    notes,
    hasScores: rounds.length > 0,
  };
}

export { displayName, ACT_LABEL };
