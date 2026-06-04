/**
 * parentReport, produces a printable, parent-friendly summary of everything
 * Draw in the Air holds about a parent and their learners.
 *
 * Why not a PDF library? The brand surface is HTML + Nunito + the same
 * plum/aqua/sunshine palette as the rest of the parent area. We render a
 * dedicated print-styled page in a new tab and call window.print(), the
 * resulting "Save as PDF" output is indistinguishable from a hand-crafted
 * design PDF, with zero new dependencies and zero bundle weight.
 *
 * The JSON path remains available via openJsonExport() for engineering /
 * debug. The UI surfaces the PDF as the primary action.
 */

import { exportParentData } from '../parentApi';
import {
  describeChildSummary,
  describeActivity,
} from './progressNarrator';
import { getChildDashboard, type ChildDashboard } from '../parentApi';

interface ExportRoot {
  exported_at: string;
  parent: { id: string; email: string | null; display_name: string | null; created_at?: string; marketing_opt_in?: boolean } | null;
  subscription: {
    status: string; plan_interval: string | null;
    trial_start: string | null; trial_end: string | null;
    current_period_start: string | null; current_period_end: string | null;
    cancel_at_period_end: boolean;
    included_child_slots: number; billed_addon_quantity: number;
  } | null;
  children: Array<{
    id: string; nickname: string; avatar: string | null;
    age_band: string | null; learning_focus: string | null;
    status: string; created_at: string;
  }>;
  consent: Array<{ consent_type: string; consent_version: string; granted: boolean; granted_at: string; withdrawn_at: string | null }>;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'Not set';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}
function escapeHtml(s: string | null | undefined): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function activityRows(child: ChildDashboard): string {
  if (!child.activities.length) {
    return `<tr><td colspan="4" class="muted">No activity history yet.</td></tr>`;
  }
  return child.activities.slice(0, 12).map(a => `
    <tr>
      <td>${escapeHtml(describeActivity(a.activity_key))}</td>
      <td class="num">${a.attempts}</td>
      <td class="num">${Math.round((a.mastery || 0) * 100)}%</td>
      <td><span class="pill pill-${a.status}">${a.status === 'mastered' ? 'Doing well' : a.status === 'practising' ? 'Practising' : a.status === 'struggling' ? 'Needs support' : 'New'}</span></td>
    </tr>
  `).join('');
}

function childSection(child: ChildDashboard): string {
  const summary = describeChildSummary(child);
  const totals = child.totals;
  const mins = totals ? Math.round((totals.total_seconds ?? 0) / 60) : 0;
  return `
    <section class="child">
      <div class="child-head">
        <div class="avatar">${escapeHtml(child.child.avatar || '🌱')}</div>
        <div>
          <h3>${escapeHtml(child.child.nickname)}</h3>
          <p class="meta">Age ${escapeHtml(child.child.age_band || 'Not set')} · Status: ${escapeHtml(child.child.status)}</p>
        </div>
      </div>
      <p class="summary">${escapeHtml(summary)}</p>
      <div class="kpis">
        <div><span class="label">Activities played</span><span class="value">${totals?.activities_played ?? 0}</span></div>
        <div><span class="label">Doing well</span><span class="value">${totals?.mastered ?? 0}</span></div>
        <div><span class="label">Practising</span><span class="value">${totals?.practising ?? 0}</span></div>
        <div><span class="label">Time learning</span><span class="value">${mins} min</span></div>
      </div>
      <table class="activity-table" aria-label="Activity history">
        <thead><tr><th>Activity</th><th>Attempts</th><th>Mastery</th><th>Status</th></tr></thead>
        <tbody>${activityRows(child)}</tbody>
      </table>
    </section>
  `;
}

function consentRows(consent: ExportRoot['consent']): string {
  if (!consent?.length) {
    return `<tr><td colspan="3" class="muted">No consent records yet.</td></tr>`;
  }
  return consent.map(c => `
    <tr>
      <td>${escapeHtml(c.consent_type.replace(/_/g, ' '))}</td>
      <td>${escapeHtml(c.consent_version)}</td>
      <td>${c.granted ? 'Granted' : 'Withdrawn'} on ${fmtDate(c.granted_at)}</td>
    </tr>
  `).join('');
}

function describeStatus(status: string): string {
  switch (status) {
    case 'active': return 'Active';
    case 'trialing': return 'In free trial';
    case 'past_due': return 'Payment past due';
    case 'canceled': return 'Cancelled';
    default: return status || 'None';
  }
}

