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

interface SummaryData {
  kpi: SummaryKPI;
  breakdowns: SummaryBreakdowns;
  recentSessions: RecentSession[];
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

  // Rate limiting
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);

  const adminPin = (import.meta.env.VITE_ADMIN_PIN as string)
    || (import.meta.env.VITE_ADMIN_PASSWORD as string)
    || 'admin123';

  const sheetsEndpoint = (import.meta.env.VITE_SHEETS_ENDPOINT as string) || '';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

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
      // No endpoint — show empty state
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
      });
      setLastUpdated(new Date());
      return;
    }

    setLoading(true);
    try {
      const url = `${sheetsEndpoint}?pin=${encodeURIComponent(adminPin)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error('[Admin] Fetch failed:', res.status);
        return;
      }
      const json = await res.json();
      setData(json as SummaryData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Admin] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [sheetsEndpoint, adminPin]);

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
          </span>
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
        <div className="admin-section">
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
      </div>
    </div>
  );
};
