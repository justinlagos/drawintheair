-- ═══════════════════════════════════════════════════════════════════════════════
-- 0029 — Restore public.class_join(uuid, text) to the live database
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- ROOT CAUSE
--   The deployed student join client calls
--   POST /rest/v1/rpc/class_join { in_session_id, in_name } at the "What's your
--   name?" step. That function was defined in migration 0022 but was missing
--   from the live database (migration drift — only class_join_by_ip and
--   class_join_with_network were present). PostgREST therefore returned:
--     "Could not find the function public.class_join(in_name, in_session_id)
--      in the schema cache"
--   so no student could complete a join even after the code screen passed.
--
-- FIX
--   Re-create class_join verbatim from 0022. Idempotent (drop+create),
--   additive, reversible. Verified end-to-end against a live joinable session
--   (returns the inserted roster row); the tenant_id is auto-stamped by the
--   existing stamp_tenant BEFORE INSERT trigger.
--
-- See also 0028 (session_lookup_by_code status-vocab fix) — same join flow.
-- ═══════════════════════════════════════════════════════════════════════════════

drop function if exists public.class_join(uuid, text);
create function public.class_join(in_session_id uuid, in_name text)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_state  text;
  v_base   text;
  v_final  text;
  v_i      int := 2;
  v_id     uuid;
  r        record;
begin
  if in_session_id is null or coalesce(btrim(in_name), '') = '' then
    raise exception 'invalid join request' using errcode = '22023';
  end if;

  select s.status, s.class_state into v_status, v_state
  from public.sessions s where s.id = in_session_id limit 1;
  if not found or v_status = 'ended' or v_state = 'ended' then
    raise exception 'session not joinable' using errcode = 'P0002';
  end if;

  v_base  := left(btrim(in_name), 40);
  v_final := v_base;
  -- Dedupe against existing roster names for this session (server-side).
  while exists (
    select 1 from public.session_students ss
    where ss.session_id = in_session_id and ss.name = v_final
  ) and v_i <= 50 loop
    v_final := v_base || v_i::text;
    v_i := v_i + 1;
  end loop;

  -- avatar_seed mirrors the client's avatarForStudent: `${sessionId}:${lower(name)}`.
  insert into public.session_students (session_id, name, avatar_seed)
  values (in_session_id, v_final, in_session_id::text || ':' || lower(btrim(v_final)))
  returning id into v_id;

  select ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.is_active,
         ss.kicked_at, ss.kicked_reason
    into r
  from public.session_students ss where ss.id = v_id;
  return to_jsonb(r);
end $$;

revoke all on function public.class_join(uuid, text) from public;
grant execute on function public.class_join(uuid, text) to anon, authenticated, service_role;

comment on function public.class_join(uuid, text) is
  'Anon-callable class join: validates joinable session, dedupes name, inserts roster row, returns it. Restored to prod in 0029 (defined in 0022, was missing from live DB).';
