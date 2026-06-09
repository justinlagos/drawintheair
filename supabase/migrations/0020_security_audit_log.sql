-- =====================================================================
-- 0020_security_audit_log.sql   (Auth Framework — Phase 6 + 8)
--
-- A durable, queryable trail for auth/security events. Privacy-first:
--   * NO raw IP, NO raw user-agent — only caller-supplied HASHES.
--   * NO child data ever (the writer RPC strips child/* + PII-ish keys).
--   * NO passwords, tokens, JWTs, emails (stripped defensively too).
--   * user_id is taken from auth.uid() ONLY — a caller can never forge
--     another user's id into the log.
--
-- Writes go exclusively through log_security_event() (SECURITY DEFINER);
-- clients have no direct INSERT. Reads: a user sees their own events; a
-- platform_admin sees everything.
--
-- Idempotent. Additive only — no existing object is modified.
--
-- ROLLBACK:
--   drop function if exists public.log_security_event(text, jsonb, text, text, text);
--   drop table if exists public.security_audit_log;
-- =====================================================================

create table if not exists public.security_audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  event_type  text not null,
  ip_hash     text,          -- caller-hashed, never raw
  ua_hash     text,          -- caller-hashed UA family, never raw
  country     text,          -- coarse, optional (e.g. 'GB'); never precise geo
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_sec_audit_user on public.security_audit_log(user_id, created_at desc);
create index if not exists idx_sec_audit_type on public.security_audit_log(event_type, created_at desc);
create index if not exists idx_sec_audit_created on public.security_audit_log(created_at desc);

alter table public.security_audit_log enable row level security;

-- Own events.
drop policy if exists sec_audit_select_own on public.security_audit_log;
create policy sec_audit_select_own on public.security_audit_log
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Platform admins: full read.
drop policy if exists sec_audit_select_admin on public.security_audit_log;
create policy sec_audit_select_admin on public.security_audit_log
  for select to authenticated
  using (public.is_admin_user((select auth.uid())));

-- No client writes of any kind — only the definer RPC below.
revoke insert, update, delete on table public.security_audit_log from anon, authenticated;

-- Writer. Callable pre-auth (anon) so failed logins are captured, but
-- user_id always comes from auth.uid(), never from arguments. Metadata
-- is defensively scrubbed of sensitive / child keys.
create or replace function public.log_security_event(
  in_event_type text,
  in_metadata   jsonb default '{}'::jsonb,
  in_ip_hash    text  default null,
  in_ua_hash    text  default null,
  in_country    text  default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_meta jsonb;
begin
  if in_event_type is null or length(trim(in_event_type)) = 0 then
    return;  -- never raise; logging must not break a flow
  end if;

  -- Strip sensitive / child / PII-ish keys from metadata defensively.
  select coalesce(jsonb_object_agg(e.k, e.v), '{}'::jsonb)
    into v_meta
  from jsonb_each(coalesce(in_metadata, '{}'::jsonb)) as e(k, v)
  where lower(e.k) !~ '(email|password|passwd|token|secret|jwt|child|ssn|dob|address|phone)';

  insert into public.security_audit_log (user_id, event_type, ip_hash, ua_hash, country, metadata)
  values (
    auth.uid(),
    left(trim(in_event_type), 64),
    left(coalesce(in_ip_hash, ''), 128),
    left(coalesce(in_ua_hash, ''), 128),
    left(coalesce(in_country, ''), 8),
    v_meta
  );
exception when others then
  return;  -- audit logging is best-effort; never propagate failures
end;
$function$;

grant execute on function public.log_security_event(text, jsonb, text, text, text) to anon, authenticated;

comment on table public.security_audit_log is
  'Auth/security event trail. Hashed IP/UA only, no PII, no child data (0020).';
comment on function public.log_security_event(text, jsonb, text, text, text) is
  'Best-effort security event writer. user_id from auth.uid() only; metadata scrubbed of sensitive/child keys (0020).';
