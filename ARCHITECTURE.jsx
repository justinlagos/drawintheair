import { useState } from "react";

const COLORS = {
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceHover: "#334155",
  border: "#334155",
  borderLight: "#475569",
  primary: "#8B5CF6",
  primaryLight: "#A78BFA",
  primaryDim: "#7C3AED",
  accent: "#06B6D4",
  accentLight: "#22D3EE",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textDim: "#64748B",
};

// ─── Tiny Icon Components ────────────────────────────────
const Icon = ({ children, size = 16, color = COLORS.textMuted }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const Icons = {
  Route: (p) => <Icon {...p}><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/></Icon>,
  Users: (p) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  Student: (p) => <Icon {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>,
  Dashboard: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Icon>,
  School: (p) => <Icon {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>,
  Analytics: (p) => <Icon {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Icon>,
  Admin: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>,
  Privacy: (p) => <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>,
  AI: (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>,
  Data: (p) => <Icon {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></Icon>,
  Check: (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>,
  X: (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>,
  Arrow: (p) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>,
};

// ─── Shared Components ───────────────────────────────────
const Badge = ({ children, color = COLORS.primary }) => (
  <span style={{
    display: "inline-block", padding: "2px 8px", borderRadius: 9999,
    fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
    background: color + "22", color: color, border: `1px solid ${color}44`,
  }}>{children}</span>
);

const RoleBadge = ({ role }) => {
  const map = {
    public: { color: COLORS.textMuted, label: "Public" },
    student: { color: COLORS.accentLight, label: "Student" },
    teacher: { color: COLORS.success, label: "Teacher" },
    "teacher-pro": { color: COLORS.primary, label: "Teacher Pro" },
    school: { color: COLORS.warning, label: "School Admin" },
    admin: { color: COLORS.danger, label: "Platform Admin" },
  };
  const m = map[role] || map.public;
  return <Badge color={m.color}>{m.label}</Badge>;
};

const Card = ({ children, style = {} }) => (
  <div style={{
    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 12, padding: 20, ...style,
  }}>{children}</div>
);

const SectionTitle = ({ icon: Ic, title, subtitle }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
      {Ic && <Ic size={20} color={COLORS.primary} />}
      <h2 style={{ margin: 0, fontSize: 22, color: COLORS.text, fontWeight: 700 }}>{title}</h2>
    </div>
    {subtitle && <p style={{ margin: 0, fontSize: 14, color: COLORS.textMuted, marginLeft: 30 }}>{subtitle}</p>}
  </div>
);

const DataFlowArrow = ({ from, to }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, color: COLORS.textMuted }}>
    <span style={{ color: COLORS.accentLight, fontWeight: 600, minWidth: 120 }}>{from}</span>
    <span style={{ color: COLORS.primaryLight }}>→</span>
    <span>{to}</span>
  </div>
);

// ─── Route Table ─────────────────────────────────────────
const RouteRow = ({ path, purpose, role, data }) => (
  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 13, color: COLORS.accentLight, whiteSpace: "nowrap" }}>{path}</td>
    <td style={{ padding: "10px 12px", fontSize: 13, color: COLORS.text }}>{purpose}</td>
    <td style={{ padding: "10px 12px" }}><RoleBadge role={role} /></td>
    <td style={{ padding: "10px 12px", fontSize: 12, color: COLORS.textMuted }}>{data}</td>
  </tr>
);

const RouteTable = ({ routes }) => (
  <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: COLORS.surface, borderBottom: `2px solid ${COLORS.border}` }}>
          {["Route", "Purpose", "Access", "Data Used"].map(h => (
            <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: COLORS.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{routes.map((r, i) => <RouteRow key={i} {...r} />)}</tbody>
    </table>
  </div>
);

// ─── Permission Matrix ───────────────────────────────────
const PermCell = ({ allowed }) => (
  <td style={{ padding: "8px 12px", textAlign: "center" }}>
    {allowed ? <Icons.Check size={14} color={COLORS.success} /> : <Icons.X size={14} color={COLORS.textDim} />}
  </td>
);

// ─── SECTIONS ────────────────────────────────────────────

function Part1_Routing() {
  const [group, setGroup] = useState("public");
  const groups = {
    public: {
      label: "Public & Marketing",
      routes: [
        { path: "/", purpose: "Landing page — hero, demo video, CTA", role: "public", data: "None" },
        { path: "/about", purpose: "Mission, team, story", role: "public", data: "None" },
        { path: "/how-it-works", purpose: "Product explainer with video demos", role: "public", data: "None" },
        { path: "/activities", purpose: "Activity catalogue (9 modes)", role: "public", data: "Static activity metadata" },
        { path: "/activities/:slug", purpose: "Individual activity detail page", role: "public", data: "Activity config, demo media" },
        { path: "/for-teachers", purpose: "Teacher-focused landing page", role: "public", data: "None" },
        { path: "/for-parents", purpose: "Parent-focused landing page", role: "public", data: "None" },
        { path: "/for-schools", purpose: "School/district sales page", role: "public", data: "None" },
        { path: "/pricing", purpose: "Free / Pro / School tier comparison", role: "public", data: "Pricing config" },
        { path: "/resources", purpose: "Teaching resources, guides, downloads", role: "public", data: "CMS content" },
        { path: "/learn", purpose: "Blog / article index", role: "public", data: "CMS content" },
        { path: "/learn/:slug", purpose: "Individual blog article", role: "public", data: "CMS content" },
        { path: "/privacy", purpose: "Privacy policy", role: "public", data: "None" },
        { path: "/terms", purpose: "Terms of service", role: "public", data: "None" },
        { path: "/safeguarding", purpose: "Child safeguarding policy", role: "public", data: "None" },
        { path: "/accessibility", purpose: "Accessibility statement", role: "public", data: "None" },
        { path: "/cookies", purpose: "Cookie policy", role: "public", data: "None" },
        { path: "/press", purpose: "Press kit and media assets", role: "public", data: "None" },
        { path: "/embed", purpose: "Embed widget for partner sites", role: "public", data: "None" },
      ],
    },
    play: {
      label: "Free Play (No Auth)",
      routes: [
        { path: "/play", purpose: "Game launcher — onboarding + mode selection", role: "public", data: "Local state only" },
        { path: "/play/:mode", purpose: "Direct link to specific activity", role: "public", data: "Activity config" },
        { path: "/free-paint", purpose: "Direct entry to Free Paint mode", role: "public", data: "Local canvas state" },
        { path: "/trace-:target", purpose: "Direct entry to tracing (letter/number/shape)", role: "public", data: "Tracing template SVG" },
        { path: "/demo", purpose: "30-second auto-playing demo", role: "public", data: "Demo script" },
      ],
    },
    student: {
      label: "Student (Anonymous)",
      routes: [
        { path: "/join", purpose: "Session code entry screen", role: "student", data: "None (input only)" },
        { path: "/join/:sessionCode", purpose: "Deep-link join with pre-filled code", role: "student", data: "Session code in URL" },
        { path: "/lobby/:sessionId", purpose: "Waiting room after joining", role: "student", data: "Session status (realtime)" },
        { path: "/activity/:sessionId", purpose: "Live gameplay during round", role: "student", data: "Activity config, session state, timer" },
        { path: "/activity/:sessionId/results", purpose: "Student's own results after round", role: "student", data: "Own score, stars, rank" },
      ],
    },
    teacher: {
      label: "Teacher (Free + Pro)",
      routes: [
        { path: "/auth/login", purpose: "Google OAuth login flow", role: "teacher", data: "OAuth redirect" },
        { path: "/auth/callback", purpose: "OAuth callback handler", role: "teacher", data: "Auth tokens" },
        { path: "/dashboard", purpose: "Teacher home — overview + quick actions", role: "teacher", data: "Recent sessions, stats" },
        { path: "/dashboard/sessions", purpose: "Full session history with filters", role: "teacher-pro", data: "All teacher sessions" },
        { path: "/dashboard/sessions/:id", purpose: "Detailed session replay & analytics", role: "teacher-pro", data: "Session + scores + rounds" },
        { path: "/dashboard/analytics", purpose: "Engagement analytics & trends", role: "teacher-pro", data: "Aggregated session data" },
        { path: "/dashboard/analytics/activities", purpose: "Per-activity performance breakdown", role: "teacher-pro", data: "Activity-level aggregates" },
        { path: "/dashboard/analytics/engagement", purpose: "Student engagement patterns", role: "teacher-pro", data: "Engagement metrics" },
        { path: "/dashboard/insights", purpose: "AI-powered recommendations", role: "teacher-pro", data: "All analytics + Claude API" },
        { path: "/dashboard/playlists", purpose: "Saved activity sequences", role: "teacher-pro", data: "Playlist configs" },
        { path: "/dashboard/playlists/:id", purpose: "Edit/view specific playlist", role: "teacher-pro", data: "Playlist + activities" },
        { path: "/dashboard/settings", purpose: "Account, preferences, subscription", role: "teacher", data: "User profile" },
        { path: "/dashboard/upgrade", purpose: "Free → Pro upgrade page", role: "teacher", data: "Pricing, Stripe checkout" },
        { path: "/classroom/start", purpose: "Activity picker + session config", role: "teacher-pro", data: "Activity catalogue" },
        { path: "/classroom/:sessionId", purpose: "Live session control hub", role: "teacher-pro", data: "Session state (realtime)" },
        { path: "/classroom/:sessionId/lobby", purpose: "Student join waiting room (teacher view)", role: "teacher-pro", data: "Student list (realtime)" },
        { path: "/classroom/:sessionId/round", purpose: "Live round — leaderboard + timer", role: "teacher-pro", data: "Scores (realtime)" },
        { path: "/classroom/:sessionId/results", purpose: "Round results — podium + stats", role: "teacher-pro", data: "Round scores, stars" },
      ],
    },
    school: {
      label: "School Admin",
      routes: [
        { path: "/school/signup", purpose: "School registration + Stripe billing", role: "school", data: "Org details, payment" },
        { path: "/school/onboarding", purpose: "Post-signup setup wizard", role: "school", data: "School config" },
        { path: "/school/dashboard", purpose: "School overview — adoption + usage", role: "school", data: "Aggregated teacher/session data" },
        { path: "/school/teachers", purpose: "Teacher roster management", role: "school", data: "Teacher list, seats" },
        { path: "/school/teachers/invite", purpose: "Email invite flow for teachers", role: "school", data: "Invitation tokens" },
        { path: "/school/analytics", purpose: "School-wide analytics dashboard", role: "school", data: "Aggregated: sessions, students, activities" },
        { path: "/school/analytics/teachers", purpose: "Per-teacher usage breakdown", role: "school", data: "Teacher-level aggregates" },
        { path: "/school/analytics/activities", purpose: "Activity popularity & effectiveness", role: "school", data: "Activity aggregates" },
        { path: "/school/settings", purpose: "School profile, billing, preferences", role: "school", data: "School config" },
        { path: "/school/billing", purpose: "Subscription management, invoices", role: "school", data: "Stripe billing portal" },
      ],
    },
    admin: {
      label: "Platform Admin",
      routes: [
        { path: "/admin", purpose: "Platform command center", role: "admin", data: "System-wide metrics" },
        { path: "/admin/platform", purpose: "Live platform health dashboard", role: "admin", data: "Active sessions, load, errors" },
        { path: "/admin/analytics", purpose: "Global analytics & trends", role: "admin", data: "All platform data (aggregated)" },
        { path: "/admin/analytics/engagement", purpose: "Platform-wide engagement analysis", role: "admin", data: "Session/activity aggregates" },
        { path: "/admin/analytics/growth", purpose: "User acquisition & retention", role: "admin", data: "Teacher signup, school growth" },
        { path: "/admin/analytics/activities", purpose: "Activity performance comparison", role: "admin", data: "Activity-level platform stats" },
        { path: "/admin/users", purpose: "Teacher & school account browser", role: "admin", data: "User records (no student data)" },
        { path: "/admin/users/:id", purpose: "Individual teacher/school detail", role: "admin", data: "Account + usage data" },
        { path: "/admin/schools", purpose: "School account management", role: "admin", data: "School records + licenses" },
        { path: "/admin/sessions", purpose: "Live + historical session browser", role: "admin", data: "All sessions metadata" },
        { path: "/admin/insights", purpose: "AI-generated platform intelligence", role: "admin", data: "All analytics + Claude API" },
        { path: "/admin/system", purpose: "System health, logs, config", role: "admin", data: "Supabase metrics, edge functions" },
        { path: "/admin/billing", purpose: "Revenue dashboard, subscriptions", role: "admin", data: "Stripe data" },
        { path: "/admin/content", purpose: "Activity & content management", role: "admin", data: "Activity configs" },
      ],
    },
  };

  return (
    <div>
      <SectionTitle icon={Icons.Route} title="Part 1 — Complete Routing Structure" subtitle="68 routes across 6 role groups. Click a group to explore." />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {Object.entries(groups).map(([key, g]) => (
          <button key={key} onClick={() => setGroup(key)} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${group === key ? COLORS.primary : COLORS.border}`,
            background: group === key ? COLORS.primary + "22" : "transparent",
            color: group === key ? COLORS.primaryLight : COLORS.textMuted,
            cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>
            {g.label} <span style={{ opacity: 0.6 }}>({g.routes.length})</span>
          </button>
        ))}
      </div>
      <RouteTable routes={groups[group].routes} />

      <Card style={{ marginTop: 24 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15, color: COLORS.primaryLight }}>Routing Architecture Decision</h3>
        <p style={{ margin: "0 0 8px", fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
          <strong style={{ color: COLORS.text }}>Hybrid approach:</strong> The platform splits into two deployment surfaces:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <Card style={{ background: COLORS.bg }}>
            <Badge color={COLORS.accent}>Next.js (SSR)</Badge>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              Public marketing pages, SEO content, blog, legal pages, dashboards, school portal, admin panel.
              Server-side rendering for SEO. API routes for Stripe webhooks, Claude API proxy, email invites.
              Middleware for auth guards and role-based access.
            </p>
          </Card>
          <Card style={{ background: COLORS.bg }}>
            <Badge color={COLORS.success}>Vite SPA (Client)</Badge>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              Game engine at /play/*, student join at /join/*, classroom live at /classroom/:id/*.
              Preserves existing hand-tracking, canvas rendering, MediaPipe integration.
              Optimized for low-latency interaction. No SSR needed — pure client-side.
            </p>
          </Card>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>
          The Next.js app embeds the Vite SPA via an iframe or micro-frontend bridge for /play and /join routes,
          or the two apps share a domain with path-based routing at the CDN/reverse proxy level (/play/* and /join/* → Vite, everything else → Next.js).
        </p>
      </Card>
    </div>
  );
}

function Part2_Roles() {
  const roles = [
    { name: "Anonymous Student", auth: "None", id: "Session-scoped UUID", color: COLORS.accentLight },
    { name: "Free Teacher", auth: "Google OAuth", id: "Supabase Auth UID", color: COLORS.success },
    { name: "Teacher Pro", auth: "Google OAuth + Stripe", id: "Supabase Auth UID", color: COLORS.primary },
    { name: "School Admin", auth: "Google OAuth + School signup", id: "Supabase Auth UID + org_id", color: COLORS.warning },
    { name: "Platform Admin", auth: "Google OAuth + admin flag", id: "Supabase Auth UID + is_admin", color: COLORS.danger },
  ];

  const perms = [
    { action: "Play activities (free play)", student: true, free: true, pro: true, school: true, admin: true },
    { action: "Join classroom session", student: true, free: false, pro: false, school: false, admin: false },
    { action: "View own round results", student: true, free: false, pro: false, school: false, admin: false },
    { action: "Create classroom sessions", student: false, free: false, pro: true, school: true, admin: true },
    { action: "View session history", student: false, free: true, pro: true, school: true, admin: true },
    { action: "View classroom analytics", student: false, free: false, pro: true, school: true, admin: true },
    { action: "View AI insights", student: false, free: false, pro: true, school: true, admin: true },
    { action: "Create activity playlists", student: false, free: false, pro: true, school: true, admin: true },
    { action: "Manage teacher roster", student: false, free: false, pro: false, school: true, admin: true },
    { action: "View school-wide analytics", student: false, free: false, pro: false, school: true, admin: true },
    { action: "Invite teachers via email", student: false, free: false, pro: false, school: true, admin: true },
    { action: "Manage school billing", student: false, free: false, pro: false, school: true, admin: true },
    { action: "View platform analytics", student: false, free: false, pro: false, school: false, admin: true },
    { action: "Manage all users", student: false, free: false, pro: false, school: false, admin: true },
    { action: "View system health", student: false, free: false, pro: false, school: false, admin: true },
    { action: "Access AI platform intelligence", student: false, free: false, pro: false, school: false, admin: true },
  ];

  return (
    <div>
      <SectionTitle icon={Icons.Users} title="Part 2 — Role Architecture" subtitle="5 roles with progressive permission escalation. Students remain fully anonymous." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        {roles.map(r => (
          <Card key={r.name} style={{ borderLeft: `3px solid ${r.color}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: r.color, marginBottom: 6 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Auth: {r.auth}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Identity: {r.id}</div>
          </Card>
        ))}
      </div>

      <h3 style={{ fontSize: 15, color: COLORS.primaryLight, marginBottom: 12 }}>Permission Matrix</h3>
      <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: COLORS.surface, borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ padding: "8px 12px", textAlign: "left", color: COLORS.textMuted, fontSize: 11, fontWeight: 600 }}>Permission</th>
              {["Student", "Free Teacher", "Pro Teacher", "School Admin", "Admin"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "center", color: COLORS.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perms.map((p, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: "8px 12px", color: COLORS.text, fontSize: 12 }}>{p.action}</td>
                <PermCell allowed={p.student} />
                <PermCell allowed={p.free} />
                <PermCell allowed={p.pro} />
                <PermCell allowed={p.school} />
                <PermCell allowed={p.admin} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card style={{ marginTop: 20 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, color: COLORS.warning }}>Role Inheritance Model</h3>
        <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
          School License teachers automatically inherit all Teacher Pro permissions. The <code style={{ background: COLORS.bg, padding: "2px 6px", borderRadius: 4, color: COLORS.accentLight }}>teacher_profiles.tier</code> column
          is set to <code style={{ background: COLORS.bg, padding: "2px 6px", borderRadius: 4, color: COLORS.accentLight }}>'pro'</code> when the teacher belongs to an active school with a valid license, even if they haven't subscribed individually.
          This is enforced via a Supabase database function that checks school membership on every session creation.
        </p>
      </Card>
    </div>
  );
}

function Part3_StudentAccess() {
  const steps = [
    { time: "0s", action: "Student opens /join", detail: "Large, child-friendly UI. Single input field. No keyboard needed on touch devices — on-screen numpad." },
    { time: "3s", action: "Enters 4-digit session code", detail: "Auto-validates on 4th digit. Queries sessions table (code + status != ended). Shows activity name and teacher name on match." },
    { time: "6s", action: "Enters first name", detail: "Single text field, max 20 chars. Auto-deduplication (appends 2, 3... if name exists in session). No email, no password, no account." },
    { time: "8s", action: "Taps 'Join'", detail: "Creates session_students row. Subscribes to session realtime channel. Transitions to lobby." },
    { time: "9s", action: "In lobby, waiting", detail: "Fun animation (floating shapes). Shows 'Waiting for teacher to start...' and student count. Realtime status listener." },
    { time: "10s", action: "Teacher starts round → gameplay begins", detail: "Session status changes to 'playing'. Student auto-transitions to /activity/:sessionId. Game loads with activity config." },
  ];

  return (
    <div>
      <SectionTitle icon={Icons.Student} title="Part 3 — Student Access System" subtitle="Join a classroom in under 10 seconds. Zero accounts. Zero friction." />

      <h3 style={{ fontSize: 15, color: COLORS.primaryLight, marginBottom: 12 }}>10-Second Join Flow</h3>
      <div style={{ position: "relative", paddingLeft: 28 }}>
        <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2, background: `linear-gradient(${COLORS.accent}, ${COLORS.primary})` }} />
        {steps.map((s, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 16 }}>
            <div style={{
              position: "absolute", left: -28, top: 2, width: 22, height: 22, borderRadius: "50%",
              background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: COLORS.text,
            }}>{i + 1}</div>
            <Card style={{ background: COLORS.bg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: COLORS.text, fontSize: 13 }}>{s.action}</span>
                <Badge color={COLORS.accent}>{s.time}</Badge>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>{s.detail}</div>
            </Card>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <Card>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: COLORS.accentLight }}>Session State Machine</h3>
          <div style={{ fontFamily: "monospace", fontSize: 12, color: COLORS.textMuted, lineHeight: 1.8 }}>
            <div><span style={{ color: COLORS.success }}>lobby</span> → teacher clicks "Start Round"</div>
            <div><span style={{ color: COLORS.warning }}>playing</span> → timer expires OR teacher ends</div>
            <div><span style={{ color: COLORS.primary }}>results</span> → teacher picks next action</div>
            <div><span style={{ color: COLORS.textDim }}>ended</span> → session complete (terminal)</div>
            <div style={{ marginTop: 8, color: COLORS.textDim }}>
              results → lobby (next round)<br/>
              results → ended (session over)
            </div>
          </div>
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: COLORS.accentLight }}>Cross-Device Support</h3>
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.8 }}>
            <div><strong style={{ color: COLORS.text }}>Chromebooks:</strong> Primary target. Touch + keyboard. Camera access via getUserMedia.</div>
            <div><strong style={{ color: COLORS.text }}>Tablets (iPad/Android):</strong> Touch-only. On-screen numpad for code entry. Fullscreen prompt.</div>
            <div><strong style={{ color: COLORS.text }}>Desktop:</strong> Mouse + keyboard. Standard webcam. Best performance tier.</div>
            <div style={{ marginTop: 8, color: COLORS.textDim }}>
              All devices: responsive layout, 44px min touch targets, no hover-dependent interactions.
            </div>
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, color: COLORS.warning }}>Deep-Link Join</h3>
        <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
          Teachers can share <code style={{ background: COLORS.bg, padding: "2px 6px", borderRadius: 4, color: COLORS.accentLight }}>drawintheair.com/join/4829</code> directly.
          The code auto-fills, student only needs to enter their name. This enables QR code projection on classroom screens — scan → name → play in 5 seconds.
        </p>
      </Card>
    </div>
  );
}

