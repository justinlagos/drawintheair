-- WP0.5.2 (DIA-006 partial): revoke anonymous EXECUTE on four dashboard RPCs
-- with a proven-absent anonymous caller. Applied to production 2026-09-07.
-- Evidence: docs/audits/evidence/release/WP0.5/WP0.5.2-applied.md
-- Rollback: grant execute on function public.<fn>(integer) to anon;
revoke execute on function public.dashboard_engagement_deep(integer)   from anon, public;
revoke execute on function public.dashboard_executive_summary(integer) from anon, public;
revoke execute on function public.dashboard_mastery_summary(integer)   from anon, public;
revoke execute on function public.dashboard_ingest_latency(integer)    from anon, public;
