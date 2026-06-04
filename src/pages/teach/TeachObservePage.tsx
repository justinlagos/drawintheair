/**
 * /teach/observe, teacher tagging surface.
 *
 * Document B §9.2. Sub-30-second-per-child tablet-web UX. The teacher
 * walks the room, taps a child card, picks tags across five families
 * (focus / affect / independence / social / notable), optionally adds
 * a 20-character note, and the observation is saved instantly via
 * lios_record_observation.
 *
 * Privacy posture:
 *   • Only the classroom code + a position number ever transit the
 *     wire. Names live in localStorage and never leave the device.
 *   • Per-position pseudonymous learner ID is derived deterministically
 *     from (classroom_code, position) so repeat-tagging the same child
 *     groups correctly in the Observations dashboard.
 *   • Auth re-uses the existing Google OAuth gate (AuthContext) so the
 *     RPC's authenticated-only RLS policy is satisfied.
 *
 * Engineering posture:
 *   • One self-contained component; no router required.
 *   • Cards render in a tablet-optimised CSS grid with generous tap
 *     targets (≥48px). Mobile (phone) layout single-column.
 *   • The tag picker is a slide-up bottom sheet, a single screen,
 *     no scrolling for the common case.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SEOMeta } from '../../seo/SEOMeta';
import { recordObservation } from '../admin/insights/rpc';
import './teachObserve.css';

const TAG_FAMILIES = [
    { key: 'focus_tags',        label: 'Focus',
      tags: ['focused', 'distracted', 'disengaged'] },
    { key: 'affect_tags',       label: 'Affect',
      tags: ['confident', 'calm', 'hesitant', 'frustrated'] },
    { key: 'independence_tags', label: 'Independence',
      tags: ['independent', 'supported', 'required_intervention'] },
    { key: 'social_tags',       label: 'Social',
      tags: ['alone', 'collaborated', 'disrupted_by_peer'] },
    { key: 'notable_tags',      label: 'Notable',
      tags: ['breakthrough', 'help_needed', 'new_behaviour_good', 'new_behaviour_concern', 'avoided_activity'] },
] as const;

const TAG_TONES: Record<string, string> = {
    focused: '#7ED957', distracted: '#FF6B6B', disengaged: '#C13A3A',
    confident: '#7ED957', calm: '#55DDE0', hesitant: '#FFB14D', frustrated: '#FF6B6B',
    independent: '#7ED957', supported: '#55DDE0', required_intervention: '#FF6B6B',
    alone: '#9094B0', collaborated: '#55DDE0', disrupted_by_peer: '#FF6B6B',
    breakthrough: '#7ED957', help_needed: '#FF6B6B',
    new_behaviour_good: '#7ED957', new_behaviour_concern: '#FFB14D',
    avoided_activity: '#FF6B6B',
};
const prettyTag = (t: string) => t.replace(/_/g, ' ');

type TagBag = Partial<Record<typeof TAG_FAMILIES[number]['key'], string[]>>;

interface RosterPosition {
    position: number;
    localName: string;            // teacher's private label, never sent
    lastTaggedAt: number | null;  // ms since epoch, local only
}

interface Roster {
    classroomCode: string;
    positions: RosterPosition[];
    ageBand: string | null;
}

const ROSTER_KEY = 'lios_teach_roster';
const DEFAULT_SIZE = 8;

// Deterministic pseudonymous learner ID. SHA-256-ish (sub-cryptographic
// but deterministic and collision-free for our scale) so the same
// classroom+position always produces the same observation device_id.
function deriveLearnerUid(classroomCode: string, position: number): string {
    let h = 0x811c9dc5;       // FNV-1a 32-bit
    const s = `obs:${classroomCode}:${position}`;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
    }
    return `obs-${classroomCode}-${position.toString().padStart(2, '0')}-${h.toString(16).padStart(8, '0')}`;
}

function loadRoster(): Roster | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(ROSTER_KEY);
        return raw ? JSON.parse(raw) as Roster : null;
    } catch { return null; }
}
function persistRoster(r: Roster): void {
    try { localStorage.setItem(ROSTER_KEY, JSON.stringify(r)); } catch { /* private mode */ }
}

