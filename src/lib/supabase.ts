/**
 * Lightweight Supabase client — zero dependencies.
 * Uses native fetch() for PostgREST + GoTrue, and WebSocket for Realtime.
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: SupabaseUser;
}

interface PostgrestResponse<T> {
  data: T | null;
  error: { message: string; code: string } | null;
}

type RealtimeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

// ─── Session management ──────────────────────────────────────────────────────

let currentSession: SupabaseSession | null = null;
const authListeners: Array<(user: SupabaseUser | null) => void> = [];

function persistSession(session: SupabaseSession | null) {
  if (session) {
    localStorage.setItem('sb-session', JSON.stringify(session));
  } else {
    localStorage.removeItem('sb-session');
  }
  currentSession = session;
}

function loadSession(): SupabaseSession | null {
  try {
    const raw = localStorage.getItem('sb-session');
    if (!raw) return null;
    const session = JSON.parse(raw) as SupabaseSession;
    // Check expiry (with 60s buffer)
    if (session.expires_at && Date.now() / 1000 > session.expires_at - 60) {
      localStorage.removeItem('sb-session');
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function notifyAuthListeners(user: SupabaseUser | null) {
  authListeners.forEach(fn => fn(user));
}

// Initialize session from storage
currentSession = loadSession();

// ─── Auth helpers ────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  if (currentSession?.access_token) {
    headers['Authorization'] = `Bearer ${currentSession.access_token}`;
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return headers;
}

export function getUser(): SupabaseUser | null {
  return currentSession?.user ?? null;
}

export function getAccessToken(): string {
  return currentSession?.access_token ?? SUPABASE_ANON_KEY;
}

export function onAuthStateChange(callback: (user: SupabaseUser | null) => void): () => void {
  authListeners.push(callback);
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx >= 0) authListeners.splice(idx, 1);
  };
}

export function signInWithGoogle() {
  const redirectTo = `${window.location.origin}/class`;
  const url = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&flow_type=implicit`;
  window.location.href = url;
}

export async function signOut() {
  if (currentSession?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch { /* ignore */ }
  }
  persistSession(null);
  notifyAuthListeners(null);
}

/**
 * Call on app init — handles OAuth redirect callback.
 * Checks URL hash for access_token (Supabase implicit flow).
 */
export async function handleAuthCallback(): Promise<SupabaseUser | null> {
  // Check hash params from OAuth redirect
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = params.get('expires_in');

  if (accessToken) {
    // Fetch user from token
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const user = (await res.json()) as SupabaseUser;
        const session: SupabaseSession = {
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_at: Math.floor(Date.now() / 1000) + parseInt(expiresIn || '3600', 10),
          user,
        };
        persistSession(session);
        notifyAuthListeners(user);
        // Clean URL hash
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return user;
      }
    } catch { /* fall through */ }
  }

  // No hash — try existing session
  const existing = loadSession();
  if (existing) {
    currentSession = existing;
    notifyAuthListeners(existing.user);
    return existing.user;
  }

  return null;
}

// ─── PostgREST (database queries) ────────────────────────────────────────────

const REST_URL = `${SUPABASE_URL}/rest/v1`;

export async function dbSelect<T = Record<string, unknown>>(
  table: string,
  query: string = '',
  options?: { single?: boolean }
): Promise<PostgrestResponse<T>> {
  try {
    const headers: Record<string, string> = {
      ...authHeaders(),
      'Accept': 'application/json',
    };
    if (options?.single) {
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }
    const url = `${REST_URL}/${table}${query ? `?${query}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText, code: String(res.status) }));
      return { data: null, error: { message: err.message || res.statusText, code: err.code || String(res.status) } };
    }
    const data = await res.json();
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message, code: 'FETCH_ERROR' } };
  }
}

export async function dbInsert<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>,
  options?: { returning?: boolean; single?: boolean }
): Promise<PostgrestResponse<T>> {
  try {
    const headers: Record<string, string> = {
      ...authHeaders(),
      'Prefer': options?.returning !== false ? 'return=representation' : 'return=minimal',
    };
    if (options?.single) {
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }
    const res = await fetch(`${REST_URL}/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText, code: String(res.status) }));
      return { data: null, error: { message: err.message || res.statusText, code: err.code || String(res.status) } };
    }
    if (options?.returning === false) return { data: null, error: null };
    const data = await res.json();
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message, code: 'FETCH_ERROR' } };
  }
}

export async function dbUpdate<T = Record<string, unknown>>(
  table: string,
  updates: Record<string, unknown>,
  query: string,
  options?: { returning?: boolean; single?: boolean }
): Promise<PostgrestResponse<T>> {
  try {
    const headers: Record<string, string> = {
      ...authHeaders(),
      'Prefer': options?.returning !== false ? 'return=representation' : 'return=minimal',
    };
    if (options?.single) {
      headers['Accept'] = 'application/vnd.pgrst.object+json';
    }
    const res = await fetch(`${REST_URL}/${table}?${query}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText, code: String(res.status) }));
      return { data: null, error: { message: err.message || res.statusText, code: err.code || String(res.status) } };
    }
    if (options?.returning === false) return { data: null, error: null };
    const data = await res.json();
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message, code: 'FETCH_ERROR' } };
  }
}