function Part4_TeacherDashboard() {
  const sections = [
    {
      title: "Overview Panel",
      color: COLORS.primary,
      items: [
        "Total sessions run (all time + this week/month)",
        "Total students engaged (session-based count, not unique identities)",
        "Average engagement time per session",
        "Most popular activity this month",
        "Streak indicator (consecutive days/weeks with sessions)",
        "Quick-start button → /classroom/start",
      ],
    },
    {
      title: "Session History & Replay",
      color: COLORS.accent,
      items: [
        "Full session list with filters (date range, activity, min students)",
        "Each session expandable: rounds played, student count, avg stars, duration",
        "Per-round breakdown: individual scores, star distribution, completion rate",
        "Session comparison: overlay two sessions side-by-side",
        "Export session data as CSV (aggregated, no student names)",
      ],
    },
    {
      title: "Activity Analytics",
      color: COLORS.success,
      items: [
        "Activity usage chart (bar/pie): which activities used most",
        "Per-activity metrics: avg completion %, avg stars, avg duration",
        "Difficulty curve: how scores change across rounds within a session",
        "Drop-off analysis: at what point do students disengage",
        "Activity comparison matrix: engagement vs difficulty vs completion",
      ],
    },
    {
      title: "Engagement Intelligence",
      color: COLORS.warning,
      items: [
        "Average participation rate (students active vs joined)",
        "Star distribution curves (how many 1-star vs 5-star outcomes)",
        "Optimal round duration analysis (when does engagement peak/drop)",
        "Time-of-day heatmap (when do you run most sessions)",
        "Week-over-week engagement trend line",
      ],
    },
    {
      title: "Lesson Tools",
      color: COLORS.primaryLight,
      items: [
        "Start Class Mode → activity picker → session config → generate code",
        "Activity Playlists: save ordered sequences of activities for a lesson plan",
        "Session presets: save timer duration, max students, activity combos",
        "QR code generator for session join links",
        "Projected display mode (large code + student list for classroom screen)",
      ],
    },
    {
      title: "AI Recommendations",
      color: COLORS.danger,
      items: [
        "Auto-generated insights powered by Claude API",
        "\"Bubble Pop has 3x higher engagement than Word Search for your classes\"",
        "\"Sessions under 60 seconds per round show 22% better completion\"",
        "\"Students drop off after 3 consecutive rounds — consider activity changes\"",
        "\"Try Rainbow Bridge next — similar difficulty to your most-used activities\"",
        "Weekly email digest of top 3 insights (optional)",
      ],
    },
  ];

  return (
    <div>
      <SectionTitle icon={Icons.Dashboard} title="Part 4 — Teacher Pro Dashboard" subtitle="Mission control for classroom engagement. 6 core sections turning data into action." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {sections.map((s, i) => (
          <Card key={i} style={{ borderTop: `3px solid ${s.color}` }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: s.color }}>{s.title}</h3>
            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.8 }}>
              {s.items.map((item, j) => (
                <div key={j} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: s.color, flexShrink: 0 }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 20, borderLeft: `3px solid ${COLORS.danger}` }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, color: COLORS.danger }}>AI Insight Engine (Teacher-Level)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
          A Supabase Edge Function runs weekly (or on-demand) per teacher. It aggregates their session data into a structured summary,
          sends it to the Claude API with a system prompt designed for educational analytics, and stores the generated insights
          in an <code style={{ background: COLORS.bg, padding: "2px 6px", borderRadius: 4, color: COLORS.accentLight }}>teacher_insights</code> table.
        </p>
        <div style={{ fontFamily: "monospace", fontSize: 11, background: COLORS.bg, padding: 12, borderRadius: 8, color: COLORS.textMuted, lineHeight: 1.6 }}>
          {`// Insight generation pipeline
1. Supabase cron (pg_cron) → triggers edge function weekly
2. Edge function queries: sessions, round_scores (last 30 days)
3. Aggregates into summary JSON (no student names)
4. Calls Claude API with education-analytics system prompt
5. Stores structured insights in teacher_insights table
6. Dashboard fetches & renders latest insights`}
        </div>
      </Card>
    </div>
  );
}