function buildHtml(root: ExportRoot, kids: ChildDashboard[], origin: string): string {
  const sub = root.subscription;
  const sections = kids.map(childSection).join('\n');
  const logoUrl = `${origin}/logo.svg`;
  const reportFileName = `Draw in the Air, Family report, ${new Date(root.exported_at).toLocaleDateString()}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(reportFileName)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  :root {
    --plum: #6C3FA4; --plum-deep: #5A2F8C; --aqua: #1c7e80; --ink: #1A1B2E;
    --ink-soft: #4A4D6B; --mute: #6B6F84; --line: rgba(63, 64, 82, 0.16);
    --cream: #FFFAEB; --paper: #ffffff; --green: #2EAE52; --amber: #B7322F;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--paper); color: var(--ink); }
  body {
    font: 14px/1.55 Nunito, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 760px; margin: 0 auto; padding: 32px 28px; }
  header.cover {
    border-radius: 24px;
    padding: 28px 28px 30px;
    background: linear-gradient(135deg, #F8F2FF 0%, #FFFAEB 100%);
    border: 1px solid var(--line);
    margin-bottom: 28px;
  }
  .logo { height: 56px; width: auto; display: block; margin-bottom: 18px; }
  .eyebrow { font-size: 11px; font-weight: 800; color: var(--plum); letter-spacing: 0.12em; text-transform: uppercase; }
  h1 { font-size: 28px; line-height: 1.1; letter-spacing: -0.02em; font-weight: 800; margin: 10px 0 6px; }
  h1 em { font-style: normal; color: var(--plum); }
  .cover .meta { color: var(--ink-soft); font-size: 13px; margin: 0; }
  section { margin-bottom: 28px; page-break-inside: avoid; }
  section h2 {
    font-size: 18px; font-weight: 800; letter-spacing: -0.01em;
    margin: 0 0 14px;
    padding-bottom: 8px; border-bottom: 1px solid var(--line);
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .row:last-child { border-bottom: none; }
  .row .label { color: var(--mute); font-size: 12px; }
  .row .value { font-weight: 700; }
  .child { border: 1px solid var(--line); border-radius: 18px; padding: 18px 20px; margin-bottom: 18px; background: #fff; }
  .child-head { display: flex; gap: 14px; align-items: center; margin-bottom: 10px; }
  .child-head h3 { margin: 0; font-size: 17px; font-weight: 800; }
  .child-head .meta { margin: 2px 0 0; font-size: 12px; color: var(--mute); }
  .avatar {
    width: 44px; height: 44px; border-radius: 50%; font-size: 24px;
    background: linear-gradient(145deg, #FFFAEB, #FCEFC8);
    display: grid; place-items: center;
  }
  .summary { background: #FBF7EE; border-left: 3px solid var(--plum); padding: 10px 12px; margin: 10px 0 14px; border-radius: 0 10px 10px 0; color: var(--ink); }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
  .kpis > div { background: #FBF7EE; border-radius: 12px; padding: 10px; }
  .kpis .label { display: block; font-size: 11px; color: var(--mute); text-transform: uppercase; letter-spacing: 0.05em; }
  .kpis .value { display: block; font-size: 18px; font-weight: 800; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--line); }
  th { font-weight: 800; color: var(--ink-soft); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 0.02em; }
  .pill-mastered { background: rgba(46, 174, 82, 0.14); color: #1E6E3A; }
  .pill-practising { background: rgba(28, 126, 128, 0.14); color: #156466; }
  .pill-struggling { background: rgba(255, 107, 107, 0.14); color: #B7322F; }
  .pill-new { background: rgba(108, 63, 164, 0.12); color: var(--plum-deep); }
  .muted { color: var(--mute); }
  footer { color: var(--mute); font-size: 11px; padding-top: 18px; border-top: 1px solid var(--line); }
  .actions {
    position: fixed; top: 16px; right: 16px;
    display: flex; gap: 8px;
  }
  .actions button {
    appearance: none; border: none; cursor: pointer;
    padding: 10px 16px; border-radius: 999px;
    font: 800 13px Nunito, system-ui, sans-serif;
    background: var(--plum); color: #fff;
    box-shadow: 0 8px 20px rgba(108, 63, 164, 0.32);
  }
  .actions button.secondary { background: #fff; color: var(--ink); border: 1px solid var(--line); box-shadow: none; }
  @media print { .actions { display: none; } }
</style>
</head>
<body>
<div class="actions">
  <button class="secondary" onclick="window.close()">Close</button>
  <button onclick="window.print()">Save as PDF</button>
</div>
<div class="page">
  <header class="cover">
    <img src="${logoUrl}" alt="Draw in the Air" class="logo" />
    <p class="eyebrow">Family report</p>
    <h1>Your <em>Draw in the Air</em> summary</h1>
    <p class="meta">For ${escapeHtml(root.parent?.display_name || root.parent?.email || 'parent account')} · Generated ${fmtDate(root.exported_at)}</p>
  </header>

  <section>
    <h2>Account</h2>
    <div class="grid">
      <div class="row"><span class="label">Email</span><span class="value">${escapeHtml(root.parent?.email || 'Not set')}</span></div>
      <div class="row"><span class="label">Display name</span><span class="value">${escapeHtml(root.parent?.display_name || 'Not set')}</span></div>
      <div class="row"><span class="label">Account created</span><span class="value">${fmtDate(root.parent?.created_at)}</span></div>
      <div class="row"><span class="label">Marketing emails</span><span class="value">${root.parent?.marketing_opt_in ? 'On' : 'Off'}</span></div>
    </div>
  </section>

  <section>
    <h2>Subscription</h2>
    ${sub ? `
      <div class="grid">
        <div class="row"><span class="label">Status</span><span class="value">${escapeHtml(describeStatus(sub.status))}</span></div>
        <div class="row"><span class="label">Plan</span><span class="value">${escapeHtml(sub.plan_interval === 'year' ? 'Yearly family plan' : sub.plan_interval === 'month' ? 'Monthly family plan' : 'Not set')}</span></div>
        <div class="row"><span class="label">Learners included</span><span class="value">${sub.included_child_slots}</span></div>
        <div class="row"><span class="label">Extra learners billed</span><span class="value">${sub.billed_addon_quantity}</span></div>
        <div class="row"><span class="label">Trial ends</span><span class="value">${fmtDate(sub.trial_end)}</span></div>
        <div class="row"><span class="label">Next billing date</span><span class="value">${fmtDate(sub.current_period_end)}</span></div>
        <div class="row"><span class="label">Cancel scheduled</span><span class="value">${sub.cancel_at_period_end ? 'Yes' : 'No'}</span></div>
      </div>
    ` : `<p class="muted">No subscription yet.</p>`}
  </section>

  <section>
    <h2>Learners</h2>
    ${kids.length ? sections : `<p class="muted">No learners added yet.</p>`}
  </section>

  <section>
    <h2>Privacy &amp; consent</h2>
    <table>
      <thead><tr><th>Consent type</th><th>Version</th><th>Status</th></tr></thead>
      <tbody>${consentRows(root.consent)}</tbody>
    </table>
  </section>

  <footer>
    Draw in the Air · Built to keep your child safe · Generated ${fmtDate(root.exported_at)}.
    This report contains everything we hold about you and your children. You can request deletion at any time from the Account page.
  </footer>
</div>
<script>
  // Trigger the system print dialog the moment the page is ready so the
  // user is taken straight to "Save as PDF". Wait for fonts + the logo so
  // the rendered PDF includes everything.
  (function(){
    function go() {
      try { window.focus(); } catch (e) {}
      try { window.print(); } catch (e) {}
    }
    if (document.readyState === 'complete') {
      setTimeout(go, 200);
    } else {
      window.addEventListener('load', function(){ setTimeout(go, 200); });
    }
  })();
</script>
</body>
</html>`;
}

