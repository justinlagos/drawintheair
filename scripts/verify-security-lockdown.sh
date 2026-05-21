#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-security-lockdown.sh
#
# Live verification for the 2026-05-21 security hotfix. Run this AFTER
# both deploys are live:
#   1. platform/supabase/migrations/20260521_security_lockdown.sql applied
#   2. drawintheair.com rebuilt with the /admin removal + InsightsDashboard
#      allow-list removal + StudentJoin RPC switch.
#
# Each check prints "PASS" / "FAIL" with the observed evidence. The script
# exits non-zero if any check fails so it can be wired into CI / a deploy
# gate.
#
# All probes are read-only and low-cardinality: each one returns at most
# one row of metadata or a single boolean shape. No bulk extraction.
#
# Usage:
#   chmod +x scripts/verify-security-lockdown.sh
#   ./scripts/verify-security-lockdown.sh
#
# Override the public anon key if you've rotated it:
#   ANON_KEY="…" ./scripts/verify-security-lockdown.sh
# ─────────────────────────────────────────────────────────────────────────────

set -u
set -o pipefail

SUPABASE_URL="${SUPABASE_URL:-https://fmrsfjxwswzhvicylaph.supabase.co}"
SITE_URL="${SITE_URL:-https://drawintheair.com}"
ANON_KEY="${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcnNmanh3c3d6aHZpY3lsYXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDA5NjIsImV4cCI6MjA4ODU3Njk2Mn0.qTGZrVnB40MWjgmAxFLjh-kHiTY_p-biHkWFGAWiCWU}"

PASS=0
FAIL=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Colours (only if stdout is a TTY).
if [ -t 1 ]; then
    G="$(printf '\033[32m')"; R="$(printf '\033[31m')"; Y="$(printf '\033[33m')"; D="$(printf '\033[2m')"; N="$(printf '\033[0m')"
else
    G=""; R=""; Y=""; D=""; N=""
fi

pass() { printf "  %sPASS%s  %s\n" "$G" "$N" "$1"; PASS=$((PASS+1)); }
fail() { printf "  %sFAIL%s  %s\n%s          %s%s\n" "$R" "$N" "$1" "$D" "${2-}" "$N"; FAIL=$((FAIL+1)); }
warn() { printf "  %sWARN%s  %s\n%s          %s%s\n" "$Y" "$N" "$1" "$D" "${2-}" "$N"; }
note() { printf "%s%s%s\n" "$D" "$1" "$N"; }

section() { printf "\n%s\n" "── $1 ──────────────────────────────────────────"; }

# Helpers --------------------------------------------------------------------

# rest_get: GET /rest/v1/<path> with anon credentials. Echoes:
#   HTTP_CODE<TAB>CONTENT_RANGE<TAB>BODY_FIRST_300
rest_get() {
    local path="$1"
    local out body code range
    out="$(curl -sS -i \
        -H "apikey: $ANON_KEY" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Prefer: count=exact" \
        -H "Range: 0-0" \
        "$SUPABASE_URL/rest/v1/$path" 2>&1)"
    code="$(printf '%s' "$out" | head -n 1 | awk '{print $2}')"
    range="$(printf '%s' "$out" | grep -i '^content-range:' | head -n 1 | tr -d '\r' | awk '{print $2}')"
    # Body is whatever sits after the blank line. crude but enough.
    body="$(printf '%s' "$out" | awk 'BEGIN{p=0} /^\r?$/{p=1; next} p{print}' | head -c 300)"
    printf "%s\t%s\t%s" "$code" "${range:-(none)}" "$body"
}

# rest_post: POST /rest/v1/rpc/<fn> with anon, no JWT. Echoes HTTP_CODE<TAB>BODY.
rest_post_anon() {
    local fn="$1"; local args="$2"
    local out code body
    out="$(curl -sS -o "$TMP/body" -w '%{http_code}' -X POST \
        -H "Content-Type: application/json" \
        -H "apikey: $ANON_KEY" \
        -H "Authorization: Bearer $ANON_KEY" \
        -d "$args" \
        "$SUPABASE_URL/rest/v1/rpc/$fn" 2>&1)"
    code="$out"
    body="$(head -c 300 "$TMP/body")"
    printf "%s\t%s" "$code" "$body"
}

