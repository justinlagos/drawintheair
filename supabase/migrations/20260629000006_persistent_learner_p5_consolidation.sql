-- ════════════════════════════════════════════════════════════════════
-- Persistent learner — P5: structure consolidation (DM1 reconciliation)
-- ════════════════════════════════════════════════════════════════════
-- STATUS: P5a (below) validated on STAGING (dcivdrhxeaiulbbhsgfv). P5b drops are
-- AUTHORED BUT NOT APPLIED — they break deployed clients and must wait for an
-- app-code migration (see gating note). Production apply of P5a permitted after
-- the §0 sign-off + a deliberate deploy step.
--
-- Canonical decisions (Founder Decision Pack §DM1):
--   teacher identity → `teachers` (sessions.teacher_id already FKs it; it carries
--                      tier/trial/school_id). `teacher_profiles` becomes redundant.
--   org/school       → `schools` + `school_teachers`, mapped onto `tenants`.
--
-- ── P5a — SAFE consolidation (additive, idempotent, APPLIED on staging) ──
-- Guarantee every teacher_profiles has a canonical `teachers` row so `teachers`
-- can be treated as the single source of truth. Sources email from auth.users
-- (teacher_profiles has none) and name from full_name.
insert into public.teachers (id, email, name, tenant_id)
select tp.auth_user_id, u.email, coalesce(tp.full_name, ''), tp.tenant_id
from public.teacher_profiles tp
join auth.users u on u.id = tp.auth_user_id
where u.email is not null
  and not exists (select 1 from public.teachers t where t.id = tp.auth_user_id);

-- ════════════════════════════════════════════════════════════════════
-- ── P5b — DESTRUCTIVE drops: AUTHORED, *NOT APPLIED* (gated) ───────────
-- BLOCKING PREREQUISITE: the production app still reads these objects, so
-- dropping them now would break deployed clients. Confirmed references:
--   • teacher_profiles — src/lib/teacherApi.ts (signup + getAccountRoles role check)
--   • session_students.is_active — StudentRow type + engagementOf() in
--     TeacherClassConsole.tsx
-- Do NOT run this section until the app no longer references the object AND it
-- has been re-verified on staging. Each drop is irreversible.
--
--   -- (1) Retire teacher_profiles once signup + getAccountRoles read `teachers`:
--   -- drop trigger if exists on_auth_user_created_teacher on auth.users;  -- if it targets teacher_profiles
--   -- drop table if exists public.teacher_profiles cascade;
--
--   -- (2) Drop duplicate GENERATED columns once the client stops selecting them
--   --     (these are derived; safe only after the app reads the canonical column):
--   -- alter table public.session_students drop column if exists student_name;   -- = name
--   -- alter table public.session_students drop column if exists student_avatar;
--   -- alter table public.session_students drop column if exists is_active;      -- = is_connected  (APP USES THIS — migrate first)
--   -- alter table public.sessions          drop column if exists session_code;   -- = code
--   -- alter table public.schools           drop column if exists admin_teacher_id; -- = admin_user_id
--   -- alter table public.client_errors     drop column if exists error_message;  -- = message
--   -- (round_scores: session_student_id/round_number/gesture_name/accuracy/score are generated dups)
--
--   -- (3) Reconcile membership: standardise on school_teachers for school staff,
--   --     keep tenant_members for tenant isolation; reconcile role vocab. Define
--   --     precisely before any drop.
-- ════════════════════════════════════════════════════════════════════

-- ── ROLLBACK (P5a) ────────────────────────────────────────────────────
-- P5a is additive (inserts only missing rows); to undo a specific backfill,
-- delete the teachers rows that have no corresponding session/activity, scoped
-- to the ids inserted. No automatic rollback statement (data migration).
