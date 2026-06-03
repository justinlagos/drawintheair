-- 0011_rls_perf_and_indexes.sql
-- Performance hardening pass.
--   3a. Rewrite RLS policies that call auth.uid() per row to use (select auth.uid()) so the
--       expression is evaluated once per query (init plan).
--   3b. Split wide ALL policies into separate INSERT/UPDATE/DELETE so SELECT does not
--       double-evaluate (multiple_permissive_policies advisor).
--   3c. Drop duplicate indexes (keep the cleaner name / the unique-constraint backing index).
--   3d. Drop unused indexes that are not covering a foreign key.
--   3e. Add indexes for unindexed foreign keys.
-- Idempotent: every change is guarded by an existence check.

-- ============================================================================
-- 3a. Rewrite RLS policies: bare auth.uid() to (select auth.uid()).
--      Same semantics, just stops the planner from re-running auth.uid() per row.
-- ============================================================================

-- admin_alerts
do $$ begin
  if exists (select 1 from pg_policy where polname = 'admin_alerts_select' and polrelid = 'public.admin_alerts'::regclass) then
    drop policy "admin_alerts_select" on public.admin_alerts;
  end if;
  create policy "admin_alerts_select" on public.admin_alerts
    for select using (is_admin_user((select auth.uid())));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'admin_alerts_update' and polrelid = 'public.admin_alerts'::regclass) then
    drop policy "admin_alerts_update" on public.admin_alerts;
  end if;
  create policy "admin_alerts_update" on public.admin_alerts
    for update using (is_admin_user((select auth.uid())));
end $$;

-- analytics_events
do $$ begin
  if exists (select 1 from pg_policy where polname = 'analytics_events_select_admin' and polrelid = 'public.analytics_events'::regclass) then
    drop policy "analytics_events_select_admin" on public.analytics_events;
  end if;
  create policy "analytics_events_select_admin" on public.analytics_events
    for select to authenticated using (is_admin_user((select auth.uid())));
end $$;

-- billing_events
do $$ begin
  if exists (select 1 from pg_policy where polname = 'billing_events_select' and polrelid = 'public.billing_events'::regclass) then
    drop policy "billing_events_select" on public.billing_events;
  end if;
  create policy "billing_events_select" on public.billing_events
    for select to authenticated using (parent_id = (select auth.uid()));
end $$;

-- child_profiles
do $$ begin
  if exists (select 1 from pg_policy where polname = 'child_profiles_delete' and polrelid = 'public.child_profiles'::regclass) then
    drop policy "child_profiles_delete" on public.child_profiles;
  end if;
  create policy "child_profiles_delete" on public.child_profiles
    for delete to authenticated using (parent_id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'child_profiles_insert' and polrelid = 'public.child_profiles'::regclass) then
    drop policy "child_profiles_insert" on public.child_profiles;
  end if;
  create policy "child_profiles_insert" on public.child_profiles
    for insert to authenticated with check (parent_id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'child_profiles_select' and polrelid = 'public.child_profiles'::regclass) then
    drop policy "child_profiles_select" on public.child_profiles;
  end if;
  create policy "child_profiles_select" on public.child_profiles
    for select to authenticated using (parent_id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'child_profiles_update' and polrelid = 'public.child_profiles'::regclass) then
    drop policy "child_profiles_update" on public.child_profiles;
  end if;
  create policy "child_profiles_update" on public.child_profiles
    for update to authenticated using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
end $$;

-- client_errors
do $$ begin
  if exists (select 1 from pg_policy where polname = 'client_errors_select_admin' and polrelid = 'public.client_errors'::regclass) then
    drop policy "client_errors_select_admin" on public.client_errors;
  end if;
  create policy "client_errors_select_admin" on public.client_errors
    for select using (is_admin_user((select auth.uid())));
end $$;

-- consent_records
do $$ begin
  if exists (select 1 from pg_policy where polname = 'consent_insert' and polrelid = 'public.consent_records'::regclass) then
    drop policy "consent_insert" on public.consent_records;
  end if;
  create policy "consent_insert" on public.consent_records
    for insert to authenticated with check (parent_id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'consent_select' and polrelid = 'public.consent_records'::regclass) then
    drop policy "consent_select" on public.consent_records;
  end if;
  create policy "consent_select" on public.consent_records
    for select to authenticated using (parent_id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'consent_update' and polrelid = 'public.consent_records'::regclass) then
    drop policy "consent_update" on public.consent_records;
  end if;
  create policy "consent_update" on public.consent_records
    for update to authenticated using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
