-- Supabase environment stubs for local smoke test only (PG16, no pg_cron/pg_net)
DO $r$ DECLARE n text; BEGIN FOREACH n IN ARRAY ARRAY['anon','authenticated','service_role','supabase_admin','dashboard_user','supabase_functions_admin'] LOOP IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=n) THEN EXECUTE format('CREATE ROLE %I NOLOGIN', n); END IF; END LOOP; END $r$;
DO $$ BEGIN FOR r IN 1..1 LOOP NULL; END LOOP; END $$;
CREATE SCHEMA extensions; CREATE SCHEMA auth; CREATE SCHEMA net; CREATE SCHEMA cron;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TABLE auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, created_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ select current_setting('request.jwt.claim.role', true) $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ select '{}'::jsonb $$;
CREATE TABLE cron.job (jobid bigserial, jobname text, schedule text, command text, active bool default true);
CREATE FUNCTION cron.schedule(jobname text, schedule text, command text) RETURNS bigint LANGUAGE sql AS $$ insert into cron.job(jobname,schedule,command) values ($1,$2,$3) returning jobid $$;
CREATE FUNCTION net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 1000) RETURNS bigint LANGUAGE sql AS $$ select 1::bigint $$;
CREATE PUBLICATION supabase_realtime;
ALTER DATABASE t1 SET search_path TO public, extensions;
