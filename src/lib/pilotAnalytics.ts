/**
 * Pilot Analytics Module
 *
 * Privacy-respecting analytics for school pilots.
 * Sends data to a Google Sheets backend via Apps Script.
 *
 * Collects: age band, gameplay stats only.
 * Does NOT collect: names, photos, addresses, camera images.
 */

// ─── Types ──────────────────────────────────────────────────────

export type PilotAgeBand = '4-5' | '6-7' | '8-9' | '10-11' | '12+';

export type PilotEventType =
  | 'session_started'
  | 'menu_opened'
  | 'game_selected'
  | 'stage_started'
  | 'item_grabbed'
  | 'item_dropped'
  | 'stage_completed'
  | 'session_ended';

/** Matches the Events tab columns */
export interface PilotEvent {
  eventId: string;
  sessionId: string;
  timestamp: string;
  eventType: PilotEventType;
  gameId?: string;
  stageId?: string;
  itemKey?: string;
  itemInstanceId?: string;
  binId?: string;
  isCorrect?: boolean;
  elapsedMs?: number;
  metaJson?: string;
}

/** Matches the Sessions tab columns */
export interface PilotSession {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  ageBand: PilotAgeBand;
  schoolId: string;
  classId: string;
  deviceType: string;
  buildVersion: string;
  gamesPlayedCount: number;
  totalStagesCompleted: number;
  totalCorrect: number;
  totalWrong: number;
}

// ─── Constants ──────────────────────────────────────────────────

const QUEUE_KEY = 'pilot_event_queue';
const SESSION_KEY = 'pilot_session';
const FLUSH_INTERVAL_MS = 5000;
const MAX_RETRY_DELAY_MS = 30000;
const INITIAL_RETRY_DELAY_MS = 1000;

// ─── Helpers ────────────────────────────────────────────────────

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getBuildVersion(): string {
  return (import.meta.env.VITE_BUILD_VERSION as string) || '0.0.0';
}

function getSheetsEndpoint(): string {
  return (import.meta.env.VITE_SHEETS_ENDPOINT as string) || '';
}

// ─── Session State ──────────────────────────────────────────────

interface SessionState {
  sessionId: string;
  startedAt: string;
  ageBand: PilotAgeBand;
  schoolId: string;
  classId: string;
  gamesPlayed: Set<string>;
  stagesCompleted: number;
  correctCount: number;
  wrongCount: number;
}

let currentSession: SessionState | null = null;

function loadSession(): SessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Restore Set from array
    parsed.gamesPlayed = new Set(parsed.gamesPlayed || []);
    return parsed as SessionState;
  } catch {
    return null;
  }
}

function saveSession(session: SessionState): void {
  if (typeof window === 'undefined') return;
  const serializable = {
    ...session,
    gamesPlayed: Array.from(session.gamesPlayed),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
}

// ─── Event Queue (localStorage-backed) ─────────────────────────

function getQueue(): PilotEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(events: PilotEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(events));
  } catch {
    // Storage full — drop oldest events
    if (events.length > 10) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-10)));
    }
  }
}

function enqueue(event: PilotEvent): void {
  const queue = getQueue();
  queue.push(event);
  setQueue(queue);
}

// ─── Network — POST with retry ─────────────────────────────────

let retryDelay = INITIAL_RETRY_DELAY_MS;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;

async function postToSheets(type: string, payload: unknown): Promise<boolean> {
  const endpoint = getSheetsEndpoint();
  if (!endpoint) {
    console.debug('[PilotAnalytics] No VITE_SHEETS_ENDPOINT configured, skipping');
    return true;
  }

  try {
    // Google Apps Script drops POST bodies on 302 redirects.
    // Send as GET with data encoded as a query parameter instead.
    const data = JSON.stringify({ type, payload });
    const url = `${endpoint}?data=${encodeURIComponent(data)}`;
    const res = await fetch(url, { redirect: 'follow' });
    if (res.ok) {
      retryDelay = INITIAL_RETRY_DELAY_MS;
      return true;
    }
    console.warn('[PilotAnalytics] GET-write returned', res.status);
    return false;
  } catch (err) {
    console.warn('[PilotAnalytics] GET-write failed:', err);
    return false;
  }
}

async function flushQueue(): Promise<void> {
  const queue = getQueue();
  if (queue.length === 0) return;

  // Take all queued events
  setQueue([]);

  const success = await postToSheets('events', queue);
  if (!success) {
    // Put events back and schedule retry
    const remaining = getQueue();
    setQueue([...queue, ...remaining]);
    scheduleRetry();
  }
}

function scheduleRetry(): void {
  if (retryTimeout) return; // Already scheduled
  retryTimeout = setTimeout(async () => {
    retryTimeout = null;
    await flushQueue();
  }, retryDelay);
  // Exponential backoff
  retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
}

// ─── Flush interval ─────────────────────────────────────────────

let flushInterval: ReturnType<typeof setInterval> | null = null;

function startFlushInterval(): void {
  if (flushInterval) return;
  flushInterval = setInterval(() => {
    flushQueue();
  }, FLUSH_INTERVAL_MS);
}

function stopFlushInterval(): void {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}

// ─── Before-unload flush ────────────────────────────────────────