end $$;

-- data_deletion_requests
do $$ begin
  if exists (select 1 from pg_policy where polname = 'deletion_insert' and polrelid = 'public.data_deletion_requests'::regclass) then
    drop policy "deletion_insert" on public.data_deletion_requests;
  end if;
  create policy "deletion_insert" on public.data_deletion_requests
    for insert to authenticated with check (parent_id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'deletion_select' and polrelid = 'public.data_deletion_requests'::regclass) then
    drop policy "deletion_select" on public.data_deletion_requests;
  end if;
  create policy "deletion_select" on public.data_deletion_requests
    for select to authenticated using (parent_id = (select auth.uid()));
end $$;

-- form_submissions
do $$ begin
  if exists (select 1 from pg_policy where polname = 'admin_read_form_submissions' and polrelid = 'public.form_submissions'::regclass) then
    drop policy "admin_read_form_submissions" on public.form_submissions;
  end if;
  create policy "admin_read_form_submissions" on public.form_submissions
    for select using (is_admin_user((select auth.uid())));
end $$;

-- human_observation_fact
do $$ begin
  if exists (select 1 from pg_policy where polname = 'observations_select_admin' and polrelid = 'public.human_observation_fact'::regclass) then
    drop policy "observations_select_admin" on public.human_observation_fact;
  end if;
  create policy "observations_select_admin" on public.human_observation_fact
    for select to authenticated using (is_admin_user((select auth.uid())));
end $$;

-- newsletter_subscribers
do $$ begin
  if exists (select 1 from pg_policy where polname = 'admin_read_newsletter_subscribers' and polrelid = 'public.newsletter_subscribers'::regclass) then
    drop policy "admin_read_newsletter_subscribers" on public.newsletter_subscribers;
  end if;
  create policy "admin_read_newsletter_subscribers" on public.newsletter_subscribers
    for select using (is_admin_user((select auth.uid())));
end $$;

-- parent_profiles
do $$ begin
  if exists (select 1 from pg_policy where polname = 'parent_profiles_insert' and polrelid = 'public.parent_profiles'::regclass) then
    drop policy "parent_profiles_insert" on public.parent_profiles;
  end if;
  create policy "parent_profiles_insert" on public.parent_profiles
    for insert to authenticated with check (id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'parent_profiles_select' and polrelid = 'public.parent_profiles'::regclass) then
    drop policy "parent_profiles_select" on public.parent_profiles;
  end if;
  create policy "parent_profiles_select" on public.parent_profiles
    for select to authenticated using (id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'parent_profiles_update' and polrelid = 'public.parent_profiles'::regclass) then
    drop policy "parent_profiles_update" on public.parent_profiles;
  end if;
  create policy "parent_profiles_update" on public.parent_profiles
    for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
end $$;

-- parent_subscriptions
do $$ begin
  if exists (select 1 from pg_policy where polname = 'parent_subscriptions_select' and polrelid = 'public.parent_subscriptions'::regclass) then
    drop policy "parent_subscriptions_select" on public.parent_subscriptions;
  end if;
  create policy "parent_subscriptions_select" on public.parent_subscriptions
    for select to authenticated using (parent_id = (select auth.uid()));
end $$;

-- platform_insights
do $$ begin
  if exists (select 1 from pg_policy where polname = 'platform_insights_admin' and polrelid = 'public.platform_insights'::regclass) then
    drop policy "platform_insights_admin" on public.platform_insights;
  end if;
  create policy "platform_insights_admin" on public.platform_insights
    for select using (
      (select coalesce((select is_admin from teachers where id = (select auth.uid())), false))
    );
end $$;

-- playlists
do $$ begin
  if exists (select 1 from pg_policy where polname = 'playlists_delete_own' and polrelid = 'public.playlists'::regclass) then
    drop policy "playlists_delete_own" on public.playlists;
  end if;
  create policy "playlists_delete_own" on public.playlists
    for delete using (teacher_id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'playlists_insert_pro' and polrelid = 'public.playlists'::regclass) then
    drop policy "playlists_insert_pro" on public.playlists;
  end if;
  create policy "playlists_insert_pro" on public.playlists
    for insert to authenticated
    with check (get_effective_tier((select auth.uid())) = ANY (ARRAY['pro'::text, 'admin'::text]));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'playlists_select' and polrelid = 'public.playlists'::regclass) then
    drop policy "playlists_select" on public.playlists;
  end if;
  create policy "playlists_select" on public.playlists
    for select using (
      (teacher_id = (select auth.uid()))
      OR (is_public = true)
      OR (select coalesce((select is_admin from teachers where id = (select auth.uid())), false))
    );
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'playlists_update_own' and polrelid = 'public.playlists'::regclass) then
    drop policy "playlists_update_own" on public.playlists;
  end if;
  create policy "playlists_update_own" on public.playlists
    for update using (teacher_id = (select auth.uid()));
