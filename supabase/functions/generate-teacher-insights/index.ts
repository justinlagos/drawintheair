import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const SYSTEM_PROMPT = `You are an education platform analytics assistant for Draw in the Air, a gesture-based learning platform for children aged 3-7.

RULES:
- You analyse PLATFORM USAGE and ENGAGEMENT PATTERNS only
- You NEVER diagnose children, assess learning ability, or make claims about individual student development
- You NEVER reference student names (the data contains none)
- All insights must be actionable for the teacher
- Focus on what the teacher can CHANGE: activity selection, round duration, session frequency, scoreboard mode

INPUT: A JSON summary of the teacher's classroom data (last 30 days).
Contains only aggregated metrics: session counts, star averages, completion rates, duration stats, activity breakdowns.

OUTPUT: Return a JSON object with an "insights" array of 3-5 items, each with:
- title: string (under 15 words, specific and actionable)
- body: string (2-3 sentences with specific numbers from the data)
- severity: "info" | "suggestion" | "warning"
- insight_type: "engagement" | "activity" | "timing" | "recommendation"

FOCUS AREAS (prioritise in this order):
1. Round duration optimisation (strongest lever for engagement)
2. Activity effectiveness comparison (guide activity selection)
3. Drop-off patterns (identify friction points)
4. Session frequency patterns (encourage consistency)
5. Untried activities (expand usage)

Respond with valid JSON only. No markdown, no explanation.`;

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));

    // Caller-identity gate.
    // If a specific teacher_id is requested, the caller MUST be that teacher.
    // Cron-mode (no teacher_id) is only allowed for the service role caller
    // (the scheduled job runs with the service-role JWT).
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (body.teacher_id) {
      if (!token) {
        return new Response(JSON.stringify({ error: "missing_authorization" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Resolve the caller from the JWT using the anon client so we honour
      // the user's token rather than the service role.
      const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "invalid_token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      const callerId = userData.user.id;

      // Primary gate: the caller's auth user id must equal the requested teacher_id.
      // (teachers.id is the auth.users.id in this schema.)
      if (callerId !== body.teacher_id) {
        // Secondary check: if a teacher_profiles row exists for this caller,
        // it must also resolve to the same teacher id.
        const { data: profile } = await supabase
          .from("teacher_profiles")
          .select("id, auth_user_id")
          .eq("auth_user_id", callerId)
          .maybeSingle();

        const profileTeacherId = profile?.id || profile?.auth_user_id;
        if (!profileTeacherId || profileTeacherId !== body.teacher_id) {
          return new Response(JSON.stringify({ error: "forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Confirm the teacher row actually exists.
      const { data: teacherRow } = await supabase
        .from("teachers")
        .select("id")
        .eq("id", body.teacher_id)
        .maybeSingle();
      if (!teacherRow) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Get teacher_id from request body or process all teachers (cron mode)
    const teacherIds: string[] = [];

    if (body.teacher_id) {
      teacherIds.push(body.teacher_id);
    } else {
      // Cron mode: find all pro/trial teachers with sessions in last 30 days
      const { data: teachers } = await supabase
        .from("teachers")
        .select("id")
        .in("tier", ["pro", "trial"])
        .not("id", "is", null);

      if (teachers) {
        // Filter to those with recent sessions
        for (const t of teachers) {
          const { count } = await supabase
            .from("sessions")
            .select("*", { count: "exact", head: true })
            .eq("teacher_id", t.id)
            .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          if (count && count > 0) teacherIds.push(t.id);
        }
      }
    }

    const results: Record<string, unknown>[] = [];

    for (const teacherId of teacherIds) {
      // Check if insights were generated recently (within 24h for on-demand, 7d for cron)
      const cooldown = body.teacher_id ? 24 : 168; // hours
      const { data: recent } = await supabase
        .from("teacher_insights")
        .select("id")
        .eq("teacher_id", teacherId)
        .gte("generated_at", new Date(Date.now() - cooldown * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recent && recent.length > 0) continue;

      // Aggregate teacher data
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, activity, round, timer_seconds, scoreboard_mode, created_at, ended_at")
        .eq("teacher_id", teacherId)
        .eq("status", "ended")
        .gte("created_at", thirtyDaysAgo);

      if (!sessions || sessions.length === 0) continue;

      const sessionIds = sessions.map(s => s.id);

      const { data: scores } = await supabase
        .from("round_scores")
        .select("session_id, round, stars, raw_score, activity, duration_seconds, completed")
        .in("session_id", sessionIds);

      const { data: students } = await supabase
        .from("session_students")
        .select("session_id")
        .in("session_id", sessionIds);

      // Build summary
      const activitiesUsed: Record<string, { sessions: number; avg_stars: number; avg_duration: number; total_scores: number; completed: number }> = {};
      const roundDurations: Record<string, { count: number; completion: number }> = {};
      const sessionsByHour: Record<number, number> = {};
      const starDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      for (const s of sessions) {
        const hour = new Date(s.created_at).getHours();
        sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;

        const key = `${s.timer_seconds}s`;
        if (!roundDurations[key]) roundDurations[key] = { count: 0, completion: 0 };
        roundDurations[key].count++;

        if (!activitiesUsed[s.activity]) {
          activitiesUsed[s.activity] = { sessions: 0, avg_stars: 0, avg_duration: 0, total_scores: 0, completed: 0 };
        }
        activitiesUsed[s.activity].sessions++;
      }

      if (scores) {
        for (const sc of scores) {
          if (sc.stars >= 1 && sc.stars <= 5) starDist[sc.stars]++;
          if (activitiesUsed[sc.activity]) {
            activitiesUsed[sc.activity].avg_stars += sc.stars;
            activitiesUsed[sc.activity].avg_duration += (sc.duration_seconds || 0);
            activitiesUsed[sc.activity].total_scores++;
            if (sc.completed) activitiesUsed[sc.activity].completed++;
          }

          const session = sessions.find(s => s.id === sc.session_id);
          if (session) {
            const key = `${session.timer_seconds}s`;
            if (roundDurations[key] && sc.completed) {
              roundDurations[key].completion++;
            }
          }
        }
      }

      // Compute averages
      for (const act of Object.values(activitiesUsed)) {
        if (act.total_scores > 0) {
          act.avg_stars = Math.round((act.avg_stars / act.total_scores) * 100) / 100;
          act.avg_duration = Math.round(act.avg_duration / act.total_scores);
        }
      }

      for (const rd of Object.values(roundDurations)) {
        if (rd.count > 0) {
          rd.completion = Math.round((rd.completion / rd.count) * 100) / 100;
        }
      }

      const summary = {
        teacher_id: teacherId,
        period: "last_30_days",
        total_sessions: sessions.length,
        total_rounds: sessions.reduce((sum, s) => sum + s.round, 0),
        total_students_joined: students?.length || 0,
        activities_used: activitiesUsed,
        round_durations: roundDurations,
        sessions_by_hour: sessionsByHour,
        star_distribution: starDist,
      };

      // Call Claude API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: JSON.stringify(summary) }],
        }),
      });

      if (!response.ok) {
        console.error("Claude API error:", response.status, await response.text());
        continue;
      }

      const aiResult = await response.json();
      const content = aiResult.content?.[0]?.text;
      if (!content) continue;

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        console.error("Failed to parse Claude response:", content);
        continue;
      }

      const insights = parsed.insights || parsed;
      if (!Array.isArray(insights)) continue;

      // Store insights
      for (const insight of insights.slice(0, 5)) {
        await supabase.from("teacher_insights").insert({
          teacher_id: teacherId,
          insight_type: insight.insight_type || "engagement",
          title: insight.title,
          body: insight.body,
          severity: insight.severity || "info",
          source: "ai",
          data_snapshot: summary,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      results.push({ teacher_id: teacherId, insights_generated: insights.length });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