// ─── Realtime (WebSocket) ────────────────────────────────────────────────────

interface RealtimeChannel {
  topic: string;
  callbacks: Array<{ event: string; table: string; filter?: string; callback: RealtimeCallback }>;
}

let realtimeSocket: WebSocket | null = null;
let realtimeRef = 0;
const channels = new Map<string, RealtimeChannel>();
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function connectRealtime() {
  if (realtimeSocket?.readyState === WebSocket.OPEN) return;

  const wsUrl = SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  realtimeSocket = new WebSocket(
    `${wsUrl}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`
  );

  realtimeSocket.onopen = () => {
    // Re-subscribe all channels
    channels.forEach((_ch, topic) => {
      sendPhxJoin(topic);
    });
    // Heartbeat every 30s
    heartbeatInterval = setInterval(() => {
      sendPhx('heartbeat', 'phoenix', {});
    }, 30000);
  };

  realtimeSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const [_joinRef, _ref, topic, eventName, payload] = [
        msg.join_ref, msg.ref, msg.topic, msg.event, msg.payload,
      ];
      if (eventName === 'postgres_changes' && payload?.data) {
        const data = payload.data;
        const channel = channels.get(topic);
        channel?.callbacks.forEach(cb => {
          if (data.table === cb.table) {
            const matchesFilter = !cb.filter || matchesPostgresFilter(cb.filter, data.record);
            if (matchesFilter) {
              cb.callback({
                eventType: data.type as 'INSERT' | 'UPDATE' | 'DELETE',
                new: data.record || {},
                old: data.old_record || {},
              });
            }
          }
        });
      }
    } catch { /* ignore parse errors */ }
  };

  realtimeSocket.onclose = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    // Reconnect after 2s
    setTimeout(connectRealtime, 2000);
  };
}

function matchesPostgresFilter(filter: string, record: Record<string, unknown>): boolean {
  // Parse filter like "session_id=eq.some-uuid"
  const match = filter.match(/^(\w+)=eq\.(.+)$/);
  if (match) {
    return String(record[match[1]]) === match[2];
  }
  return true;
}

function sendPhx(event: string, topic: string, payload: Record<string, unknown>) {
  if (realtimeSocket?.readyState !== WebSocket.OPEN) return;
  realtimeRef++;
  realtimeSocket.send(JSON.stringify({
    topic,
    event,
    payload,
    ref: String(realtimeRef),
  }));
}

function sendPhxJoin(topic: string) {
  const channel = channels.get(topic);
  if (!channel) return;

  const postgresChanges = channel.callbacks.map((cb, i) => ({
    id: i,
    event: cb.event,
    schema: 'public',
    table: cb.table,
    filter: cb.filter ? cb.filter : undefined,
  }));

  realtimeRef++;
  const msg = {
    topic,
    event: 'phx_join',
    payload: {
      config: {
        broadcast: { self: false },
        presence: { key: '' },
        postgres_changes: postgresChanges,
      },
    },
    ref: String(realtimeRef),
    join_ref: String(realtimeRef),
  };
  realtimeSocket?.send(JSON.stringify(msg));
}

export function subscribeToTable(
  channelName: string,
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: RealtimeCallback,
  filter?: string,
): () => void {
  const topic = `realtime:${channelName}`;

  if (!channels.has(topic)) {
    channels.set(topic, { topic, callbacks: [] });
  }

  const channel = channels.get(topic)!;
  const entry = { event, table, filter, callback };
  channel.callbacks.push(entry);

  // Connect and subscribe
  connectRealtime();
  if (realtimeSocket?.readyState === WebSocket.OPEN) {
    sendPhxJoin(topic);
  }

  // Return unsubscribe function
  return () => {
    const idx = channel.callbacks.indexOf(entry);
    if (idx >= 0) channel.callbacks.splice(idx, 1);
    if (channel.callbacks.length === 0) {
      channels.delete(topic);
      sendPhx('phx_leave', topic, {});
    }
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}
