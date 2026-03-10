import { useState } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────
const C = {
  bg: "#0B0F1A", surface: "#131825", surfaceAlt: "#1A2033", border: "#1F2A40",
  primary: "#8B5CF6", primaryMuted: "#7C3AED33", accent: "#06B6D4", accentMuted: "#06B6D422",
  success: "#10B981", successMuted: "#10B98122", warning: "#F59E0B", warningMuted: "#F59E0B22",
  danger: "#EF4444", dangerMuted: "#EF444422", orange: "#F97316",
  text: "#E8ECF4", textSecondary: "#8B95A9", textDim: "#4F5B6E",
  trial: "#F59E0B", pro: "#8B5CF6", school: "#06B6D4", admin: "#EF4444", free: "#64748B",
};

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
const mono = "'JetBrains Mono','Fira Code',monospace";

// ─── PRIMITIVES ──────────────────────────────────────────
const Badge = ({ children, color = C.primary, small }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", padding: small ? "1px 6px" : "2px 10px",
    borderRadius: 99, fontSize: small ? 9 : 10, fontWeight: 700, letterSpacing: 0.8,
    textTransform: "uppercase", background: color + "1A", color, border: `1px solid ${color}33`,
  }}>{children}</span>
);

const Card = ({ children, accent, style }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: 18, ...(accent ? { borderLeft: `3px solid ${accent}` } : {}), ...style,
  }}>{children}</div>
);

const Heading = ({ children, size = 18, color = C.text, sub }) => (
  <div style={{ marginBottom: sub ? 16 : 20 }}>
    <h2 style={{ margin: 0, fontSize: size, fontWeight: 800, color, lineHeight: 1.3 }}>{children}</h2>
    {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textSecondary }}>{sub}</p>}
  </div>
);

const Mono = ({ children }) => (
  <code style={{ background: C.bg, padding: "2px 6px", borderRadius: 4, fontSize: 11, color: C.accent, fontFamily: mono }}>{children}</code>
);

const Pre = ({ children }) => (
  <div style={{ fontFamily: mono, fontSize: 11, background: C.bg, padding: 14, borderRadius: 8, color: C.textSecondary, lineHeight: 1.7, whiteSpace: "pre-wrap", overflowX: "auto" }}>
    {children}
  </div>
);

const Grid = ({ cols = 2, gap = 14, children, style }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, ...style }}>{children}</div>
);

const Bullet = ({ items, color = C.accent }) => (
  <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.8 }}>
    {items.map((item, i) => (
      <div key={i} style={{ display: "flex", gap: 8 }}>
        <span style={{ color, flexShrink: 0, fontSize: 8, marginTop: 6 }}>●</span>
        <span>{item}</span>
      </div>
    ))}
  </div>
);

const DecisionBox = ({ title, decision, reasoning }) => (
  <Card style={{ background: C.surfaceAlt, marginTop: 14, borderLeft: `3px solid ${C.primary}` }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>DECISION: {title}</div>
    <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 4 }}>{decision}</div>
    <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>{reasoning}</div>
  </Card>
);