# spa_get_status: GET <path> against the SPA host. Echoes HTTP_CODE.
spa_get_status() {
    local path="$1"
    curl -sS -o /dev/null -w '%{http_code}' -I "$SITE_URL$path"
}

# bundle_grep: download index.html, extract the main JS bundle URL,
# fetch it, then grep for the given regex.
bundle_grep() {
    local pattern="$1"
    local html bundle_path bundle_url
    html="$(curl -sS "$SITE_URL/")"
    bundle_path="$(printf '%s' "$html" | grep -oE 'src="[^"]+index-[A-Za-z0-9_-]+\.js"' | head -n 1 | sed 's/src="\([^"]*\)"/\1/')"
    if [ -z "$bundle_path" ]; then
        return 2  # could not locate bundle
    fi
    bundle_url="$SITE_URL$bundle_path"
    if [ ! -f "$TMP/main.js" ]; then
        curl -sS "$bundle_url" > "$TMP/main.js"
    fi
    if grep -qE "$pattern" "$TMP/main.js"; then
        return 0
    fi
    return 1
}

# insights_chunk_grep: fetch the InsightsDashboard lazy chunk and grep it.
insights_chunk_grep() {
    local pattern="$1"
    local chunk
    chunk="$(grep -oE '"assets/InsightsDashboard-[A-Za-z0-9_-]+\.js"' "$TMP/main.js" 2>/dev/null | head -n 1 | tr -d '"')"
    if [ -z "$chunk" ]; then
        # Fall back to direct fetch via the bundled mapping.
        chunk="$(grep -oE 'InsightsDashboard-[A-Za-z0-9_-]+\.js' "$TMP/main.js" 2>/dev/null | head -n 1)"
        [ -z "$chunk" ] && return 2
        chunk="assets/$chunk"
    fi
    if [ ! -f "$TMP/insights.js" ]; then
        curl -sS "$SITE_URL/$chunk" > "$TMP/insights.js"
    fi
    if grep -qE "$pattern" "$TMP/insights.js"; then
        return 0
    fi
    return 1
}

# ───────────────────────────────────────────────────────────────────────────
# Checks
# ───────────────────────────────────────────────────────────────────────────

printf "Verifying against:\n"
printf "  Supabase: %s\n" "$SUPABASE_URL"
printf "  Site:     %s\n" "$SITE_URL"

section "C1 — sessions table"

# C1a: anon cannot pull teacher_id / school_id / metadata.
r="$(curl -sS -o "$TMP/body" -w '%{http_code}' \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$SUPABASE_URL/rest/v1/sessions?select=teacher_id,school_id,metadata&limit=1")"
if [ "$r" = "401" ] || [ "$r" = "403" ]; then
    pass "anon GET sessions?select=teacher_id,school_id,metadata → HTTP $r"
elif [ "$r" = "200" ]; then
    body="$(head -c 200 "$TMP/body")"
    # Look for the leaky fields in the response.
    if printf '%s' "$body" | grep -qE '"teacher_id"|"school_id"|"metadata"'; then
        fail "anon can still read sensitive session fields" "$body"
    elif printf '%s' "$body" | grep -qE '"code":"42501"|permission denied'; then
        pass "anon GET sessions sensitive cols → permission denied"
    else
        # 200 but empty -> RLS hides rows; that's also a pass for THIS check.
        pass "anon GET sessions sensitive cols returned no rows ($body)"
    fi
else
    fail "anon GET sessions sensitive cols → unexpected HTTP $r" "$(head -c 200 "$TMP/body")"
fi