const TeachObservePage: React.FC = () => {
    const { user, signIn, signOut, loading } = useAuth();

    if (loading) return <div className="to-shell"><div className="to-gate-card">Checking sign-in…</div></div>;
    if (!user)   return <SignInPrompt onSignIn={signIn} />;

    return <ObserveMain email={user.email ?? '(unknown)'} onSignOut={signOut} />;
};

const SignInPrompt: React.FC<{ onSignIn: (path?: string) => void }> = ({ onSignIn }) => (
    <div className="to-shell">
        <SEOMeta title="Teacher observations · Draw in the Air"
                 description="Tag classroom sessions in 30 seconds."
                 canonical="https://drawintheair.com/teach/observe" noIndex />
        <div className="to-gate-card">
            <h1>Teacher observations</h1>
            <p>Sign in with Google to start tagging classroom sessions.
               Names stay on this device, only the position number
               and your tags are transmitted.</p>
            <button className="to-btn to-btn-primary"
                    onClick={() => onSignIn('/teach/observe')}>
                Sign in with Google
            </button>
        </div>
    </div>
);

const ObserveMain: React.FC<{ email: string; onSignOut: () => Promise<void> }> = ({ email, onSignOut }) => {
    const [roster, setRoster] = useState<Roster | null>(() => loadRoster());
    const [editingPos, setEditingPos] = useState<number | null>(null);

    // First-load: derive classroom code from ?class=CODE or prompt
    useEffect(() => {
        if (roster) return;
        const url = new URLSearchParams(window.location.search);
        const codeFromUrl = (url.get('class') ?? '').trim().toUpperCase();
        if (codeFromUrl.length > 0 && codeFromUrl.length <= 32) {
            const fresh: Roster = {
                classroomCode: codeFromUrl,
                positions: Array.from({ length: DEFAULT_SIZE }, (_, i) => ({
                    position: i + 1, localName: '', lastTaggedAt: null,
                })),
                ageBand: null,
            };
            setRoster(fresh);
            persistRoster(fresh);
        }
    }, [roster]);

    const updateRoster = useCallback((next: Roster) => {
        setRoster(next);
        persistRoster(next);
    }, []);

    if (!roster) {
        return <ClassroomCodePrompt onSubmit={(code, ageBand) => {
            const fresh: Roster = {
                classroomCode: code.trim().toUpperCase(),
                positions: Array.from({ length: DEFAULT_SIZE }, (_, i) => ({
                    position: i + 1, localName: '', lastTaggedAt: null,
                })),
                ageBand,
            };
            updateRoster(fresh);
        }} />;
    }

    const nTagged = roster.positions.filter(p =>
        p.lastTaggedAt && Date.now() - p.lastTaggedAt < 30 * 60_000).length;

    return (
        <div className="to-shell">
            <SEOMeta title="Teacher observations · Draw in the Air"
                     description="Tag classroom sessions in 30 seconds."
                     canonical="https://drawintheair.com/teach/observe" noIndex />

            <header className="to-topbar">
                <div className="to-topbar-inner">
                    <div className="to-brand">
                        <img src="/logo.png" alt="" className="to-brand-logo" />
                        <div>
                            <div className="to-brand-name">Observations</div>
                            <div className="to-brand-sub">
                                {email} · class <strong>{roster.classroomCode}</strong>
                                {roster.ageBand && ` · ${roster.ageBand}`}
                            </div>
                        </div>
                    </div>
                    <div className="to-topbar-spacer" />
                    <div className="to-topbar-meta">
                        {nTagged} of {roster.positions.length} tagged
                    </div>
                    <button className="to-btn to-btn-ghost" onClick={() => {
                        if (confirm('Reset this classroom roster? Local names will be cleared.')) {
                            localStorage.removeItem(ROSTER_KEY);
                            setRoster(null);
                        }
                    }}>Reset</button>
                    <button className="to-btn to-btn-ghost" onClick={onSignOut}>Sign out</button>
                </div>
            </header>

            <main className="to-main">
                <div className="to-roster">
                    {roster.positions.map(pos => (
                        <ChildCard
                            key={pos.position}
                            pos={pos}
                            onEdit={() => setEditingPos(pos.position)}
                            onRename={(name) => updateRoster({
                                ...roster,
                                positions: roster.positions.map(p =>
                                    p.position === pos.position ? { ...p, localName: name } : p),
                            })}
                        />
                    ))}
                </div>

                <div className="to-row-actions">
                    <button className="to-btn to-btn-ghost" onClick={() => updateRoster({
                        ...roster,
                        positions: [
                            ...roster.positions,
                            { position: roster.positions.length + 1, localName: '', lastTaggedAt: null },
                        ],
                    })}>+ Add a child</button>

                    {roster.positions.length > 4 && (
                        <button className="to-btn to-btn-ghost" onClick={() => updateRoster({
                            ...roster,
                            positions: roster.positions.slice(0, -1),
                        })}>− Remove last</button>
                    )}
                </div>
            </main>

            {editingPos != null && (
                <TagPickerSheet
                    classroomCode={roster.classroomCode}
                    ageBand={roster.ageBand}
                    position={roster.positions.find(p => p.position === editingPos)!}
                    onClose={() => setEditingPos(null)}
                    onSaved={() => {
                        updateRoster({
                            ...roster,
                            positions: roster.positions.map(p =>
                                p.position === editingPos
                                    ? { ...p, lastTaggedAt: Date.now() }
                                    : p),
                        });
                        setEditingPos(null);
                    }}
                />
            )}
        </div>
    );
};