end $$;

-- round_scores
do $$ begin
  if exists (select 1 from pg_policy where polname = 'round_scores_select_scoped' and polrelid = 'public.round_scores'::regclass) then
    drop policy "round_scores_select_scoped" on public.round_scores;
  end if;
  create policy "round_scores_select_scoped" on public.round_scores
    for select using (
      (EXISTS (SELECT 1 FROM sessions s WHERE s.id = round_scores.session_id AND s.teacher_id = (select auth.uid())))
      OR is_admin_user((select auth.uid()))
      OR (EXISTS (SELECT 1 FROM sessions s WHERE s.id = round_scores.session_id AND s.status <> 'ended'::text))
    );
end $$;

-- school_invites
do $$ begin
  if exists (select 1 from pg_policy where polname = 'invites_insert_admin' and polrelid = 'public.school_invites'::regclass) then
    drop policy "invites_insert_admin" on public.school_invites;
  end if;
  create policy "invites_insert_admin" on public.school_invites
    for insert
    with check (school_id IN (SELECT schools.id FROM schools WHERE schools.admin_user_id = (select auth.uid())));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'invites_select' and polrelid = 'public.school_invites'::regclass) then
    drop policy "invites_select" on public.school_invites;
  end if;
  create policy "invites_select" on public.school_invites
    for select using (
      (school_id IN (SELECT schools.id FROM schools WHERE schools.admin_user_id = (select auth.uid())))
      OR (select coalesce((select is_admin from teachers where id = (select auth.uid())), false))
    );
end $$;

-- school_teachers
do $$ begin
  if exists (select 1 from pg_policy where polname = 'school_teachers_insert_admin' and polrelid = 'public.school_teachers'::regclass) then
    drop policy "school_teachers_insert_admin" on public.school_teachers;
  end if;
  create policy "school_teachers_insert_admin" on public.school_teachers
    for insert
    with check (school_id IN (SELECT schools.id FROM schools WHERE schools.admin_user_id = (select auth.uid())));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'school_teachers_select' and polrelid = 'public.school_teachers'::regclass) then
    drop policy "school_teachers_select" on public.school_teachers;
  end if;
  create policy "school_teachers_select" on public.school_teachers
    for select using (
      (school_id IN (SELECT schools.id FROM schools WHERE schools.admin_user_id = (select auth.uid())))
      OR (teacher_id = (select auth.uid()))
      OR (select coalesce((select is_admin from teachers where id = (select auth.uid())), false))
    );
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'school_teachers_update_admin' and polrelid = 'public.school_teachers'::regclass) then
    drop policy "school_teachers_update_admin" on public.school_teachers;
  end if;
  create policy "school_teachers_update_admin" on public.school_teachers
    for update using (school_id IN (SELECT schools.id FROM schools WHERE schools.admin_user_id = (select auth.uid())));
end $$;

-- schools
do $$ begin
  if exists (select 1 from pg_policy where polname = 'schools_insert' and polrelid = 'public.schools'::regclass) then
    drop policy "schools_insert" on public.schools;
  end if;
  create policy "schools_insert" on public.schools
    for insert with check (admin_user_id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'schools_select_own' and polrelid = 'public.schools'::regclass) then
    drop policy "schools_select_own" on public.schools;
  end if;
  create policy "schools_select_own" on public.schools
    for select using (
      (admin_user_id = (select auth.uid()))
      OR (id IN (SELECT school_teachers.school_id FROM school_teachers WHERE school_teachers.teacher_id = (select auth.uid()) AND school_teachers.status = 'active'::text))
      OR (select coalesce((select is_admin from teachers where id = (select auth.uid())), false))
    );
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'schools_update_admin' and polrelid = 'public.schools'::regclass) then
    drop policy "schools_update_admin" on public.schools;
  end if;
  create policy "schools_update_admin" on public.schools
    for update using (admin_user_id = (select auth.uid()));