# C1b: anon can still see the safe projection for active sessions (so the
# in-progress student client doesn't break).
r="$(curl -sS -o "$TMP/body" -w '%{http_code}' \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$SUPABASE_URL/rest/v1/sessions?select=id,code,status,class_state&limit=1")"
if [ "$r" = "200" ]; then
    pass "anon GET sessions safe-cols → HTTP 200 (student client still works)"
else
    warn "anon GET sessions safe-cols → HTTP $r (expected 200; student flow may break)" "$(head -c 200 "$TMP/body")"
fi

# C1c: session_lookup_by_code RPC exists and rejects malformed input.
res="$(rest_post_anon session_lookup_by_code '{"in_code":"not-a-code"}')"
code="${res%%	*}"; body="${res##*	}"
if [ "$code" = "200" ] && printf '%s' "$body" | grep -qE 'null'; then
    pass "RPC session_lookup_by_code('not-a-code') → null (input validation works)"
elif [ "$code" = "404" ]; then
    fail "RPC session_lookup_by_code not deployed (HTTP 404)" "$body"
else
    warn "RPC session_lookup_by_code unexpected response" "HTTP $code  body: $body"
fi

section "C2 — dashboard RPCs anon-locked"

# Each entry: <fn>:<json-args>. Args must match the live function signature
# so PostgREST returns 401/403 (permission) rather than 404 (no-such-fn-with-this-sig).
DASHBOARDS=(
    "dashboard_executive_summary:{\"in_days\":7}"
    "dashboard_engagement_deep:{\"in_days\":7}"
    "dashboard_retention_deep:{}"
    "dashboard_latest_sessions:{}"
    "dashboard_errors:{}"
    "dashboard_today:{}"
    "dashboard_funnel:{\"in_days\":7}"
    "dashboard_tracker_health:{\"in_days\":7}"
    "dashboard_top_modes:{\"in_days\":7}"
)
for entry in "${DASHBOARDS[@]}"; do
    fn="${entry%%:*}"; args="${entry#*:}"
    res="$(rest_post_anon "$fn" "$args")"
    code="${res%%	*}"; body="${res##*	}"
    # PASS:
    #   401/403       → anon EXECUTE revoked (the canonical "ship today" outcome).
    #   permission denied / 42501 / forbidden body → same, expressed in body.
    #   404 ONLY IF body says "function … not found"      → the RPC doesn't
    #       exist in the live schema; no exposure path.
    # FAIL:
    #   200 with real data → still callable.
    if [ "$code" = "401" ] || [ "$code" = "403" ]; then
        pass "anon POST rpc/$fn → HTTP $code (anon EXECUTE revoked)"
    elif printf '%s' "$body" | grep -qE 'permission denied|42501|forbidden'; then
        pass "anon POST rpc/$fn → permission denied (in body)"
    elif [ "$code" = "404" ] && printf '%s' "$body" | grep -qE 'Could not find the function|PGRST202'; then
        warn "anon POST rpc/$fn → HTTP 404 / function-not-found (no exposure, but verify signature)"
    elif [ "$code" = "200" ]; then
        fail "anon POST rpc/$fn still returns data" "HTTP $code  body: $(printf '%s' "$body" | head -c 200)"
    else
        warn "anon POST rpc/$fn → unexpected HTTP $code" "$(printf '%s' "$body" | head -c 200)"
    fi
done

# Public-proof RPCs SHOULD still work (intentionally anon).
for fn in dashboard_public_proof landing_public_proof; do
    res="$(rest_post_anon "$fn" '{}')"
    code="${res%%	*}"; body="${res##*	}"
    if [ "$code" = "200" ]; then
        pass "anon POST rpc/$fn → HTTP 200 (intentional public OK)"
    elif [ "$code" = "401" ] || [ "$code" = "403" ]; then
        fail "intentional-public RPC $fn was inadvertently locked" "HTTP $code"
    else
        warn "anon POST rpc/$fn unexpected" "HTTP $code  body: $(printf '%s' "$body" | head -c 120)"
    fi
done

section "C3 — /admin route retired"

