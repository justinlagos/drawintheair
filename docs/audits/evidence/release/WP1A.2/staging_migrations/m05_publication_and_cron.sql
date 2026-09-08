-- WP1A.2 staging sync 05: realtime publication membership + 9 cron jobs from production cron.job (2026-09-08).
-- Differences from prod: net.http_post URLs point at STAGING ref dcivdrhxeaiulbbhsgfv.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='session_students') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_students; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='round_scores') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.round_scores; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='session_activities') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_activities; END IF;
END $$;

-- idempotent: unschedule any existing copies first
DO $$ DECLARE j text; BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname IN ('refresh-materialized-views','retention-purge','dita-prune-analytics-events','dita-prune-learning-attempts','dita-daily-digest','dita-anomaly-check','lios-pipeline-every-5min','email-dispatch-15m','billing-health-15m') LOOP
    PERFORM cron.unschedule(j);
  END LOOP;
END $$;

SELECT cron.schedule('refresh-materialized-views', '0 3 * * *', '
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_teacher_session_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_activity_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_engagement_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_school_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_growth_metrics;
  ');
SELECT cron.schedule('retention-purge', '0 2 * * *', '
  -- Delete expired insights
  DELETE FROM public.teacher_insights WHERE expires_at < now();
  DELETE FROM public.platform_insights WHERE expires_at < now();

  -- Purge old client errors (90 days)
  DELETE FROM public.client_errors WHERE reported_at < now() - interval ''90 days'';

  -- Nullify old session codes (30 days)
  UPDATE public.sessions SET code = NULL
  WHERE ended_at < now() - interval ''30 days'' AND code IS NOT NULL;

  -- Purge expired trial data (7 days post trial expiry if not converted)
  DELETE FROM public.round_scores rs
  USING public.sessions s, public.teachers t
  WHERE rs.session_id = s.id
    AND s.teacher_id = t.id
    AND t.tier = ''free''
    AND t.trial_expires_at IS NOT NULL
    AND t.trial_expires_at + interval ''7 days'' < now();

  DELETE FROM public.session_students ss
  USING public.sessions s, public.teachers t
  WHERE ss.session_id = s.id
    AND s.teacher_id = t.id
    AND t.tier = ''free''
    AND t.trial_expires_at IS NOT NULL
    AND t.trial_expires_at + interval ''7 days'' < now();
  ');
SELECT cron.schedule('dita-prune-analytics-events', '0 3 * * *', 'DELETE FROM public.analytics_events WHERE occurred_at < now() - interval ''365 days''');
SELECT cron.schedule('dita-prune-learning-attempts', '5 3 * * *', 'DELETE FROM public.learning_attempts WHERE occurred_at < now() - interval ''365 days''');
SELECT cron.schedule('dita-daily-digest', '0 7 * * *', '
    SELECT net.http_post(
        url := ''https://dcivdrhxeaiulbbhsgfv.supabase.co/functions/v1/analytics-digest?mode=daily'',
        headers := ''{"Content-Type":"application/json"}''::jsonb,
        body := ''{}''::jsonb,
        timeout_milliseconds := 30000
    );
    ');
SELECT cron.schedule('dita-anomaly-check', '*/15 * * * *', '
    SELECT net.http_post(
        url := ''https://dcivdrhxeaiulbbhsgfv.supabase.co/functions/v1/analytics-digest?mode=anomaly'',
        headers := ''{"Content-Type":"application/json"}''::jsonb,
        body := ''{}''::jsonb,
        timeout_milliseconds := 15000
    );
    ');
SELECT cron.schedule('lios-pipeline-every-5min', '*/5 * * * *', 'SELECT public.lios_run_pipeline(''15 minutes''::interval);');
SELECT cron.schedule('email-dispatch-15m', '*/15 * * * *', 'select app_private.run_email_dispatch()');
SELECT cron.schedule('billing-health-15m', '7-59/15 * * * *', 'select app_private.run_billing_health()');
