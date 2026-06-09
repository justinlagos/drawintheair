/**
 * authFlags — kill-switches / rollout gates for the Auth Framework.
 * (Auth Framework, all phases.)
 *
 * Risky or user-visible auth behaviour sits behind these so it can be
 * disabled instantly without a code rollback. Passive DB writes (audit
 * log, consent-version capture, the is_admin_user superset) intentionally
 * are NOT gated — they cannot break a working flow.
 *
 * Values come from Vite env (VITE_FLAG_*). Defaults are conservative:
 * new user-visible behaviour is OFF until explicitly enabled; observability
 * is ON so we get the trail from day one.
 */

function envBool(key: string, fallback: boolean): boolean {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  if (v == null || v === '') return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

export const authFlags = {
  /** school_admin / platform_admin UI + multi-role switcher entries. */
  rbacV2Roles: envBool('VITE_FLAG_RBAC_V2_ROLES', false),
  /** Step-up re-auth prompts, admin idle timeout, new-context emails. */
  adaptiveTrustV1: envBool('VITE_FLAG_ADAPTIVE_TRUST_V1', false),
  /** Human-readable export PDF + account/child deletion UI. */
  complianceFlowsV1: envBool('VITE_FLAG_COMPLIANCE_FLOWS_V1', false),
  /** Auth funnel + security event emission (kill-switch, default ON). */
  authObservabilityV1: envBool('VITE_FLAG_AUTH_OBSERVABILITY_V1', true),
} as const;

/** Admin idle-timeout window in minutes (Phase 6). */
export const ADMIN_IDLE_TIMEOUT_MINUTES = 30;
