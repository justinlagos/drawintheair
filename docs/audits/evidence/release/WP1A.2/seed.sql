-- WP1A.2 synthetic seed for STAGING (dcivdrhxeaiulbbhsgfv) — 2026-09-08
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING / deterministic event_uids.
-- Contains NO production rows. All names/emails are synthetic ("Test Child 01", *@staging.invalid).
-- Never run against production.

BEGIN;

-- ---------------------------------------------------------------- guard
DO $$ BEGIN
  IF current_database() <> 'postgres' THEN RAISE EXCEPTION 'unexpected database'; END IF;
  IF EXISTS (SELECT 1 FROM app_private.secrets WHERE name='email_cron_key' AND value NOT LIKE 'staging-%') THEN
    RAISE EXCEPTION 'refusing to seed: this does not look like the synthetic staging project';
  END IF;
END $$;

-- ---------------------------------------------------------------- config
INSERT INTO public.pricing_config (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------- auth users
-- Fixed ids. Password for all: StagingPass123!
-- teachers: 1..3, parents: 4..5
WITH u(id, email, role, full_name, school_name) AS (VALUES
  ('11111111-1111-4111-8111-000000000001'::uuid, 'teacher01@staging.invalid', 'teacher', 'Test Teacher 01', 'Test Primary School A'),
  ('11111111-1111-4111-8111-000000000002'::uuid, 'teacher02@staging.invalid', 'teacher', 'Test Teacher 02', 'Test Primary School B'),
  ('11111111-1111-4111-8111-000000000003'::uuid, 'teacher03@staging.invalid', 'teacher', 'Test Teacher 03', 'Test Primary School A'),
  ('22222222-2222-4222-8222-000000000001'::uuid, 'parent01@staging.invalid',  'parent',  'Test Parent 01',  NULL),
  ('22222222-2222-4222-8222-000000000002'::uuid, 'parent02@staging.invalid',  'parent',  'Test Parent 02',  NULL)
)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, is_super_admin
)
SELECT '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('StagingPass123!', extensions.gen_salt('bf')), now() - interval '20 days',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_strip_nulls(jsonb_build_object('role', u.role, 'full_name', u.full_name, 'school_name', u.school_name)),
  now() - interval '20 days', now() - interval '20 days', '', '', '', '', false
FROM u
WHERE NOT EXISTS (SELECT 1 FROM auth.users x WHERE x.id = u.id);

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), x.id, x.id::text,
  jsonb_build_object('sub', x.id::text, 'email', x.email, 'email_verified', true),
  'email', now() - interval '20 days', now() - interval '20 days', now() - interval '20 days'
FROM auth.users x
WHERE x.email LIKE '%@staging.invalid'
  AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = x.id AND i.provider = 'email');

-- Signup triggers (on_auth_user_created*) have now created: teachers (tier trial), teacher_profiles, parent_profiles (all users), parent_subscriptions (parents, trialing).
-- Tenants, as register_teacher()/register_parent() would do:
DO $$ DECLARE r record; t uuid; BEGIN
  FOR r IN SELECT id, email, raw_user_meta_data->>'role' AS role, raw_user_meta_data->>'full_name' AS nm FROM auth.users WHERE email LIKE '%@staging.invalid' LOOP
    t := public._ensure_tenant(r.role, r.id, r.nm);
    IF r.role = 'teacher' THEN
      UPDATE public.teachers SET tenant_id = t WHERE id = r.id AND tenant_id IS NULL;
      UPDATE public.teacher_profiles SET tenant_id = t WHERE auth_user_id = r.id AND tenant_id IS NULL;
    ELSE
      UPDATE public.parent_profiles SET tenant_id = t WHERE id = r.id AND tenant_id IS NULL;
      UPDATE public.parent_subscriptions SET tenant_id = t WHERE parent_id = r.id AND tenant_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------- schools