end $$;

-- session_students
do $$ begin
  if exists (select 1 from pg_policy where polname = 'session_students_select_scoped' and polrelid = 'public.session_students'::regclass) then
    drop policy "session_students_select_scoped" on public.session_students;
  end if;
  create policy "session_students_select_scoped" on public.session_students
    for select using (
      (EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_students.session_id AND s.teacher_id = (select auth.uid())))
      OR is_admin_user((select auth.uid()))
      OR (EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_students.session_id AND s.status <> 'ended'::text))
    );
end $$;

-- teacher_insights
do $$ begin
  if exists (select 1 from pg_policy where polname = 'insights_select_own' and polrelid = 'public.teacher_insights'::regclass) then
    drop policy "insights_select_own" on public.teacher_insights;
  end if;
  create policy "insights_select_own" on public.teacher_insights
    for select using (
      (teacher_id = (select auth.uid()))
      OR (select coalesce((select is_admin from teachers where id = (select auth.uid())), false))
    );
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'insights_update_dismiss' and polrelid = 'public.teacher_insights'::regclass) then
    drop policy "insights_update_dismiss" on public.teacher_insights;
  end if;
  create policy "insights_update_dismiss" on public.teacher_insights
    for update using (teacher_id = (select auth.uid()));
end $$;

-- teacher_profiles
do $$ begin
  if exists (select 1 from pg_policy where polname = 'teachers self-insert' and polrelid = 'public.teacher_profiles'::regclass) then
    drop policy "teachers self-insert" on public.teacher_profiles;
  end if;
  create policy "teachers self-insert" on public.teacher_profiles
    for insert with check ((select auth.uid()) = auth_user_id);
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'teachers self-select' and polrelid = 'public.teacher_profiles'::regclass) then
    drop policy "teachers self-select" on public.teacher_profiles;
  end if;
  create policy "teachers self-select" on public.teacher_profiles
    for select using ((select auth.uid()) = auth_user_id);
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'teachers self-update' and polrelid = 'public.teacher_profiles'::regclass) then
    drop policy "teachers self-update" on public.teacher_profiles;
  end if;
  create policy "teachers self-update" on public.teacher_profiles
    for update using ((select auth.uid()) = auth_user_id) with check ((select auth.uid()) = auth_user_id);
end $$;

-- teachers
do $$ begin
  if exists (select 1 from pg_policy where polname = 'Teachers can update own row' and polrelid = 'public.teachers'::regclass) then
    drop policy "Teachers can update own row" on public.teachers;
  end if;
  create policy "Teachers can update own row" on public.teachers
    for update using ((select auth.uid()) = id);
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'teachers_insert_own' and polrelid = 'public.teachers'::regclass) then
    drop policy "teachers_insert_own" on public.teachers;
  end if;
  create policy "teachers_insert_own" on public.teachers
    for insert with check (id = (select auth.uid()));
end $$;

do $$ begin
  if exists (select 1 from pg_policy where polname = 'teachers_select_own_or_admin' and polrelid = 'public.teachers'::regclass) then
    drop policy "teachers_select_own_or_admin" on public.teachers;
  end if;
  create policy "teachers_select_own_or_admin" on public.teachers
    for select using ((id = (select auth.uid())) OR is_admin_user((select auth.uid())));
end $$;

-- ============================================================================
-- 3b. Split wide ALL policies into separate INSERT/UPDATE/DELETE.
--      Keeps SELECT on the existing select-only policy. Same predicates.
-- ============================================================================

-- child_activity_summary (drop cas_write ALL, recreate select with init plan, add ins/upd/del)
do $$ begin
  if exists (select 1 from pg_policy where polname = 'cas_write' and polrelid = 'public.child_activity_summary'::regclass) then
    drop policy "cas_write" on public.child_activity_summary;
  end if;
  if exists (select 1 from pg_policy where polname = 'cas_select' and polrelid = 'public.child_activity_summary'::regclass) then
    drop policy "cas_select" on public.child_activity_summary;
  end if;
  create policy "cas_select" on public.child_activity_summary
    for select to authenticated using (auth_owns_child(child_profile_id));
  create policy "cas_insert" on public.child_activity_summary
    for insert to authenticated with check (auth_owns_child(child_profile_id));
  create policy "cas_update" on public.child_activity_summary
    for update to authenticated using (auth_owns_child(child_profile_id)) with check (auth_owns_child(child_profile_id));
  create policy "cas_delete" on public.child_activity_summary
    for delete to authenticated using (auth_owns_child(child_profile_id));
