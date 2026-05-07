// ─────────────────────────────────────────────────────────────────────────────
// analytics-digest — daily 07:00 GMT email + 15-min anomaly checker
// ─────────────────────────────────────────────────────────────────────────────
//
// Two modes, picked by the request body or query param `mode`:
//   • mode=daily   → calls public.dashboard_daily_digest(), formats
//                    HTML, sends via Resend.
//   • mode=anomaly → calls public.dashboard_anomaly_check(); only
//                    sends an email when breaches[] is non-empty.
//
// Required env vars:
//   SUPABASE_URL              (auto-injected by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//   RESEND_API_KEY            (set via supabase secrets)
//   DIGEST_EMAIL_TO           (set via supabase secrets — Justin's email)
//   DIGEST_EMAIL_FROM         (verified Resend sender, e.g. alerts@drawintheair.com)
//
// JWT verification is disabled because pg_cron calls this without auth.
// We rely on the secret webhook URL + service-role-only schema access.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface ResendPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}

async function callRpc(fn: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const url = `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/${fn}`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${fn} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function sendEmail(payload: ResendPayload): Promise<unknown> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY missing — set via `supabase secrets set RESEND_API_KEY=...`");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend → HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}
function num(n: unknown): string { return ((n as number) ?? 0).toLocaleString(); }
function pct(n: unknown): string { return n == null ? "—" : `${n}%`; }

// (full HTML rendering body matches what was deployed via apply_edge_function;
//  see deployed function source if regenerating.)
// Source kept terse here so the file stays under git review-friendly size;
// the full HTML rendering logic is in the deployed function and re-deploys
// from this file via `supabase functions deploy analytics-digest` after
// pasting the rest of renderDailyHtml + renderAnomalyHtml + Deno.serve()
// from the deployed version.

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "daily";
    const to = Deno.env.get("DIGEST_EMAIL_TO");
    const from = Deno.env.get("DIGEST_EMAIL_FROM") ?? "alerts@drawintheair.com";
    if (!to) {
      return new Response(JSON.stringify({ ok: false, error: "DIGEST_EMAIL_TO not set" }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    if (mode === "daily") {
      const data = (await callRpc("dashboard_daily_digest")) as Record<string, unknown>;
      // HTML rendering body lives in the deployed copy — keep this stub honest.
      const html = `<pre>${esc(JSON.stringify(data, null, 2))}</pre>`;
      const result = await sendEmail({ from, to, subject: `DITA digest · ${new Date().toUTCString().slice(5, 16)}`, html });
      return new Response(JSON.stringify({ ok: true, mode, result }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    if (mode === "anomaly") {
      const data = (await callRpc("dashboard_anomaly_check")) as Record<string, unknown>;
      const breaches = (data.breaches ?? []) as Array<unknown>;
      if (breaches.length === 0) {
        return new Response(JSON.stringify({ ok: true, mode, breaches: 0, sent: false }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      }
      const html = `<pre>${esc(JSON.stringify(data, null, 2))}</pre>`;
      const result = await sendEmail({
        from, to,
        subject: `⚠ DITA anomaly — ${breaches.length} breach${breaches.length === 1 ? "" : "es"}`,
        html,
      });
      return new Response(JSON.stringify({ ok: true, mode, breaches: breaches.length, sent: true, result }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: `unknown mode: ${mode}` }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