INSERT INTO public.schools (id, name, admin_user_id, slug, city, country, license_tier, max_seats)
VALUES
  ('33333333-3333-4333-8333-000000000001', 'Test Primary School A', '11111111-1111-4111-8111-000000000001', 'test-primary-a', 'Testville', 'GB', 'starter_5', 5),
  ('33333333-3333-4333-8333-000000000002', 'Test Primary School B', '11111111-1111-4111-8111-000000000002', 'test-primary-b', 'Testford',  'GB', 'standard_10', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.school_teachers (id, school_id, teacher_id, role, status, accepted_at, joined_at)
VALUES
  ('34343434-3434-4434-8434-000000000001', '33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-000000000001', 'school_admin', 'active', now() - interval '19 days', now() - interval '19 days'),
  ('34343434-3434-4434-8434-000000000002', '33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-000000000003', 'teacher',      'active', now() - interval '18 days', now() - interval '18 days'),
  ('34343434-3434-4434-8434-000000000003', '33333333-3333-4333-8333-000000000002', '11111111-1111-4111-8111-000000000002', 'school_admin', 'active', now() - interval '19 days', now() - interval '19 days')
ON CONFLICT (id) DO NOTHING;
UPDATE public.schools SET seats_used = (SELECT count(*) FROM public.school_teachers st WHERE st.school_id = schools.id AND st.status='active');

-- ---------------------------------------------------------------- class rosters (class_children)
-- Class 1: teacher01, 12 children.  Class 2: teacher02, 25 children.
INSERT INTO public.class_children (id, teacher_id, first_name, nickname, display_name, age_band, avatar_seed, created_at)
SELECT ('44444444-4444-4444-8444-' || lpad((100 + n)::text, 12, '0'))::uuid,
       '11111111-1111-4111-8111-000000000001',
       'Test Child ' || lpad(n::text, 2, '0'), NULL, 'Test Child ' || lpad(n::text, 2, '0'),
       CASE WHEN n % 2 = 0 THEN '3-4' ELSE '5-7' END, 'seed-c1-' || n, now() - interval '18 days'
FROM generate_series(1, 12) n
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.class_children (id, teacher_id, first_name, nickname, display_name, age_band, avatar_seed, created_at)
SELECT ('44444444-4444-4444-8444-' || lpad((200 + n)::text, 12, '0'))::uuid,
       '11111111-1111-4111-8111-000000000002',
       'Test Child ' || lpad(n::text, 2, '0'), NULL, 'Test Child ' || lpad(n::text, 2, '0'),
       CASE WHEN n % 3 = 0 THEN '3-4' ELSE '5-7' END, 'seed-c2-' || n, now() - interval '18 days'
FROM generate_series(1, 25) n
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------- sessions (3 states)
-- s1: lobby (teacher01) · s2: in_activity (teacher02) · s3: ended (teacher01, 10 days ago)
INSERT INTO public.sessions (id, teacher_id, code, status, class_state, class_name, created_at, started_at, ended_at, activity, round)
VALUES
  ('55555555-5555-4555-8555-000000000001', '11111111-1111-4111-8111-000000000001', 'STG001', 'lobby',   'lobby', 'Test Class 1 (lobby)',  now() - interval '10 minutes', NULL, NULL, NULL, 1),
  ('55555555-5555-4555-8555-000000000002', '11111111-1111-4111-8111-000000000002', 'STG002', 'playing', 'lobby', 'Test Class 2 (live)',   now() - interval '30 minutes', now() - interval '25 minutes', NULL, 'letter_tracing', 1),
  ('55555555-5555-4555-8555-000000000003', '11111111-1111-4111-8111-000000000001', 'STG003', 'ended',   'ended', 'Test Class 1 (ended)',  now() - interval '10 days', now() - interval '10 days' + interval '2 minutes', now() - interval '10 days' + interval '35 minutes', 'shape_tracing', 3)
ON CONFLICT (id) DO NOTHING;

-- activities for s2 (current) and s3 (historical, ended)
INSERT INTO public.session_activities (id, session_id, activity, state, ordinal, started_at, ended_at)
VALUES
  ('56565656-5656-4656-8656-000000000001', '55555555-5555-4555-8555-000000000002', 'letter_tracing', 'playing', 1, now() - interval '20 minutes', NULL),
  ('56565656-5656-4656-8656-000000000002', '55555555-5555-4555-8555-000000000003', 'shape_tracing',  'ended',  1, now() - interval '10 days' + interval '3 minutes',  now() - interval '10 days' + interval '15 minutes'),
  ('56565656-5656-4656-8656-000000000003', '55555555-5555-4555-8555-000000000003', 'number_tracing', 'ended',  2, now() - interval '10 days' + interval '16 minutes', now() - interval '10 days' + interval '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- satisfies trg_sessions_check_active_has_activity (in_activity <=> current_activity_id not null)
UPDATE public.sessions SET class_state = 'in_activity', current_activity_id = '56565656-5656-4656-8656-000000000001', activity_version = 1
WHERE id = '55555555-5555-4555-8555-000000000002' AND current_activity_id IS NULL;

-- ---------------------------------------------------------------- session_students (~30)
-- s2: 20 of teacher02's roster (linked via class_child_id); s3: 10 of teacher01's roster (ended, disconnected)
INSERT INTO public.session_students (id, session_id, name, avatar_seed, class_child_id, joined_at, is_connected, readiness_state, readiness_changed_at)
SELECT ('57575757-5757-4757-8757-' || lpad((200 + n)::text, 12, '0'))::uuid,
       '55555555-5555-4555-8555-000000000002',
       'Test Child ' || lpad(n::text, 2, '0'), 'STG002:test child ' || lpad(n::text, 2, '0'),
       ('44444444-4444-4444-8444-' || lpad((200 + n)::text, 12, '0'))::uuid,
       now() - interval '24 minutes' + (n || ' seconds')::interval, true,
       (ARRAY['ready','playing','playing','hand_detected','camera_ready'])[1 + n % 5], now() - interval '5 minutes'
FROM generate_series(1, 20) n
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.session_students (id, session_id, name, avatar_seed, class_child_id, joined_at, is_connected, left_at, readiness_state, readiness_changed_at)
SELECT ('57575757-5757-4757-8757-' || lpad((100 + n)::text, 12, '0'))::uuid,
       '55555555-5555-4555-8555-000000000003',
       'Test Child ' || lpad(n::text, 2, '0'), 'STG003:test child ' || lpad(n::text, 2, '0'),
       ('44444444-4444-4444-8444-' || lpad((100 + n)::text, 12, '0'))::uuid,
       now() - interval '10 days' + (n || ' seconds')::interval, false, now() - interval '10 days' + interval '35 minutes',
       'completed', now() - interval '10 days' + interval '35 minutes'
FROM generate_series(1, 10) n
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------- parent side
INSERT INTO public.child_profiles (id, parent_id, nickname, age_band, learning_focus, avatar, preferred_hand, created_at)
VALUES
  ('66666666-6666-4666-8666-000000000001', '22222222-2222-4222-8222-000000000001', 'Test Kid A', '3-4', 'letters', 'fox',  'right', now() - interval '19 days'),
  ('66666666-6666-4666-8666-000000000002', '22222222-2222-4222-8222-000000000001', 'Test Kid B', '5-7', 'numbers', 'owl',  'left',  now() - interval '19 days'),
  ('66666666-6666-4666-8666-000000000003', '22222222-2222-4222-8222-000000000002', 'Test Kid C', '5-7', 'letters', 'bear', 'right', now() - interval '15 days')
ON CONFLICT (id) DO NOTHING;
UPDATE public.child_profiles c SET tenant_id = t.id FROM public.tenants t WHERE t.kind='parent' AND t.owner_user_id=c.parent_id AND c.tenant_id IS NULL;

-- subscriptions: parent01 = trialing but EXPIRED; parent02 = active monthly
UPDATE public.parent_subscriptions SET
  status='trialing', trial_start = now() - interval '20 days', trial_end = now() - interval '6 days',
  reminder_2d_sent_at = now() - interval '8 days', reminder_expired_sent_at = now() - interval '6 days'
WHERE parent_id = '22222222-2222-4222-8222-000000000001';

UPDATE public.parent_subscriptions SET
  status='active', plan_interval='month', stripe_customer_id='cus_staging_synthetic_02', stripe_subscription_id='sub_staging_synthetic_02',
  trial_start = now() - interval '20 days', trial_end = now() - interval '6 days',
  current_period_start = now() - interval '6 days', current_period_end = now() + interval '24 days',
  welcome_sent_at = now() - interval '20 days', activated_sent_at = now() - interval '6 days', last_event_at = now() - interval '6 days'
WHERE parent_id = '22222222-2222-4222-8222-000000000002';

-- ---------------------------------------------------------------- analytics_events (~200 over 30 days)
-- deterministic event_uid => re-runs are no-ops (unique index analytics_events_event_uid_uidx)
INSERT INTO public.analytics_events (session_id, device_id, occurred_at, event_name, page, game_mode, age_band, school_id, class_id,
                                     build_version, device_type, browser, viewport_w, viewport_h, meta, event_uid, client_seq, client_ts, context, environment)
SELECT
  CASE WHEN n % 2 = 0 THEN '55555555-5555-4555-8555-000000000002'::uuid ELSE '55555555-5555-4555-8555-000000000003'::uuid END,
  'stg-device-' || lpad(((n % 12) + 1)::text, 2, '0'),
  now() - ((n % 30) || ' days')::interval - ((n * 7) % 1440 || ' minutes')::interval,
  (ARRAY['camera_requested','camera_granted','tracker_init_started','tracker_init_succeeded','wave_screen_view','wave_first_hand_seen',
         'wave_completed','mode_started','mode_completed','session_heartbeat','tab_hidden','tab_visible','tracker_quality_sample','mode_started'])[1 + n % 14],
  '/play', (ARRAY['letter_tracing','shape_tracing','number_tracing'])[1 + n % 3],
  CASE WHEN n % 2 = 0 THEN '3-4' ELSE '5-7' END,
  CASE WHEN n % 2 = 0 THEN '33333333-3333-4333-8333-000000000002' ELSE '33333333-3333-4333-8333-000000000001' END,
  CASE WHEN n % 2 = 0 THEN 'STG002' ELSE 'STG003' END,
  'staging-seed', (ARRAY['desktop','tablet','chromebook'])[1 + n % 3], 'Chrome', 1280, 800,
  jsonb_build_object('seed', true, 'environment', 'staging'),
  md5('stg-analytics-' || n)::uuid, n, now() - ((n % 30) || ' days')::interval, 'classroom', 'staging'
FROM generate_series(1, 200) n
ON CONFLICT (event_uid) DO NOTHING;

-- ---------------------------------------------------------------- learning_attempts (~50 over 30 days)
-- 40 classroom attempts (no child_profile_id) + 10 parent-child attempts (fires bump_child_* triggers)
INSERT INTO public.learning_attempts (occurred_at, session_id, device_id, game_mode, stage_id, stage_index, item_key, age_band, was_correct,
                                      attempt_number, ms_to_attempt, expected_value, actual_value, meta, event_uid, client_seq, context,
                                      child_profile_id, gq_path_accuracy_pct, gq_n_samples)
SELECT
  now() - ((n % 30) || ' days')::interval - ((n * 11) % 600 || ' minutes')::interval,
  CASE WHEN n <= 40 THEN (CASE WHEN n % 2 = 0 THEN '55555555-5555-4555-8555-000000000002'::uuid ELSE '55555555-5555-4555-8555-000000000003'::uuid END)
       ELSE '55555555-5555-4555-8555-000000000003'::uuid END,
  CASE WHEN n <= 40 THEN 'stg-device-' || lpad(((n % 12) + 1)::text, 2, '0') ELSE 'stg-home-device-' || (1 + n % 2) END,
  (ARRAY['letter_tracing','shape_tracing','number_tracing'])[1 + n % 3],
  'stage_' || (1 + n % 4), 1 + n % 4,
  (ARRAY['letter_a','letter_b','letter_c','shape_circle','shape_square','number_1','number_2','letter_s'])[1 + n % 8],
  CASE WHEN n % 2 = 0 THEN '3-4' ELSE '5-7' END,
  (n % 5) <> 0,
  1 + n % 3, 1500 + (n * 37) % 4000, 'a', CASE WHEN (n % 5) <> 0 THEN 'a' ELSE 'o' END,
  jsonb_build_object('seed', true, 'duration_ms', 2000 + (n * 13) % 3000),
  md5('stg-attempt-' || n)::uuid, n, CASE WHEN n <= 40 THEN 'classroom' ELSE 'home' END,
  CASE WHEN n > 40 THEN (ARRAY['66666666-6666-4666-8666-000000000001','66666666-6666-4666-8666-000000000002','66666666-6666-4666-8666-000000000003'])[1 + n % 3]::uuid ELSE NULL END,
  60 + (n * 7) % 40, 40 + n % 20
FROM generate_series(1, 50) n
ON CONFLICT (event_uid) DO NOTHING;

COMMIT;
