-- ════════════════════════════════════════════════════════════════════
-- Baseline 10 — TABLES (public schema)
-- Reconstructed from live project fmrsfjxwswzhvicylaph on 2026-06-29 via
-- read-only catalog introspection (the migration ledger is unreliable;
-- this captures the TRUE production structure). Apply order: see 00_APPLY.md.
-- Generated/identity columns are emitted correctly so this replays cleanly.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_alerts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    alert_type text NOT NULL,
    severity text NOT NULL DEFAULT 'info'::text,
    message text NOT NULL,
    resolved boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    resolved_at timestamp with time zone,
    data jsonb,
    read_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    occurred_at timestamp with time zone NOT NULL DEFAULT now(),
    event_name text NOT NULL,
    page text,
    component text,
    game_mode text,
    stage_id text,
    chapter integer,
    level integer,
    age_band text,
    school_id text,
    class_id text,
    build_version text,
    device_type text,
    browser text,
    browser_version text,
    viewport_w integer,
    viewport_h integer,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    referrer text,
    value_number double precision,
    meta jsonb DEFAULT '{}'::jsonb,
    device_id text,
    event_uid uuid,
    client_seq bigint,
    client_ts timestamp with time zone,
    context text,
    tenant_id uuid,
    environment text,
    traffic_type text,
    attempt_id uuid,
    received_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_events (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    parent_id uuid,
    stripe_event_id text,
    type text NOT NULL,
    payload jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.broadcast_log (
    campaign text NOT NULL,
    email text NOT NULL,
    status text NOT NULL DEFAULT 'sent'::text,
    provider_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.child_activity_summary (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    child_profile_id uuid NOT NULL,
    activity_key text NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    completions integer NOT NULL DEFAULT 0,
    completion_rate numeric NOT NULL DEFAULT 0,
    mastery numeric NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'practising'::text,
    total_seconds integer NOT NULL DEFAULT 0,
    last_played_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.child_learning_state (
    child_profile_id uuid NOT NULL,
    mode_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    adaptive_difficulty jsonb NOT NULL DEFAULT '{}'::jsonb,
    confidence_overall numeric NOT NULL DEFAULT 0,
    streak_days integer NOT NULL DEFAULT 0,
    last_streak_date date,
    last_played_at timestamp with time zone,
    recommended_activity_key text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.child_profiles (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    parent_id uuid NOT NULL,
    nickname text NOT NULL,
    age_band text,
    learning_focus text,
    avatar text,
    accessibility_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
    preferred_hand text,
    status text NOT NULL DEFAULT 'active'::text,
    archived_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.class_children (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL,
    first_name text NOT NULL,
    nickname text,
    age_band text,
    notes text,
    archived boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.classroom_default_activities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    activities text[] NOT NULL DEFAULT '{}'::text[],
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_errors (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    error_type text NOT NULL,
    message text,
    user_agent text,
    session_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    reported_at timestamp with time zone NOT NULL DEFAULT now(),
    error_message text GENERATED ALWAYS AS (message) STORED,
    error_stack text,
    page_url text,
    teacher_id uuid,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.consent_records (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    parent_id uuid NOT NULL,
    consent_type text NOT NULL,
    consent_version text NOT NULL,
    granted boolean NOT NULL DEFAULT true,
    granted_at timestamp with time zone NOT NULL DEFAULT now(),
    withdrawn_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    parent_id uuid NOT NULL,
    scope text NOT NULL,
    target_child_id uuid,
    status text NOT NULL DEFAULT 'pending'::text,
    requested_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.form_submissions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    form_type text NOT NULL,
    email text,
    name text,
    school text,
    role text,
    message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    ip_hash text,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.human_observation_fact (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    recorded_at timestamp with time zone NOT NULL DEFAULT now(),
    recorded_by text,
    observer_role text NOT NULL DEFAULT 'teacher'::text,
    device_id text NOT NULL,
    session_id uuid,
    classroom_code text,
    age_band text,
    focus_tags text[] NOT NULL DEFAULT '{}'::text[],
    affect_tags text[] NOT NULL DEFAULT '{}'::text[],
    independence_tags text[] NOT NULL DEFAULT '{}'::text[],
    social_tags text[] NOT NULL DEFAULT '{}'::text[],
    notable_tags text[] NOT NULL DEFAULT '{}'::text[],
    note text,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.item_difficulty (
    item_key text NOT NULL,
    game_mode text NOT NULL,
    b numeric(6,3) NOT NULL DEFAULT 0,
    n_attempts bigint NOT NULL DEFAULT 0,
    last_updated timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.join_audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid,
    student_id uuid,
    event text NOT NULL,
    result_code text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.join_rate_limits (
    ip_hash text NOT NULL,
    attempt_count integer NOT NULL DEFAULT 1,
    window_start timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_attempts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    occurred_at timestamp with time zone NOT NULL DEFAULT now(),
    session_id uuid NOT NULL,
    device_id text,
    game_mode text NOT NULL,
    stage_id text,
    stage_index integer,
    item_key text NOT NULL,
    age_band text,
    was_correct boolean NOT NULL,
    attempt_number integer,
    ms_to_attempt integer,
    expected_value text,
    actual_value text,
    meta jsonb DEFAULT '{}'::jsonb,
    event_uid uuid,
    client_seq bigint,
    client_ts timestamp with time zone,
    context text,
    credibility_score numeric(3,2),
    credibility_tier text,
    credibility_reasons jsonb DEFAULT '[]'::jsonb,
    credibility_scored_at timestamp with time zone,
    elo_processed_at timestamp with time zone,
    gq_path_accuracy_pct numeric(5,2),
    gq_path_efficiency numeric(5,3),
    gq_spatial_error_mean_px numeric(7,2),
    gq_velocity_variance numeric(10,3),
    gq_pause_count integer,
    gq_directional_changes integer,
    gq_time_to_first_movement_ms integer,
    gq_time_to_completion_ms integer,
    gq_corrections_in_stroke integer,
    gq_n_samples integer,
    child_profile_id uuid,
    tenant_id uuid,
    attempt_id uuid
);

CREATE TABLE IF NOT EXISTS public.lios_adaptive_decisions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    made_at timestamp with time zone NOT NULL DEFAULT now(),
    device_id text NOT NULL,
    session_id uuid NOT NULL,
    game_mode text NOT NULL,
    age_band text,
    context text,
    current_item text,
    next_item text,
    scaffold_level text NOT NULL DEFAULT 'none'::text,
    reward_intensity text NOT NULL DEFAULT 'quiet'::text,
    suggest_break boolean NOT NULL DEFAULT false,
    regime text NOT NULL DEFAULT 'productive'::text,
    recovery_step integer,
    p_expected numeric(4,3),
    invariants_applied text[] NOT NULL DEFAULT '{}'::text[],
    inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
    reasoning text,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.lios_anomaly_fact (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    detected_at timestamp with time zone NOT NULL DEFAULT now(),
    metric text NOT NULL,
    severity text NOT NULL DEFAULT 'warn'::text,
    current_value numeric,
    baseline_mean numeric,
    baseline_sd numeric,
    z_score numeric,
    context jsonb NOT NULL DEFAULT '{}'::jsonb,
    reason text,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.lios_pipeline_runs (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    run_at timestamp with time zone NOT NULL DEFAULT now(),
    duration_ms integer,
    trust_scored bigint,
    trust_tier_a bigint,
    trust_tier_b bigint,
    trust_tier_c bigint,
    elo_processed bigint,
    elo_distinct_learners bigint,
    elo_distinct_items bigint,
    mastery_pairs bigint,
    mastery_transitions bigint,
    mastery_by_state jsonb,
    friction_sessions bigint,
    friction_detectors_fired bigint,
    friction_by_detector jsonb,
    error_message text,
    anomaly_detected bigint,
    anomaly_by_metric jsonb,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.mastery_episode_fact (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    device_id text NOT NULL,
    item_key text NOT NULL,
    game_mode text NOT NULL,
    from_state text,
    to_state text NOT NULL,
    transition_at timestamp with time zone NOT NULL DEFAULT now(),
    age_band text,
    theta_at_event numeric(6,3),
    b_at_event numeric(6,3),
    evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    source text DEFAULT 'website'::text,
    subscribed_at timestamp with time zone DEFAULT now(),
    unsubscribe_token text DEFAULT encode(gen_random_bytes(16), 'hex'::text),
    unsubscribed_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.parent_controls (
    child_profile_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    daily_play_limit_minutes integer,
    allowed_categories text[],
    paused boolean NOT NULL DEFAULT false,
    sound_enabled boolean NOT NULL DEFAULT true,
    camera_reassurance text NOT NULL DEFAULT 'standard'::text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.parent_profiles (
    id uuid NOT NULL,
    email text,
    display_name text,
    stripe_customer_id text,
    marketing_opt_in boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.parent_subscriptions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    parent_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text NOT NULL DEFAULT 'none'::text,
    plan_interval text,
    base_price_id text,
    addon_price_id text,
    included_child_slots integer NOT NULL DEFAULT 2,
    billed_addon_quantity integer NOT NULL DEFAULT 0,
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid,
    reminder_2d_sent_at timestamp with time zone,
    reminder_expired_sent_at timestamp with time zone,
    welcome_sent_at timestamp with time zone,
    last_event_at timestamp with time zone,
    activated_sent_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id uuid NOT NULL,
    granted_by uuid,
    note text,
    granted_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_insights (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    scope text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data_snapshot jsonb,
    severity text NOT NULL DEFAULT 'info'::text,
    source text NOT NULL DEFAULT 'ai'::text,
    generated_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + '30 days'::interval),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.playlists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    activities jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_public boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    gestures jsonb NOT NULL DEFAULT '[]'::jsonb,
    difficulty text NOT NULL DEFAULT 'medium'::text,
    duration_minutes integer NOT NULL DEFAULT 20,
    school_id uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.pricing_config (
    id text NOT NULL DEFAULT 'default'::text,
    currency text NOT NULL DEFAULT 'usd'::text,
    base_included_slots integer NOT NULL DEFAULT 2,
    base_monthly_cents integer NOT NULL DEFAULT 499,
    base_annual_cents integer NOT NULL DEFAULT 5499,
    addon_monthly_cents_per_child integer NOT NULL DEFAULT 200,
    addon_annual_cents_per_child integer NOT NULL DEFAULT 2199,
    trial_days integer NOT NULL DEFAULT 14,
    max_children integer,
    active boolean NOT NULL DEFAULT true,
    effective_from timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.round_scores (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    round integer NOT NULL,
    stars integer NOT NULL,
    raw_score integer NOT NULL DEFAULT 0,
    activity text NOT NULL,
    submitted_at timestamp with time zone NOT NULL DEFAULT now(),
    duration_seconds integer,
    completed boolean NOT NULL DEFAULT true,
    session_student_id uuid GENERATED ALWAYS AS (student_id) STORED,
    round_number integer GENERATED ALWAYS AS (round) STORED,
    gesture_name text GENERATED ALWAYS AS (activity) STORED,
    accuracy numeric GENERATED ALWAYS AS ((((stars)::numeric / 5.0) * 100.0)) STORED,
    score integer GENERATED ALWAYS AS (raw_score) STORED,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    session_activity_id uuid,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.school_invites (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL,
    email text NOT NULL,
    token uuid NOT NULL DEFAULT gen_random_uuid(),
    invited_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
    accepted_at timestamp with time zone,
    status text NOT NULL DEFAULT 'pending'::text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.school_teachers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'teacher'::text,
    status text NOT NULL DEFAULT 'invited'::text,
    invited_by uuid,
    invited_at timestamp with time zone NOT NULL DEFAULT now(),
    accepted_at timestamp with time zone,
    joined_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.schools (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    admin_user_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    license_tier text NOT NULL DEFAULT 'starter_5'::text,
    license_status text NOT NULL DEFAULT 'active'::text,
    max_seats integer NOT NULL DEFAULT 5,
    seats_used integer NOT NULL DEFAULT 0,
    academic_year_end date NOT NULL DEFAULT '2026-07-31'::date,
    settings jsonb NOT NULL DEFAULT '{"timezone": "Europe/London", "default_scoreboard": "personal"}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    slug text,
    logo_url text,
    address text,
    city text,
    state text,
    zip_code text,
    country text DEFAULT 'GB'::text,
    phone text,
    website text,
    subscription_tier text NOT NULL DEFAULT 'free'::text,
    admin_teacher_id uuid GENERATED ALWAYS AS (admin_user_id) STORED,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    user_id uuid,
    event_type text NOT NULL,
    ip_hash text,
    ua_hash text,
    country text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_activities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    activity text NOT NULL,
    state text NOT NULL DEFAULT 'starting'::text,
    ordinal integer NOT NULL,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    ended_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.session_network_fingerprints (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    network_hash text NOT NULL,
    algorithm text NOT NULL DEFAULT 'hmac-sha256'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.session_students (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    name text NOT NULL,
    joined_at timestamp with time zone NOT NULL DEFAULT now(),
    is_connected boolean NOT NULL DEFAULT true,
    student_name text GENERATED ALWAYS AS (name) STORED,
    student_avatar text,
    left_at timestamp with time zone,
    is_active boolean GENERATED ALWAYS AS (is_connected) STORED,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    kicked_at timestamp with time zone,
    kicked_reason text,
    avatar_seed text,
    tenant_id uuid,
    class_child_id uuid
);

CREATE TABLE IF NOT EXISTS public.sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL,
    code text NOT NULL,
    activity text,
    status text NOT NULL DEFAULT 'lobby'::text,
    round integer NOT NULL DEFAULT 1,
    timer_seconds integer NOT NULL DEFAULT 90,
    max_students integer NOT NULL DEFAULT 30,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    ended_at timestamp with time zone,
    scoreboard_mode text NOT NULL DEFAULT 'personal'::text,
    school_id uuid,
    playlist_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    session_code text GENERATED ALWAYS AS (code) STORED,
    started_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    class_state text NOT NULL DEFAULT 'lobby'::text,
    current_activity_id uuid,
    class_name text,
    scoreboard_visible boolean NOT NULL DEFAULT false,
    tenant_id uuid,
    activity_version integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.skill_state (
    device_id text NOT NULL,
    item_key text NOT NULL,
    game_mode text NOT NULL,
    theta numeric(6,3) NOT NULL DEFAULT 0,
    n_attempts bigint NOT NULL DEFAULT 0,
    n_credible_attempts numeric(8,2) NOT NULL DEFAULT 0,
    last_attempt_at timestamp with time zone,
    age_band text,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.skill_state_history (
    device_id text NOT NULL,
    item_key text NOT NULL,
    game_mode text NOT NULL,
    day date NOT NULL,
    theta numeric(6,3) NOT NULL,
    n_attempts bigint NOT NULL,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.stripe_price_map (
    price_key text NOT NULL,
    stripe_price_id text NOT NULL,
    "interval" text NOT NULL,
    role text NOT NULL,
    description text,
    active boolean NOT NULL DEFAULT true,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.student_activity_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    activity text NOT NULL,
    sequence_order integer NOT NULL DEFAULT 0,
    is_enabled boolean NOT NULL DEFAULT true,
    assigned_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teacher_insights (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL,
    insight_type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data_snapshot jsonb,
    severity text NOT NULL DEFAULT 'info'::text,
    source text NOT NULL DEFAULT 'ai'::text,
    generated_at timestamp with time zone NOT NULL DEFAULT now(),
    dismissed_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + '30 days'::interval),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    auth_user_id uuid NOT NULL,
    full_name text,
    school_name text,
    role text DEFAULT 'teacher'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.teachers (
    id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL DEFAULT ''::text,
    avatar_url text DEFAULT ''::text,
    tier text NOT NULL DEFAULT 'free'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    trial_started_at timestamp with time zone,
    trial_expires_at timestamp with time zone,
    stripe_customer_id text,
    stripe_subscription_id text,
    school_id uuid,
    is_admin boolean NOT NULL DEFAULT false,
    settings jsonb NOT NULL DEFAULT '{"email_digest": false, "max_students": 30, "default_timer": 90, "default_scoreboard": "personal"}'::jsonb,
    onboarded_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS public.tenant_members (
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    member_role text NOT NULL DEFAULT 'owner'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    kind text NOT NULL,
    owner_user_id uuid,
    name text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