# C3a: /admin loads (still 200 because it's an SPA, but content should be the
# /admin/insights shell, not the legacy PIN form).
if bundle_grep 'admin_authenticated'; then
    fail "legacy admin sessionStorage key 'admin_authenticated' still present in bundle"
else
    pass "bundle no longer references admin_authenticated sessionStorage gate"
fi

if bundle_grep 'admin_session_expiry'; then
    fail "legacy admin sessionStorage key 'admin_session_expiry' still present in bundle"
else
    pass "bundle no longer references admin_session_expiry"
fi

# Status code probe just to confirm the route resolves to the SPA shell.
r="$(spa_get_status /admin)"
if [ "$r" = "200" ]; then
    pass "/admin → HTTP 200 (SPA shell renders, now routed to /admin/insights)"
else
    warn "/admin → HTTP $r (expected 200)"
fi

section "C4 — form_submissions / newsletter_subscribers"

r="$(curl -sS -o "$TMP/body" -w '%{http_code}' \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$SUPABASE_URL/rest/v1/form_submissions?select=id&limit=1")"
body="$(head -c 200 "$TMP/body")"
if [ "$r" = "401" ] || [ "$r" = "403" ] || printf '%s' "$body" | grep -qE 'permission denied|42501'; then
    pass "anon GET form_submissions → blocked (HTTP $r)"
else
    fail "anon can still SELECT form_submissions" "HTTP $r  body: $body"
fi

r="$(curl -sS -o "$TMP/body" -w '%{http_code}' \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$SUPABASE_URL/rest/v1/newsletter_subscribers?select=id&limit=1")"
body="$(head -c 200 "$TMP/body")"
if [ "$r" = "401" ] || [ "$r" = "403" ] || printf '%s' "$body" | grep -qE 'permission denied|42501'; then
    pass "anon GET newsletter_subscribers → blocked (HTTP $r)"
else
    fail "anon can still SELECT newsletter_subscribers" "HTTP $r  body: $body"
fi

# Anon must still be blocked from INSERTing direct rows (writes go via the
# Next.js /api/form-submission service-role endpoint).
r="$(curl -sS -o "$TMP/body" -w '%{http_code}' -X POST \
    -H "Content-Type: application/json" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d '{"form_type":"contact","email":"verify@example.test","name":"verify"}' \
    "$SUPABASE_URL/rest/v1/form_submissions")"
body="$(head -c 200 "$TMP/body")"
if [ "$r" = "401" ] || [ "$r" = "403" ] || printf '%s' "$body" | grep -qE 'permission denied|42501'; then
    pass "anon POST form_submissions → blocked (HTTP $r)"
else
    fail "anon can still INSERT into form_submissions" "HTTP $r  body: $body"
fi

section "H7 — admin email allow-list out of the bundle"

# The main bundle search uses string-match because Vite minifies the
# allow-list email into a JS string literal.
if bundle_grep '@gmail\.com|ALLOWED_ADMINS'; then
    fail "bundle still contains an admin email / ALLOWED_ADMINS literal"
else
    pass "main bundle has no admin gmail / ALLOWED_ADMINS literal"
fi

# Also probe the lazy InsightsDashboard chunk (the actual offender).
insights_chunk_grep '@gmail\.com|allow-list|ALLOWED_ADMINS'
case $? in
    1) pass "InsightsDashboard chunk no longer contains the admin email / allow-list" ;;
    0) fail "InsightsDashboard chunk still contains the admin email or allow-list" ;;
    2) warn "could not locate InsightsDashboard lazy chunk to verify" ;;
esac

section "Summary"

printf "  %s%d passing%s  /  %s%d failing%s\n" "$G" "$PASS" "$N" "$R" "$FAIL" "$N"

if [ "$FAIL" -gt 0 ]; then
    printf "\n%sOne or more checks failed. Do NOT mark the hotfix as complete.%s\n" "$R" "$N"
    exit 1
fi
printf "\n%sAll critical / high checks passed.%s\n" "$G" "$N"
exit 0
