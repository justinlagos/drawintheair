-- Consolidate learning_attempts policies to clear the remaining multi-permissive warnings.
-- Drop the legacy wide-open anon insert policy. Merge child/school INSERT/UPDATE/DELETE
-- into single policies using OR. Semantics unchanged: a child-owned row requires
-- auth_owns_child; a school row (child_profile_id IS NULL) is allowed for both anon and
-- authenticated. The legacy "Anonymous insert" was wider (with_check = true) and is
-- replaced by the more constrained school policy.

do $$ begin
  if exists (select 1 from pg_policy where polname = 'Anonymous insert learning attempts' and polrelid = 'public.learning_attempts'::regclass) then
    drop policy "Anonymous insert learning attempts" on public.learning_attempts;
  end if;
  if exists (select 1 from pg_policy where polname = 'attempts_child_insert' and polrelid = 'public.learning_attempts'::regclass) then
    drop policy "attempts_child_insert" on public.learning_attempts;
  end if;
  if exists (select 1 from pg_policy where polname = 'attempts_school_insert' and polrelid = 'public.learning_attempts'::regclass) then
    drop policy "attempts_school_insert" on public.learning_attempts;
  end if;
  if exists (select 1 from pg_policy where polname = 'attempts_child_update' and polrelid = 'public.learning_attempts'::regclass) then
    drop policy "attempts_child_update" on public.learning_attempts;
  end if;
  if exists (select 1 from pg_policy where polname = 'attempts_school_update' and polrelid = 'public.learning_attempts'::regclass) then
    drop policy "attempts_school_update" on public.learning_attempts;
  end if;
  if exists (select 1 from pg_policy where polname = 'attempts_child_delete' and polrelid = 'public.learning_attempts'::regclass) then
    drop policy "attempts_child_delete" on public.learning_attempts;
  end if;
  if exists (select 1 from pg_policy where polname = 'attempts_school_delete' and polrelid = 'public.learning_attempts'::regclass) then
    drop policy "attempts_school_delete" on public.learning_attempts;
  end if;

  create policy "attempts_insert" on public.learning_attempts
    for insert to authenticated, anon
    with check (
      child_profile_id IS NULL
      OR ((child_profile_id IS NOT NULL) AND auth_owns_child(child_profile_id))
    );

  create policy "attempts_update" on public.learning_attempts
    for update to authenticated, anon
    using (
      child_profile_id IS NULL
      OR ((child_profile_id IS NOT NULL) AND auth_owns_child(child_profile_id))
    )
    with check (
      child_profile_id IS NULL
      OR ((child_profile_id IS NOT NULL) AND auth_owns_child(child_profile_id))
    );

  create policy "attempts_delete" on public.learning_attempts
    for delete to authenticated, anon
    using (
      child_profile_id IS NULL
      OR ((child_profile_id IS NOT NULL) AND auth_owns_child(child_profile_id))
    );
end $$;
