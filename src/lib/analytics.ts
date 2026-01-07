/**
 * Analytics Client
 * Privacy-respecting analytics for product insight
 */

type EventName = 
  | 'landing_view'
  | 'nav_click'
  | 'cta_click'
  | 'demo_try_click'
  | 'demo_loading_view'
  | 'demo_loading_complete'
  | 'demo_wave_screen_view'
  | 'demo_wave_success'
  | 'demo_mode_select_view'
  | 'mode_start'
  | 'mode_exit'
  | 'mode_chapter_complete'
  | 'mode_level_up'
  | 'bubblepop_round_start'
  | 'bubblepop_balloon_popped'
  | 'bubblepop_round_complete'
  | 'bubblepop_auto_advance'
  | 'wordsearch_level_start'
  | 'wordsearch_word_found'
  | 'wordsearch_hint_shown'
  | 'wordsearch_level_complete'
  | 'wordsearch_world_transition'
  | 'session_heartbeat'
  | 'session_idle'
  | 'session_resume'
  | 'school_pack_form_view'
  | 'school_pack_form_submit'
  | 'system_error'
  | 'camera_permission_denied'
  | 'camera_permission_granted';

interface EventMeta {
  [key: string]: any;
  viewport_w?: number;
  viewport_h?: number;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  connection_type?: string;
  browser?: string;
  browser_version?: string;
  country?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  time_on_page?: number;
  demo_session_duration?: number;
  mode_chosen?: string;
  error_type?: string;
  camera_permission_outcome?: 'granted' | 'denied' | 'prompt';
}

interface AnalyticsEvent {
  event_id: string;
  session_id: string;
  created_at: string;
  event_name: EventName;
  page: string;
  component?: string;
  mode?: string;
  chapter?: number;
  level?: number;
  value_number?: number;
  value_string?: string;
  meta: EventMeta;
}

class AnalyticsClient {
  private sessionId: string;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  private readonly FLUSH_INTERVAL_MS = 10000; // 10 seconds
  private readonly FLUSH_BATCH_SIZE = 10;
  private readonly HEARTBEAT_INTERVAL_MS = 15000; // 15 seconds

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.startHeartbeat();
    this.startFlushInterval();
    this.setupBeforeUnload();
    this.trackLandingView();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return '';
    
    const stored = sessionStorage.getItem('analytics_session_id');
    if (stored) return stored;

    const newId = this.generateUUID();
    sessionStorage.setItem('analytics_session_id', newId);
    return newId;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getBrowserInfo(): { browser: string; version: string } {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return { browser: 'unknown', version: 'unknown' };
    }

    const ua = navigator.userAgent;
    let browser = 'unknown';
    let version = 'unknown';

    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browser = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (ua.includes('Edg')) {
      browser = 'Edge';
      const match = ua.match(/Edg\/(\d+)/);
      version = match ? match[1] : 'unknown';
    }

    return { browser, version };
  }

  private getCountry(): string | undefined {
    // Only use if available from request headers or existing service
    // Do not make new API calls for privacy
    // This would typically come from server-side headers
    return undefined;
  }

  private getUTMParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    };
  }

  private getMeta(additionalMeta: EventMeta = {}): EventMeta {
    const browserInfo = this.getBrowserInfo();
    const utmParams = this.getUTMParams();
    
    return {
      viewport_w: typeof window !== 'undefined' ? window.innerWidth : undefined,
      viewport_h: typeof window !== 'undefined' ? window.innerHeight : undefined,
      device_type: this.getDeviceType(),
      connection_type: (navigator as any).connection?.effectiveType,
      browser: browserInfo.browser,
      browser_version: browserInfo.version,
      country: this.getCountry(),
      referrer: typeof document !== 'undefined' ? (document.referrer || undefined) : undefined,
      ...utmParams,
      ...additionalMeta,
    };
  }

  logEvent(
    eventName: EventName,
    meta: EventMeta = {},
    options: {
      page?: string;
      component?: string;
      mode?: string;
      chapter?: number;
      level?: number;
      value_number?: number;
      value_string?: string;
    } = {}
  ): void {
    const event: AnalyticsEvent = {
      event_id: this.generateUUID(),
      session_id: this.sessionId,
      created_at: new Date().toISOString(),
      event_name: eventName,
      page: options.page || window.location.pathname,
      component: options.component,
      mode: options.mode,
      chapter: options.chapter,
      level: options.level,
      value_number: options.value_number,
      value_string: options.value_string,
      meta: this.getMeta(meta),
    };

    this.eventQueue.push(event);

    // Flush if queue is large enough
    if (this.eventQueue.length >= this.FLUSH_BATCH_SIZE) {
      this.flush();
    }
  }

  private startFlushInterval(): void {
    if (this.flushInterval) return;
    this.flushInterval = window.setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = window.setInterval(() => {
      const activeScreen = this.getActiveScreen();
      this.logEvent('session_heartbeat', {
        active_screen: activeScreen,
      });
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private getActiveScreen(): string {
    const path = window.location.pathname;
    if (path === '/demo') return 'demo_loading';
    if (path === '/play' || path === '/onboarding') return 'wave_screen';
    if (path === '/app') return 'mode_selection';
    if (path.startsWith('/')) return 'game';
    return 'landing';
  }

  private setupBeforeUnload(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
  }

  private async flush(sync = false): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    const flushFn = async () => {
      try {
        // In production, this would POST to /api/track
        // For now, we'll store in sessionStorage as fallback
        const stored = JSON.parse(sessionStorage.getItem('analytics_events') || '[]');
        stored.push(...events);
        sessionStorage.setItem('analytics_events', JSON.stringify(stored.slice(-1000))); // Keep last 1000

        // Try to send to API
        if (typeof fetch !== 'undefined') {
          await fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events }),
            keepalive: true,
          }).catch(() => {
            // Silently fail - events are stored in sessionStorage
          });
        }
      } catch (error) {
        console.error('Analytics flush error:', error);
      }
    };

    if (sync) {
      // Use sendBeacon for beforeunload
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
        navigator.sendBeacon('/api/track', blob);
      } else {
        await flushFn();
      }
    } else {
      flushFn();
    }
  }

  private trackLandingView(): void {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/' || window.location.pathname === '') {
      this.logEvent('landing_view', {
        path: window.location.pathname,
      });
    }
  }

  // Public method to manually flush
  flushNow(): void {
    this.flush();
  }

  // Get current session ID (for admin dashboard)
  getSessionId(): string {
    return this.sessionId;
  }
}

// Create singleton instance
let analyticsInstance: AnalyticsClient | null = null;

export const initAnalytics = (): AnalyticsClient => {
  if (!analyticsInstance && typeof window !== 'undefined') {
    analyticsInstance = new AnalyticsClient();
    (window as any).analytics = analyticsInstance;
  }
  return analyticsInstance!;
};

export const getAnalytics = (): AnalyticsClient | null => {
  return analyticsInstance;
};

// Auto-initialize on import in browser
if (typeof window !== 'undefined') {
  initAnalytics();
}