const ClassroomCodePrompt: React.FC<{
    onSubmit: (code: string, ageBand: string | null) => void;
}> = ({ onSubmit }) => {
    const [code, setCode] = useState('');
    const [ageBand, setAgeBand] = useState<string>('');
    const valid = code.trim().length >= 2 && code.trim().length <= 32;
    return (
        <div className="to-shell">
            <div className="to-gate-card">
                <h1>Set up your classroom</h1>
                <p>Enter your classroom code. Children's names stay on
                   this device only, the platform only sees the
                   position number and your tags.</p>
                <label className="to-field">
                    <span>Classroom code</span>
                    <input
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        placeholder="e.g. CLASS-3A"
                        autoFocus
                    />
                </label>
                <label className="to-field">
                    <span>Age band (optional)</span>
                    <select value={ageBand} onChange={e => setAgeBand(e.target.value)}>
                        <option value="">Not set</option>
                        <option value="4-5">4–5</option>
                        <option value="6-7">6–7</option>
                        <option value="8-9">8–9</option>
                        <option value="10-11">10–11</option>
                        <option value="12+">12+</option>
                    </select>
                </label>
                <button
                    className="to-btn to-btn-primary"
                    disabled={!valid}
                    onClick={() => onSubmit(code, ageBand || null)}
                >Continue</button>
            </div>
        </div>
    );
};

const ChildCard: React.FC<{
    pos: RosterPosition;
    onEdit: () => void;
    onRename: (name: string) => void;
}> = ({ pos, onEdit, onRename }) => {
    const tagged = pos.lastTaggedAt && Date.now() - pos.lastTaggedAt < 30 * 60_000;
    return (
        <div className={`to-child ${tagged ? 'is-tagged' : ''}`}>
            <div className="to-child-head">
                <div className="to-child-pos">{pos.position}</div>
                <input
                    className="to-child-name"
                    placeholder="Name (local only)"
                    value={pos.localName}
                    onChange={e => onRename(e.target.value)}
                    maxLength={20}
                />
            </div>
            <button className="to-btn to-btn-primary to-child-tag-btn" onClick={onEdit}>
                {tagged ? '✓ Re-tag' : 'Tag'}
            </button>
            {pos.lastTaggedAt && (
                <div className="to-child-foot">
                    Tagged {fmtAgo(pos.lastTaggedAt)}
                </div>
            )}
        </div>
    );
};