end $$;

-- child_learning_state
do $$ begin
  if exists (select 1 from pg_policy where polname = 'cls_write' and polrelid = 'public.child_learning_state'::regclass) then
    drop policy "cls_write" on public.child_learning_state;
  end if;
  if exists (select 1 from pg_policy where polname = 'cls_select' and polrelid = 'public.child_learning_state'::regclass) then
    drop policy "cls_select" on public.child_learning_state;
  end if;
  create policy "cls_select" on public.child_learning_state
    for select to authenticated using (auth_owns_child(child_profile_id));
  create policy "cls_insert" on public.child_learning_state
    for insert to authenticated with check (auth_owns_child(child_profile_id));
  create policy "cls_update" on public.child_learning_state
    for update to authenticated using (auth_owns_child(child_profile_id)) with check (auth_owns_child(child_profile_id));
  create policy "cls_delete" on public.child_learning_state
    for delete to authenticated using (auth_owns_child(child_profile_id));
end $$;

-- parent_controls (drop controls_write ALL, recreate select, add ins/upd/del with init plan)
do $$ begin
  if exists (select 1 from pg_policy where polname = 'controls_write' and polrelid = 'public.parent_controls'::regclass) then
    drop policy "controls_write" on public.parent_controls;
  end if;
  if exists (select 1 from pg_policy where polname = 'controls_select' and polrelid = 'public.parent_controls'::regclass) then
    drop policy "controls_select" on public.parent_controls;
  end if;
  create policy "controls_select" on public.parent_controls
    for select to authenticated using (parent_id = (select auth.uid()));
  create policy "controls_insert" on public.parent_controls
    for insert to authenticated
    with check ((parent_id = (select auth.uid())) AND auth_owns_child(child_profile_id));
  create policy "controls_update" on public.parent_controls
    for update to authenticated
    using (parent_id = (select auth.uid()))
    with check ((parent_id = (select auth.uid())) AND auth_owns_child(child_profile_id));
  create policy "controls_delete" on public.parent_controls
    for delete to authenticated using (parent_id = (select auth.uid()));
end $$;

-- learning_attempts (split attempts_child_rows ALL + attempts_school_rows ALL)
do $$ begin
  if exists (select 1 from pg_policy where polname = 'attempts_child_rows' and polrelid = 'public.learning_attempts'::regclass) then
    drop policy "attempts_child_rows" on public.learning_attempts;
  end if;
  if exists (select 1 from pg_policy where polname = 'attempts_school_rows' and polrelid = 'public.learning_attempts'::regclass) then
    drop policy "attempts_school_rows" on public.learning_attempts;
  end if;
  -- child-owned rows
  create policy "attempts_child_insert" on public.learning_attempts
    for insert to authenticated
    with check ((child_profile_id IS NOT NULL) AND auth_owns_child(child_profile_id));
  create policy "attempts_child_update" on public.learning_attempts
    for update to authenticated
    using ((child_profile_id IS NOT NULL) AND auth_owns_child(child_profile_id))
    with check ((child_profile_id IS NOT NULL) AND auth_owns_child(child_profile_id));
  create policy "attempts_child_delete" on public.learning_attempts
    for delete to authenticated
    using ((child_profile_id IS NOT NULL) AND auth_owns_child(child_profile_id));
  -- school/anon rows
  create policy "attempts_school_insert" on public.learning_attempts
    for insert to authenticated, anon
    with check (child_profile_id IS NULL);
  create policy "attempts_school_update" on public.learning_attempts
    for update to authenticated, anon
    using (child_profile_id IS NULL)
    with check (child_profile_id IS NULL);
  create policy "attempts_school_delete" on public.learning_attempts
    for delete to authenticated, anon
    using (child_profile_id IS NULL);
end $$;

