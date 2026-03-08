import React, { useState, useEffect, useCallback } from 'react';
import './admin.css';

// ─── Types ──────────────────────────────────────────────────────

interface SummaryKPI {
  totalSessions: number;
  totalPlaytimeMs: number;
  avgSessionDurationMs: number;
  avgAccuracy: number;
  totalStagesCompleted: number;
}

interface SummaryBreakdowns {
  sessionsByAgeBand: Record<string, number>;
  sessionsByGame: Record<string, number>;
  accuracyByStage: Record<string, number>;
  avgTimeByStage: Record<string, number>;
  mostFailedItems: { item: string; count: number }[];
  dropOutcomes: { correct: number; wrong: number };
}

interface RecentSession {
  startedAt: string;
  ageBand: string;
  gamesPlayed: number;
  durationMs: number;
  accuracy: number;
  stagesCompleted: number;
}

interface SchoolPackRequest {
  timestamp: string;
  contactName: string;
  email: string;
  schoolName: string;
  role: string;
  yearGroup: string;
  deviceType: string;
  sendNotes: string;
}

interface FeedbackRequest {
  timestamp: string;
  feedback: string;
  email: string;
  url: string;
}

interface SummaryData {
  kpi: SummaryKPI;
  breakdowns: SummaryBreakdowns;
  recentSessions: RecentSession[];
  recentSchoolPacks?: SchoolPackRequest[];
  recentFeedback?: FeedbackRequest[];
}

// ─── Helpers ────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return '0s';
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
}

function formatPlaytime(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return `${hrs}h ${min}m`;
}

function getMaxValue(obj: Record<string, number>): number {
  const vals = Object.values(obj);
  return vals.length > 0 ? Math.max(...vals) : 1;
}

// ─── Component ──────────────────────────────────────────────────

