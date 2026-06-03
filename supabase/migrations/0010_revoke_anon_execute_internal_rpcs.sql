-- Revoke anon EXECUTE on internal SECURITY DEFINER functions.
-- Keep anon ONLY for marketing/public surfaces:
--   landing_public_proof, dashboard_public_proof
--   dashboard_transparency_report, dashboard_transparency_signals
-- These are read by unauthenticated marketing pages (Landing, About, TransparencyPage).
-- All other SECURITY DEFINER functions are internal and must require an authenticated caller.

do $body$
declare r record;
declare keep_anon text[] := array[
  'landing_public_proof',
  'dashboard_public_proof',
  'dashboard_transparency_report',
  'dashboard_transparency_signals'
];
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.prosecdef = true
      and not (p.proname = any(keep_anon))
  loop
    execute format('revoke execute on function public.%I(%s) from anon', r.proname, r.args);
    execute format('revoke execute on function public.%I(%s) from public', r.proname, r.args);
  end loop;
end;
$body$;