function Part5_SchoolDashboard() {
  return (
    <div>
      <SectionTitle icon={Icons.School} title="Part 5 — School Dashboard" subtitle="Multi-teacher management. Aggregated analytics. Zero child data." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          { title: "Signup Flow", color: COLORS.accent, items: [
            "Self-serve registration at /school/signup",
            "School name, admin email (Google OAuth)",
            "Stripe Checkout for annual license",
            "Choose seat count (5/10/25/50/unlimited)",
            "Instant activation on payment success",
            "Onboarding wizard: invite first teachers",
          ]},
          { title: "Teacher Management", color: COLORS.success, items: [
            "Invite via email (sends magic link)",
            "Teacher accepts → auto-assigned Pro tier",
            "Seat usage tracker (X / N seats used)",
            "Remove teacher (reverts to Free tier)",
            "Bulk invite via CSV upload",
            "Teacher activity status (active/inactive)",
          ]},
          { title: "School Analytics", color: COLORS.warning, items: [
            "Total sessions run (all teachers combined)",
            "Total students reached (session-based count)",
            "Teacher adoption rate (% of seats active)",
            "Most popular activities across school",
            "Sessions per week trend chart",
            "Per-teacher usage comparison (no student data)",
          ]},
        ].map((s, i) => (
          <Card key={i} style={{ borderTop: `3px solid ${s.color}` }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, color: s.color }}>{s.title}</h3>
            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.8 }}>
              {s.items.map((item, j) => (
                <div key={j} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
                  <span style={{ color: s.color, flexShrink: 0 }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: COLORS.primaryLight }}>School Data Model</h3>
        <div style={{ fontFamily: "monospace", fontSize: 11, background: COLORS.bg, padding: 16, borderRadius: 8, color: COLORS.textMuted, lineHeight: 1.6 }}>
{`schools
├── id (UUID)
├── name (text)
├── admin_user_id (FK → auth.users)
├── stripe_customer_id (text)
├── stripe_subscription_id (text)
├── license_tier ('starter_5' | 'standard_10' | 'premium_25' | 'unlimited')
├── license_status ('active' | 'past_due' | 'cancelled')
├── max_seats (int)
├── created_at (timestamptz)
└── academic_year_end (date)

school_teachers (junction)
├── school_id (FK → schools)
├── teacher_id (FK → auth.users)
├── role ('teacher' | 'school_admin')
├── invited_by (FK → auth.users)
├── invited_at (timestamptz)
├── accepted_at (timestamptz, nullable)
└── status ('invited' | 'active' | 'removed')`}
        </div>
      </Card>
    </div>
  );
}