export const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unconfigured' | 'connected' | 'error' | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'feedback'>('overview');

  // Rate limiting
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);

  // Admin PIN must be set via VITE_ADMIN_PIN environment variable.
  // There is intentionally no default fallback — if the env var is missing,
  // the admin panel is disabled rather than exposed with a known password.
  const adminPin = (import.meta.env.VITE_ADMIN_PIN as string)
    || (import.meta.env.VITE_ADMIN_PASSWORD as string)
    || '';

  const sheetsEndpoint = (import.meta.env.VITE_SHEETS_ENDPOINT as string) || '';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // If no admin PIN is configured via environment variable, deny all access.
    // This prevents the admin panel from being accessible in production builds
    // where VITE_ADMIN_PIN was not set at build time.
    if (!adminPin) {
      setError('Admin panel is not configured for this deployment.');
      return;
    }

    const now = Date.now();
    if (now - lastAttemptTime < 60000 && loginAttempts >= 5) {
      setError('Too many attempts. Wait a minute.');
      return;
    }
    if (now - lastAttemptTime >= 60000) setLoginAttempts(0);

    if (pin.trim() === adminPin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.setItem('admin_session_expiry', (Date.now() + 15 * 60 * 1000).toString());
      setPin('');
      setError('');
      setLoginAttempts(0);
      fetchData();
    } else {
      setError('Incorrect PIN');
      setPin('');
      setLoginAttempts((p) => p + 1);
      setLastAttemptTime(now);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_session_expiry');
    setPin('');
    setData(null);
  };

  const fetchData = useCallback(async () => {
    if (!sheetsEndpoint) {
      // Endpoint not configured — show unconfigured state (distinct from "no data yet")
      setConnectionStatus('unconfigured');
      setFetchError(null);
      setData({
        kpi: { totalSessions: 0, totalPlaytimeMs: 0, avgSessionDurationMs: 0, avgAccuracy: 0, totalStagesCompleted: 0 },
        breakdowns: {
          sessionsByAgeBand: {},
          sessionsByGame: {},
          accuracyByStage: {},
          avgTimeByStage: {},
          mostFailedItems: [],
          dropOutcomes: { correct: 0, wrong: 0 },
        },
        recentSessions: [],
        recentSchoolPacks: [],
        recentFeedback: [],
      });
      setLastUpdated(new Date());
      console.warn('[Admin] VITE_SHEETS_ENDPOINT is not set. Dashboard will show empty data. Set this env var to connect to your Google Sheets backend.');
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const url = `${sheetsEndpoint}?pin=${encodeURIComponent(adminPin)}`;
      console.debug('[Admin] Fetching from endpoint…');
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        const msg = `HTTP ${res.status} ${res.statusText}`;
        console.error('[Admin] Fetch failed:', msg);
        setFetchError(`Server returned ${msg}. Check your Google Apps Script deployment and that the PIN is accepted.`);
        setConnectionStatus('error');
        return;
      }
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        setFetchError('Response was not valid JSON. The Apps Script may have returned an HTML error page. Check the deployment URL and CORS settings.');
        setConnectionStatus('error');
        return;
      }
      // Validate shape before setting data
      const typed = json as Partial<SummaryData>;
      if (!typed.kpi || !typed.breakdowns) {
        console.warn('[Admin] Response shape unexpected:', json);
        setFetchError(`Response shape unexpected — missing "kpi" or "breakdowns" keys. Got: ${Object.keys(typed).join(', ') || '(empty object)'}. Check the Apps Script response format.`);
        setConnectionStatus('error');
        return;
      }
      setData(json as SummaryData);
      setConnectionStatus('connected');
      setFetchError(null);
      setLastUpdated(new Date());
      console.debug('[Admin] Data loaded successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Admin] Fetch error:', msg);
      setFetchError(`Network error: ${msg}. The endpoint may be unreachable or blocked by CORS.`);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, [sheetsEndpoint, adminPin]);

  const handleTestConnection = async () => {
    if (!sheetsEndpoint) {
      setFetchError('VITE_SHEETS_ENDPOINT is not configured. Add it to your .env file and rebuild.');
      return;
    }
    setTestingConnection(true);
    try {
      const url = `${sheetsEndpoint}?pin=${encodeURIComponent(adminPin)}&action=health`;
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text().catch(() => '(no body)');
      if (res.ok) {
        setFetchError(null);
        setConnectionStatus('connected');
        console.info('[Admin] Connection test OK. Response snippet:', text.substring(0, 200));
        alert(`✅ Connection OK (HTTP ${res.status})\n\nResponse preview:\n${text.substring(0, 300)}`);
      } else {
        const errMsg = `HTTP ${res.status} — ${text.substring(0, 200)}`;
        setFetchError(errMsg);
        setConnectionStatus('error');
        alert(`❌ Connection failed: ${errMsg}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(`Connection test failed: ${msg}`);
      setConnectionStatus('error');
      alert(`❌ Network error: ${msg}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // Session restoration
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_authenticated');
    const expiry = sessionStorage.getItem('admin_session_expiry');
    if (authStatus === 'true' && expiry && Date.now() < parseInt(expiry, 10)) {
      setIsAuthenticated(true);
      fetchData();
    } else {
      sessionStorage.removeItem('admin_authenticated');
      sessionStorage.removeItem('admin_session_expiry');
    }
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchData]);

  // ─── Login Screen ──────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <h1>Admin Dashboard</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="admin-login-input"
              autoFocus
            />
            {error && <p className="admin-login-error">{error}</p>}
            <button type="submit" className="admin-btn admin-btn-primary">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────────

  const kpi = data?.kpi;
  const br = data?.breakdowns;
  const recent = data?.recentSessions || [];

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <a href="/" className="admin-logo-link">
            <img src="/logo.png" alt="Draw In The Air" className="admin-logo" />
          </a>
          <h1 className="admin-title">Pilot Dashboard</h1>
        </div>
        <div className="admin-header-right">
          <span className="admin-timestamp">
            {loading ? 'Loading…' : `Updated ${lastUpdated.toLocaleTimeString()}`}
            {connectionStatus === 'connected' && (
              <span style={{ marginLeft: 6, color: '#22c55e', fontSize: '0.7rem' }}>● connected</span>
            )}
            {connectionStatus === 'error' && (
              <span style={{ marginLeft: 6, color: '#ef4444', fontSize: '0.7rem' }}>● error</span>
            )}
            {connectionStatus === 'unconfigured' && (
              <span style={{ marginLeft: 6, color: '#f59e0b', fontSize: '0.7rem' }}>● not configured</span>
            )}
          </span>
          {sheetsEndpoint && (
            <button onClick={handleTestConnection} className="admin-btn admin-btn-secondary" disabled={testingConnection} title="Test the connection to the Google Sheets endpoint">
              {testingConnection ? 'Testing…' : 'Test'}
            </button>
          )}
          <button onClick={fetchData} className="admin-btn admin-btn-secondary" disabled={loading}>
            Refresh
          </button>
          <button onClick={handleLogout} className="admin-btn admin-btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="admin-content">
        {!sheetsEndpoint && (
          <div className="admin-notice">
            ⚠️ <code>VITE_SHEETS_ENDPOINT</code> not set. Deploy the Apps Script and set the
            endpoint in <code>.env</code> to see live data.
          </div>
        )}

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'overview' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`admin-tab ${activeTab === 'requests' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Pilot Requests {data?.recentSchoolPacks && data.recentSchoolPacks.length > 0 && <span className="admin-badge">{data.recentSchoolPacks.length}</span>}
          </button>
          <button
            className={`admin-tab ${activeTab === 'feedback' ? 'admin-tab-active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            Feedback {data?.recentFeedback && data.recentFeedback.length > 0 && <span className="admin-badge">{data.recentFeedback.length}</span>}
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* ─── Diagnostic Banner ──────────────────────────────── */}
            {connectionStatus === 'unconfigured' && (
              <div className="admin-diagnostic admin-diagnostic-warn">
                <div className="admin-diagnostic-icon">⚙️</div>
                <div className="admin-diagnostic-body">
                  <strong>Sheets endpoint not configured</strong>
                  <p>
                    Set <code>VITE_SHEETS_ENDPOINT</code> in your <code>.env</code> file and rebuild.
                    Without it, the dashboard cannot fetch real session data — all metrics show zero.
                  </p>
                  <p style={{ marginTop: 4, color: '#94a3b8', fontSize: '0.78rem' }}>
                    Expected value: your Google Apps Script deployment URL
                    (e.g. <code>https://script.google.com/macros/s/ABC.../exec</code>)
                  </p>
                </div>
              </div>
            )}
            {connectionStatus === 'error' && fetchError && (
              <div className="admin-diagnostic admin-diagnostic-error">
                <div className="admin-diagnostic-icon">⚠️</div>
                <div className="admin-diagnostic-body">
                  <strong>Data fetch failed</strong>
                  <p>{fetchError}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="admin-btn-sm" onClick={fetchData} disabled={loading}>
                      {loading ? 'Retrying…' : 'Retry Now'}
                    </button>
                    <button className="admin-btn-sm admin-btn-outline" onClick={handleTestConnection} disabled={testingConnection}>
                      {testingConnection ? 'Testing…' : 'Test Connection'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {connectionStatus === 'connected' && data?.kpi.totalSessions === 0 && (
              <div className="admin-diagnostic admin-diagnostic-info">
                <div className="admin-diagnostic-icon">ℹ️</div>
                <div className="admin-diagnostic-body">
                  <strong>Connected — no sessions yet</strong>
                  <p>
                    The endpoint is reachable and responding correctly, but no gameplay sessions
                    have been recorded yet. Sessions are created when a user clicks "Start" in the
                    Try Free modal and plays at least one activity.
                  </p>
                </div>
              </div>
            )}

            {/* ─── KPI Strip ──────────────────────────────────────── */}
            <div className="admin-kpi-strip">
              <div className="admin-kpi-card">
                <div className="admin-kpi-value">{kpi?.totalSessions ?? 0}</div>
                <div className="admin-kpi-label">Total Sessions</div>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-value">{formatPlaytime(kpi?.totalPlaytimeMs ?? 0)}</div>
                <div className="admin-kpi-label">Total Playtime</div>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-value">{formatDuration(kpi?.avgSessionDurationMs ?? 0)}</div>
                <div className="admin-kpi-label">Avg Session</div>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-value">{kpi?.avgAccuracy ?? 0}%</div>
                <div className="admin-kpi-label">Avg Accuracy</div>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-value">{kpi?.totalStagesCompleted ?? 0}</div>
                <div className="admin-kpi-label">Stages Completed</div>
              </div>
            </div>

            {/* ─── Breakdowns Grid ────────────────────────────────── */}
            <div className="admin-breakdowns-grid">
              {/* Sessions by Age Band */}
              <div className="admin-section admin-section-half">
                <h2 className="admin-section-title">Sessions by Age Band</h2>
                <div className="admin-chart-container">
                  {br && Object.keys(br.sessionsByAgeBand).length > 0 ? (
                    Object.entries(br.sessionsByAgeBand).map(([band, count]) => (
                      <div key={band} className="admin-bar-row">
                        <span className="admin-bar-label">{band}</span>
                        <div className="admin-bar-track">
                          <div
                            className="admin-bar-fill admin-bar-fill-gold"
                            style={{ width: `${(count / getMaxValue(br.sessionsByAgeBand)) * 100}%` }}
                          />
                        </div>
                        <span className="admin-bar-value">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="admin-empty">No data yet</p>
                  )}
                </div>
              </div>

              {/* Sessions by Game */}
              <div className="admin-section admin-section-half">
                <h2 className="admin-section-title">Sessions by Game</h2>
                <div className="admin-chart-container">
                  {br && Object.keys(br.sessionsByGame).length > 0 ? (
                    Object.entries(br.sessionsByGame).map(([game, count]) => (
                      <div key={game} className="admin-bar-row">
                        <span className="admin-bar-label">{game}</span>
                        <div className="admin-bar-track">
                          <div
                            className="admin-bar-fill admin-bar-fill-cyan"
                            style={{ width: `${(count / getMaxValue(br.sessionsByGame)) * 100}%` }}
                          />
                        </div>
                        <span className="admin-bar-value">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="admin-empty">No data yet</p>
                  )}
                </div>
              </div>

              {/* Accuracy by Stage */}
              <div className="admin-section admin-section-half">
                <h2 className="admin-section-title">Accuracy by Stage</h2>
                <div className="admin-chart-container">
                  {br && Object.keys(br.accuracyByStage).length > 0 ? (
                    Object.entries(br.accuracyByStage).map(([stage, pct]) => (
                      <div key={stage} className="admin-bar-row">
                        <span className="admin-bar-label">{stage}</span>
                        <div className="admin-bar-track">
                          <div
                            className="admin-bar-fill admin-bar-fill-green"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="admin-bar-value">{pct}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="admin-empty">No data yet</p>
                  )}
                </div>
              </div>

              {/* Avg Time per Stage */}
              <div className="admin-section admin-section-half">
                <h2 className="admin-section-title">Avg Time per Stage</h2>
                <div className="admin-chart-container">
                  {br && Object.keys(br.avgTimeByStage).length > 0 ? (
                    Object.entries(br.avgTimeByStage).map(([stage, ms]) => (
                      <div key={stage} className="admin-bar-row">
                        <span className="admin-bar-label">{stage}</span>
                        <div className="admin-bar-track">
                          <div
                            className="admin-bar-fill admin-bar-fill-purple"
                            style={{ width: `${(ms / getMaxValue(br.avgTimeByStage)) * 100}%` }}
                          />
                        </div>
                        <span className="admin-bar-value">{formatDuration(ms)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="admin-empty">No data yet</p>
                  )}
                </div>
              </div>

              {/* Drop Outcomes */}
              <div className="admin-section admin-section-half">
                <h2 className="admin-section-title">Drop Outcomes</h2>
                <div className="admin-chart-container">
                  {br && (br.dropOutcomes.correct + br.dropOutcomes.wrong) > 0 ? (
                    <>
                      <div className="admin-bar-row">
                        <span className="admin-bar-label">Correct</span>
                        <div className="admin-bar-track">
                          <div
                            className="admin-bar-fill admin-bar-fill-green"
                            style={{
                              width: `${(br.dropOutcomes.correct / (br.dropOutcomes.correct + br.dropOutcomes.wrong)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="admin-bar-value">{br.dropOutcomes.correct}</span>
                      </div>
                      <div className="admin-bar-row">
                        <span className="admin-bar-label">Wrong</span>
                        <div className="admin-bar-track">
                          <div
                            className="admin-bar-fill admin-bar-fill-red"
                            style={{
                              width: `${(br.dropOutcomes.wrong / (br.dropOutcomes.correct + br.dropOutcomes.wrong)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="admin-bar-value">{br.dropOutcomes.wrong}</span>
                      </div>
                    </>
                  ) : (
                    <p className="admin-empty">No data yet</p>
                  )}
                </div>
              </div>

              {/* Most Failed Items */}
              <div className="admin-section admin-section-half">
                <h2 className="admin-section-title">Most Failed Items</h2>
                <div className="admin-chart-container">
                  {br && br.mostFailedItems.length > 0 ? (
                    br.mostFailedItems.slice(0, 8).map((item) => (
                      <div key={item.item} className="admin-bar-row">
                        <span className="admin-bar-label">{item.item}</span>
                        <div className="admin-bar-track">
                          <div
                            className="admin-bar-fill admin-bar-fill-red"
                            style={{
                              width: `${(item.count / br.mostFailedItems[0].count) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="admin-bar-value">{item.count}</span>
                      </div>
                    ))
                  ) : (
                    <p className="admin-empty">No failed items yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Recent Sessions Table ──────────────────────────── */}
            <div className="admin-section" style={{ marginTop: 'var(--spacing-lg)' }}>
              <h2 className="admin-section-title">Recent Sessions</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Started</th>
                      <th>Age Band</th>
                      <th>Games</th>
                      <th>Duration</th>
                      <th>Accuracy</th>
                      <th>Stages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="admin-table-empty">
                          No sessions yet
                        </td>
                      </tr>
                    ) : (
                      recent.map((s, i) => (
                        <tr key={i}>
                          <td>{s.startedAt ? new Date(s.startedAt).toLocaleString() : '-'}</td>
                          <td>
                            <span className="admin-age-badge">{s.ageBand}</span>
                          </td>
                          <td>{s.gamesPlayed}</td>
                          <td>{formatDuration(s.durationMs)}</td>
                          <td>
                            <span className={`admin-accuracy ${s.accuracy >= 70 ? 'admin-accuracy-good' : s.accuracy >= 40 ? 'admin-accuracy-mid' : 'admin-accuracy-low'}`}>
                              {s.accuracy}%
                            </span>
                          </td>
                          <td>{s.stagesCompleted}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ─── Pilot Requests Tab ──────────────────────────── */}
        {activeTab === 'requests' && (
          <div className="admin-section">
            <h2 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>School Pilot Requests</span>
              <span className="admin-tab-count">{data?.recentSchoolPacks?.length || 0} Total</span>
            </h2>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>School</th>
                    <th>Role</th>
                    <th>Info</th>
                  </tr>
                </thead>
                <tbody>
                  {!data?.recentSchoolPacks || data.recentSchoolPacks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-table-empty">
                        No requests yet
                      </td>
                    </tr>
                  ) : (
                    data.recentSchoolPacks.map((p, i) => (
                      <tr key={i}>
                        <td>{p.timestamp ? new Date(p.timestamp).toLocaleString() : '-'}</td>
                        <td>{p.contactName}</td>
                        <td><a href={`mailto:${p.email}`}>{p.email}</a></td>
                        <td>{p.schoolName}</td>
                        <td>{p.role}</td>
                        <td>
                          <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                            {p.yearGroup && <div>Year: {p.yearGroup}</div>}
                            {p.deviceType && <div>Device: {p.deviceType}</div>}
                            {p.sendNotes && <div>Notes: {p.sendNotes}</div>}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Feedback Tab ──────────────────────────── */}
        {activeTab === 'feedback' && (
          <div className="admin-section">
            <h2 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>User Feedback</span>
              <span className="admin-tab-count">{data?.recentFeedback?.length || 0} Total</span>
            </h2>
            <div className="admin-feedback-grid">
              {!data?.recentFeedback || data.recentFeedback.length === 0 ? (
                <div className="admin-empty">No feedback yet</div>
              ) : (
                data.recentFeedback.map((f, i) => (
                  <div key={i} className="admin-feedback-card">
                    <div className="admin-feedback-header">
                      <span className="admin-feedback-date">{f.timestamp ? new Date(f.timestamp).toLocaleString() : '-'}</span>
                      {f.email && <a href={`mailto:${f.email}`} className="admin-feedback-email">{f.email}</a>}
                    </div>
                    <p className="admin-feedback-text">"{f.feedback}"</p>
                    <div className="admin-feedback-meta">
                      <span>URL: <a href={f.url} target="_blank" rel="noreferrer">[{f.url.split('/').pop() || 'link'}]</a></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