// ─── TABLE COMPONENT ─────────────────────────────────────
const Table = ({ headers, rows }) => (
  <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: C.surfaceAlt }}>
          {headers.map(h => (
            <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, borderBottom: `2px solid ${C.border}` }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "8px 12px", fontSize: 12, color: j === 0 ? C.text : C.textSecondary, fontFamily: j === 0 ? mono : font, verticalAlign: "top" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 1: FINAL TIER MODEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S1_TierModel() {
  const tiers = [
    {
      name: "Free User", color: C.free, tag: "FREE",
      who: "Anyone — parents, curious visitors, children at home",
      access: [
        "All 9 public activities via /play",
        "No sign-in required",
        "No dashboard, no analytics, no classroom features",
        "Fully client-side — zero data sent to Supabase",
      ],
      locked: ["Dashboard", "Classroom Mode", "Analytics", "Insights", "Playlists", "Session history"],
      conversion: "CTA banners on /play: 'Use this in your classroom — Start free trial'",
    },
    {
      name: "Teacher Pro Trial", color: C.trial, tag: "5-DAY TRIAL",
      who: "Teacher who signs in with Google OAuth for the first time",
      access: [
        "Classroom Mode: create sessions, generate codes, run rounds (unlimited)",
        "Dashboard: overview panel with real stats",
        "Session History: last 5 sessions only (blurred beyond that)",
        "Basic Analytics: student count, total sessions, avg stars (numbers only, no charts)",
        "Scoreboard: all visibility options available",
      ],
      locked: [
        "Full session history (shows blurred preview with 'Upgrade' overlay)",
        "Activity analytics charts (visible but blurred, with sample data beneath)",
        "AI Insights: 1 real insight shown, remaining 4 blurred with teaser text",
        "Playlists: UI visible, can browse, cannot save or use",
        "Session replay & detailed round breakdown",
        "CSV export",
        "Engagement metrics & trends",
      ],
      conversion: "Persistent top banner: 'Day 3 of 5 — Your trial data is building. Upgrade to keep it.' Final day: modal on login.",
    },
    {
      name: "Teacher Pro", color: C.pro, tag: "PAID",
      who: "Subscribed teacher (monthly or annual via Stripe)",
      access: [
        "Everything in trial, fully unlocked",
        "Unlimited session history with search & filters",
        "Full activity analytics with charts & trends",
        "AI Insights: all 5 per cycle + on-demand generation",
        "Playlists: create, save, reorder, share publicly",
        "Session replay with per-round student breakdown",
        "Engagement metrics: participation rate, drop-off, star curves",
        "CSV export of aggregated session data",
        "QR code generator for join links",
        "Projected display mode for classroom screens",
      ],
      locked: ["School-level analytics", "Teacher management", "School billing"],
      conversion: "N/A — fully unlocked tier",
    },
    {
      name: "School License", color: C.school, tag: "SCHOOL",
      who: "School administrator who purchases annual seat-based license",
      access: [
        "All Teacher Pro features inherited by every seated teacher",
        "School dashboard: adoption, usage, activity trends (aggregated)",
        "Teacher roster: invite, remove, track seat usage",
        "Per-teacher usage comparison (no student-level data)",
        "School billing management via Stripe portal",
        "Bulk teacher onboarding (CSV import)",
        "School-wide AI insights (aggregated across all teachers)",
      ],
      locked: ["Platform admin features", "System health", "Revenue data"],
      conversion: "N/A — enterprise tier",
    },
    {
      name: "Platform Admin", color: C.admin, tag: "INTERNAL",
      who: "Founder + ops team (2-5 people). Not customer-facing.",
      access: [
        "Full operational command center (3 layers)",
        "All teacher & school accounts (read/write)",
        "System health monitoring & diagnostics",
        "Revenue & growth dashboards",
        "AI platform intelligence (weekly auto-generated)",
        "Content management (activity configs)",
        "Impersonation for debugging (teacher view)",
      ],
      locked: [],
      conversion: "N/A — internal only",
    },
  ];

  return (
    <div>
      <Heading size={20} sub="Five tiers with strict boundaries. No ambiguity. No overlap.">1. Final Tier Model</Heading>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {tiers.map(t => (
          <Card key={t.name} accent={t.color}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Badge color={t.color}>{t.tag}</Badge>
              <span style={{ fontSize: 15, fontWeight: 700, color: t.color }}>{t.name}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>{t.who}</div>
            <Grid cols={t.locked.length > 0 ? 3 : 2} gap={12}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.success, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Unlocked</div>
                <Bullet items={t.access} color={C.success} />
              </div>
              {t.locked.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.danger, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Locked</div>
                  <Bullet items={t.locked} color={C.danger} />
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.warning, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Conversion Pressure</div>
                <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>{t.conversion}</div>
              </div>
            </Grid>
          </Card>
        ))}
      </div>

      <DecisionBox
        title="Trial Trigger"
        decision="Trial starts on first Google OAuth sign-in. Not on first session creation."
        reasoning="Starting the clock on sign-in (not on first classroom use) prevents teachers from signing in, exploring the dashboard for weeks, then claiming their 5 days. The trial must create urgency immediately."
      />
      <DecisionBox
        title="Trial Data Retention"
        decision="Session data created during trial is retained if teacher upgrades within 7 days of trial expiry. Purged after 7 days if not converted."
        reasoning="Retaining trial data creates a powerful conversion lever: 'Your classroom data is waiting. Upgrade to keep it.' The 7-day grace period after expiry prevents accidental data loss while maintaining pressure."
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 2: ROLE & PERMISSION MODEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S2_Roles() {
  const perms = [
    ["Play public activities", "✓", "✓", "✓", "✓", "✓", "✓"],
    ["Join classroom session (code)", "✓", "—", "—", "—", "—", "—"],
    ["View own round results", "✓", "—", "—", "—", "—", "—"],
    ["Sign in with Google OAuth", "—", "—", "✓", "✓", "✓", "✓"],
    ["Create classroom sessions", "—", "—", "✓", "✓", "✓", "✓"],
    ["Configure scoreboard visibility", "—", "—", "✓", "✓", "✓", "✓"],
    ["View dashboard (limited)", "—", "—", "✓", "—", "—", "—"],
    ["View dashboard (full)", "—", "—", "—", "✓", "✓", "✓"],
    ["View session history (last 5)", "—", "—", "✓", "—", "—", "—"],
    ["View session history (all)", "—", "—", "—", "✓", "✓", "✓"],
    ["View basic analytics (numbers)", "—", "—", "✓", "—", "—", "—"],
    ["View full analytics (charts)", "—", "—", "—", "✓", "✓", "✓"],
    ["View AI insights (1 preview)", "—", "—", "✓", "—", "—", "—"],
    ["View AI insights (all)", "—", "—", "—", "✓", "✓", "✓"],
    ["Create & save playlists", "—", "—", "—", "✓", "✓", "✓"],
    ["Export session data (CSV)", "—", "—", "—", "✓", "✓", "✓"],
    ["Manage teacher roster", "—", "—", "—", "—", "✓", "✓"],
    ["View school-wide analytics", "—", "—", "—", "—", "✓", "✓"],
    ["Manage school billing", "—", "—", "—", "—", "✓", "✓"],
    ["View platform command center", "—", "—", "—", "—", "—", "✓"],
    ["View all user accounts", "—", "—", "—", "—", "—", "✓"],
    ["View system health", "—", "—", "—", "—", "—", "✓"],
    ["Impersonate teacher", "—", "—", "—", "—", "—", "✓"],
  ];

  return (
    <div>
      <Heading size={20} sub="Progressive permission escalation enforced at the database level via Supabase RLS.">2. Role & Permission Model</Heading>

      <Table
        headers={["Permission", "Student", "Free", "Trial", "Pro", "School", "Admin"]}
        rows={perms.map(r => [
          r[0],
          ...r.slice(1).map(v => <span style={{ color: v === "✓" ? C.success : C.textDim, fontWeight: v === "✓" ? 700 : 400 }}>{v}</span>)
        ])}
      />

      <Card style={{ marginTop: 16 }}>
        <Heading size={14} sub="How the database enforces tier boundaries">Enforcement Mechanism</Heading>
        <Pre>{`teacher_profiles
├── user_id          PK, FK → auth.users
├── tier             ENUM('free','trial','pro')  ← core gating column
├── trial_started_at TIMESTAMPTZ                 ← set on first OAuth
├── trial_expires_at TIMESTAMPTZ                 ← trial_started_at + 5 days
├── stripe_customer_id    TEXT NULL
├── stripe_subscription_id TEXT NULL
├── school_id        FK → schools NULL            ← if set, tier forced to 'pro'
└── is_admin         BOOLEAN DEFAULT false

─── RLS Policy Logic ───────────────────────────────

-- Classroom session creation
CREATE POLICY "pro_or_trial_can_create_sessions" ON sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teacher_profiles tp
      WHERE tp.user_id = auth.uid()
      AND (
        tp.tier = 'pro'
        OR (tp.tier = 'trial' AND tp.trial_expires_at > NOW())
        OR tp.school_id IS NOT NULL
      )
    )
  );

-- Analytics access (full)
CREATE POLICY "pro_can_read_analytics" ON v_teacher_analytics
  FOR SELECT USING (
    teacher_id = auth.uid()
    AND (get_effective_tier(auth.uid()) = 'pro')
  );

-- get_effective_tier() function:
-- 1. If school_id is NOT NULL and school license is active → 'pro'
-- 2. If tier = 'trial' AND trial_expires_at > NOW() → 'trial'
-- 3. If tier = 'trial' AND trial_expires_at <= NOW() → 'expired'
-- 4. Otherwise → tier value directly`}</Pre>
      </Card>

      <DecisionBox
        title="School Permission Inheritance"
        decision="School teachers get tier='pro' forced at the database level via a trigger on school_teachers INSERT. Removing a teacher from a school reverts their tier to 'free' unless they have an active Stripe subscription."
        reasoning="Database-level enforcement prevents any edge case where a school teacher sees a paywall. The trigger fires synchronously on school_teachers changes, keeping teacher_profiles.tier always correct."
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 3: ROUTE ARCHITECTURE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S3_Routes() {
  const groups = [
    {
      name: "Public Marketing", color: C.free, tag: "SSR",
      routes: [
        ["/", "Landing page — hero, demo video, CTA", "None"],
        ["/about", "Mission, team, story", "None"],
        ["/how-it-works", "Product explainer with interactive demos", "None"],
        ["/activities", "Activity catalogue (9 modes)", "Static metadata"],
        ["/activities/:slug", "Individual activity detail + embedded demo", "Activity config"],
        ["/for-teachers", "Teacher-focused value proposition", "None"],
        ["/for-parents", "Parent-focused value proposition", "None"],
        ["/for-schools", "School/district sales page + contact form", "None"],
        ["/pricing", "Free / Trial / Pro / School comparison", "Pricing config"],
        ["/resources", "Teaching guides + printable worksheets", "CMS content"],
        ["/learn", "Blog index", "CMS"],
        ["/learn/:slug", "Blog article", "CMS"],
        ["/privacy", "Privacy policy", "Static"],
        ["/terms", "Terms of service", "Static"],
        ["/safeguarding", "Child safeguarding statement", "Static"],
        ["/press", "Press kit", "Static"],
      ],
    },
    {
      name: "Free Play (No Auth)", color: C.success, tag: "SPA",
      routes: [
        ["/play", "Game launcher — onboarding → mode picker → play", "Local only"],
        ["/play/:mode", "Direct link to specific activity", "Activity config"],
        ["/free-paint", "Redirect → /play/free", "—"],
        ["/trace-:target", "Redirect → /play/pre-writing?target=:target", "—"],
        ["/demo", "30-second auto-playing demo", "Demo script"],
      ],
    },
    {
      name: "Student Session", color: C.accent, tag: "SPA",
      routes: [
        ["/join", "Session code entry (4-digit numpad)", "None"],
        ["/join/:code", "Pre-filled code (QR / teacher link)", "URL param"],
        ["/join/lobby", "Waiting room (after code + name)", "Session realtime"],
        ["/join/play", "Live gameplay during round", "Activity + timer"],
        ["/join/results", "Own results after round ends", "Score, stars"],
      ],
    },
    {
      name: "Auth", color: C.textDim, tag: "SSR",
      routes: [
        ["/auth/login", "Google OAuth initiation + trial start", "OAuth redirect"],
        ["/auth/callback", "OAuth callback → create teacher_profile", "Auth tokens"],
        ["/auth/logout", "Sign out + clear session", "—"],
      ],
    },
    {
      name: "Teacher Dashboard", color: C.pro, tag: "SSR",
      routes: [
        ["/dashboard", "Overview: stats + quick actions + trial banner", "Profile + recent"],
        ["/dashboard/sessions", "Full session history (Pro: all, Trial: 5)", "Sessions"],
        ["/dashboard/sessions/:id", "Session detail + round replay (Pro only)", "Scores"],
        ["/dashboard/analytics", "Engagement analytics (Pro: charts, Trial: numbers)", "Aggregates"],
        ["/dashboard/analytics/activities", "Per-activity breakdown (Pro only)", "Activity agg"],
        ["/dashboard/analytics/engagement", "Participation + drop-off (Pro only)", "Engagement agg"],
        ["/dashboard/insights", "AI recommendations (Pro: all, Trial: 1)", "Insights"],
        ["/dashboard/playlists", "Activity playlists (Pro only)", "Playlists"],
        ["/dashboard/playlists/:id", "Edit playlist (Pro only)", "Playlist"],
        ["/dashboard/settings", "Account + preferences", "Profile"],
        ["/dashboard/upgrade", "Trial → Pro conversion page", "Pricing"],
        ["/dashboard/billing", "Stripe customer portal (Pro only)", "Stripe"],
      ],
    },
    {
      name: "Classroom", color: C.warning, tag: "SPA",
      routes: [
        ["/classroom/start", "Activity picker + session config + scoreboard settings", "Activities"],
        ["/classroom/:id", "Session hub (redirects to current state)", "Session"],
        ["/classroom/:id/lobby", "Teacher lobby: student list + code display", "Realtime"],
        ["/classroom/:id/round", "Live round: leaderboard/stars + timer", "Realtime"],
        ["/classroom/:id/results", "Round results: podium + stats + next actions", "Scores"],
      ],
    },
    {
      name: "School Admin", color: C.school, tag: "SSR",
      routes: [
        ["/school/signup", "Registration + Stripe checkout", "Org details"],
        ["/school/onboarding", "Setup wizard: invite first teachers", "School config"],
        ["/school", "School dashboard: adoption + usage overview", "Aggregates"],
        ["/school/teachers", "Teacher roster management", "Teacher list"],
        ["/school/teachers/invite", "Email invite flow", "Invite tokens"],
        ["/school/analytics", "School-wide analytics", "School aggregates"],
        ["/school/analytics/teachers", "Per-teacher comparison", "Teacher agg"],
        ["/school/analytics/activities", "Activity popularity", "Activity agg"],
        ["/school/settings", "School profile + preferences", "School config"],
        ["/school/billing", "License + invoice management", "Stripe portal"],
      ],
    },
    {
      name: "Platform Admin", color: C.admin, tag: "SSR",
      routes: [
        ["/admin", "Command center: live health + key metrics", "System-wide"],
        ["/admin/operations", "Operational monitoring (Layer 1)", "Health data"],
        ["/admin/growth", "Growth analytics (Layer 2)", "Growth data"],
        ["/admin/intelligence", "Gameplay + AI intelligence (Layer 3)", "All data"],
        ["/admin/users", "Teacher + school browser", "User records"],
        ["/admin/users/:id", "Individual account detail", "Account data"],
        ["/admin/schools", "School account management", "School records"],
        ["/admin/sessions", "Live + historical session browser", "All sessions"],
        ["/admin/billing", "Revenue + subscription dashboard", "Stripe data"],
        ["/admin/content", "Activity configuration manager", "Activity config"],
        ["/admin/system", "Supabase health + edge functions + logs", "System metrics"],
      ],
    },
  ];

  return (
    <div>
      <Heading size={20} sub="74 routes total. Tag indicates rendering strategy: SSR (Next.js server) or SPA (Vite client engine).">3. Final Route Architecture</Heading>
      {groups.map(g => (
        <div key={g.name} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Badge color={g.color}>{g.tag}</Badge>
            <span style={{ fontSize: 14, fontWeight: 700, color: g.color }}>{g.name}</span>
            <span style={{ fontSize: 11, color: C.textDim }}>({g.routes.length} routes)</span>
          </div>
          <Table headers={["Route", "Purpose", "Data"]} rows={g.routes} />
        </div>
      ))}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 4: NAVIGATION & LAYOUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S4_Navigation() {
  const layouts = [
    {
      name: "Public Layout", color: C.free,
      header: "Logo · Activities · For Teachers · For Schools · Pricing · Sign In / Play Free",
      desc: "Full-width marketing header. Sticky. Sign In button is always visible. Play Free is a highlighted CTA button.",
      footer: "Full marketing footer with links, social, legal, newsletter signup.",
    },
    {
      name: "Teacher Dashboard Layout", color: C.pro,
      header: "Logo · [trial banner if trial] · Notifications · Avatar dropdown",
      desc: "Sidebar navigation: Overview, Sessions, Analytics, Insights, Playlists, Classroom, Settings. Sidebar collapses on mobile. Trial users see upgrade CTA in sidebar.",
      footer: "Minimal: Help link, Feedback, Version.",
    },
    {
      name: "School Admin Layout", color: C.school,
      header: "Logo · School Name · Notifications · Avatar dropdown",
      desc: "Sidebar navigation: Dashboard, Teachers, Analytics, Settings, Billing. Same shell as teacher but with school-specific nav items.",
      footer: "Minimal: Support, Docs.",
    },
    {
      name: "Admin Layout", color: C.admin,
      header: "Logo · 'Command Center' label · Live indicator (green pulse) · System alerts · Avatar",
      desc: "Sidebar: Operations, Growth, Intelligence, Users, Schools, Sessions, Billing, Content, System. Dark theme forced. Real-time data refresh indicator in header.",
      footer: "System status bar: DB connections, Realtime channels, Edge function health.",
    },
    {
      name: "Student Session Layout", color: C.accent,
      header: "Logo only (top-left, small). No navigation. Full-screen activity.",
      desc: "Completely distraction-free. No nav links, no menus, no browser chrome prompts. Back button in lobby only (returns to /join). During gameplay: zero UI except activity + timer.",
      footer: "None.",
    },
    {
      name: "Classroom Layout (Teacher)", color: C.warning,
      header: "Logo · Session code (large) · Activity name · Student count · Timer",
      desc: "Optimized for projection onto classroom screens. Large fonts, high contrast. Minimal controls: Start/End round buttons. No sidebar.",
      footer: "None — full viewport used.",
    },
  ];

  return (
    <div>
      <Heading size={20} sub="6 layout shells. Every page includes the logo linking to homepage. Each role sees contextually appropriate navigation.">4. Navigation & Layout Architecture</Heading>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {layouts.map(l => (
          <Card key={l.name} accent={l.color}>
            <div style={{ fontSize: 14, fontWeight: 700, color: l.color, marginBottom: 8 }}>{l.name}</div>
            <Grid cols={3} gap={12}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", marginBottom: 4 }}>Header</div>
                <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.5 }}>{l.header}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", marginBottom: 4 }}>Body / Sidebar</div>
                <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.5 }}>{l.desc}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", marginBottom: 4 }}>Footer</div>
                <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.5 }}>{l.footer}</div>
              </div>
            </Grid>
          </Card>
        ))}
      </div>

      <DecisionBox
        title="Shared Layout Shell"
        decision="All SSR layouts (dashboard, school, admin) share a single Next.js layout component with role-based sidebar rendering. The sidebar items are determined by a getSidebarItems(role, tier) function."
        reasoning="A unified shell prevents layout drift between roles and simplifies implementation. The sidebar function centralises all nav logic in one place, making permission changes trivial."
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 5: TRIAL EXPERIENCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S5_Trial() {
  const timeline = [
    { day: "Sign-in", event: "First Google OAuth", what: "teacher_profile created with tier='trial', trial_started_at=NOW(), trial_expires_at=NOW()+5d. Redirected to /dashboard with welcome modal." },
    { day: "Day 1-2", event: "Exploration phase", what: "Teacher sees full dashboard skeleton. Runs first sessions. Data starts appearing in overview. Session history shows up to 5 entries. Basic numbers visible." },
    { day: "Day 3", event: "Value demonstration", what: "Banner changes to 'Day 3 of 5'. If teacher has run 3+ sessions, AI generates their first insight (1 of 5 visible). Blurred analytics start showing chart shapes with real data beneath blur." },
    { day: "Day 4", event: "Urgency phase", what: "Banner turns amber: '1 day left'. Email sent: 'Your classroom data is building — upgrade to keep analyzing it.' Dashboard shows 'X sessions, Y students' with 'Don't lose this data' messaging." },
    { day: "Day 5", event: "Final day", what: "Banner turns red: 'Trial ends today'. Modal on login: conversion CTA with pricing. All trial features still work. Teacher can still run sessions and see limited analytics." },
    { day: "Expired", event: "Trial ended", what: "tier changes to 'free'. Dashboard shows read-only overview with last stats frozen. All features locked with 'Upgrade' overlays. Session creation blocked. Data retained for 7 more days." },
    { day: "+7 days", event: "Data purge", what: "If not converted: trial session data purged. teacher_profile remains (can re-subscribe later but data is gone). If converted within 7 days: all data retained seamlessly." },
  ];

  return (
    <div>
      <Heading size={20} sub="The trial must demonstrate value, create urgency, and make the upgrade feel inevitable.">5. Teacher Pro Trial Experience (5-Day)</Heading>

      <div style={{ position: "relative", paddingLeft: 24 }}>
        <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, background: `linear-gradient(${C.success}, ${C.warning}, ${C.danger})` }} />
        {timeline.map((t, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 12 }}>
            <div style={{
              position: "absolute", left: -24, top: 4, width: 16, height: 16, borderRadius: "50%",
              background: i < 3 ? C.success : i < 5 ? C.warning : C.danger,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 700, color: C.bg,
            }}>{i + 1}</div>
            <Card style={{ background: C.surfaceAlt }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                <Badge color={i < 3 ? C.success : i < 5 ? C.warning : C.danger} small>{t.day}</Badge>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.event}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>{t.what}</div>
            </Card>
          </div>
        ))}
      </div>

      <Card style={{ marginTop: 16 }}>
        <Heading size={14} sub="What trial users see on the dashboard">Trial Dashboard Anatomy</Heading>
        <Grid cols={2} gap={12}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.success, marginBottom: 6 }}>VISIBLE & FUNCTIONAL</div>
            <Bullet items={[
              "Overview panel: real session count, student count, avg stars",
              "Quick-start classroom button (fully functional)",
              "Session history (last 5, with round scores)",
              "Basic stats: numbers for total sessions, students, avg duration",
              "Scoreboard configuration (all options work)",
              "Settings page (account info, preferences)",
            ]} color={C.success} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.danger, marginBottom: 6 }}>VISIBLE BUT LOCKED (blur + overlay)</div>
            <Bullet items={[
              "Session history beyond 5 entries (blurred rows)",
              "Analytics charts (blurred, real chart shape visible beneath)",
              "AI Insights: slot 1 is real, slots 2-5 show blurred teaser text",
              "Playlists: browse UI works, 'Save' button triggers upgrade modal",
              "Session replay: clicking a session row shows 'Pro feature' overlay",
              "Export CSV: button present, triggers upgrade modal on click",
            ]} color={C.danger} />
          </div>
        </Grid>
      </Card>

      <DecisionBox
        title="Blur Strategy"
        decision="Use CSS filter: blur(6px) on real data, not placeholder data. The teacher can see the shape of their actual charts and insights, but cannot read the values."
        reasoning="Showing blurred real data is more compelling than showing fake placeholders. The teacher knows their data exists — they just can't access it. This is the strongest conversion lever."
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 6: TEACHER PRO FULL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S6_TeacherPro() {
  const sections = [
    { title: "Overview Panel", desc: "Total sessions (all time + this period), students engaged, avg engagement time, most popular activity, streak indicator, quick-start button. Week-over-week comparison arrows on every metric.", color: C.primary },
    { title: "Session History & Replay", desc: "Full searchable list with date/activity/student-count filters. Expandable rows: per-round breakdown, star distribution, individual student scores (first name only). Session comparison (overlay two sessions). CSV export.", color: C.accent },
    { title: "Activity Analytics", desc: "Activity usage bar chart, per-activity avg stars/completion/duration. Difficulty curve across rounds. Drop-off analysis timeline. Activity comparison scatter plot (engagement vs difficulty).", color: C.success },
    { title: "Engagement Intelligence", desc: "Participation rate trend, star distribution curves, optimal round duration chart (engagement vs timer length), time-of-day heatmap, week-over-week engagement line.", color: C.warning },
    { title: "AI Insights", desc: "5 insights per weekly cycle. On-demand 'Analyse Now' button. Each insight: title, explanation with numbers, severity badge, actionable recommendation. Dismissable. Weekly email digest (opt-in).", color: C.danger },
    { title: "Lesson Tools", desc: "Activity picker with search/filter. Playlists (create, save, reorder, share). Session presets (timer, max students, scoreboard mode). QR code generator. Projected display mode for classroom screens.", color: C.orange },
  ];

  return (
    <div>
      <Heading size={20} sub="Everything unlocked. The full mission control experience.">6. Teacher Pro Full Experience</Heading>
      <Grid cols={2} gap={12}>
        {sections.map(s => (
          <Card key={s.title} accent={s.color}>
            <div style={{ fontSize: 13, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>{s.desc}</div>
          </Card>
        ))}
      </Grid>

      <Card style={{ marginTop: 16 }}>
        <Heading size={14} sub="Teachers configure scoreboard visibility when creating a session">Classroom Sensitivity Controls</Heading>
        <Table
          headers={["Mode", "Students See", "Teacher Sees", "Best For"]}
          rows={[
            ["Full Leaderboard", "All names ranked with stars", "Same + raw scores", "Competitive activities, older children"],
            ["Top 3 Only", "Podium (1st/2nd/3rd) + own score", "Full leaderboard", "Balanced competition, mixed abilities"],
            ["Personal Stars Only", "Only their own stars", "Full leaderboard", "Younger children, low confidence groups"],
            ["Class Score", "Combined class total + own contribution", "Individual + class total", "Collaborative activities, team building"],
          ]}
        />
        <div style={{ marginTop: 10, fontSize: 11, color: C.textDim }}>
          Default: <Mono>Personal Stars Only</Mono>. Stored in <Mono>sessions.scoreboard_mode</Mono>. Teacher can save a default in settings.
        </div>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 7: SCHOOL LICENSE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S7_School() {
  return (
    <div>
      <Heading size={20} sub="Self-serve annual licenses. Teachers inherit Pro. Zero friction.">7. School License System</Heading>

      <Card style={{ marginBottom: 16 }}>
        <Heading size={14}>Signup Flow</Heading>
        <Pre>{`1. School admin visits /school/signup
2. Enters: school name, admin email (Google OAuth)
3. Selects seat tier:
   ├── Starter  (5 seats)
   ├── Standard (10 seats)
   ├── Premium  (25 seats)
   └── Unlimited
4. Stripe Checkout (annual billing)
5. On payment success:
   ├── schools row created (license_status='active')
   ├── school_teachers row created (role='school_admin')
   ├── Admin's teacher_profiles.school_id set
   ├── Admin's teacher_profiles.tier forced to 'pro'
   └── Redirect to /school/onboarding
6. Onboarding wizard:
   ├── "Invite your first teachers" (email input)
   ├── Emails sent with magic link (/auth/join-school?token=...)
   └── Complete → redirect to /school`}</Pre>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Heading size={14}>Teacher Invitation Flow</Heading>
        <Pre>{`School admin clicks "Invite Teacher" on /school/teachers:
1. Enters teacher's email address
2. System creates school_invites row:
   ├── school_id, email, token (UUID), invited_by, expires_at (+7d)
3. Email sent via Resend:
   ├── Subject: "You're invited to Draw in the Air at [School Name]"
   ├── CTA: "Join your school" → /auth/join-school?token=...
4. Teacher clicks link:
   ├── If no account → Google OAuth → create teacher_profiles
   ├── If existing account → just link to school
5. On acceptance:
   ├── school_teachers row: status='active', accepted_at=NOW()
   ├── teacher_profiles.school_id = school.id
   ├── teacher_profiles.tier = 'pro' (via trigger)
   ├── Seat count incremented
6. If teacher already has personal Pro subscription:
   ├── Subscription NOT cancelled (school provides override)
   ├── If removed from school later, personal sub still valid`}</Pre>
      </Card>

      <Grid cols={2} gap={14}>
        <Card accent={C.danger}>
          <Heading size={14}>Seat Removal</Heading>
          <Bullet items={[
            "School admin clicks 'Remove' on teacher row",
            "school_teachers.status → 'removed'",
            "teacher_profiles.school_id → NULL (via trigger)",
            "Tier reverts: if personal Stripe sub exists → 'pro', else → 'free'",
            "Teacher's existing session data is NOT deleted",
            "Freed seat becomes available immediately",
          ]} color={C.danger} />
        </Card>
        <Card accent={C.school}>
          <Heading size={14}>Billing Enforcement</Heading>
          <Bullet items={[
            "Stripe webhook: subscription.updated → check seat count",
            "If seats_used > new_max_seats → flag for admin resolution",
            "Stripe webhook: subscription.deleted → license_status='cancelled'",
            "30-day grace period before teacher access revoked",
            "On grace expiry: all school teachers reverted to free",
            "Session data retained (follows standard retention policy)",
          ]} color={C.school} />
        </Card>
      </Grid>

      <Card style={{ marginTop: 16 }}>
        <Heading size={14}>School Data Model</Heading>
        <Pre>{`schools
├── id              UUID PK
├── name            TEXT NOT NULL
├── admin_user_id   FK → auth.users
├── stripe_customer_id     TEXT
├── stripe_subscription_id TEXT
├── license_tier    ENUM('starter_5','standard_10','premium_25','unlimited')
├── license_status  ENUM('active','past_due','cancelled','grace_period')
├── max_seats       INT
├── seats_used      INT (computed via trigger on school_teachers)
├── created_at      TIMESTAMPTZ
├── academic_year_end DATE (default: July 31)
└── settings        JSONB {default_scoreboard, timezone}

school_teachers
├── id              UUID PK
├── school_id       FK → schools
├── teacher_id      FK → auth.users
├── role            ENUM('teacher','school_admin')
├── status          ENUM('invited','active','removed')
├── invited_by      FK → auth.users
├── invited_at      TIMESTAMPTZ
└── accepted_at     TIMESTAMPTZ NULL

school_invites
├── id              UUID PK
├── school_id       FK → schools
├── email           TEXT
├── token           UUID UNIQUE
├── invited_by      FK → auth.users
├── created_at      TIMESTAMPTZ
├── expires_at      TIMESTAMPTZ
└── accepted_at     TIMESTAMPTZ NULL`}</Pre>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 8: ADMIN COMMAND CENTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S8_Admin() {
  return (
    <div>
      <Heading size={20} sub="Three operational layers. Real-time health. Deep intelligence. Designed for a small team running a global platform.">8. Admin Command Center</Heading>

      {/* LAYER 1 */}
      <Card style={{ marginBottom: 16, borderTop: `3px solid ${C.danger}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Badge color={C.danger}>Layer 1</Badge>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.danger }}>Operational Monitoring</span>
          <Mono>/admin/operations</Mono>
        </div>
        <Grid cols={3} gap={12}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.success, marginBottom: 6 }}>LIVE HEALTH</div>
            <Bullet items={[
              "Active sessions (count, refreshes every 10s)",
              "Concurrent connected users (realtime channels)",
              "Supabase DB connection pool (% used)",
              "Realtime channel count",
              "Edge function invocations (last hour)",
              "API response latency (p50, p95, p99)",
              "Auth success/failure rate",
            ]} color={C.success} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.danger, marginBottom: 6 }}>ERROR TRACKING</div>
            <Bullet items={[
              "Session creation failures (last 24h)",
              "Score submission failures",
              "Camera permission denials (client-reported)",
              "Browser compatibility issues (UA aggregates)",
              "Student join failures (wrong code, full session)",
              "Email invite bounce rate",
              "Stripe webhook failures",
              "Edge function error rate",
            ]} color={C.danger} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.warning, marginBottom: 6 }}>ALERTS</div>
            <Bullet items={[
              "Error rate > 5% in last hour → red banner",
              "Realtime connections > 80% capacity → amber",
              "Edge function latency > 2s → amber",
              "Stripe webhook backlog > 10 → red",
              "Auth failure rate > 10% → red",
              "All alerts logged to admin_alerts table",
              "Optional: Slack webhook for critical alerts",
            ]} color={C.warning} />
          </div>
        </Grid>
      </Card>

      {/* LAYER 2 */}
      <Card style={{ marginBottom: 16, borderTop: `3px solid ${C.primary}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Badge color={C.primary}>Layer 2</Badge>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>Growth Analytics</span>
          <Mono>/admin/growth</Mono>
        </div>
        <Grid cols={3} gap={12}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.primary, marginBottom: 6 }}>ACQUISITION</div>
            <Bullet items={[
              "New teacher signups (daily/weekly/monthly chart)",
              "Signup source (organic, referral, school invite)",
              "Landing page → signup conversion funnel",
              "/play → /auth/login conversion rate",
              "Geographic distribution (country from auth metadata)",
            ]} color={C.primary} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.success, marginBottom: 6 }}>CONVERSION & RETENTION</div>
            <Bullet items={[
              "Trial activation rate (signup → first session)",
              "Trial → Pro conversion rate (overall + by cohort)",
              "Day-of-conversion distribution (which trial day?)",
              "Retention cohorts (Week 1, 2, 4, 8, 12)",
              "Monthly Active Teachers (MAT) trend",
              "Churn rate (monthly, annualized)",
            ]} color={C.success} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.warning, marginBottom: 6 }}>REVENUE & SCHOOLS</div>
            <Bullet items={[
              "MRR (Monthly Recurring Revenue) chart",
              "ARR breakdown: Pro subs vs School licenses",
              "School adoption: new schools per month",
              "Avg seats per school, seat utilisation %",
              "Revenue per teacher (Pro vs School)",
              "Expansion revenue (seat upgrades)",
            ]} color={C.warning} />
          </div>
        </Grid>
      </Card>

      {/* LAYER 3 */}
      <Card style={{ marginBottom: 16, borderTop: `3px solid ${C.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Badge color={C.accent}>Layer 3</Badge>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Gameplay & AI Intelligence</span>
          <Mono>/admin/intelligence</Mono>
        </div>
        <Grid cols={3} gap={12}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, marginBottom: 6 }}>GAMEPLAY ANALYTICS</div>
            <Bullet items={[
              "Activity usage ranking (all-time + trending)",
              "Per-activity: avg stars, completion %, duration",
              "Activity difficulty signals (low-star clusters)",
              "Drop-off points per activity (round-by-round)",
              "Session duration distribution",
              "Round duration impact on completion",
              "Scoreboard mode popularity",
            ]} color={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, marginBottom: 6 }}>FRICTION & OPPORTUNITIES</div>
            <Bullet items={[
              "Camera permission denial rate by browser",
              "Student join abandonment rate",
              "Session creation → first round time",
              "Features never used by active teachers",
              "Activities never selected by active teachers",
              "A/B testing readiness signals",
              "Activity balancing recommendations",
            ]} color={C.orange} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.danger, marginBottom: 6 }}>AI PLATFORM INSIGHTS</div>
            <Bullet items={[
              "Weekly auto-generated platform report",
              "Product improvement suggestions",
              "Growth opportunity identification",
              "Feature prioritisation recommendations",
              "UX friction analysis",
              "Activity tuning suggestions",
              "Anomaly detection (spikes/drops)",
              "Predictive: estimated sessions next month",
            ]} color={C.danger} />
          </div>
        </Grid>
      </Card>

      <Card>
        <Heading size={14}>Admin Data Sources</Heading>
        <Pre>{`Layer 1 (Operations):
  ├── Supabase Management API (DB health, connection pool, realtime stats)
  ├── Edge Function logs (Supabase Logs API)
  ├── client_errors table (client-side error reports via beacon)
  ├── admin_alerts table (threshold-based alerts from pg_cron)
  └── Stripe webhook event log

Layer 2 (Growth):
  ├── teacher_profiles table (signup dates, tiers, conversion timestamps)
  ├── schools + school_teachers tables (school metrics)
  ├── Stripe API (revenue, subscriptions, invoices)
  └── v_growth_metrics materialized view (daily aggregates)

Layer 3 (Intelligence):
  ├── sessions + round_scores tables (gameplay data)
  ├── v_activity_performance materialized view
  ├── v_engagement_metrics materialized view
  ├── platform_insights table (AI-generated)
  └── Claude API (weekly platform analysis)`}</Pre>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 9: ANALYTICS ARCHITECTURE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S9_Analytics() {
  return (
    <div>
      <Heading size={20} sub="All analytics built on Supabase Postgres. Materialized views for speed. Real-time for live data. Edge Functions for AI.">9. Analytics Architecture</Heading>

      <Card style={{ marginBottom: 16 }}>
        <Heading size={14}>Complete Table Schema (Extended)</Heading>
        <Pre>{`── CORE TABLES ─────────────────────────────────────────

sessions (EXTENDED from current)
├── id                  UUID PK
├── code                TEXT (4-digit, unique among active)
├── teacher_id          FK → auth.users
├── school_id           FK → schools NULL
├── activity            game_mode_id ENUM
├── status              ENUM('lobby','playing','results','ended')
├── round               INT DEFAULT 1
├── timer_seconds       INT DEFAULT 90
├── max_students        INT DEFAULT 30
├── scoreboard_mode     ENUM('full','top3','personal','class') DEFAULT 'personal'  ← NEW
├── playlist_id         FK → playlists NULL                                        ← NEW
├── created_at          TIMESTAMPTZ
├── ended_at            TIMESTAMPTZ NULL
└── metadata            JSONB {browser_stats, device_breakdown}                    ← NEW

session_students (UNCHANGED — privacy boundary)
├── id                  UUID PK
├── session_id          FK → sessions
├── name                TEXT (first name, max 20 chars)
└── joined_at           TIMESTAMPTZ

round_scores (EXTENDED)
├── id                  UUID PK
├── session_id          FK → sessions
├── student_id          FK → session_students
├── round               INT
├── stars               SMALLINT (1-5)
├── raw_score           NUMERIC
├── activity            game_mode_id
├── duration_seconds    INT                  ← NEW (actual play time)
└── completed           BOOLEAN DEFAULT true ← NEW (did student finish?)

── TEACHER & BILLING TABLES ────────────────────────────

teacher_profiles
├── user_id             FK → auth.users PK
├── display_name        TEXT
├── avatar_url          TEXT
├── tier                ENUM('free','trial','pro')
├── trial_started_at    TIMESTAMPTZ NULL
├── trial_expires_at    TIMESTAMPTZ NULL
├── stripe_customer_id  TEXT NULL
├── stripe_subscription_id TEXT NULL
├── school_id           FK → schools NULL
├── is_admin            BOOLEAN DEFAULT false
├── settings            JSONB {default_timer, default_scoreboard, max_students, email_digest}
├── onboarded_at        TIMESTAMPTZ NULL
└── created_at          TIMESTAMPTZ

playlists
├── id                  UUID PK
├── teacher_id          FK → auth.users
├── name                TEXT
├── description         TEXT NULL
├── activities          JSONB[] [{mode, timer, config}]
├── is_public           BOOLEAN DEFAULT false
└── created_at          TIMESTAMPTZ

── INSIGHT TABLES ──────────────────────────────────────

teacher_insights
├── id                  UUID PK
├── teacher_id          FK → auth.users
├── insight_type        ENUM('engagement','activity','timing','recommendation')
├── title               TEXT
├── body                TEXT
├── data_snapshot       JSONB (input used for generation)
├── severity            ENUM('info','suggestion','warning')
├── generated_at        TIMESTAMPTZ
├── dismissed_at        TIMESTAMPTZ NULL
└── expires_at          TIMESTAMPTZ (generated_at + 30d)

platform_insights (same structure, teacher_id replaced with scope)
├── scope               ENUM('platform','activity','growth','operations')

── OPERATIONAL TABLES ──────────────────────────────────

client_errors
├── id                  UUID PK
├── error_type          TEXT (camera_denied, join_failed, score_submit_failed, ...)
├── message             TEXT
├── user_agent          TEXT
├── session_id          FK → sessions NULL
├── reported_at         TIMESTAMPTZ
└── metadata            JSONB

admin_alerts
├── id                  UUID PK
├── alert_type          TEXT
├── severity            ENUM('info','warning','critical')
├── message             TEXT
├── resolved            BOOLEAN DEFAULT false
├── created_at          TIMESTAMPTZ
└── resolved_at         TIMESTAMPTZ NULL`}</Pre>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Heading size={14}>Materialized Views</Heading>
        <Pre>{`v_teacher_session_stats  (refresh: on session end + daily cron)
  → Per teacher: sessions_count, rounds_count, students_count,
    avg_stars, avg_duration, avg_students_per_session
  → Grouped by: day, week, month

v_activity_performance  (refresh: daily cron)
  → Per activity: usage_count, avg_stars, avg_completion_rate,
    avg_duration, drop_off_by_round
  → Scoped by: teacher_id, school_id, or platform-wide

v_engagement_metrics  (refresh: daily cron)
  → Participation rate, star distribution, completion rates by timer,
    sessions_by_hour, sessions_by_day_of_week
  → Scoped by: teacher_id or platform-wide

v_growth_metrics  (refresh: daily cron)
  → New signups, trial activations, conversions, churn events
  → Revenue snapshots (synced from Stripe webhooks)
  → Grouped by: day, week, month

v_school_overview  (refresh: daily cron)
  → Per school: teacher_count, active_teachers, sessions_count,
    students_reached, top_activities, seat_utilisation`}</Pre>
      </Card>

      <DecisionBox
        title="View Refresh Strategy"
        decision="Hybrid: (1) Postgres trigger refreshes v_teacher_session_stats on session end (immediate); (2) pg_cron refreshes all views daily at 3am UTC (comprehensive); (3) CONCURRENTLY flag prevents read-blocking."
        reasoning="Session end is the natural write boundary — refreshing the teacher's view at that moment means their dashboard is always current after class. Daily cron catches everything else (growth metrics, platform views) without per-event overhead."
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 10: AI INSIGHT ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S10_AI() {
  return (
    <div>
      <Heading size={20} sub="Claude-powered analytics with strict privacy boundaries and rule-based fallback.">10. AI Insight Engine</Heading>

      <Grid cols={3} gap={14} style={{ marginBottom: 16 }}>
        {[
          { title: "Collection", color: C.accent, desc: "Postgres materialized views aggregate session data. A pg_cron job (weekly) identifies teachers with new sessions since last insight generation. Builds structured JSON summary per teacher. Never includes student names — only numeric aggregates." },
          { title: "Generation", color: C.primary, desc: "Supabase Edge Function calls Claude API (claude-haiku-4-5 for teacher insights, claude-sonnet-4-6 for weekly platform report). Education-analytics system prompt. Structured JSON output with title, body, severity, type. Max 5 insights per teacher per cycle." },
          { title: "Delivery", color: C.success, desc: "Insights stored in teacher_insights / platform_insights tables. Dashboard renders as dismissable cards. Optional weekly email digest via Resend (opt-in in teacher settings). Trial users see 1 insight, Pro sees all 5." },
        ].map(l => (
          <Card key={l.title} accent={l.color}>
            <div style={{ fontSize: 12, fontWeight: 700, color: l.color, marginBottom: 6 }}>{l.title}</div>
            <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.6 }}>{l.desc}</div>
          </Card>
        ))}
      </Grid>

      <Card style={{ marginBottom: 16 }}>
        <Heading size={14}>System Prompt (Teacher-Level)</Heading>
        <Pre>{`You are an education platform analytics assistant for Draw in the Air,
a gesture-based learning platform for children aged 3–7.

RULES:
- You analyse PLATFORM USAGE and ENGAGEMENT PATTERNS only
- You NEVER diagnose children, assess learning ability, or make claims
  about individual student development
- You NEVER reference student names (the data contains none)
- All insights must be actionable for the teacher
- Focus on what the teacher can CHANGE: activity selection, round duration,
  session frequency, scoreboard mode

INPUT: A JSON summary of the teacher's classroom data (last 30 days).
Contains only aggregated metrics: session counts, star averages,
completion rates, duration stats, activity breakdowns.

OUTPUT: JSON array of 3-5 insights, each with:
- title: string (under 15 words, specific and actionable)
- body: string (2-3 sentences with specific numbers from the data)
- severity: "info" | "suggestion" | "warning"
- insight_type: "engagement" | "activity" | "timing" | "recommendation"

FOCUS AREAS (prioritise in this order):
1. Round duration optimisation (strongest lever for engagement)
2. Activity effectiveness comparison (guide activity selection)
3. Drop-off patterns (identify friction points)
4. Session frequency patterns (encourage consistency)
5. Untried activities (expand usage)`}</Pre>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Heading size={14}>Platform-Level AI Intelligence (Admin)</Heading>
        <Pre>{`Weekly platform report generated by Claude Sonnet:
- Aggregates ALL platform data (no PII)
- Produces structured analysis across 4 domains:

1. PRODUCT INTELLIGENCE
   "Balloon Math engagement increased 18% after timer default changed to 60s"
   "Sort & Place has highest drop-off in round 3 — consider difficulty rebalancing"

2. GROWTH INTELLIGENCE
   "Trial conversion peaks on day 3 — consider triggering a feature demo on day 2"
   "Schools with >3 active teachers have 92% renewal rate vs 61% for 1-teacher schools"

3. OPERATIONAL INTELLIGENCE
   "Camera permission denials spiked 40% on Chrome 124 — investigate API change"
   "Score submission latency increased 200ms after last edge function deploy"

4. STRATEGIC RECOMMENDATIONS
   "Consider adding a 'Class of the Week' feature — 78% of teachers run sessions weekly"
   "Word Search has lowest usage but highest completion — consider promoting it"

STRICT CONSTRAINT:
The AI must never claim to diagnose learning disabilities, developmental
delays, or educational outcomes. It analyses platform behaviour only.`}</Pre>
      </Card>

      <Grid cols={2} gap={14}>
        <Card accent={C.success}>
          <Heading size={14}>Cost Model</Heading>
          <Bullet items={[
            "Teacher insights: Claude Haiku @ ~$0.001/batch → $0.50/month for 500 teachers",
            "Platform report: Claude Sonnet @ ~$0.02/run (weekly) → $0.08/month",
            "On-demand 'Analyse Now': rate-limited to 1/day per teacher → negligible",
            "Total estimated: <$2/month at 500 teachers, <$15/month at 5,000",
            "Insights cached — only regenerated when new session data exists",
          ]} color={C.success} />
        </Card>
        <Card accent={C.warning}>
          <Heading size={14}>Rule-Based Fallback</Heading>
          <Bullet items={[
            "If Claude API unavailable, fall back to Postgres function: generate_rule_insights(teacher_id)",
            "10 hardcoded rules covering most common patterns:",
            "  → completion_rate < 0.6 AND timer > 90s → 'Try shorter rounds'",
            "  → single_activity_usage > 80% → 'Try varying activities'",
            "  → sessions_this_week = 0 AND last_session > 7d → 'Consistency reminder'",
            "  → drop_off_round_3 > 40% → 'Consider 2-round sessions'",
            "Fallback insights stored with source='rule_engine' for tracking",
          ]} color={C.warning} />
        </Card>
      </Grid>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 11: PRIVACY & RETENTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S11_Privacy() {
  return (
    <div>
      <Heading size={20} sub="The system is architecturally incapable of storing persistent child identities.">11. Privacy & Retention Architecture</Heading>

      <Card style={{ marginBottom: 16 }}>
        <Heading size={14}>Privacy Principles (Non-Negotiable)</Heading>
        <Table
          headers={["Principle", "Implementation", "Verification"]}
          rows={[
            ["No student accounts", "session_students has no FK to auth.users. No email column. No password.", "Schema review: table has only (id, session_id, name, joined_at)"],
            ["Session-scoped identity", "student UUID is per-session. Same child, two sessions = two unlinked UUIDs", "No cross-session JOIN possible on student identity"],
            ["First name only", "TEXT column, max 20 chars. No surname field exists in schema", "CHECK constraint: char_length(name) <= 20"],
            ["No camera storage", "MediaPipe runs client-side only. No server endpoint accepts image data", "No Supabase storage bucket for images. No upload API"],
            ["AI never sees names", "Insight generation uses aggregated views (counts, averages). Views exclude student names", "View definitions reviewed: no JOIN to session_students.name"],
            ["Aggregates survive purge", "Materialized views retain counts/averages. Source rows deleted", "Purge job deletes round_scores + session_students only"],
            ["COPPA alignment", "No PII collection from children under 13. No account creation. No parental consent needed", "Architecture review: no PII collection path exists"],
          ]}
        />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Heading size={14}>Data Retention Pipeline</Heading>
        <Pre>{`pg_cron job: "retention_purge" — runs daily at 2:00 AM UTC

Step 1: Refresh all materialized views (preserves aggregates)
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_teacher_session_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_activity_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_engagement_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_school_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_growth_metrics;

Step 2: Delete expired student data (academic year boundary)
  -- For school-linked sessions: use school's academic_year_end
  DELETE FROM round_scores rs
  USING sessions s, schools sc
  WHERE rs.session_id = s.id
    AND s.school_id = sc.id
    AND s.ended_at < make_date(
      CASE WHEN CURRENT_DATE > make_date(extract(year from CURRENT_DATE)::int,
        extract(month from sc.academic_year_end)::int,
        extract(day from sc.academic_year_end)::int)
      THEN extract(year from CURRENT_DATE)::int
      ELSE extract(year from CURRENT_DATE)::int - 1
      END,
      extract(month from sc.academic_year_end)::int,
      extract(day from sc.academic_year_end)::int
    );

  -- For non-school sessions: use global default (July 31)
  DELETE FROM round_scores rs
  USING sessions s
  WHERE rs.session_id = s.id
    AND s.school_id IS NULL
    AND s.ended_at < make_date(
      CASE WHEN CURRENT_DATE > make_date(extract(year from CURRENT_DATE)::int, 7, 31)
      THEN extract(year from CURRENT_DATE)::int
      ELSE extract(year from CURRENT_DATE)::int - 1
      END, 7, 31
    );

  -- Matching deletes for session_students (same logic)

Step 3: Purge expired trial data (7 days post-expiry, if not converted)
  DELETE FROM round_scores rs
  USING sessions s, teacher_profiles tp
  WHERE rs.session_id = s.id
    AND s.teacher_id = tp.user_id
    AND tp.tier = 'free'
    AND tp.trial_expires_at IS NOT NULL
    AND tp.trial_expires_at + INTERVAL '7 days' < NOW();

  -- Matching delete for session_students

Step 4: Anonymise session metadata (nullify codes for old sessions)
  UPDATE sessions SET code = NULL
  WHERE ended_at < NOW() - INTERVAL '30 days';

Step 5: Expire old insights
  DELETE FROM teacher_insights WHERE expires_at < NOW();
  DELETE FROM platform_insights WHERE expires_at < NOW();

Step 6: Purge old client errors (keep 90 days)
  DELETE FROM client_errors WHERE reported_at < NOW() - INTERVAL '90 days';`}</Pre>
      </Card>

      <DecisionBox
        title="GDPR Right to Erasure"
        decision="Teacher can delete their account via /dashboard/settings. This triggers: (1) delete teacher_profiles row, (2) cascade delete all sessions + scores + insights, (3) remove from school_teachers if applicable, (4) cancel Stripe subscription. Completed within 30 days per GDPR."
        reasoning="Cascade delete is the simplest and most complete approach. Since aggregated materialized views don't contain teacher_id mappings at the individual row level, deleting the source data is sufficient."
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 12: DEPLOYMENT ARCHITECTURE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S12_Deployment() {
  return (
    <div>
      <Heading size={20} sub="One framework. One deployment. One domain. No micro-frontend complexity.">12. Final Deployment Architecture</Heading>

      <DecisionBox
        title="Framework"
        decision="Next.js 14 App Router — single application, deployed on Vercel."
        reasoning="The hybrid Vite+Next.js approach introduces micro-frontend complexity (iframe embedding, shared auth, CORS, dual build pipelines) that is not justified at this stage. Next.js App Router handles both SSR marketing pages and client-only game routes in a single codebase. The game engine (hand tracking, canvas, MediaPipe) runs entirely client-side inside 'use client' route segments — SSR never touches it."
      />

      <Card style={{ marginBottom: 16, marginTop: 16 }}>
        <Heading size={14}>Architecture Diagram</Heading>
        <Pre>{`┌─────────────────────────────────────────────────────────┐
│                    VERCEL (CDN + Edge)                   │
│                                                         │
│  Next.js 14 App Router                                  │
│  ├── /                    SSR  (marketing)               │
│  ├── /about, /pricing...  SSR  (marketing)               │
│  ├── /auth/*              SSR  (OAuth flow)               │
│  ├── /dashboard/*         SSR  (teacher dashboard)        │
│  ├── /school/*            SSR  (school dashboard)         │
│  ├── /admin/*             SSR  (admin command center)     │
│  ├── /play/*              CSR  ('use client' — game SPA)  │
│  ├── /join/*              CSR  ('use client' — student)   │
│  ├── /classroom/*         CSR  ('use client' — live)      │
│  └── /api/*               API  (webhooks, AI proxy)       │
│                                                         │
│  API Routes:                                            │
│  ├── /api/stripe/webhook     Stripe event handler        │
│  ├── /api/insights/generate  Proxy to Supabase Edge Fn   │
│  └── /api/errors/report      Client error beacon         │
│                                                         │
│  Middleware:                                            │
│  ├── Auth guard (redirect unauthenticated from /dash*)   │
│  ├── Tier guard (redirect free users from Pro routes)    │
│  ├── Admin guard (check is_admin flag)                   │
│  └── School guard (check school membership)              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ HTTPS / WebSocket
                  │
┌─────────────────▼───────────────────────────────────────┐
│                     SUPABASE                             │
│                                                         │
│  Postgres Database                                      │
│  ├── 12 tables (see Section 9)                           │
│  ├── 5 materialized views                                │
│  ├── RLS policies (tier-based access control)            │
│  ├── Triggers (school membership → tier sync)            │
│  └── pg_cron (daily purge, weekly insight trigger)       │
│                                                         │
│  Auth (GoTrue)                                          │
│  ├── Google OAuth provider                               │
│  └── JWT with custom claims (tier, school_id, is_admin)  │
│                                                         │
│  Realtime                                               │
│  ├── Session status broadcasts                           │
│  ├── Student join notifications                          │
│  └── Score submission broadcasts                         │
│                                                         │
│  Edge Functions                                         │
│  ├── generate-teacher-insights (Claude Haiku)            │
│  ├── generate-platform-report (Claude Sonnet)            │
│  ├── send-invite-email (Resend API)                      │
│  └── send-trial-reminder (Resend API)                    │
└─────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  EXTERNAL SERVICES                       │
│  ├── Stripe (billing, subscriptions, webhooks)           │
│  ├── Resend (transactional email)                        │
│  ├── Anthropic API (Claude Haiku + Sonnet)               │
│  └── Google OAuth (identity provider)                    │
└─────────────────────────────────────────────────────────┘`}</Pre>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Heading size={14}>Game Engine Integration Strategy</Heading>
        <Pre>{`The existing Vite game engine (9 activities, MediaPipe hand tracking,
canvas rendering, realtime scoring) is migrated into Next.js as
client-only route groups:

app/
├── (marketing)/           ← SSR group
│   ├── page.tsx           ← Landing page
│   ├── about/page.tsx
│   ├── pricing/page.tsx
│   └── ...
├── (auth)/                ← SSR group
│   ├── auth/login/page.tsx
│   └── auth/callback/page.tsx
├── (dashboard)/           ← SSR group, auth middleware
│   ├── layout.tsx         ← Sidebar + tier gating
│   ├── dashboard/page.tsx
│   ├── dashboard/sessions/page.tsx
│   └── ...
├── (school)/              ← SSR group, school middleware
├── (admin)/               ← SSR group, admin middleware
├── (game)/                ← CLIENT-ONLY group
│   ├── layout.tsx         ← 'use client', loads MediaPipe, no SSR
│   ├── play/page.tsx      ← Game launcher
│   ├── play/[mode]/page.tsx ← Activity runner
│   ├── join/page.tsx      ← Student join
│   ├── join/lobby/page.tsx
│   ├── join/play/page.tsx
│   ├── classroom/start/page.tsx
│   └── classroom/[id]/...
└── api/                   ← API routes

Migration approach:
1. Copy src/features/ (game modes, tracking) into app/(game)/
2. Replace custom router (main.tsx) with Next.js file-based routing
3. Replace custom Supabase client with @supabase/ssr
4. 'use client' on all game components (they're already client-only)
5. Shared components (Logo, etc.) in /components/
6. Game-specific code stays isolated in (game)/ group`}</Pre>
      </Card>

      <Grid cols={2} gap={14}>
        <Card accent={C.primary}>
          <Heading size={14}>Background Jobs</Heading>
          <Bullet items={[
            "pg_cron: daily retention purge (2am UTC)",
            "pg_cron: daily materialized view refresh (3am UTC)",
            "pg_cron: weekly → trigger Edge Function: generate-teacher-insights",
            "pg_cron: weekly → trigger Edge Function: generate-platform-report",
            "pg_cron: daily → check trial_expires_at, send reminder emails on day 4",
            "Postgres trigger: on session UPDATE to 'ended' → refresh teacher view",
            "Postgres trigger: on school_teachers INSERT/DELETE → sync teacher tier",
          ]} color={C.primary} />
        </Card>
        <Card accent={C.success}>
          <Heading size={14}>Environment Variables</Heading>
          <Pre>{`# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Anthropic
ANTHROPIC_API_KEY

# Resend
RESEND_API_KEY

# App
NEXT_PUBLIC_APP_URL
ADMIN_USER_IDS (comma-separated)`}</Pre>
        </Card>
      </Grid>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SECTION 13: CRITICAL OPEN QUESTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function S13_Questions() {
  const questions = [
    {
      q: "Stripe pricing structure",
      detail: "What are the exact prices for Teacher Pro monthly/annual and each School seat tier? This is needed before implementing the pricing page and Stripe product configuration.",
      blocking: true,
    },
    {
      q: "Existing Supabase project ID",
      detail: "Confirm the Supabase project to extend. I need the project ref to run migrations against the correct database and configure the new tables, views, triggers, and pg_cron jobs.",
      blocking: true,
    },
    {
      q: "Email sender domain",
      detail: "What domain will transactional emails come from? (e.g., hello@drawintheair.com). Needed for Resend configuration for trial reminders and school invitations.",
      blocking: false,
    },
    {
      q: "Admin user identification",
      detail: "What are the Google email addresses of the initial admin team? These will be used to set is_admin=true in teacher_profiles and grant access to /admin routes.",
      blocking: false,
    },
    {
      q: "Current deployment setup",
      detail: "Is the current Vite app deployed on Vercel already? Or a different provider? Need to plan the Next.js migration pathway and domain configuration.",
      blocking: true,
    },
    {
      q: "Academic year variation",
      detail: "Should the default academic year end be July 31 globally, or do you need region-specific defaults? (UK: July, US: June, Australia: December). Affects the retention purge logic.",
      blocking: false,
    },
  ];

  return (
    <div>
      <Heading size={20} sub="These must be resolved before engineering begins. Blocking questions stop implementation; non-blocking can be resolved in parallel.">13. Critical Open Questions</Heading>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {questions.map((q, i) => (
          <Card key={i} accent={q.blocking ? C.danger : C.warning}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Badge color={q.blocking ? C.danger : C.warning}>{q.blocking ? "BLOCKING" : "NON-BLOCKING"}</Badge>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{q.q}</span>
            </div>
            <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>{q.detail}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 20, borderTop: `3px solid ${C.success}` }}>
        <Heading size={14}>Implementation Order (Recommended)</Heading>
        <Pre>{`Phase 1: Foundation (Week 1-2)
  ├── Next.js project setup + Supabase migration
  ├── Auth flow (Google OAuth + teacher_profiles + tier system)
  ├── Game engine migration to Next.js (game) group
  ├── Student join flow (/join/*)
  └── Basic classroom mode (/classroom/*)

Phase 2: Dashboard & Trial (Week 3-4)
  ├── Teacher dashboard shell + sidebar
  ├── Overview panel + session history
  ├── Trial experience (banner, blur, gating)
  ├── Upgrade flow + Stripe integration
  └── Scoreboard sensitivity controls

Phase 3: Analytics & Pro (Week 5-6)
  ├── Materialized views + analytics queries
  ├── Activity analytics page
  ├── Engagement analytics page
  ├── Playlists system
  └── Session replay

Phase 4: AI & School (Week 7-8)
  ├── Edge Functions for insight generation
  ├── AI insight cards on dashboard
  ├── School signup + teacher management
  ├── School analytics
  └── Email system (Resend)

Phase 5: Admin & Polish (Week 9-10)
  ├── Admin command center (3 layers)
  ├── Operational monitoring
  ├── Growth analytics
  ├── Platform AI intelligence
  └── Retention pipeline + testing`}</Pre>
      </Card>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN APPLICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const sections = [
  { id: "tiers", label: "Tier Model", component: S1_TierModel },
  { id: "roles", label: "Roles & Permissions", component: S2_Roles },
  { id: "routes", label: "Route Architecture", component: S3_Routes },
  { id: "nav", label: "Navigation", component: S4_Navigation },
  { id: "trial", label: "Trial Experience", component: S5_Trial },
  { id: "pro", label: "Teacher Pro", component: S6_TeacherPro },
  { id: "school", label: "School License", component: S7_School },
  { id: "admin", label: "Admin Center", component: S8_Admin },
  { id: "analytics", label: "Analytics", component: S9_Analytics },
  { id: "ai", label: "AI Engine", component: S10_AI },
  { id: "privacy", label: "Privacy", component: S11_Privacy },
  { id: "deploy", label: "Deployment", component: S12_Deployment },
  { id: "questions", label: "Open Questions", component: S13_Questions },
];

export default function App() {
  const [active, setActive] = useState("tiers");
  const Section = sections.find(s => s.id === active)?.component || S1_TierModel;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: font }}>
      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "14px 20px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: 18, fontWeight: 800,
              background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Draw in the Air — Final Architecture Blueprint
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textDim }}>
              v2.1 Implementation-Ready · 74 Routes · 5 Tiers · 13 Sections · Every Decision Final
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Badge color={C.danger}>FINAL</Badge>
            <Badge color={C.success}>13 Sections</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "0 20px", overflowX: "auto", display: "flex", gap: 0,
        scrollbarWidth: "thin",
      }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)} style={{
            padding: "10px 14px", border: "none",
            borderBottom: `2px solid ${active === s.id ? C.primary : "transparent"}`,
            background: "transparent", color: active === s.id ? C.text : C.textDim,
            cursor: "pointer", fontSize: 11, fontWeight: active === s.id ? 700 : 500,
            whiteSpace: "nowrap", transition: "all 0.15s",
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1050, margin: "0 auto", padding: "24px 20px" }}>
        <Section />
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 20px", textAlign: "center", marginTop: 32 }}>
        <p style={{ margin: 0, fontSize: 10, color: C.textDim }}>
          Draw in the Air — Final Architecture Blueprint · Implementation-Ready · Privacy-First · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