export interface ParentReportResult {
  ok: boolean;
  error?: string;
}

/** Open a brand-styled family report in a new tab and trigger Save-as-PDF. */
export async function openParentReport(): Promise<ParentReportResult> {
  const exportRes = await exportParentData();
  if (exportRes.error || !exportRes.data) {
    return { ok: false, error: exportRes.error?.message ?? 'Could not load your data.' };
  }
  const root = exportRes.data as unknown as ExportRoot;

  // Pull per-child dashboard data so the report can include activity rollups.
  const activeKids = (root.children ?? []).filter(c => c.status === 'active');
  const kidDashboards: ChildDashboard[] = [];
  for (const c of activeKids) {
    const dash = await getChildDashboard(c.id);
    if (dash) kidDashboards.push(dash);
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const html = buildHtml(root, kidDashboards, origin);

  // Open the report in a fresh window then write the HTML directly. This
  // keeps the same origin so the logo (and any future images) load, and
  // the document.write path makes Chrome use the page <title> as the
  // default "Save as PDF" filename. The page's inline <script> auto-
  // triggers window.print() so the user sees the system PDF dialog
  // immediately, they save a real .pdf, not raw HTML.
  const win = window.open('about:blank', '_blank', 'noopener,noreferrer');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    return { ok: true };
  }
  // Popups blocked, fall back to a Blob download. Most modern browsers
  // will still let the user open + print this HTML file as a PDF, just
  // with one extra step.
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drawintheair-family-report-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return { ok: true };
}

/** Power-user / engineering fallback. Triggers a JSON download. */
export async function openJsonExport(): Promise<ParentReportResult> {
  const res = await exportParentData();
  if (res.error || !res.data) return { ok: false, error: res.error?.message ?? 'Could not load your data.' };
  const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drawintheair-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}