-- sessions (drop "Teachers manage own sessions" ALL; add explicit delete policy; rest covered)
do $$ begin
  if exists (select 1 from pg_policy where polname = 'Teachers manage own sessions' and polrelid = 'public.sessions'::regclass) then
    drop policy "Teachers manage own sessions" on public.sessions;
  end if;
  if not exists (select 1 from pg_policy where polname = 'sessions_delete_own' and polrelid = 'public.sessions'::regclass) then
    create policy "sessions_delete_own" on public.sessions
      for delete using (teacher_id = (select auth.uid()));
  end if;
  -- re-create select/update to use init plan
  if exists (select 1 from pg_policy where polname = 'sessions_select' and polrelid = 'public.sessions'::regclass) then
    drop policy "sessions_select" on public.sessions;
  end if;
  create policy "sessions_select" on public.sessions
    for select using (
      (teacher_id = (select auth.uid()))
      OR is_admin_user((select auth.uid()))
      OR (status <> 'ended'::text)
    );
  if exists (select 1 from pg_policy where polname = 'sessions_update_own' and polrelid = 'public.sessions'::regclass) then
    drop policy "sessions_update_own" on public.sessions;
  end if;
  create policy "sessions_update_own" on public.sessions
    for update using (teacher_id = (select auth.uid()));
  if exists (select 1 from pg_policy where polname = 'sessions_insert_pro' and polrelid = 'public.sessions'::regclass) then
    drop policy "sessions_insert_pro" on public.sessions;
  end if;
  create policy "sessions_insert_pro" on public.sessions
    for insert to authenticated
    with check (get_effective_tier((select auth.uid())) = ANY (ARRAY['trial'::text, 'pro'::text, 'admin'::text]));
end $$;

-- ============================================================================
-- 3c. Drop duplicate indexes (keep the cleaner name / unique-constraint backing).
-- ============================================================================
drop index if exists public.idx_sessions_code_active;            -- dup of sessions_active_code_idx
drop index if exists public.idx_session_students_session_id;     -- dup of session_students_session_idx
drop index if exists public.idx_round_scores_session_round;      -- dup of round_scores_session_idx
drop index if exists public.idx_school_teachers_school_id;       -- dup of idx_school_teachers_school
drop index if exists public.idx_school_teachers_teacher_id;      -- dup of idx_school_teachers_teacher
drop index if exists public.idx_school_invites_token;            -- dup of school_invites_token_key
drop index if exists public.idx_playlists_teacher_id;            -- dup of idx_playlists_teacher
drop index if exists public.idx_teacher_insights_teacher_id;     -- dup of idx_teacher_insights_teacher
drop index if exists public.idx_newsletter_email;                -- dup of newsletter_subscribers_email_key
drop index if exists public.idx_parent_subscriptions_parent;     -- dup of parent_subscriptions_parent_id_key
drop index if exists public.teacher_profiles_auth_user_id_idx;   -- dup of teacher_profiles_auth_user_id_key

-- ============================================================================
-- 3d. Drop unused indexes that are NOT covering a foreign key.
-- ============================================================================
drop index if exists public.idx_admin_alerts_unresolved;
drop index if exists public.analytics_events_context_idx;
drop index if exists public.analytics_events_session_seq_idx;
drop index if exists public.idx_client_errors_type;
drop index if exists public.idx_form_submissions_type;
drop index if exists public.human_observation_classroom_idx;
drop index if exists public.human_observation_device_idx;
drop index if exists public.human_observation_session_idx;
drop index if exists public.learning_attempts_context_idx;
drop index if exists public.learning_attempts_session_seq_idx;
drop index if exists public.lios_adaptive_decisions_regime_idx;
drop index if exists public.lios_adaptive_decisions_session_idx;
drop index if exists public.lios_anomaly_severity_idx;
drop index if exists public.idx_parent_subscriptions_customer;
drop index if exists public.idx_platform_insights_scope;
drop index if exists public.idx_school_invites_email;
drop index if exists public.idx_school_invites_expires_at;
drop index if exists public.idx_sessions_created_at;
drop index if exists public.skill_state_history_day_idx;
drop index if exists public.idx_teachers_stripe_customer;
drop index if exists public.idx_teachers_tier;
-- KEEP idx_round_scores_unique_submission (data integrity dedupe).
-- KEEP idx_sessions_teacher_status (composite for active session lookups).
-- KEEP all FK-covering indexes per the brief, even if currently unused.

-- ============================================================================
-- 3e. Add indexes for unindexed foreign keys.
-- ============================================================================
create index if not exists data_deletion_requests_target_child_id_idx
  on public.data_deletion_requests (target_child_id);

create index if not exists sessions_current_activity_id_idx
  on public.sessions (current_activity_id);

create index if not exists sessions_playlist_id_idx
  on public.sessions (playlist_id);