function setupBeforeUnload(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeunload', () => {
    // Do NOT call endSession() here — beforeunload fires on in-tab navigation
    // (e.g. modal → /demo → /play) which would kill the session after 1ms.
    // The session persists in sessionStorage and is restored by initPilotAnalytics.
    // endSession() should only be called explicitly (e.g. back-to-landing button).

    // Flush any queued events
    const queue = getQueue();
    if (queue.length > 0) {
      const endpoint = getSheetsEndpoint();
      if (endpoint) {
        const data = JSON.stringify({ type: 'events', payload: queue });
        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'text/plain' });
          navigator.sendBeacon(endpoint, blob);
        }
        const img = new Image();
        img.src = `${endpoint}?data=${encodeURIComponent(data)}`;
        setQueue([]);
      }
    }
  });
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Start a new pilot analytics session.
 * Called when user clicks Start in the Try Free modal.
 */
export function startSession(
  ageBand: PilotAgeBand,
  schoolId = '',
  classId = ''
): string {
  const sessionId = generateUUID();
  currentSession = {
    sessionId,
    startedAt: new Date().toISOString(),
    ageBand,
    schoolId,
    classId,
    gamesPlayed: new Set(),
    stagesCompleted: 0,
    correctCount: 0,
    wrongCount: 0,
  };
  saveSession(currentSession);
  startFlushInterval();

  // Fire session_started event
  logEvent('session_started', { metaJson: JSON.stringify({ ageBand, schoolId, classId }) });

  return sessionId;
}

/**
 * Log a gameplay event.
 */
export function logEvent(
  eventType: PilotEventType,
  data: Partial<Omit<PilotEvent, 'eventId' | 'sessionId' | 'timestamp' | 'eventType'>> = {}
): void {
  if (!currentSession) {
    // Try to restore from sessionStorage
    currentSession = loadSession();
    if (!currentSession) {
      console.debug('[PilotAnalytics] No active session, skipping event:', eventType);
      return;
    }
  }

  // Track aggregates
  if (eventType === 'game_selected' && data.gameId) {
    currentSession.gamesPlayed.add(data.gameId);
    saveSession(currentSession);
  }
  if (eventType === 'stage_completed') {
    currentSession.stagesCompleted++;
    saveSession(currentSession);
  }
  if (eventType === 'item_dropped' && data.isCorrect !== undefined) {
    if (data.isCorrect) {
      currentSession.correctCount++;
    } else {
      currentSession.wrongCount++;
    }
    saveSession(currentSession);
  }

  const event: PilotEvent = {
    eventId: generateUUID(),
    sessionId: currentSession.sessionId,
    timestamp: new Date().toISOString(),
    eventType,
    gameId: data.gameId || '',
    stageId: data.stageId || '',
    itemKey: data.itemKey || '',
    itemInstanceId: data.itemInstanceId || '',
    binId: data.binId || '',
    isCorrect: data.isCorrect,
    elapsedMs: data.elapsedMs || 0,
    metaJson: data.metaJson || '',
  };

  enqueue(event);

  // Flush immediately on critical events
  if (eventType === 'stage_completed' || eventType === 'session_ended') {
    flushQueue();
  }
}

/**
 * End the current session. Posts a summary row to the Sessions tab.
 */
export function endSession(exitReason: string = 'menu_back'): void {
  if (!currentSession) {
    currentSession = loadSession();
    if (!currentSession) return;
  }

  const endedAt = new Date().toISOString();
  const durationMs = new Date(endedAt).getTime() - new Date(currentSession.startedAt).getTime();

  // Fire session_ended event
  logEvent('session_ended', {
    metaJson: JSON.stringify({ exitReason }),
    elapsedMs: durationMs,
  });

  // Post session summary
  const sessionRow: PilotSession = {
    sessionId: currentSession.sessionId,
    startedAt: currentSession.startedAt,
    endedAt,
    durationMs,
    ageBand: currentSession.ageBand,
    schoolId: currentSession.schoolId,
    classId: currentSession.classId,
    deviceType: getDeviceType(),
    buildVersion: getBuildVersion(),
    gamesPlayedCount: currentSession.gamesPlayed.size,
    totalStagesCompleted: currentSession.stagesCompleted,
    totalCorrect: currentSession.correctCount,
    totalWrong: currentSession.wrongCount,
  };

  postToSheets('session', sessionRow);

  // Flush remaining events
  flushQueue();

  // Clean up
  stopFlushInterval();
  sessionStorage.removeItem(SESSION_KEY);
  currentSession = null;
}

/**
 * Get the current session ID (for debug / admin).
 */
export function getSessionId(): string | null {
  if (currentSession) return currentSession.sessionId;
  const restored = loadSession();
  return restored?.sessionId || null;
}

/**
 * Check if a session is active.
 */
export function hasActiveSession(): boolean {
  if (currentSession) return true;
  return loadSession() !== null;
}

// ─── Initialize ─────────────────────────────────────────────────

export function initPilotAnalytics(): void {
  // Restore session if exists
  currentSession = loadSession();
  if (currentSession) {
    startFlushInterval();
  }
  setupBeforeUnload();
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  initPilotAnalytics();
}
