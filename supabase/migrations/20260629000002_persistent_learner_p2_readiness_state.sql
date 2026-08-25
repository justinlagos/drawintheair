-- ════════════════════════════════════════════════════════════════════
-- Persistent learner — P2: authoritative readiness state (Decision DM2)
-- ════════════════════════════════════════════════════════════════════
-- STATUS: validated on STAGING (dcivdrhxeaiulbbhsgfv). NOT applied to prod.
-- Additive + reversible. Adds a typed, teacher-visible readiness state to the
-- participant row (session_students, the Option-A participant table). The
-- state is SEPARATE from learning performance. It is written idempotently by
-- the join/conduct flow in P3; this migration only establishes the column.
--
-- States (DM2): joined · camera_permission_needed · camera_ready ·
--   hand_detected · ready · playing · tracking_lost · needs_help ·
--   completed · disconnected · removed
-- 'ready' is reached only after camera stream + tracker load + valid hand +
-- sustained confidence + identity confirmed (enforced in client/RPC, not here).
-- ════════════════════════════════════════════════════════════════════

alter table public.session_students
    add column if not exists readiness_state text not null default 'joined',
    add column if not exists readiness_changed_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'session_students_readiness_state_check'
  ) then
    alter table public.session_students
      add constraint session_students_readiness_state_check
      check (readiness_state in (
        'joined','camera_permission_needed','camera_ready','hand_detected',
        'ready','playing','tracking_lost','needs_help','completed',
        'disconnected','removed'
      ));
  end if;
end $$;

-- Supports the teacher console querying learners by state (e.g. needs_help).
create index if not exists session_students_readiness_idx
    on public.session_students (session_id, readiness_state);

comment on column public.session_students.readiness_state is
  'Authoritative learner readiness (Decision DM2), separate from learning performance. Set idempotently by the join/conduct flow (P3).';
comment on column public.session_students.readiness_changed_at is
  'Timestamp of last readiness_state change; maintained by the P3 setter RPC.';

-- ── ROLLBACK (reversible) ─────────────────────────────────────────────
-- drop index if exists public.session_students_readiness_idx;
-- alter table public.session_students drop constraint if exists session_students_readiness_state_check;
-- alter table public.session_students drop column if exists readiness_changed_at;
-- alter table public.session_students drop column if exists readiness_state;