function Part6_Analytics() {
  return (
    <div>
      <SectionTitle icon={Icons.Analytics} title="Part 6 — Analytics Engine & Data Schema" subtitle="Session-based, anonymised, privacy-first. All data flows through Supabase." />

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: COLORS.accentLight }}>Complete Database Schema</h3>
        <div style={{ fontFamily: "monospace", fontSize: 11, background: COLORS.bg, padding: 16, borderRadius: 8, color: COLORS.textMuted, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
{`── EXISTING (extended) ──────────────────────────────

sessions (extended)
├── id (UUID, PK)
├── code (text, 4-digit, unique among active)
├── teacher_id (FK → auth.users)
├── activity (game_mode_id enum)
├── status ('lobby' | 'playing' | 'results' | 'ended')
├── round (int, default 1)
├── timer_seconds (int, default 90)
├── max_students (int)
├── created_at (timestamptz)
├── ended_at (timestamptz, nullable)
├── + school_id (FK → schools, nullable)          ← NEW
├── + playlist_id (FK → playlists, nullable)       ← NEW
└── + metadata (jsonb: {device_breakdown, ...})    ← NEW

session_students (unchanged)
├── id (UUID, PK)
├── session_id (FK → sessions)
├── name (text, first name only, max 20)
└── joined_at (timestamptz)

round_scores (extended)
├── id (UUID, PK)
├── session_id (FK → sessions)
├── student_id (FK → session_students)
├── round (int)
├── stars (1-5)
├── raw_score (numeric)
├── activity (game_mode_id)
├── + duration_seconds (int)                       ← NEW
└── + completed (boolean)                          ← NEW

── NEW TABLES ──────────────────────────────────────

teacher_profiles
├── user_id (FK → auth.users, PK)
├── display_name (text)
├── avatar_url (text)
├── tier ('free' | 'pro')
├── stripe_customer_id (text, nullable)
├── stripe_subscription_id (text, nullable)
├── school_id (FK → schools, nullable)
├── onboarded_at (timestamptz, nullable)
├── settings (jsonb: {default_timer, max_students, ...})
└── created_at (timestamptz)

schools (see Part 5)

school_teachers (see Part 5)

playlists
├── id (UUID, PK)
├── teacher_id (FK → auth.users)
├── name (text)
├── description (text, nullable)
├── activities (jsonb[]: [{mode, timer, config}])
├── is_public (boolean, default false)
└── created_at (timestamptz)

teacher_insights
├── id (UUID, PK)
├── teacher_id (FK → auth.users)
├── insight_type ('engagement' | 'activity' | 'timing' | 'recommendation')
├── title (text)
├── body (text, Claude-generated)
├── data_snapshot (jsonb, the input data)
├── severity ('info' | 'suggestion' | 'warning')
├── generated_at (timestamptz)
├── dismissed_at (timestamptz, nullable)
└── expires_at (timestamptz)

platform_insights (admin-level, same structure)

── ANALYTICS VIEWS (Postgres) ──────────────────────

v_teacher_session_stats
  → sessions per teacher, grouped by week/month
  → avg students per session, avg duration, total rounds

v_activity_performance
  → per-activity: avg stars, avg completion %, avg duration
  → grouped by teacher, school, or platform-wide

v_engagement_metrics
  → participation rate, drop-off points, star distribution
  → time-of-day heatmap data

v_school_overview
  → per-school: teacher count, session count, student reach
  → activity popularity, adoption rate

v_platform_health
  → daily active teachers, sessions created, students joined
  → activity breakdown, error rates`}
        </div>
      </Card>

      <h3 style={{ fontSize: 15, color: COLORS.primaryLight, marginBottom: 12 }}>Data Flow Architecture</h3>
      <Card>
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          <DataFlowArrow from="Student plays" to="ClassModeGameWrapper polls score every 2s" />
          <DataFlowArrow from="Round ends" to="Score submitted to round_scores (Supabase insert)" />
          <DataFlowArrow from="Session ends" to="Session marked ended, ended_at set" />
          <DataFlowArrow from="Postgres triggers" to="Refresh materialized views on session end" />
          <DataFlowArrow from="pg_cron (weekly)" to="Triggers Edge Function: generate-teacher-insights" />
          <DataFlowArrow from="Edge Function" to="Aggregates teacher data → calls Claude API → stores insights" />
          <DataFlowArrow from="Dashboard loads" to="Queries views + teacher_insights → renders analytics" />
          <DataFlowArrow from="pg_cron (nightly)" to="Runs data retention: purges expired session_students rows" />
        </div>
      </Card>

      <Card style={{ marginTop: 16, borderLeft: `3px solid ${COLORS.warning}` }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, color: COLORS.warning }}>Privacy Boundary</h3>
        <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
          All analytics views aggregate data above the student level. The <code style={{ background: COLORS.bg, padding: "2px 6px", borderRadius: 4, color: COLORS.accentLight }}>session_students</code> table
          stores only first names with no persistent identity. After the academic year retention window, student rows are deleted but aggregated stats
          in the views are preserved. The AI insight engine never receives student names — only numeric aggregates.
        </p>
      </Card>
    </div>
  );
}

