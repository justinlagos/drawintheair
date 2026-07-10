-- ════════════════════════════════════════════════════════════════════
-- Persistent learner — P4: class_children deletion coverage (§13, D3)
-- ════════════════════════════════════════════════════════════════════
-- STATUS: validated on STAGING (dcivdrhxeaiulbbhsgfv). Production apply
-- permitted only after the §0 sign-off (recorded 2026-06-29) and a deliberate
-- production deploy step. Additive (new functions).
--
-- Distinct actions (§13), all teacher-scoped (caller must own the learner):
--   archive    — no longer active/selectable; retained. Reversible.
--   anonymise  — sever the identity link (clear name/nickname/display/avatar/
--                notes), keep non-identifying age_band for aggregate. Irreversible.
--   delete     — remove the class_children row; FKs handle dependents:
--                session_students.class_child_id → SET NULL (join kept, unlinked),
--                class_session_tokens.class_child_id → CASCADE (assignment removed).
-- No learner identifier exists in analytics_events/learning_attempts (classroom
-- attempts were never linked by class_child_id; the link lives on session_students,
-- which is nullified on delete) — so deletion leaves no learner id behind.
--
-- Follow-ups (documented, not in this migration): organisation/school-level
-- cascade delete (awaits the P5 org consolidation) and the scheduled 12-month
-- inactivity purge (needs an agreed "last active" source); wiring a
-- data_deletion_requests row to invoke class_child_delete for classroom learners.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.class_child_archive(in_class_child_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.class_children set archived = true, updated_at = now()
   where id = in_class_child_id and teacher_id = auth.uid();
  if not found then raise exception 'not your learner' using errcode = '42501'; end if;
end $$;

create or replace function public.class_child_anonymise(in_class_child_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.class_children
     set first_name = null, nickname = null, display_name = null,
         avatar_seed = null, notes = null, archived = true, updated_at = now()
   where id = in_class_child_id and teacher_id = auth.uid();
  if not found then raise exception 'not your learner' using errcode = '42501'; end if;
end $$;

create or replace function public.class_child_delete(in_class_child_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select teacher_id into v_owner from public.class_children where id = in_class_child_id;
  if v_owner is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if v_owner <> auth.uid() then raise exception 'not your learner' using errcode = '42501'; end if;
  delete from public.class_children where id = in_class_child_id;
end $$;

revoke all on function public.class_child_archive(uuid)   from public;
revoke all on function public.class_child_anonymise(uuid) from public;
revoke all on function public.class_child_delete(uuid)    from public;
grant execute on function public.class_child_archive(uuid)   to authenticated;
grant execute on function public.class_child_anonymise(uuid) to authenticated;
grant execute on function public.class_child_delete(uuid)    to authenticated;

-- ── ROLLBACK ──────────────────────────────────────────────────────────
-- drop function if exists public.class_child_delete(uuid);
-- drop function if exists public.class_child_anonymise(uuid);
-- drop function if exists public.class_child_archive(uuid);