const TagPickerSheet: React.FC<{
    classroomCode: string;
    ageBand: string | null;
    position: RosterPosition;
    onClose: () => void;
    onSaved: () => void;
}> = ({ classroomCode, ageBand, position, onClose, onSaved }) => {
    const [tagBag, setTagBag] = useState<TagBag>({});
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deviceId = useMemo(
        () => deriveLearnerUid(classroomCode, position.position),
        [classroomCode, position.position],
    );

    const toggleTag = useCallback((family: keyof TagBag, tag: string) => {
        setTagBag(prev => {
            const cur = prev[family] ?? [];
            return {
                ...prev,
                [family]: cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag],
            };
        });
    }, []);

    const handleSave = useCallback(async () => {
        // Empty save is allowed (the teacher might want to record
        // "child was here, nothing notable"), but require at least
        // ONE family populated OR a note, otherwise it's an accidental
        // tap.
        const anyTag = TAG_FAMILIES.some(f => (tagBag[f.key] ?? []).length > 0);
        if (!anyTag && note.trim().length === 0) {
            setError('Pick at least one tag or add a note.');
            return;
        }
        setSaving(true); setError(null);
        try {
            await recordObservation({
                p_device_id:         deviceId,
                p_focus_tags:        tagBag.focus_tags        ?? [],
                p_affect_tags:       tagBag.affect_tags       ?? [],
                p_independence_tags: tagBag.independence_tags ?? [],
                p_social_tags:       tagBag.social_tags       ?? [],
                p_notable_tags:      tagBag.notable_tags      ?? [],
                p_classroom_code:    classroomCode,
                p_age_band:          ageBand,
                p_note:              note.trim() || null,
                p_observer_role:     'teacher',
            });
            onSaved();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    }, [tagBag, note, classroomCode, ageBand, deviceId, onSaved]);

    return (
        <div className="to-sheet-overlay" onClick={onClose} role="dialog" aria-modal>
            <div className="to-sheet" onClick={e => e.stopPropagation()}>
                <header className="to-sheet-head">
                    <div>
                        <h2>Tag child #{position.position}</h2>
                        {position.localName && (
                            <div className="to-sheet-sub">{position.localName} <em>(local)</em></div>
                        )}
                    </div>
                    <button className="to-btn to-btn-ghost" onClick={onClose}>Cancel</button>
                </header>

                <div className="to-sheet-body">
                    {TAG_FAMILIES.map(fam => (
                        <div key={fam.key} className="to-family">
                            <div className="to-family-label">{fam.label}</div>
                            <div className="to-family-tags">
                                {fam.tags.map(tag => {
                                    const sel = (tagBag[fam.key] ?? []).includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            className={`to-tag-pill ${sel ? 'is-selected' : ''}`}
                                            style={sel ? {
                                                background: TAG_TONES[tag],
                                                color: '#fff',
                                                borderColor: TAG_TONES[tag],
                                            } : undefined}
                                            onClick={() => toggleTag(fam.key, tag)}
                                        >{prettyTag(tag)}</button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <label className="to-field">
                        <span>Note (optional, max 200 chars)</span>
                        <textarea
                            rows={2}
                            value={note}
                            onChange={e => setNote(e.target.value.slice(0, 200))}
                            placeholder="Anything notable?"
                        />
                        <small style={{ color: '#9094B0' }}>{200 - note.length} characters left</small>
                    </label>

                    {error && <div className="to-error">{error}</div>}
                </div>

                <footer className="to-sheet-foot">
                    <button className="to-btn to-btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="to-btn to-btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >{saving ? 'Saving…' : 'Save and close'}</button>
                </footer>
            </div>
        </div>
    );
};

function fmtAgo(t: number): string {
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
}

export default TeachObservePage;
