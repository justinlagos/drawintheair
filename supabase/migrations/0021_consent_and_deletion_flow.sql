-- =====================================================================
-- 0021_consent_and_deletion_flow.sql   (Auth Framework — Phase 7)
--
-- Builds on what already exists (audited 2026-06-09):
--   * record_consent(), export_parent_data(), request_account_deletion(),
--     request_child_deletion() (already hard-deletes a child + cascade),
--     archive/restore_child_profile() — all present and working.
--
-- This migration fills the three real gaps WITHOUT touching the working
-- paths:
--   1. create_child_profile() — a consent-ENFORCED child-create RPC.
--      A child profile cannot be created unless the parent holds a
--      granted 'child_privacy' consent. If a current consent version is
--      supplied, it is recorded atomically first. Existing direct-insert
--      flows are left intact (non-breaking); the frontend is switched to
--      this RPC so enforcement applies going forward.
--   2. export_family_data() — a HUMAN-READABLE structured export (no
--      internal ids / tenant plumbing), suitable for rendering to PDF,
--      plus an explicit "what we do NOT store" statement.
--   3. process_account_deletion_requests() — a platform-admin / cron
--      processor that fulfils pending parent_account deletions on the
--      app side (parent_profiles cascade) and audit-logs the action.
--      Final auth.users removal + Stripe cancellation remain the
--      service-role / edge-function step (documented), so this function
--      never deletes from the auth schema directly.
--
-- Idempotent, additive. ROLLBACK: drop the three functions; existing
-- record_consent / request_* / export_parent_data are untouched.
-- =====================================================================

-- 1. Consent-enforced child creation. ------------------------------------
create or replace function public.create_child_profile(
  p_nickname        text,
  p_age_band        text default null,
  p_learning_focus  text default null,
  p_avatar          text default null,
  p_preferred_hand  text default null,
  p_consent_version text default null   -- current child_privacy notice version
)
returns child_profiles
language plpgsql
security definer
set search_path to 'public'
as $function$
declare uid uuid := auth.uid();
        v_has_consent boolean;
        v_row child_profiles;
begin
  if uid is null then raise exception 'auth required' using errcode = '42501'; end if;
  if p_nickname is null or length(trim(p_nickname)) = 0 then
    raise exception 'nickname required';
  end if;

  -- Record consent now if a version was supplied (first child = consent moment).
  if p_consent_version is not null and length(trim(p_consent_version)) > 0 then
    insert into consent_records(parent_id, consent_type, consent_version, granted)
    values (uid, 'child_privacy', p_consent_version, true);
  end if;

  -- Enforce: a granted, non-withdrawn child_privacy consent must exist.
  select exists (
    select 1 from consent_records
    where parent_id = uid and consent_type = 'child_privacy'
      and granted = true and withdrawn_at is null
  ) into v_has_consent;

  if not v_has_consent then
    raise exception 'child_privacy consent required before creating a child profile'
      using errcode = '42501';
  end if;

  insert into child_profiles (parent_id, nickname, age_band, learning_focus, avatar, preferred_hand)
  values (uid, trim(p_nickname), p_age_band, p_learning_focus, p_avatar, p_preferred_hand)
  returning * into v_row;

  perform public.log_security_event('child_profile_created',
    jsonb_build_object('age_band', p_age_band));

  return v_row;
end;
$function$;
revoke execute on function public.create_child_profile(text,text,text,text,text,text) from anon;
grant  execute on function public.create_child_profile(text,text,text,text,text,text) to authenticated;

-- 2. Human-readable family export. ---------------------------------------
-- Plain-language, no internal ids / tenant_id. Designed for a parent to
-- read or for the frontend to render as a PDF.
create or replace function public.export_family_data()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;
  select jsonb_build_object(
    'exported_at', now(),
    'account', jsonb_build_object(
      'display_name', (select display_name from parent_profiles where id = uid),
      'email',        (select email from parent_profiles where id = uid)
    ),
    'children', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'nickname',       c.nickname,
        'age_band',       c.age_band,
        'learning_focus', c.learning_focus,
        'status',         c.status,
        'created_at',     c.created_at,
        'progress', (
          select jsonb_build_object(
            'streak_days',        cls.streak_days,
            'confidence_overall', round(cls.confidence_overall::numeric, 2),
            'last_played_at',     cls.last_played_at
          ) from child_learning_state cls where cls.child_profile_id = c.id
        )
      ) order by c.created_at), '[]'::jsonb)
      from child_profiles c where c.parent_id = uid
    ),
    'consents', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type',       cr.consent_type,
        'version',    cr.consent_version,
        'granted',    cr.granted,
        'granted_at', cr.granted_at,
        'withdrawn_at', cr.withdrawn_at
      ) order by cr.granted_at desc), '[]'::jsonb)
      from consent_records cr where cr.parent_id = uid
    ),
    'what_we_do_not_store', jsonb_build_array(
      'No child email addresses',
      'No child passwords or logins',
      'No raw camera frames or photos of your child',
      'No precise location data',
      'Camera video is processed on-device and never uploaded or stored'
    )
  ) into result;

  perform public.log_security_event('data_exported', '{}'::jsonb);
  return result;
end;
$function$;
revoke execute on function public.export_family_data() from anon;
grant  execute on function public.export_family_data() to authenticated;

-- 3. Account-deletion processor (platform-admin / cron). -----------------
-- Fulfils pending 'parent_account' requests on the APP side only. Final
-- auth.users removal + Stripe cancellation stay in the service-role/edge
-- job — this function deliberately does NOT touch the auth schema.
create or replace function public.process_account_deletion_requests(p_limit int default 50)
returns int
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r record; n int := 0;
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  for r in
    select id, parent_id from data_deletion_requests
    where scope = 'parent_account' and status = 'pending'
    order by requested_at asc
    limit greatest(1, least(p_limit, 500))
  loop
    update data_deletion_requests set status = 'processing' where id = r.id;
    -- App-side cascade: deleting the parent_profiles row removes children,
    -- learning state, controls, consents via ON DELETE CASCADE FKs.
    delete from parent_profiles where id = r.parent_id;
    update data_deletion_requests
      set status = 'completed', completed_at = now()
      where id = r.id;
    perform public.log_security_event('account_deletion_processed',
      jsonb_build_object('request_id', r.id));
    n := n + 1;
  end loop;

  return n;
end;
$function$;
revoke execute on function public.process_account_deletion_requests(int) from anon, authenticated;
-- Granted only to service_role implicitly (definer owner); call from a
-- cron / edge function. No client may invoke it.

comment on function public.create_child_profile(text,text,text,text,text,text) is
  'Consent-enforced child creation (0021). Requires granted child_privacy consent.';
comment on function public.export_family_data() is
  'Human-readable family data export for PDF (0021). No internal ids, no PII beyond account email.';
comment on function public.process_account_deletion_requests(int) is
  'Admin/cron processor for pending parent_account deletions, app-side cascade only (0021). Auth.users + Stripe handled by service-role job.';
