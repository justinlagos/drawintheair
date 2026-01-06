import React, { useState, useEffect } from 'react';
import './admin.css';

interface SchoolPackRequest {
  request_id: string;
  created_at: string;
  school_name: string;
  contact_name: string;
  role: string;
  email: string;
  year_group: string;
  device_type: string;
  send_notes: string | null;
  status: 'new' | 'contacted' | 'closed';
}

interface AnalyticsSession {
  session_id: string;
  created_at: string;
  last_seen_at: string;
  device_type: string;
  browser: string;
  browser_version?: string;
  country?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  landing_views: number;
  try_demo_clicked: boolean;
  first_mode_started: string | null;
  total_play_time: number;
  modes_played: string[];
  time_on_page?: number;
  demo_session_duration?: number;
  errors_encountered: string[];
  camera_permission_outcome?: 'granted' | 'denied' | 'prompt';
}

interface KPIData {
  total_visits: number;
  unique_sessions: number;
  try_demo_clicks: number;
  demo_sessions_started: number;
  avg_session_duration: number;
  conversion_rate: number;
  error_count: number;
  mobile_percentage: number;
}

interface FunnelStep {
  name: string;
  count: number;
  percent_of_previous: number;
  percent_of_total: number;
}

export const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [schoolPackRequests, setSchoolPackRequests] = useState<SchoolPackRequest[]>([]);
  const [kpiData, setKpiData] = useState<KPIData>({
    total_visits: 0,
    unique_sessions: 0,
    try_demo_clicks: 0,
    demo_sessions_started: 0,
    avg_session_duration: 0,
    conversion_rate: 0,
    error_count: 0,
    mobile_percentage: 0,
  });
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SchoolPackRequest | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  
  // Rate limiting for login attempts
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting: max 5 attempts per minute
    const now = Date.now();
    if (now - lastAttemptTime < 60000) {
      if (loginAttempts >= 5) {
        setError('Too many login attempts. Please wait a minute.');
        return;
      }
    } else {
      setLoginAttempts(0);
    }

    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    
    // Validate password (prevent injection attempts)
    const sanitizedPassword = password.trim();
    
    if (sanitizedPassword === adminPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      // Set expiration (15 minutes)
      sessionStorage.setItem('admin_session_expiry', (Date.now() + 15 * 60 * 1000).toString());
      setPassword('');
      setError('');
      setLoginAttempts(0);
      loadData();
      startPolling();
    } else {
      setError('Incorrect password');
      setPassword('');
      setLoginAttempts(prev => prev + 1);
      setLastAttemptTime(now);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_session_expiry');
    setPassword('');
    setLoginAttempts(0);
  };

  const loadData = async () => {
    try {
      // Load school pack requests
      const stored = localStorage.getItem('schoolPackForms');
      if (stored) {
        const forms = JSON.parse(stored);
        const requests: SchoolPackRequest[] = forms.map((form: any, index: number) => ({
          request_id: `req-${index}-${form.timestamp}`,
          created_at: form.timestamp || new Date().toISOString(),
          school_name: form.schoolName || form.school || '',
          contact_name: form.contactName || form.name || '',
          role: form.role || '',
          email: form.email || '',
          year_group: form.yearGroup || '',
          device_type: form.deviceType || '',
          send_notes: form.sendNotes || null,
          status: 'new' as const,
        }));
        setSchoolPackRequests(requests);
      }

      // Load analytics data
      const analyticsEvents = JSON.parse(sessionStorage.getItem('analytics_events') || '[]');
      const sessions = new Map<string, any>();
      
      analyticsEvents.forEach((event: any) => {
        if (!sessions.has(event.session_id)) {
          sessions.set(event.session_id, {
            session_id: event.session_id,
            created_at: event.created_at,
            last_seen_at: event.created_at,
            device_type: event.meta?.device_type || 'unknown',
            browser: event.meta?.browser || 'unknown',
            browser_version: event.meta?.browser_version,
            country: event.meta?.country,
            referrer: event.meta?.referrer,
            utm_source: event.meta?.utm_source,
            utm_medium: event.meta?.utm_medium,
            utm_campaign: event.meta?.utm_campaign,
            landing_views: 0,
            try_demo_clicked: false,
            first_mode_started: null,
            total_play_time: 0,
            modes_played: [],
            errors_encountered: [],
            camera_permission_outcome: event.meta?.camera_permission_outcome,
          });
        }
        const session = sessions.get(event.session_id);
        session.last_seen_at = event.created_at;
        
        if (event.event_name === 'landing_view') session.landing_views++;
        if (event.event_name === 'demo_try_click') session.try_demo_clicked = true;
        if (event.event_name === 'mode_start' && !session.first_mode_started) {
          session.first_mode_started = event.created_at;
          if (event.mode) session.modes_played.push(event.mode);
        }
        if (event.event_name === 'system_error' || event.event_name === 'camera_permission_denied') {
          if (event.meta?.error_type) {
            session.errors_encountered.push(event.meta.error_type);
          }
        }
        if (event.meta?.time_on_page) {
          session.time_on_page = (session.time_on_page || 0) + (event.meta.time_on_page || 0);
        }
        if (event.meta?.demo_session_duration) {
          session.demo_session_duration = event.meta.demo_session_duration;
        }
      });

      const sessionArray = Array.from(sessions.values());
      const totalSessions = sessions.size;
      const mobileSessions = sessionArray.filter((s: any) => s.device_type === 'mobile').length;
      const totalErrors = analyticsEvents.filter((e: any) => 
        e.event_name === 'system_error' || e.event_name === 'camera_permission_denied'
      ).length;
      
      // Calculate average session duration
      const sessionsWithDuration = sessionArray.filter((s: any) => {
        const start = new Date(s.created_at).getTime();
        const end = new Date(s.last_seen_at).getTime();
        return (end - start) > 0;
      });
      const avgDuration = sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce((sum: number, s: any) => {
            const start = new Date(s.created_at).getTime();
            const end = new Date(s.last_seen_at).getTime();
            return sum + (end - start);
          }, 0) / sessionsWithDuration.length / 1000 // Convert to seconds
        : 0;

      // Calculate funnel metrics (reused for KPI data)
      const landingViews = analyticsEvents.filter((e: any) => e.event_name === 'landing_view').length;
      const tryDemoClicks = analyticsEvents.filter((e: any) => e.event_name === 'demo_try_click').length;
      const conversionRate = landingViews > 0 ? (tryDemoClicks / landingViews) * 100 : 0;

      setKpiData({
        total_visits: landingViews,
        unique_sessions: totalSessions,
        try_demo_clicks: tryDemoClicks,
        demo_sessions_started: sessionArray.filter((s: any) => s.try_demo_clicked).length,
        avg_session_duration: Math.round(avgDuration),
        conversion_rate: Math.round(conversionRate * 10) / 10,
        error_count: totalErrors,
        mobile_percentage: totalSessions > 0 ? Math.round((mobileSessions / totalSessions) * 100) : 0,
      });

      // Calculate funnel (reuse landingViews and tryDemoClicks from above)
      const loadingViews = analyticsEvents.filter((e: any) => e.event_name === 'demo_loading_view').length;
      const waveViews = analyticsEvents.filter((e: any) => e.event_name === 'demo_wave_screen_view').length;
      const modeSelectViews = analyticsEvents.filter((e: any) => e.event_name === 'demo_mode_select_view').length;
      const modeStarts = analyticsEvents.filter((e: any) => e.event_name === 'mode_start').length;
      const active30s = sessionArray.filter((s: any) => {
        const start = new Date(s.created_at).getTime();
        const end = new Date(s.last_seen_at).getTime();
        return (end - start) > 30000;
      }).length;

      setFunnelSteps([
        { name: 'Landing view', count: landingViews, percent_of_previous: 100, percent_of_total: 100 },
        { name: 'Try demo clicked', count: tryDemoClicks, percent_of_previous: landingViews > 0 ? (tryDemoClicks / landingViews) * 100 : 0, percent_of_total: landingViews > 0 ? (tryDemoClicks / landingViews) * 100 : 0 },
        { name: 'Loading screen viewed', count: loadingViews, percent_of_previous: tryDemoClicks > 0 ? (loadingViews / tryDemoClicks) * 100 : 0, percent_of_total: landingViews > 0 ? (loadingViews / landingViews) * 100 : 0 },
        { name: 'Wave start screen viewed', count: waveViews, percent_of_previous: loadingViews > 0 ? (waveViews / loadingViews) * 100 : 0, percent_of_total: landingViews > 0 ? (waveViews / landingViews) * 100 : 0 },
        { name: 'Mode selection viewed', count: modeSelectViews, percent_of_previous: waveViews > 0 ? (modeSelectViews / waveViews) * 100 : 0, percent_of_total: landingViews > 0 ? (modeSelectViews / landingViews) * 100 : 0 },
        { name: 'First mode started', count: modeStarts, percent_of_previous: modeSelectViews > 0 ? (modeStarts / modeSelectViews) * 100 : 0, percent_of_total: landingViews > 0 ? (modeStarts / landingViews) * 100 : 0 },
        { name: 'At least 30s active', count: active30s, percent_of_previous: modeStarts > 0 ? (active30s / modeStarts) * 100 : 0, percent_of_total: landingViews > 0 ? (active30s / landingViews) * 100 : 0 },
      ]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const startPolling = () => {
    const interval = setInterval(() => {
      loadData();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  };

  // Check if already authenticated (session in memory) with expiration
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_authenticated');
    const expiry = sessionStorage.getItem('admin_session_expiry');
    
    if (authStatus === 'true' && expiry) {
      const now = Date.now();
      const expiryTime = parseInt(expiry, 10);
      
      if (now < expiryTime) {
        setIsAuthenticated(true);
        loadData();
        const cleanup = startPolling();
        return cleanup;
      } else {
        // Session expired
        sessionStorage.removeItem('admin_authenticated');
        sessionStorage.removeItem('admin_session_expiry');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportCSV = () => {
    const csv = [
      ['Created', 'School', 'Contact Name', 'Role', 'Email', 'Year Group', 'Device', 'SEND Notes', 'Status'],
      ...schoolPackRequests.map(req => [
        new Date(req.created_at).toLocaleDateString(),
        req.school_name,
        req.contact_name,
        req.role,
        req.email,
        req.year_group,
        req.device_type,
        req.send_notes || '',
        req.status,
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school-pack-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = (requestId: string, newStatus: 'new' | 'contacted' | 'closed') => {
    setSchoolPackRequests(prev => 
      prev.map(req => req.request_id === requestId ? { ...req, status: newStatus } : req)
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <h1>Admin Dashboard</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-left">
          <a href="/" className="admin-logo-link">
            <img 
              src="https://i.postimg.cc/d3nR91sy/logo.png" 
              alt="Draw In The Air" 
              className="admin-logo"
            />
          </a>
          <h1 className="admin-title">Admin</h1>
        </div>
        <div className="admin-header-right">
          <span className="admin-timestamp">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button onClick={loadData} className="admin-btn admin-btn-secondary">
            Refresh
          </button>
          <button onClick={handleExportCSV} className="admin-btn admin-btn-secondary">
            Export CSV
          </button>
          <button onClick={handleLogout} className="admin-btn admin-btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* KPI Strip - Compact and Dense */}
        <div className="admin-kpi-strip">
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <div className="admin-kpi-value">{kpiData.total_visits.toLocaleString()}</div>
              <span className="admin-kpi-trend">↗</span>
            </div>
            <div className="admin-kpi-label">Total Visits</div>
          </div>
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <div className="admin-kpi-value">{kpiData.unique_sessions.toLocaleString()}</div>
            </div>
            <div className="admin-kpi-label">Unique Sessions</div>
            <div className="admin-kpi-meta">{kpiData.mobile_percentage}% mobile</div>
          </div>
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <div className="admin-kpi-value">{kpiData.conversion_rate}%</div>
            </div>
            <div className="admin-kpi-label">Conversion Rate</div>
            <div className="admin-kpi-meta">{kpiData.try_demo_clicks} clicks</div>
          </div>
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <div className="admin-kpi-value">{kpiData.avg_session_duration}s</div>
            </div>
            <div className="admin-kpi-label">Avg Session</div>
            <div className="admin-kpi-meta">{kpiData.demo_sessions_started} started</div>
          </div>
          <div className="admin-kpi-card admin-kpi-card-error">
            <div className="admin-kpi-header">
              <div className="admin-kpi-value">{kpiData.error_count}</div>
            </div>
            <div className="admin-kpi-label">Errors</div>
          </div>
        </div>

        {/* Funnel */}
        <div className="admin-section">
          <h2 className="admin-section-title">Demo funnel</h2>
          <div className="admin-funnel">
            {funnelSteps.map((step, index) => (
              <div key={index} className="admin-funnel-step">
                <div className="admin-funnel-step-header">
                  <span className="admin-funnel-step-name">{step.name}</span>
                  <span className="admin-funnel-step-count">{step.count}</span>
                </div>
                <div className="admin-funnel-step-bar">
                  <div 
                    className="admin-funnel-step-fill"
                    style={{ width: `${step.percent_of_total}%` }}
                  />
                </div>
                <div className="admin-funnel-step-meta">
                  <span className="admin-funnel-conversion">{step.percent_of_previous.toFixed(1)}% conversion</span>
                  <span className="admin-funnel-total">{step.percent_of_total.toFixed(1)}% of total</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* School Pack Requests */}
        <div className="admin-section">
          <h2 className="admin-section-title">School pack requests</h2>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>School</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Year Group</th>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schoolPackRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="admin-table-empty">
                      No requests yet
                    </td>
                  </tr>
                ) : (
                  schoolPackRequests.map((req) => (
                    <tr key={req.request_id}>
                      <td>{new Date(req.created_at).toLocaleDateString()}</td>
                      <td>{req.school_name}</td>
                      <td>{req.contact_name}</td>
                      <td>{req.role}</td>
                      <td>{req.email}</td>
                      <td>{req.year_group || '-'}</td>
                      <td>{req.device_type || '-'}</td>
                      <td>
                        <span className={`admin-status admin-status-${req.status}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowDrawer(true);
                            }}
                            className="admin-btn admin-btn-small"
                          >
                            View
                          </button>
                          {req.status !== 'contacted' && (
                            <button
                              onClick={() => handleStatusChange(req.request_id, 'contacted')}
                              className="admin-btn admin-btn-small"
                            >
                              Mark Contacted
                            </button>
                          )}
                          {req.status !== 'closed' && (
                            <button
                              onClick={() => handleStatusChange(req.request_id, 'closed')}
                              className="admin-btn admin-btn-small"
                            >
                              Close
                            </button>
                          )}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(req.email);
                            }}
                            className="admin-btn admin-btn-small"
                          >
                            Copy Email
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {showDrawer && selectedRequest && (
        <div className="admin-drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <button 
              className="admin-drawer-close"
              onClick={() => setShowDrawer(false)}
            >
              ×
            </button>
            <h2>Request Details</h2>
            <div className="admin-drawer-content">
              <div className="admin-drawer-field">
                <label>School Name</label>
                <div>{selectedRequest.school_name}</div>
              </div>
              <div className="admin-drawer-field">
                <label>Contact Name</label>
                <div>{selectedRequest.contact_name}</div>
              </div>
              <div className="admin-drawer-field">
                <label>Role</label>
                <div>{selectedRequest.role}</div>
              </div>
              <div className="admin-drawer-field">
                <label>Email</label>
                <div>
                  <a href={`mailto:${selectedRequest.email}`}>{selectedRequest.email}</a>
                </div>
              </div>
              <div className="admin-drawer-field">
                <label>Year Group</label>
                <div>{selectedRequest.year_group || '-'}</div>
              </div>
              <div className="admin-drawer-field">
                <label>Device Type</label>
                <div>{selectedRequest.device_type || '-'}</div>
              </div>
              {selectedRequest.send_notes && (
                <div className="admin-drawer-field">
                  <label>SEND Notes</label>
                  <div>{selectedRequest.send_notes}</div>
                </div>
              )}
              <div className="admin-drawer-field">
                <label>Created</label>
                <div>{new Date(selectedRequest.created_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

