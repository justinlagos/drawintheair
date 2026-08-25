-- ════════════════════════════════════════════════════════════════════
-- Persistent learner — P3a: class_set_readiness RPC (Decision DM2)
-- ════════════════════════════════════════════════════════════════════
-- STATUS: validated on STAGING (dcivdrhxeaiulbbhsgfv). NOT applied to prod.
-- Additive (new function). Makes readiness authoritative: idempotent,
-- timestamped, server-validated. Mirrors the existing conductor SECURITY
-- DEFINER + anon-callable pattern (the learner's client holds its own
-- unguessable session_student id from class_join, as it already does for
-- realtime). Learner-reportable states only; 'removed' stays teacher-only
-- (existing kick path). readiness_changed_at only moves on a real change.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.class_set_readiness(in_student_id uuid, in_state text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid;
  v_kicked  timestamptz;
  v_class_state text;
begin
  if in_state not in (
    'camera_permission_needed','camera_ready','hand_detected','ready',
    'playing','tracking_lost','needs_help','completed','disconnected'
  ) then
    raise exception 'invalid or non-self-settable readiness state: %', in_state
      using errcode = '22023';
  end if;

  select ss.session_id, ss.kicked_at into v_session, v_kicked
    from public.session_students ss where ss.id = in_student_id;
  if v_session is null then
    raise exception 'student not found' using errcode = 'P0002';
  end if;
  if v_kicked is not null then
    raise exception 'student removed' using errcode = 'P0001';
  end if;

  select s.class_state into v_class_state from public.sessions s where s.id = v_session;
  if v_class_state is null or v_class_state = 'ended' then
    raise exception 'session not active' using errcode = 'P0001';
  end if;

  update public.session_students
     set readiness_state = in_state,
         readiness_changed_at = case
           when readiness_state is distinct from in_state then now()
           else readiness_changed_at
         end
   where id = in_student_id;

  return in_state;
end $$;

revoke all on function public.class_set_readiness(uuid, text) from public;
grant execute on function public.class_set_readiness(uuid, text) to anon, authenticated;

comment on function public.class_set_readiness(uuid, text) is
  'P3a: learner-reported readiness setter (DM2). Idempotent + timestamped; validates live session and non-kicked student. Teacher-only states (removed) use the existing kick path.';

-- ── ROLLBACK ──────────────────────────────────────────────────────────
-- drop function if exists public.class_set_readiness(uuid, text);