function Part7_Admin() {
  return (
    <div>
      <SectionTitle icon={Icons.Admin} title="Part 7 — Super Admin Data Center" subtitle="Platform command center for a small ops team (2-5). Real-time health + AI intelligence." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          { title: "Live Platform Health", color: COLORS.success, path: "/admin/platform", items: [
            "Active sessions right now (count + map)",
            "Students currently connected",
            "Supabase connection pool usage",
            "Realtime channel count",
            "Edge function invocation rate",
            "Error rate (last hour / day)",
            "Average response latency",
          ]},
          { title: "Growth & Adoption", color: COLORS.primary, path: "/admin/analytics/growth", items: [
            "New teacher signups (daily/weekly/monthly)",
            "Free → Pro conversion rate",
            "School license activations",
            "Churn rate (cancelled subscriptions)",
            "Retention cohort analysis (week 1, 2, 4, 8)",
            "Geographic distribution",
            "Referral source tracking",
          ]},
          { title: "Engagement Analytics", color: COLORS.accent, path: "/admin/analytics/engagement", items: [
            "Platform-wide sessions per day chart",
            "Average students per session (trend)",
            "Activity usage breakdown (pie + trend)",
            "Peak usage hours heatmap",
            "Average session duration trend",
            "Round completion rate by activity",
            "Star distribution curves (platform-wide)",
          ]},
          { title: "AI Platform Intelligence", color: COLORS.danger, path: "/admin/insights", items: [
            "Auto-generated weekly platform report",
            "\"Activity X has highest engagement among age 4-5\"",
            "\"Teachers run most sessions between 9-11am\"",
            "\"Session dropout increases when rounds exceed 120s\"",
            "\"Bubble Pop engagement up 15% after last update\"",
            "Anomaly detection (unusual spikes/drops)",
            "Predictive: estimated sessions next month",
          ]},
        ].map((s, i) => (
          <Card key={i} style={{ borderTop: `3px solid ${s.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: s.color }}>{s.title}</h3>
              <code style={{ fontSize: 10, color: COLORS.textDim }}>{s.path}</code>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.8 }}>
              {s.items.map((item, j) => (
                <div key={j} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
                  <span style={{ color: s.color, flexShrink: 0 }}>•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, color: COLORS.primaryLight }}>Admin Role Separation</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <Badge color={COLORS.danger}>Super Admin</Badge>
            <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8, lineHeight: 1.6 }}>
              Full access: system config, user management, billing override, database access, content management, can impersonate teachers for debugging.
            </p>
          </div>
          <div>
            <Badge color={COLORS.warning}>Viewer Admin</Badge>
            <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8, lineHeight: 1.6 }}>
              Read-only: view all dashboards and analytics, browse user accounts, view session data. Cannot modify system config, billing, or user data.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Part8_Privacy() {
  const rules = [
    { principle: "No student accounts", detail: "Students never create accounts. No email, no password, no persistent profile. Join with first name + session code only.", icon: "🔒" },
    { principle: "Session-scoped identity", detail: "Student identity exists only within a session. The session_students.id is a UUID with no cross-session linkage. Same child joining two sessions gets two separate, unlinked UUIDs.", icon: "🆔" },
    { principle: "First name only", detail: "The only personal data stored is a first name (max 20 chars). No surname, no age, no class/grade, no photo, no device fingerprint.", icon: "👤" },
    { principle: "Academic year retention", detail: "Session student data (names + scores) is auto-purged at the end of the academic year. A pg_cron job runs the purge based on schools.academic_year_end or a global default (July 31).", icon: "📅" },
    { principle: "Aggregates survive purge", detail: "Materialized views and analytics aggregates are retained after student data purge. They contain counts and averages, never individual records.", icon: "📊" },
    { principle: "No camera storage", detail: "Hand tracking runs entirely client-side via MediaPipe. No camera frames are transmitted, stored, or processed server-side. Zero video/image data touches Supabase.", icon: "📹" },
    { principle: "AI insight isolation", detail: "The Claude API insight engine receives only numeric aggregates (session counts, star averages, duration stats). It never sees student names or any personally identifiable information.", icon: "🤖" },
    { principle: "RLS enforcement", detail: "Supabase Row Level Security ensures teachers can only access their own sessions and scores. School admins see aggregated views only. No cross-tenant data leakage.", icon: "🛡️" },
    { principle: "COPPA alignment", detail: "No collection of personal information from children under 13. No account creation for children. Parental consent not required because no PII is collected. Teacher (adult) is the account holder.", icon: "⚖️" },
    { principle: "GDPR compliance path", detail: "Teacher data subject requests (access/delete) handled via dashboard settings. Student data has no persistent identity to request against. Data processing agreement available for schools.", icon: "🇪🇺" },
  ];

  return (
    <div>
      <SectionTitle icon={Icons.Privacy} title="Part 8 — Privacy Compliance Architecture" subtitle="Privacy is not a feature — it's the foundation. The system is designed to be incapable of violating child privacy." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {rules.map((r, i) => (
          <Card key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>{r.icon}</div>
            <div>
              <div style={{ fontWeight: 700, color: COLORS.text, fontSize: 13, marginBottom: 4 }}>{r.principle}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>{r.detail}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 20 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: COLORS.danger }}>Data Purge Pipeline</h3>
        <div style={{ fontFamily: "monospace", fontSize: 11, background: COLORS.bg, padding: 16, borderRadius: 8, color: COLORS.textMuted, lineHeight: 1.8 }}>
{`-- pg_cron job: runs daily at 2am UTC
-- Step 1: Refresh materialized analytics views (preserves aggregates)
REFRESH MATERIALIZED VIEW CONCURRENTLY v_teacher_session_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY v_activity_performance;

-- Step 2: Delete expired student data
DELETE FROM round_scores rs
USING sessions s
WHERE rs.session_id = s.id
  AND s.ended_at < NOW() - INTERVAL '1 year';  -- academic year default

DELETE FROM session_students ss
USING sessions s
WHERE ss.session_id = s.id
  AND s.ended_at < NOW() - INTERVAL '1 year';

-- Step 3: Anonymise session metadata (keep for analytics)
UPDATE sessions SET code = NULL
WHERE ended_at < NOW() - INTERVAL '1 year';

-- School-specific retention uses schools.academic_year_end`}
        </div>
      </Card>
    </div>
  );
}

function Part9_AIEngine() {
  return (
    <div>
      <SectionTitle icon={Icons.AI} title="Part 9 — AI Insight Engine" subtitle="Claude-powered analytics that turn raw data into actionable teaching intelligence." />

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: COLORS.primaryLight }}>Architecture</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { title: "Data Collection Layer", color: COLORS.accent, desc: "Postgres views aggregate session data into structured summaries. No PII. Runs via pg_cron triggers or on-demand from dashboard." },
            { title: "Intelligence Layer", color: COLORS.primary, desc: "Supabase Edge Function calls Claude API (claude-haiku-4-5 for cost efficiency) with education-analytics system prompt + teacher data summary." },
            { title: "Delivery Layer", color: COLORS.success, desc: "Insights stored in teacher_insights / platform_insights tables. Dashboard renders cards. Optional weekly email digest via Resend." },
          ].map((l, i) => (
            <Card key={i} style={{ background: COLORS.bg, borderTop: `2px solid ${l.color}` }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, color: l.color }}>{l.title}</h4>
              <p style={{ margin: 0, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>{l.desc}</p>
            </Card>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: COLORS.warning }}>System Prompt Design (Teacher-Level)</h3>
        <div style={{ fontFamily: "monospace", fontSize: 11, background: COLORS.bg, padding: 16, borderRadius: 8, color: COLORS.textMuted, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
{`You are an education analytics assistant for Draw in the Air,
a gesture-based learning platform for children aged 3-7.

You will receive a JSON summary of a teacher's classroom data.
The data contains ONLY aggregated metrics — no student names
or personal information.

Your task:
1. Identify 3-5 actionable insights from the data
2. Each insight must include:
   - A clear, concise title (under 12 words)
   - A 2-3 sentence explanation with specific numbers
   - A severity level: "info" | "suggestion" | "warning"
   - An insight_type: "engagement" | "activity" | "timing" | "recommendation"

Focus on:
- Optimal round duration for this teacher's students
- Activity effectiveness comparisons
- Engagement patterns and drop-off points
- Suggestions for activities they haven't tried
- Session frequency and consistency patterns

Respond in JSON format: { "insights": [...] }`}
        </div>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: COLORS.accentLight }}>Example Data Input → Insight Output</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 6, fontWeight: 600 }}>INPUT (to Claude API)</div>
            <div style={{ fontFamily: "monospace", fontSize: 10, background: COLORS.bg, padding: 12, borderRadius: 8, color: COLORS.textMuted, lineHeight: 1.5 }}>
{`{
  "teacher_id": "uuid",
  "period": "last_30_days",
  "total_sessions": 24,
  "total_rounds": 87,
  "total_students_joined": 156,
  "activities_used": {
    "calibration": { "sessions": 12, "avg_stars": 3.8, "avg_duration": 72 },
    "pre-writing": { "sessions": 8, "avg_stars": 2.9, "avg_duration": 95 },
    "balloon-math": { "sessions": 4, "avg_stars": 4.1, "avg_duration": 60 }
  },
  "round_durations": { "60s": 23, "90s": 51, "120s": 13 },
  "completion_rates": { "60s": 0.91, "90s": 0.74, "120s": 0.58 },
  "sessions_by_hour": { "9": 8, "10": 11, "11": 3, "14": 2 },
  "star_distribution": { "1": 12, "2": 31, "3": 45, "4": 38, "5": 30 }
}`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 6, fontWeight: 600 }}>OUTPUT (insight example)</div>
            <div style={{ fontFamily: "monospace", fontSize: 10, background: COLORS.bg, padding: 12, borderRadius: 8, color: COLORS.textMuted, lineHeight: 1.5 }}>
{`{
  "title": "Shorter rounds, better results",
  "body": "Your 60-second rounds have a 91%
    completion rate vs 58% for 120-second
    rounds. Consider defaulting to 60s for
    Pre-Writing, where avg stars are lowest
    (2.9) — shorter rounds may reduce
    frustration and improve scores.",
  "severity": "suggestion",
  "insight_type": "timing"
}`}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ borderLeft: `3px solid ${COLORS.success}` }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: COLORS.success }}>Cost Management</h3>
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
            Claude Haiku for teacher-level insights (~$0.001 per insight batch). Claude Sonnet for platform-level analysis (weekly, ~$0.01 per run).
            Cached results in teacher_insights table — only regenerate when new session data exists. Estimated cost: &lt;$5/month for 500 teachers.
          </div>
        </Card>
        <Card style={{ borderLeft: `3px solid ${COLORS.primary}` }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14, color: COLORS.primary }}>Fallback Strategy</h3>
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
            If Claude API is unavailable, fall back to rule-based insights using Postgres functions.
            Pre-defined rules: "if completion_rate {'<'} 0.6 for timer {'>'} 90s → suggest shorter rounds."
            These cover the top 10 most common patterns and ensure the dashboard always shows something useful.
          </div>
        </Card>
      </div>
    </div>
  );
}

function Part10_DataFlow() {
  return (
    <div>
      <SectionTitle icon={Icons.Data} title="Part 10 — Data Flow & Visual Consistency" subtitle="How data moves through the system, and the unified visual language across all surfaces." />

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: COLORS.primaryLight }}>End-to-End Data Flow</h3>
        <div style={{ fontFamily: "monospace", fontSize: 11, background: COLORS.bg, padding: 16, borderRadius: 8, lineHeight: 2 }}>
          <div style={{ color: COLORS.accentLight }}>┌─ FREE PLAY (no data stored server-side) ─────────────┐</div>
          <div style={{ color: COLORS.textMuted }}>│ User opens /play → plays activity → local state only │</div>
          <div style={{ color: COLORS.accentLight }}>└──────────────────────────────────────────────────────┘</div>
          <br/>
          <div style={{ color: COLORS.success }}>┌─ CLASS MODE (Supabase data flow) ────────────────────┐</div>
          <div style={{ color: COLORS.textMuted }}>│ Teacher: /classroom/start                            │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ INSERT sessions (code, activity, status=lobby)  │</div>
          <div style={{ color: COLORS.textMuted }}>│                                                      │</div>
          <div style={{ color: COLORS.textMuted }}>│ Student: /join → enters code + name                  │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ INSERT session_students (name, session_id)      │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ Realtime broadcast → teacher lobby updates      │</div>
          <div style={{ color: COLORS.textMuted }}>│                                                      │</div>
          <div style={{ color: COLORS.textMuted }}>│ Teacher starts round:                                │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ UPDATE sessions SET status='playing'            │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ Realtime broadcast → all students start game    │</div>
          <div style={{ color: COLORS.textMuted }}>│                                                      │</div>
          <div style={{ color: COLORS.textMuted }}>│ During round:                                        │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ Client polls score every 2s (local)             │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ On round end: INSERT round_scores               │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ Realtime broadcast → teacher leaderboard        │</div>
          <div style={{ color: COLORS.textMuted }}>│                                                      │</div>
          <div style={{ color: COLORS.textMuted }}>│ Session ends:                                        │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ UPDATE sessions SET status='ended'              │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ Postgres trigger → refresh materialized views   │</div>
          <div style={{ color: COLORS.success }}>└──────────────────────────────────────────────────────┘</div>
          <br/>
          <div style={{ color: COLORS.primary }}>┌─ ANALYTICS PIPELINE ─────────────────────────────────┐</div>
          <div style={{ color: COLORS.textMuted }}>│ pg_cron (weekly):                                    │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ Edge Function: generate-teacher-insights        │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ Aggregates data → Claude API → store insights   │</div>
          <div style={{ color: COLORS.textMuted }}>│                                                      │</div>
          <div style={{ color: COLORS.textMuted }}>│ pg_cron (daily 2am):                                 │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ Refresh materialized views                      │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ Purge expired student data                      │</div>
          <div style={{ color: COLORS.primary }}>└──────────────────────────────────────────────────────┘</div>
          <br/>
          <div style={{ color: COLORS.warning }}>┌─ BILLING PIPELINE ────────────────────────────────────┐</div>
          <div style={{ color: COLORS.textMuted }}>│ Stripe webhook → Next.js API route                   │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ subscription.created → set tier='pro'           │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ subscription.deleted → set tier='free'          │</div>
          <div style={{ color: COLORS.textMuted }}>│   └→ invoice.paid → update license_status            │</div>
          <div style={{ color: COLORS.warning }}>└──────────────────────────────────────────────────────┘</div>
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: COLORS.primaryLight }}>Navigation by Role</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: COLORS.textMuted }}>
          Every page includes the Draw in the Air logo (top-left, links to /). Each role sees a contextual navigation bar:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { role: "Public visitor", nav: "Logo · Activities · For Teachers · For Schools · Pricing · Play Free · Sign In", color: COLORS.textMuted },
            { role: "Free Teacher", nav: "Logo · Dashboard · Play · Activities · Upgrade to Pro · Settings", color: COLORS.success },
            { role: "Teacher Pro", nav: "Logo · Dashboard · Classroom · Analytics · Insights · Playlists · Settings", color: COLORS.primary },
            { role: "School Admin", nav: "Logo · School Dashboard · Teachers · School Analytics · Billing · Settings", color: COLORS.warning },
            { role: "Platform Admin", nav: "Logo · Command Center · Analytics · Users · Schools · Insights · System", color: COLORS.danger },
            { role: "Student (in session)", nav: "Logo only (no navigation). Full-screen activity. Back button returns to lobby.", color: COLORS.accentLight },
          ].map((n, i) => (
            <div key={i} style={{ padding: 12, background: COLORS.bg, borderRadius: 8, borderLeft: `3px solid ${n.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: n.color, marginBottom: 4 }}>{n.role}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{n.nav}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────

const tabs = [
  { id: "routing", label: "Routing", icon: Icons.Route, component: Part1_Routing },
  { id: "roles", label: "Roles", icon: Icons.Users, component: Part2_Roles },
  { id: "student", label: "Student Access", icon: Icons.Student, component: Part3_StudentAccess },
  { id: "teacher", label: "Teacher Dashboard", icon: Icons.Dashboard, component: Part4_TeacherDashboard },
  { id: "school", label: "School Dashboard", icon: Icons.School, component: Part5_SchoolDashboard },
  { id: "analytics", label: "Analytics Engine", icon: Icons.Analytics, component: Part6_Analytics },
  { id: "admin", label: "Admin Center", icon: Icons.Admin, component: Part7_Admin },
  { id: "privacy", label: "Privacy", icon: Icons.Privacy, component: Part8_Privacy },
  { id: "ai", label: "AI Engine", icon: Icons.AI, component: Part9_AIEngine },
  { id: "dataflow", label: "Data Flow", icon: Icons.Data, component: Part10_DataFlow },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("routing");
  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || Part1_Routing;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "16px 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Draw in the Air — Platform Architecture
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: COLORS.textDim }}>
              v2.0 Architecture Blueprint · 68 Routes · 5 Roles · AI-Powered Analytics
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={COLORS.success}>10 Sections</Badge>
            <Badge color={COLORS.accent}>Privacy-First</Badge>
            <Badge color={COLORS.primary}>Claude AI</Badge>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "0 24px", overflowX: "auto", display: "flex", gap: 0 }}>
        {tabs.map(t => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "12px 16px",
              border: "none", borderBottom: `2px solid ${active ? COLORS.primary : "transparent"}`,
              background: "transparent", color: active ? COLORS.text : COLORS.textDim,
              cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500, whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}>
              <t.icon size={14} color={active ? COLORS.primary : COLORS.textDim} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <ActiveComponent />
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "16px 24px", textAlign: "center", marginTop: 40 }}>
        <p style={{ margin: 0, fontSize: 11, color: COLORS.textDim }}>
          Draw in the Air Platform Architecture · Designed for scalability, privacy, and deep classroom insight · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
