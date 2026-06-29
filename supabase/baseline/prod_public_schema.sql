


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."_check_active_has_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.class_state = 'in_activity' AND NEW.current_activity_id IS NULL THEN
        RAISE EXCEPTION 'class_state=in_activity requires current_activity_id to be non-null'
            USING ERRCODE = 'P0001';
    END IF;
    IF NEW.class_state <> 'in_activity' AND NEW.current_activity_id IS NOT NULL THEN
        RAISE EXCEPTION 'current_activity_id must be null when class_state is not in_activity'
            USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."_check_active_has_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_class_assert_teacher"("in_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE owner uuid;
BEGIN
    SELECT teacher_id INTO owner FROM public.sessions WHERE id = in_session_id;
    IF owner IS NULL THEN
        RAISE EXCEPTION 'session not found' USING ERRCODE = 'P0002';
    END IF;
    IF auth.uid() IS NULL OR auth.uid() <> owner THEN
        RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
    END IF;
END;
$$;


ALTER FUNCTION "public"."_class_assert_teacher"("in_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_ensure_tenant"("in_kind" "text", "in_owner" "uuid", "in_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare t_id uuid;
begin
  select id into t_id from tenants where kind = in_kind and owner_user_id = in_owner limit 1;
  if t_id is null then
    insert into tenants (kind, owner_user_id, name) values (in_kind, in_owner, in_name)
    returning id into t_id;
  end if;
  insert into tenant_members (tenant_id, user_id) values (t_id, in_owner)
  on conflict do nothing;
  return t_id;
end;
$$;


ALTER FUNCTION "public"."_ensure_tenant"("in_kind" "text", "in_owner" "uuid", "in_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_get_child_skills"("p_child" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare result jsonb;
begin
  if to_regclass('public.lios_state') is null then
    return '[]'::jsonb;
  end if;
  execute $sql$
    select coalesce(jsonb_agg(jsonb_build_object(
      'skill_key', skill_key, 'mastery', mastery, 'confidence', confidence, 'attempts', attempts
    ) order by mastery desc), '[]'::jsonb)
    from lios_state where child_profile_id = $1
  $sql$ into result using p_child;
  return result;
end;
$_$;


ALTER FUNCTION "public"."_get_child_skills"("p_child" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM public.platform_admins
                WHERE user_id = auth.uid()
            );
        END;
        $$;


ALTER FUNCTION "public"."_is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."_is_admin"() IS 'Returns true if the current user is listed in platform_admins. Used by RLS policies to grant admin read access.';



CREATE OR REPLACE FUNCTION "public"."_stamp_child_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.tenant_id is null and new.child_profile_id is not null then
    select tenant_id into new.tenant_id from child_profiles where id = new.child_profile_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_stamp_child_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_stamp_parent_profile_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.tenant_id is null then
    select id into new.tenant_id from tenants
    where kind = 'parent' and owner_user_id = new.id limit 1;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_stamp_parent_profile_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_stamp_parent_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.tenant_id is null then
    select id into new.tenant_id from tenants
    where kind = 'parent' and owner_user_id = coalesce(new.parent_id, auth.uid()) limit 1;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_stamp_parent_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_stamp_session_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.tenant_id is null and new.session_id is not null then
    select tenant_id into new.tenant_id from sessions where id = new.session_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_stamp_session_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_stamp_teacher_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.tenant_id is null then
    select id into new.tenant_id from tenants
    where kind = 'teacher' and owner_user_id = coalesce(new.teacher_id, auth.uid()) limit 1;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."_stamp_teacher_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."analytics_events_promote_meta"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
BEGIN
  BEGIN
    IF NEW.traffic_type IS NULL AND (NEW.meta ? 'traffic_type') THEN
      NEW.traffic_type := NEW.meta->>'traffic_type';
    END IF;
    IF NEW.environment IS NULL AND (NEW.meta ? 'environment') THEN
      NEW.environment := NEW.meta->>'environment';
    END IF;
    IF NEW.attempt_id IS NULL AND (NEW.meta ? 'attempt_id')
       AND (NEW.meta->>'attempt_id') ~ '^[0-9a-f-]{36}$' THEN
      NEW.attempt_id := (NEW.meta->>'attempt_id')::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never block an insert
  END;
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."analytics_events_promote_meta"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."child_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "nickname" "text" NOT NULL,
    "age_band" "text",
    "learning_focus" "text",
    "avatar" "text",
    "accessibility_prefs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "preferred_hand" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."child_profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_child_profile"("p_child" "uuid") RETURNS "public"."child_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare row child_profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;
  update child_profiles
     set status = 'archived', archived_at = now()
   where id = p_child and parent_id = auth.uid()
   returning * into row;
  return row;
end;
$$;


ALTER FUNCTION "public"."archive_child_profile"("p_child" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_owns_child"("child" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from child_profiles c
    where c.id = child and c.parent_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."auth_owns_child"("child" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_child_activity_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_activity text := coalesce(new.game_mode, 'unknown');
  v_attempts int;
  v_completions int;
  v_completion_rate numeric;
  v_mastery numeric;
  v_status text;
  v_total_seconds int := coalesce((new.meta->>'duration_ms')::int, new.ms_to_attempt, 0) / 1000;
begin
  if new.child_profile_id is null then
    return new;
  end if;

  -- Upsert the rollup row. We treat each was_correct=true as a "completion".
  -- mastery starts at 0 and rises with completion_rate, capped at 1.
  insert into child_activity_summary (
    child_profile_id, activity_key, attempts, completions,
    completion_rate, mastery, status, total_seconds, last_played_at
  )
  values (
    new.child_profile_id, v_activity,
    1, case when new.was_correct then 1 else 0 end,
    case when new.was_correct then 1.0 else 0.0 end,
    case when new.was_correct then 0.1 else 0.0 end,
    case when new.was_correct then 'practising' else 'new' end,
    greatest(v_total_seconds, 0),
    new.occurred_at
  )
  on conflict (child_profile_id, activity_key) do update
    set attempts = child_activity_summary.attempts + 1,
        completions = child_activity_summary.completions
                    + case when new.was_correct then 1 else 0 end,
        completion_rate = (child_activity_summary.completions
                          + case when new.was_correct then 1 else 0 end)::numeric
                         / nullif(child_activity_summary.attempts + 1, 0),
        mastery = least(1.0, (child_activity_summary.completions
                          + case when new.was_correct then 1 else 0 end)::numeric
                         / nullif(child_activity_summary.attempts + 1, 0)),
        status = case
          when (child_activity_summary.completions
                + case when new.was_correct then 1 else 0 end)::numeric
                / nullif(child_activity_summary.attempts + 1, 0) >= 0.85
            and child_activity_summary.attempts + 1 >= 4 then 'mastered'
          when (child_activity_summary.completions
                + case when new.was_correct then 1 else 0 end)::numeric
                / nullif(child_activity_summary.attempts + 1, 0) < 0.4
            and child_activity_summary.attempts + 1 >= 3 then 'struggling'
          else 'practising'
        end,
        total_seconds = child_activity_summary.total_seconds + greatest(v_total_seconds, 0),
        last_played_at = new.occurred_at,
        updated_at = now()
    returning attempts, completions, completion_rate, mastery, status
      into v_attempts, v_completions, v_completion_rate, v_mastery, v_status;

  return new;
end;
$$;


ALTER FUNCTION "public"."bump_child_activity_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_child_learning_state"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_today date := (new.occurred_at at time zone 'utc')::date;
  v_yesterday date := v_today - 1;
begin
  if new.child_profile_id is null then
    return new;
  end if;

  insert into child_learning_state (
    child_profile_id, last_played_at, streak_days, last_streak_date,
    recommended_activity_key
  )
  values (
    new.child_profile_id, new.occurred_at, 1, v_today,
    -- naive: keep playing what was just touched until a real recommender exists
    new.game_mode
  )
  on conflict (child_profile_id) do update
    set last_played_at = greatest(child_learning_state.last_played_at, new.occurred_at),
        last_streak_date = v_today,
        streak_days = case
          when child_learning_state.last_streak_date = v_today
            then child_learning_state.streak_days
          when child_learning_state.last_streak_date = v_yesterday
            then child_learning_state.streak_days + 1
          else 1
        end,
        recommended_activity_key = (
          select activity_key
          from child_activity_summary
          where child_profile_id = new.child_profile_id
            and status in ('practising', 'struggling')
          order by status = 'struggling' desc, mastery asc, attempts asc
          limit 1
        ),
        updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."bump_child_learning_state"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_join_rate_limit"("in_ip_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_row      public.join_rate_limits%ROWTYPE;
    v_now      timestamptz := now();
    v_window   interval := '60 seconds';
    v_max_attempts int := 10;
BEGIN
    IF in_ip_hash IS NULL OR in_ip_hash = '' THEN
        RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
    END IF;

    SELECT * INTO v_row
    FROM public.join_rate_limits
    WHERE ip_hash = in_ip_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.join_rate_limits (ip_hash, attempt_count, window_start)
        VALUES (in_ip_hash, 1, v_now);
        RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
    END IF;

    -- If window expired, reset
    IF v_now - v_row.window_start > v_window THEN
        UPDATE public.join_rate_limits
        SET attempt_count = 1, window_start = v_now
        WHERE ip_hash = in_ip_hash;
        RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
    END IF;

    -- Within window — check count
    IF v_row.attempt_count >= v_max_attempts THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'retry_after_seconds', extract(epoch FROM (v_row.window_start + v_window - v_now))::int
        );
    END IF;

    -- Increment
    UPDATE public.join_rate_limits
    SET attempt_count = attempt_count + 1
    WHERE ip_hash = in_ip_hash;

    RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
END;
$$;


ALTER FUNCTION "public"."check_join_rate_limit"("in_ip_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_join_rate_limit"("in_ip_hash" "text") IS 'SECURITY DEFINER. Checks rate limit for join attempts. Allows 10 attempts per IP per 60 seconds. Returns { allowed: bool, retry_after_seconds: int }.';



CREATE OR REPLACE FUNCTION "public"."class_delete_session"("in_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE owner uuid;
BEGIN
    SELECT teacher_id INTO owner FROM public.sessions WHERE id = in_session_id;
    IF owner IS NULL THEN
        -- Already gone — treat as success (idempotent).
        RETURN jsonb_build_object('session_id', in_session_id, 'deleted', false, 'note', 'not found');
    END IF;
    IF auth.uid() IS NULL OR auth.uid() <> owner THEN
        RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
    END IF;
    -- ON DELETE CASCADE on session_activities + session_students +
    -- round_scores (already declared) takes care of the children.
    DELETE FROM public.sessions WHERE id = in_session_id;
    RETURN jsonb_build_object('session_id', in_session_id, 'deleted', true);
END;
$$;


ALTER FUNCTION "public"."class_delete_session"("in_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_end_activity"("in_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE cur uuid; new_ver int;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN
        SELECT id INTO cur FROM public.session_activities
        WHERE session_id = in_session_id AND state IN ('starting','playing','paused','results')
        ORDER BY started_at DESC LIMIT 1;
    END IF;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities
    SET state = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE id = cur;
    UPDATE public.sessions
    SET class_state = 'between_activities',
        current_activity_id = NULL,
        status = 'lobby',
        activity = NULL,
        activity_version = activity_version + 1,
        updated_at = now()
    WHERE id = in_session_id
    RETURNING activity_version INTO new_ver;
    RETURN jsonb_build_object(
        'session_activity_id', cur,
        'state', 'ended',
        'class_state', 'between_activities',
        'status', 'lobby',
        'activity_version', new_ver
    );
END;
$$;


ALTER FUNCTION "public"."class_end_activity"("in_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_end_session"("in_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    UPDATE public.session_activities
    SET state = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE session_id = in_session_id
      AND state IN ('starting','playing','paused','results');
    UPDATE public.sessions
    SET class_state = 'ended',
        ended_at = now(),
        current_activity_id = NULL,
        status = 'ended',
        activity_version = activity_version + 1,
        updated_at = now()
    WHERE id = in_session_id;
    RETURN jsonb_build_object(
        'session_id', in_session_id,
        'class_state', 'ended',
        'status', 'ended'
    );
END;
$$;


ALTER FUNCTION "public"."class_end_session"("in_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_end_stale_sessions"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE n int;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
    END IF;
    -- "Stale" = caller's own non-ended sessions older than 4 hours
    -- with no current_activity_id (i.e. never escaped lobby) OR any
    -- caller's session in lobby/between state.
    WITH ended AS (
        UPDATE public.sessions
        SET class_state = 'ended', ended_at = COALESCE(ended_at, now()),
            current_activity_id = NULL, status = 'ended', updated_at = now()
        WHERE teacher_id = auth.uid()
          AND class_state IN ('lobby','between_activities')
        RETURNING id
    )
    SELECT count(*)::int INTO n FROM ended;
    RETURN jsonb_build_object('ended_count', n);
END;
$$;


ALTER FUNCTION "public"."class_end_stale_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_get_activity"("in_activity_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE r record;
BEGIN
    IF in_activity_id IS NULL THEN RETURN NULL; END IF;
    SELECT sa.id, sa.session_id, sa.activity, sa.state, sa.ordinal,
           sa.started_at, sa.ended_at, COALESCE(sa.metadata, '{}'::jsonb) AS metadata
      INTO r
      FROM public.session_activities sa
     WHERE sa.id = in_activity_id
     LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN to_jsonb(r);
END $$;


ALTER FUNCTION "public"."class_get_activity"("in_activity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_get_self"("in_student_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE r record;
BEGIN
    IF in_student_id IS NULL THEN RETURN NULL; END IF;
    SELECT ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.joined_at,
           ss.left_at, ss.is_active, ss.is_connected, ss.kicked_at, ss.kicked_reason
      INTO r
      FROM public.session_students ss
     WHERE ss.id = in_student_id
     LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN to_jsonb(r);
END $$;


ALTER FUNCTION "public"."class_get_self"("in_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_get_session"("in_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare r record;
begin
  if in_session_id is null then return null; end if;
  select s.id, s.code, s.session_code, s.activity, s.status, s.class_state,
         s.current_activity_id, s.class_name, s.scoreboard_visible,
         s.scoreboard_mode, s.round, s.timer_seconds, s.max_students,
         s.activity_version, s.updated_at
    into r
  from public.sessions s
  where s.id = in_session_id and s.status <> 'ended' and s.class_state <> 'ended'
  limit 1;
  if not found then return null; end if;
  return to_jsonb(r);
end $$;


ALTER FUNCTION "public"."class_get_session"("in_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_join"("in_session_id" "uuid", "in_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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
  while exists (
    select 1 from public.session_students ss
    where ss.session_id = in_session_id and ss.name = v_final
  ) and v_i <= 50 loop
    v_final := v_base || v_i::text;
    v_i := v_i + 1;
  end loop;

  insert into public.session_students (session_id, name, avatar_seed)
  values (in_session_id, v_final, in_session_id::text || ':' || lower(btrim(v_final)))
  returning id into v_id;

  select ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.is_active,
         ss.kicked_at, ss.kicked_reason
    into r
  from public.session_students ss where ss.id = v_id;
  return to_jsonb(r);
end $$;


ALTER FUNCTION "public"."class_join"("in_session_id" "uuid", "in_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."class_join"("in_session_id" "uuid", "in_name" "text") IS 'Anon-callable class join: validates joinable session, dedupes name, inserts roster row, returns it. Restored to prod in 0029 (was defined in 0022 but missing from live DB).';



CREATE OR REPLACE FUNCTION "public"."class_join_by_ip"("in_session_id" "uuid", "in_name" "text", "in_client_ip" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_secret text := current_setting('app.network_fingerprint_secret', true);
    v_fp     text := public.generate_network_fingerprint(in_client_ip, v_secret);
BEGIN
    RETURN public.class_join_with_network(in_session_id, in_name, v_fp);
END $$;


ALTER FUNCTION "public"."class_join_by_ip"("in_session_id" "uuid", "in_name" "text", "in_client_ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_join_with_network"("in_session_id" "uuid", "in_name" "text", "in_network_fingerprint" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_stored_hash   text;
    v_base          text;
    v_final         text;
    v_i             int := 2;
    v_id            uuid;
    r               record;
BEGIN
    IF in_session_id IS NULL OR coalesce(btrim(in_name), '') = '' THEN
        RAISE EXCEPTION 'invalid join request' USING ERRCODE = '22023';
    END IF;

    PERFORM 1 FROM public.sessions s
    WHERE s.id = in_session_id
      AND (s.status IN ('lobby', 'playing', 'paused')
           OR s.class_state IN ('lobby', 'in_activity'));
    IF NOT FOUND THEN
        RAISE EXCEPTION 'session not joinable' USING ERRCODE = 'P0002';
    END IF;

    SELECT snf.network_hash INTO v_stored_hash
    FROM public.session_network_fingerprints snf
    WHERE snf.session_id = in_session_id;

    IF v_stored_hash IS NOT NULL AND v_stored_hash != '' THEN
        IF in_network_fingerprint IS NULL OR in_network_fingerprint = ''
           OR in_network_fingerprint != v_stored_hash THEN
            RAISE EXCEPTION 'network mismatch' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    v_base  := left(btrim(in_name), 40);
    v_final := v_base;
    WHILE EXISTS (
        SELECT 1 FROM public.session_students ss
        WHERE ss.session_id = in_session_id AND ss.name = v_final
    ) AND v_i <= 50 LOOP
        v_final := v_base || v_i::text;
        v_i := v_i + 1;
    END LOOP;

    INSERT INTO public.session_students (session_id, name, avatar_seed)
    VALUES (in_session_id, v_final, in_session_id::text || ':' || lower(btrim(v_final)))
    RETURNING id INTO v_id;

    SELECT ss.id, ss.session_id, ss.name, ss.avatar_seed, ss.is_active,
           ss.kicked_at, ss.kicked_reason
    INTO r
    FROM public.session_students ss WHERE ss.id = v_id;
    RETURN to_jsonb(r);
END;
$$;


ALTER FUNCTION "public"."class_join_with_network"("in_session_id" "uuid", "in_name" "text", "in_network_fingerprint" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."class_join_with_network"("in_session_id" "uuid", "in_name" "text", "in_network_fingerprint" "text") IS 'SECURITY DEFINER. Anon-callable class join with network proximity validation. Takes server-generated network fingerprint (HMAC hash), compares against stored session fingerprint, dedupes name, inserts roster row, returns it.';



CREATE OR REPLACE FUNCTION "public"."class_kick_student"("in_session_id" "uuid", "in_student_id" "uuid", "in_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE name_at_kick text;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    UPDATE public.session_students
    SET kicked_at     = COALESCE(kicked_at, now()),
        kicked_reason = in_reason,
        is_connected  = false,         -- is_active is GENERATED from this
        left_at       = COALESCE(left_at, now())
    WHERE id = in_student_id AND session_id = in_session_id
    RETURNING name INTO name_at_kick;

    IF name_at_kick IS NULL THEN
        RAISE EXCEPTION 'student not found in session' USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_build_object(
        'student_id', in_student_id,
        'name', name_at_kick,
        'kicked_at', now()
    );
END;
$$;


ALTER FUNCTION "public"."class_kick_student"("in_session_id" "uuid", "in_student_id" "uuid", "in_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_pause_activity"("in_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE cur uuid; new_ver int;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN
        SELECT id INTO cur FROM public.session_activities
        WHERE session_id = in_session_id AND state IN ('starting','playing','paused')
        ORDER BY started_at DESC LIMIT 1;
        IF cur IS NOT NULL THEN
            UPDATE public.sessions
            SET current_activity_id = cur,
                class_state = 'in_activity',
                updated_at = now()
            WHERE id = in_session_id;
        END IF;
    END IF;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities SET state = 'paused'
      WHERE id = cur AND state IN ('playing','starting');
    UPDATE public.sessions
    SET updated_at = now(),
        status = 'paused',
        activity_version = activity_version + 1
    WHERE id = in_session_id
    RETURNING activity_version INTO new_ver;
    RETURN jsonb_build_object(
        'session_activity_id', cur,
        'state', 'paused',
        'status', 'paused',
        'activity_version', new_ver
    );
END;
$$;


ALTER FUNCTION "public"."class_pause_activity"("in_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_resume_activity"("in_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE cur uuid; new_ver int;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    SELECT current_activity_id INTO cur FROM public.sessions WHERE id = in_session_id;
    IF cur IS NULL THEN
        SELECT id INTO cur FROM public.session_activities
        WHERE session_id = in_session_id AND state IN ('paused','playing','starting')
        ORDER BY started_at DESC LIMIT 1;
        IF cur IS NOT NULL THEN
            UPDATE public.sessions
            SET current_activity_id = cur,
                class_state = 'in_activity',
                updated_at = now()
            WHERE id = in_session_id;
        END IF;
    END IF;
    IF cur IS NULL THEN RAISE EXCEPTION 'no active activity'; END IF;
    UPDATE public.session_activities SET state = 'playing'
      WHERE id = cur AND state IN ('paused','starting');
    UPDATE public.sessions
    SET updated_at = now(),
        status = 'playing',
        activity_version = activity_version + 1
    WHERE id = in_session_id
    RETURNING activity_version INTO new_ver;
    RETURN jsonb_build_object(
        'session_activity_id', cur,
        'state', 'playing',
        'status', 'playing',
        'activity_version', new_ver
    );
END;
$$;


ALTER FUNCTION "public"."class_resume_activity"("in_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_set_scoreboard_visibility"("in_session_id" "uuid", "in_visible" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    UPDATE public.sessions SET scoreboard_visible = in_visible, updated_at = now() WHERE id = in_session_id;
    RETURN jsonb_build_object('scoreboard_visible', in_visible);
END;
$$;


ALTER FUNCTION "public"."class_set_scoreboard_visibility"("in_session_id" "uuid", "in_visible" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_start_activity"("in_session_id" "uuid", "in_activity" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    new_id    uuid;
    next_ord  int;
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);

    UPDATE public.session_activities
    SET state = 'ended', ended_at = COALESCE(ended_at, now())
    WHERE session_id = in_session_id
      AND state IN ('starting', 'playing', 'paused', 'results');

    SELECT COALESCE(max(ordinal), 0) + 1 INTO next_ord
      FROM public.session_activities
     WHERE session_id = in_session_id;

    INSERT INTO public.session_activities (session_id, activity, state, ordinal)
    VALUES (in_session_id, in_activity, 'playing', next_ord)
    RETURNING id INTO new_id;

    UPDATE public.sessions
    SET class_state          = 'in_activity',
        current_activity_id  = new_id,
        activity             = in_activity,
        status               = 'playing',
        activity_version     = activity_version + 1,
        started_at           = COALESCE(started_at, now()),
        updated_at           = now()
    WHERE id = in_session_id;

    RETURN jsonb_build_object(
        'session_id',         in_session_id,
        'activity',           in_activity,
        'session_activity_id', new_id,
        'ordinal',            next_ord,
        'state',              'playing',
        'status',             'playing',
        'activity_version',   (SELECT activity_version FROM public.sessions WHERE id = in_session_id)
    );
END;
$$;


ALTER FUNCTION "public"."class_start_activity"("in_session_id" "uuid", "in_activity" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_student_stats"("in_session_id" "uuid", "in_student_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    RETURN (
        SELECT jsonb_build_object(
            'student_id', s.id,
            'name', s.name,
            'avatar_seed', s.avatar_seed,
            'joined_at', s.joined_at,
            'is_active', s.is_active AND s.kicked_at IS NULL,
            'kicked_at', s.kicked_at,
            'kicked_reason', s.kicked_reason,
            'activities', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'session_activity_id', sa.id,
                        'activity', sa.activity,
                        'ordinal', sa.ordinal,
                        'state', sa.state,
                        'started_at', sa.started_at,
                        'ended_at', sa.ended_at,
                        'rounds', (
                            SELECT jsonb_agg(jsonb_build_object(
                                'round', r.round,
                                'stars', r.stars,
                                'raw_score', r.raw_score,
                                'duration_seconds', r.duration_seconds,
                                'completed', r.completed,
                                'submitted_at', r.submitted_at
                            ) ORDER BY r.round) FROM public.round_scores r
                            WHERE r.session_activity_id = sa.id AND r.student_id = in_student_id
                        )
                    ) ORDER BY sa.ordinal
                ) FROM public.session_activities sa WHERE sa.session_id = in_session_id
            ), '[]'::jsonb),
            'totals', (
                SELECT jsonb_build_object(
                    'rounds', count(*)::int,
                    'stars', COALESCE(sum(stars), 0)::int,
                    'time_on_task_s', COALESCE(sum(duration_seconds), 0)::int
                ) FROM public.round_scores WHERE session_id = in_session_id AND student_id = in_student_id
            )
        )
        FROM public.session_students s
        WHERE s.id = in_student_id AND s.session_id = in_session_id
    );
END;
$$;


ALTER FUNCTION "public"."class_student_stats"("in_session_id" "uuid", "in_student_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_summary"("in_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    PERFORM public._class_assert_teacher(in_session_id);
    RETURN (
        SELECT jsonb_build_object(
            'session', jsonb_build_object(
                'id', s.id,
                'class_name', s.class_name,
                'code', s.code,
                'started_at', s.started_at,
                'ended_at', s.ended_at,
                'duration_minutes', CASE
                    WHEN s.started_at IS NULL OR s.ended_at IS NULL THEN NULL
                    ELSE round(extract(epoch from (s.ended_at - s.started_at)) / 60.0)::int END
            ),
            'students', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'student_id', ss.id,
                        'name', ss.name,
                        'avatar_seed', ss.avatar_seed,
                        'kicked', ss.kicked_at IS NOT NULL,
                        'rounds', (SELECT count(*)::int FROM public.round_scores r WHERE r.student_id = ss.id AND r.session_id = s.id),
                        'stars', (SELECT COALESCE(sum(stars), 0)::int FROM public.round_scores r WHERE r.student_id = ss.id AND r.session_id = s.id),
                        'time_on_task_s', (SELECT COALESCE(sum(duration_seconds), 0)::int FROM public.round_scores r WHERE r.student_id = ss.id AND r.session_id = s.id)
                    ) ORDER BY ss.name
                ) FROM public.session_students ss WHERE ss.session_id = s.id
            ),
            'activities', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'activity', sa.activity,
                        'ordinal', sa.ordinal,
                        'started_at', sa.started_at,
                        'ended_at', sa.ended_at,
                        'duration_seconds', CASE
                            WHEN sa.ended_at IS NULL THEN NULL
                            ELSE extract(epoch from (sa.ended_at - sa.started_at))::int END,
                        'rounds_count', (SELECT count(*)::int FROM public.round_scores r WHERE r.session_activity_id = sa.id),
                        'avg_stars', (SELECT round(avg(stars)::numeric, 1) FROM public.round_scores r WHERE r.session_activity_id = sa.id)
                    ) ORDER BY sa.ordinal
                ) FROM public.session_activities sa WHERE sa.session_id = s.id
            ),
            'totals', (
                SELECT jsonb_build_object(
                    'rounds_completed', count(*)::int,
                    'total_stars', COALESCE(sum(stars), 0)::int,
                    'avg_stars', round(avg(stars)::numeric, 1),
                    'students_active', (SELECT count(*) FROM public.session_students WHERE session_id = s.id AND kicked_at IS NULL),
                    'students_total', (SELECT count(*) FROM public.session_students WHERE session_id = s.id)
                ) FROM public.round_scores WHERE session_id = s.id
            )
        )
        FROM public.sessions s WHERE s.id = in_session_id
    );
END;
$$;


ALTER FUNCTION "public"."class_summary"("in_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."class_validate_join"("in_code" "text", "in_network_fingerprint" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_normalized    text;
    v_session       record;
    v_network       jsonb;
BEGIN
    v_normalized := btrim(in_code);
    IF v_normalized IS NULL OR v_normalized = '' THEN
        RETURN jsonb_build_object('valid', false, 'code', 'INVALID_CODE');
    END IF;

    SELECT s.id, s.code, s.session_code, s.activity, s.status, s.class_state,
           s.current_activity_id, s.timer_seconds, s.class_name, s.started_at,
           s.ended_at
    INTO v_session
    FROM public.sessions s
    WHERE s.code = v_normalized OR s.session_code = v_normalized
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'code', 'INVALID_CODE');
    END IF;

    IF v_session.status NOT IN ('lobby', 'playing', 'paused')
       AND v_session.class_state NOT IN ('lobby', 'in_activity') THEN
        RETURN jsonb_build_object('valid', false, 'code', 'SESSION_NOT_JOINABLE');
    END IF;

    IF v_session.started_at IS NOT NULL AND
       now() - v_session.started_at > interval '4 hours' THEN
        RETURN jsonb_build_object('valid', false, 'code', 'SESSION_EXPIRED');
    END IF;

    v_network := public.session_validate_network(v_session.id, in_network_fingerprint);
    IF (v_network->>'match')::boolean = false THEN
        RETURN jsonb_build_object('valid', false, 'code', 'NETWORK_MISMATCH');
    END IF;

    IF NOT pg_try_advisory_xact_lock(hashtext(v_session.id::text)) THEN
        RETURN jsonb_build_object('valid', false, 'code', 'RATE_LIMITED');
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'code', 'OK',
        'session', jsonb_build_object(
            'id', v_session.id,
            'code', v_session.code,
            'activity', v_session.activity,
            'class_state', v_session.class_state,
            'current_activity_id', v_session.current_activity_id,
            'timer_seconds', v_session.timer_seconds,
            'class_name', v_session.class_name
        )
    );
END;
$$;


ALTER FUNCTION "public"."class_validate_join"("in_code" "text", "in_network_fingerprint" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."class_validate_join"("in_code" "text", "in_network_fingerprint" "text") IS 'SECURITY DEFINER. Authoritative join validation for classroom sessions. Checks code validity, session activity, expiry, network proximity, and rate limiting. Returns { valid: bool, code: string, session?: {...} }.';



CREATE OR REPLACE FUNCTION "public"."class_validate_join_by_ip"("in_code" "text", "in_client_ip" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_secret text := current_setting('app.network_fingerprint_secret', true);
    v_fp     text := public.generate_network_fingerprint(in_client_ip, v_secret);
BEGIN
    RETURN public.class_validate_join(in_code, v_fp);
END $$;


ALTER FUNCTION "public"."class_validate_join_by_ip"("in_code" "text", "in_client_ip" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_billing_preview"("p_interval" "text", "p_active_children" integer) RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select jsonb_build_object(
    'interval', coalesce(p_interval, 'month'),
    'currency', cfg.currency,
    'included_slots', cfg.base_included_slots,
    'active_children', p_active_children,
    'extra_children', greatest(0, p_active_children - cfg.base_included_slots),
    'base_cents', case when p_interval='year' then cfg.base_annual_cents else cfg.base_monthly_cents end,
    'addon_cents_per_child', case when p_interval='year' then cfg.addon_annual_cents_per_child else cfg.addon_monthly_cents_per_child end,
    'addon_cents_total', greatest(0, p_active_children - cfg.base_included_slots) *
        (case when p_interval='year' then cfg.addon_annual_cents_per_child else cfg.addon_monthly_cents_per_child end),
    'total_cents', pricing_amount_cents(p_interval, p_active_children),
    'annual_savings_cents', (cfg.base_monthly_cents * 12 - cfg.base_annual_cents)
  )
  from pricing_config cfg where cfg.id = 'default';
$$;


ALTER FUNCTION "public"."compute_billing_preview"("p_interval" "text", "p_active_children" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_child_profile"("p_nickname" "text", "p_age_band" "text" DEFAULT NULL::"text", "p_learning_focus" "text" DEFAULT NULL::"text", "p_avatar" "text" DEFAULT NULL::"text", "p_preferred_hand" "text" DEFAULT NULL::"text", "p_consent_version" "text" DEFAULT NULL::"text") RETURNS "public"."child_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare uid uuid := auth.uid();
        v_has_consent boolean;
        v_row child_profiles;
begin
  if uid is null then raise exception 'auth required' using errcode = '42501'; end if;
  if p_nickname is null or length(trim(p_nickname)) = 0 then
    raise exception 'nickname required';
  end if;

  if p_consent_version is not null and length(trim(p_consent_version)) > 0 then
    insert into consent_records(parent_id, consent_type, consent_version, granted)
    values (uid, 'child_privacy', p_consent_version, true);
  end if;

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
$$;


ALTER FUNCTION "public"."create_child_profile"("p_nickname" "text", "p_age_band" "text", "p_learning_focus" "text", "p_avatar" "text", "p_preferred_hand" "text", "p_consent_version" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_child_profile"("p_nickname" "text", "p_age_band" "text", "p_learning_focus" "text", "p_avatar" "text", "p_preferred_hand" "text", "p_consent_version" "text") IS 'Consent-enforced child creation (0021). Requires granted child_privacy consent.';



CREATE OR REPLACE FUNCTION "public"."dashboard_ab_results"("in_flag" "text" DEFAULT 'camera_explainer_v1'::"text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH exposures AS (
    -- One row per (session, variant) — first exposure wins
    SELECT DISTINCT session_id, meta->>'variant' AS variant
    FROM public.analytics_events
    WHERE event_name = 'feature_flag_exposed'
      AND meta->>'flag_name' = in_flag
      AND occurred_at > now() - interval '30 days'
), funnel AS (
    SELECT
        e.variant,
        count(*) AS exposed_sessions,
        -- Of sessions that requested camera, how many were granted?
        count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM public.analytics_events x
            WHERE x.session_id = e.session_id AND x.event_name = 'camera_granted'
        )) AS granted,
        count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM public.analytics_events x
            WHERE x.session_id = e.session_id
              AND x.event_name IN ('camera_granted','camera_denied')
        )) AS requested,
        count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM public.analytics_events x
            WHERE x.session_id = e.session_id AND x.event_name = 'mode_completed'
        )) AS reached_completion
    FROM exposures e
    GROUP BY e.variant
), with_rates AS (
    SELECT *,
        CASE WHEN requested > 0 THEN granted::numeric / requested::numeric ELSE NULL END AS grant_rate,
        CASE WHEN exposed_sessions > 0 THEN reached_completion::numeric / exposed_sessions::numeric ELSE NULL END AS complete_rate
    FROM funnel
), c AS (
    SELECT * FROM with_rates WHERE variant = 'control'  LIMIT 1
), t AS (
    SELECT * FROM with_rates WHERE variant = 'treatment' LIMIT 1
), z AS (
    -- Two-proportion z-test on grant rate. Cheap, approximate, good enough
    -- to gate "stop reading the metric, p>0.05" vs "actionable".
    SELECT
        CASE
            WHEN c.requested IS NULL OR t.requested IS NULL
              OR c.requested = 0 OR t.requested = 0 THEN NULL
            ELSE (
                (t.grant_rate - c.grant_rate) /
                NULLIF(
                    sqrt(
                        (((t.granted + c.granted)::numeric / (t.requested + c.requested)::numeric)
                         * (1 - ((t.granted + c.granted)::numeric / (t.requested + c.requested)::numeric)))
                        * ((1.0/NULLIF(t.requested,0)::numeric) + (1.0/NULLIF(c.requested,0)::numeric))
                    ), 0
                )
            )
        END AS z_score
    FROM c, t
)
SELECT jsonb_build_object(
    'flag', in_flag,
    'as_of', now(),
    'control',   (SELECT to_jsonb(c) FROM c),
    'treatment', (SELECT to_jsonb(t) FROM t),
    'lift_pp',   CASE WHEN c.grant_rate IS NOT NULL AND t.grant_rate IS NOT NULL
                       THEN round((t.grant_rate - c.grant_rate)::numeric * 100, 2)
                       ELSE NULL END,
    'z_score',   round(coalesce((SELECT z_score FROM z), 0)::numeric, 2),
    -- Coarse readout: |z|>1.96 is roughly p<0.05 two-sided
    'verdict',   CASE
                    WHEN c.requested IS NULL OR t.requested IS NULL
                      OR c.requested < 30 OR t.requested < 30 THEN 'sample too small'
                    WHEN abs(coalesce((SELECT z_score FROM z), 0)) > 1.96
                      AND t.grant_rate > c.grant_rate THEN 'treatment winning'
                    WHEN abs(coalesce((SELECT z_score FROM z), 0)) > 1.96
                      AND t.grant_rate < c.grant_rate THEN 'control winning'
                    ELSE 'inconclusive'
                 END
) FROM c, t;
$$;


ALTER FUNCTION "public"."dashboard_ab_results"("in_flag" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_adaptive_decisions"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH win AS (
        SELECT * FROM lios_adaptive_decisions
        WHERE made_at > now() - (in_days || ' days')::interval
    ),
    by_regime AS (SELECT regime, count(*)::int AS n FROM win GROUP BY regime),
    by_recovery_step AS (SELECT recovery_step, count(*)::int AS n FROM win WHERE recovery_step IS NOT NULL GROUP BY recovery_step ORDER BY recovery_step),
    by_scaffold AS (SELECT scaffold_level, count(*)::int AS n FROM win GROUP BY scaffold_level),
    by_reward AS (SELECT reward_intensity, count(*)::int AS n FROM win GROUP BY reward_intensity),
    invariant_fires AS (SELECT unnest(invariants_applied) AS invariant, count(*)::int AS n FROM win GROUP BY 1 ORDER BY n DESC),
    by_mode AS (SELECT game_mode, count(*)::int AS n, avg(p_expected)::numeric(4, 3) AS mean_p_expected FROM win GROUP BY game_mode),
    recent AS (SELECT id, made_at, device_id, session_id, game_mode, current_item, next_item, scaffold_level, reward_intensity, suggest_break, regime, recovery_step, p_expected, invariants_applied, reasoning FROM win ORDER BY made_at DESC LIMIT 30)
    SELECT jsonb_build_object(
        'days', in_days, 'as_of', now(),
        'total', (SELECT count(*) FROM win),
        'by_regime', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_regime b), '[]'::jsonb),
        'by_recovery_step', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_recovery_step b), '[]'::jsonb),
        'by_scaffold', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_scaffold b), '[]'::jsonb),
        'by_reward', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_reward b), '[]'::jsonb),
        'invariant_fires', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM invariant_fires b), '[]'::jsonb),
        'by_mode', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_mode b), '[]'::jsonb),
        'recent', COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY made_at DESC) FROM recent r), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_adaptive_decisions"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_anomaly_check"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH window15 AS (
    SELECT * FROM public.analytics_events
    WHERE occurred_at > now() - interval '15 minutes'
), counts AS (
    SELECT
        count(distinct device_id) filter (where event_name = 'tracker_init_failed') AS init_fail_devices,
        count(distinct device_id) filter (where event_name = 'camera_denied')        AS cam_denied_devices,
        count(distinct device_id) filter (where event_name = 'csp_violation')        AS csp_devices,
        count(*)                   filter (where event_name = 'system_error')         AS sys_err,
        count(*)                   filter (where event_name = 'tracker_init_succeeded') AS init_ok,
        count(*)                   filter (where event_name = 'camera_denied')        AS cam_denied_raw,
        count(*)                   filter (where event_name = 'camera_retry_failed')  AS cam_retry_failed_raw,
        count(distinct session_id) filter (where event_name = 'session_started')      AS new_sessions
    FROM window15
), checks AS (
    SELECT * FROM (VALUES
        ('tracker_init_failed_devices', (SELECT init_fail_devices FROM counts)::int, 5,
         'tracker_init_failed seen on N distinct devices in last 15 min'),
        ('camera_denied_devices',       (SELECT cam_denied_devices FROM counts)::int, 10,
         'camera_denied (first-time per session) on N distinct devices'),
        ('csp_violation_devices',       (SELECT csp_devices FROM counts)::int, 10,
         'csp_violation on N distinct devices — something is being blocked'),
        ('system_error',                (SELECT sys_err FROM counts)::int, 3,
         'uncaught system_error events in last 15 min')
    ) AS t(metric, observed, threshold, message)
)
SELECT jsonb_build_object(
    'as_of', now(),
    'breaches', coalesce(jsonb_agg(
        jsonb_build_object(
            'metric', metric,
            'observed', observed,
            'threshold', threshold,
            'message', message
        )
    ) FILTER (WHERE observed >= threshold), '[]'::jsonb),
    'window_summary', (SELECT to_jsonb(c) FROM counts c)
) FROM checks;
$$;


ALTER FUNCTION "public"."dashboard_anomaly_check"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_classrooms"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH per_school_day AS (
    SELECT school_id,
           date_trunc('day', occurred_at) AS day,
           count(distinct session_id)  AS distinct_sessions,
           count(distinct device_id)   AS distinct_devices,
           count(*) filter (where event_name = 'mode_completed') AS mode_completions,
           count(*) filter (where event_name = 'session_started') AS session_starts,
           extract(epoch from (max(occurred_at) - min(occurred_at)))::int AS span_seconds
    FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND school_id IS NOT NULL AND school_id <> ''
    GROUP BY school_id, day
), per_school AS (
    SELECT school_id,
           sum(distinct_sessions) AS total_sessions,
           sum(distinct_devices)  AS total_devices,
           sum(mode_completions)  AS total_completions,
           count(*) AS active_days,
           max(day) AS last_active_day
    FROM per_school_day
    GROUP BY school_id
)
SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'schools', coalesce(jsonb_agg(
        jsonb_build_object(
            'school_id', school_id,
            'sessions', total_sessions,
            'devices', total_devices,
            'mode_completions', total_completions,
            'active_days', active_days,
            'last_active_day', last_active_day
        ) ORDER BY total_sessions DESC
    ), '[]'::jsonb)
) FROM per_school;
$$;


ALTER FUNCTION "public"."dashboard_classrooms"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_cohort_curves"("in_weeks" integer DEFAULT 6) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH first_seen AS (
    SELECT device_id, min(occurred_at) AS first_at
    FROM public.analytics_events
    WHERE device_id IS NOT NULL
      AND occurred_at > now() - make_interval(weeks => in_weeks + 3)
    GROUP BY device_id
), cohorts AS (
    SELECT device_id, date_trunc('week', first_at) AS cohort_week, first_at
    FROM first_seen
    WHERE first_at > now() - make_interval(weeks => in_weeks)
), days AS (
    SELECT generate_series(0, 14) AS d
), points AS (
    SELECT
        c.cohort_week,
        d.d,
        count(distinct c.device_id) AS cohort_size,
        count(distinct CASE
            WHEN EXISTS (
                SELECT 1 FROM public.analytics_events e
                WHERE e.device_id = c.device_id
                  AND e.occurred_at >= c.first_at + make_interval(days => d.d)
                  AND e.occurred_at <  c.first_at + make_interval(days => d.d + 1)
            )
            THEN c.device_id END) AS returned
    FROM cohorts c CROSS JOIN days d
    GROUP BY c.cohort_week, d.d
), pct AS (
    SELECT cohort_week, d,
           CASE WHEN cohort_size > 0 THEN round(100.0 * returned / cohort_size, 1) ELSE NULL END AS return_pct,
           max(cohort_size) OVER (PARTITION BY cohort_week) AS cohort_size
    FROM points
), agg AS (
    SELECT cohort_week, cohort_size,
           jsonb_agg(jsonb_build_object('d', d, 'pct', return_pct) ORDER BY d) AS curve
    FROM pct
    GROUP BY cohort_week, cohort_size
)
SELECT jsonb_build_object(
    'weeks', in_weeks,
    'as_of', now(),
    'cohorts', coalesce(jsonb_agg(
        jsonb_build_object(
            'cohort_week', cohort_week,
            'size', cohort_size,
            'curve', curve
        ) ORDER BY cohort_week DESC
    ), '[]'::jsonb)
) FROM agg;
$$;


ALTER FUNCTION "public"."dashboard_cohort_curves"("in_weeks" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_cohort_retention"("in_weeks" integer DEFAULT 8) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH first_seen AS (
    SELECT device_id,
           min(occurred_at) AS first_at
    FROM public.analytics_events
    WHERE device_id IS NOT NULL
      AND occurred_at > now() - make_interval(weeks => in_weeks + 2)
    GROUP BY device_id
), cohorts AS (
    SELECT device_id,
           date_trunc('week', first_at) AS cohort_week,
           first_at
    FROM first_seen
    WHERE first_at > now() - make_interval(weeks => in_weeks)
), returns AS (
    SELECT c.cohort_week,
           c.device_id,
           bool_or(e.occurred_at >= c.first_at + interval '20 hours'  AND e.occurred_at < c.first_at + interval '48 hours')   AS d1,
           bool_or(e.occurred_at >= c.first_at + interval '2 days 20 hours' AND e.occurred_at < c.first_at + interval '4 days')   AS d3,
           bool_or(e.occurred_at >= c.first_at + interval '6 days 20 hours' AND e.occurred_at < c.first_at + interval '8 days')   AS d7
    FROM cohorts c
    LEFT JOIN public.analytics_events e
      ON e.device_id = c.device_id AND e.occurred_at > c.first_at
    GROUP BY c.cohort_week, c.device_id
), agg AS (
    SELECT cohort_week,
           count(*)                         AS new_devices,
           count(*) filter (where d1)       AS d1_returns,
           count(*) filter (where d3)       AS d3_returns,
           count(*) filter (where d7)       AS d7_returns
    FROM returns
    GROUP BY cohort_week
)
SELECT jsonb_build_object(
    'weeks', in_weeks,
    'as_of', now(),
    'cohorts', coalesce(jsonb_agg(
        jsonb_build_object(
            'cohort_week', cohort_week,
            'new_devices', new_devices,
            'd1_returns', d1_returns,
            'd3_returns', d3_returns,
            'd7_returns', d7_returns,
            'd1_pct', CASE WHEN new_devices > 0 THEN round(100.0 * d1_returns / new_devices, 1) ELSE 0 END,
            'd3_pct', CASE WHEN new_devices > 0 THEN round(100.0 * d3_returns / new_devices, 1) ELSE 0 END,
            'd7_pct', CASE WHEN new_devices > 0 THEN round(100.0 * d7_returns / new_devices, 1) ELSE 0 END
        ) ORDER BY cohort_week DESC
    ), '[]'::jsonb)
) FROM agg;
$$;


ALTER FUNCTION "public"."dashboard_cohort_retention"("in_weeks" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_context_split"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH win AS (
        SELECT context, credibility_score, credibility_tier, was_correct
        FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
    ),
    by_ctx AS (
        SELECT
            COALESCE(context, 'unknown') AS context,
            count(*)::int                AS n_attempts,
            count(DISTINCT session_id)::int AS n_sessions,
            avg(was_correct::int)::numeric(4, 3) AS accuracy,
            avg(credibility_score)::numeric(4, 3) AS mean_credibility,
            count(*) FILTER (WHERE credibility_tier = 'A')::int AS tier_a,
            count(*) FILTER (WHERE credibility_tier = 'B')::int AS tier_b,
            count(*) FILTER (WHERE credibility_tier = 'C')::int AS tier_c
        FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
        GROUP BY COALESCE(context, 'unknown')
    ),
    class_codes AS (
        SELECT
            (meta->>'class_code')::text AS class_code,
            count(*)::int               AS n_attempts,
            count(DISTINCT session_id)::int AS n_sessions
        FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
          AND meta ? 'class_code'
        GROUP BY meta->>'class_code'
        ORDER BY n_attempts DESC
        LIMIT 25
    )
    SELECT jsonb_build_object(
        'days', in_days,
        'as_of', now(),
        'total_attempts', (SELECT count(*) FROM win),
        'by_context',  COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_ctx b), '[]'::jsonb),
        'class_codes', COALESCE((SELECT jsonb_agg(row_to_json(c)) FROM class_codes c), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_context_split"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_curriculum_coverage"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH per_device AS (
    SELECT device_id,
           game_mode,
           count(distinct item_key) AS distinct_items,
           count(*) AS total_attempts
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND device_id IS NOT NULL
    GROUP BY device_id, game_mode
), totals AS (
    SELECT game_mode,
           count(distinct device_id) AS devices,
           round(avg(distinct_items)::numeric, 1) AS avg_distinct_items,
           round(avg(total_attempts)::numeric, 1) AS avg_attempts
    FROM per_device
    GROUP BY game_mode
)
SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'modes', coalesce(jsonb_agg(
        jsonb_build_object(
            'game_mode', game_mode,
            'devices', devices,
            'avg_distinct_items', avg_distinct_items,
            'avg_attempts', avg_attempts
        ) ORDER BY devices DESC
    ), '[]'::jsonb)
) FROM totals;
$$;


ALTER FUNCTION "public"."dashboard_curriculum_coverage"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_daily_digest"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
SELECT jsonb_build_object(
    'as_of', now(),
    'today',         (SELECT public.dashboard_today()),
    'funnel_24h',    (SELECT public.dashboard_funnel(1)),
    'funnel_7d',     (SELECT public.dashboard_funnel(7)),
    'tracker_7d',    (SELECT public.dashboard_tracker_health(7)),
    'top_modes_7d',  (SELECT public.dashboard_top_modes(7)),
    'errors',        (SELECT public.dashboard_errors(20)),
    'cohort',        (SELECT public.dashboard_cohort_retention(8)),
    'mastery',       (SELECT public.dashboard_mastery(30, 5)),
    'milestones',    (SELECT public.dashboard_mastery_milestones(60, 5, 80)),
    'classrooms',    (SELECT public.dashboard_classrooms(30)),
    'yesterday_count', (
        SELECT count(*) FROM public.analytics_events
        WHERE occurred_at >= date_trunc('day', now() - interval '1 day')
          AND occurred_at <  date_trunc('day', now())
    ),
    'last7_avg_count', (
        SELECT round(count(*) / 7.0, 0)::int
        FROM public.analytics_events
        WHERE occurred_at >= date_trunc('day', now() - interval '8 days')
          AND occurred_at <  date_trunc('day', now() - interval '1 day')
    )
);
$$;


ALTER FUNCTION "public"."dashboard_daily_digest"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_engagement_deep"("in_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH win AS (
    SELECT * FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND game_mode IS NOT NULL
), per_session AS (
    SELECT game_mode, session_id,
        bool_or(event_name = 'mode_started') AS did_start,
        bool_or(event_name = 'mode_completed') AS did_complete,
        bool_or(event_name = 'mode_abandoned') AS did_abandon,
        bool_or(event_name = 'stuck_detected') AS did_stuck,
        extract(epoch from (max(occurred_at) - min(occurred_at))) AS dur_s
    FROM win GROUP BY game_mode, session_id
), per_mode AS (
    SELECT game_mode,
        count(*) FILTER (WHERE did_start) AS started,
        count(*) FILTER (WHERE did_complete AND did_start) AS completed,
        count(*) FILTER (WHERE did_abandon AND did_start AND NOT did_complete) AS abandoned,
        count(*) FILTER (WHERE did_stuck AND did_start) AS stuck,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s) FILTER (WHERE did_start AND dur_s > 0) AS median_s,
        percentile_cont(0.9) WITHIN GROUP (ORDER BY dur_s) FILTER (WHERE did_start AND dur_s > 0) AS p90_s,
        count(DISTINCT session_id) FILTER (WHERE did_start) AS distinct_starters,
        (game_mode IN ('free')) AS is_open_ended
    FROM per_session GROUP BY game_mode
), daily AS (
    SELECT game_mode, date_trunc('day', occurred_at)::date AS day, count(distinct session_id) AS sessions
    FROM win WHERE event_name = 'mode_started' GROUP BY game_mode, day
), daily_array AS (
    SELECT game_mode, jsonb_agg(jsonb_build_object('day', day, 'n', sessions) ORDER BY day) AS trend
    FROM daily GROUP BY game_mode
)
SELECT jsonb_build_object(
    'days', in_days, 'as_of', now(),
    'abandon_definition', 'started, did not complete, fired mode_abandoned',
    'modes', coalesce(jsonb_agg(jsonb_build_object(
        'game_mode', m.game_mode, 'started', m.started, 'completed', m.completed,
        'abandoned', m.abandoned, 'stuck', m.stuck,
        'median_seconds', round(coalesce(m.median_s, 0)::numeric, 0),
        'p90_seconds', round(coalesce(m.p90_s, 0)::numeric, 0),
        'distinct_devices', m.distinct_starters, 'is_open_ended', m.is_open_ended,
        'completion_rate_pct', CASE WHEN m.is_open_ended THEN NULL
                                    WHEN m.started > 0 THEN round(100.0 * m.completed / m.started, 1) ELSE NULL END,
        'stuck_rate_pct',   CASE WHEN m.started > 0 THEN round(100.0 * m.stuck / m.started, 1) ELSE 0 END,
        'abandon_rate_pct', CASE WHEN m.started > 0 THEN round(100.0 * m.abandoned / m.started, 1) ELSE 0 END,
        'daily', coalesce(d.trend, '[]'::jsonb)
    ) ORDER BY m.started DESC), '[]'::jsonb)
) FROM per_mode m LEFT JOIN daily_array d USING (game_mode);
$$;


ALTER FUNCTION "public"."dashboard_engagement_deep"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_errors"("row_limit" integer DEFAULT 50) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH errs AS (
    SELECT occurred_at,
           event_name,
           browser,
           device_type,
           page,
           meta
    FROM public.analytics_events
    WHERE event_name IN ('system_error', 'csp_violation', 'tracker_init_failed', 'camera_denied')
    ORDER BY occurred_at DESC
    LIMIT row_limit
)
SELECT jsonb_build_object(
    'as_of', now(),
    'errors', coalesce(jsonb_agg(
        jsonb_build_object(
            'occurred_at', occurred_at,
            'event_name',  event_name,
            'browser',     browser,
            'device_type', device_type,
            'page',        page,
            'meta',        meta
        ) ORDER BY occurred_at DESC
    ), '[]'::jsonb)
) FROM errs;
$$;


ALTER FUNCTION "public"."dashboard_errors"("row_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_executive_summary"("in_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    SET "statement_timeout" TO '30s'
    AS $$
WITH
  curr_range AS (SELECT now() - make_interval(days => in_days) AS lo, now() AS hi),
  prev_range AS (SELECT now() - make_interval(days => in_days * 2) AS lo, now() - make_interval(days => in_days) AS hi),

  curr AS (
    SELECT e.session_id, e.device_id, e.event_name, e.occurred_at
    FROM public.analytics_events e, curr_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
      AND (e.traffic_type IS NULL OR e.traffic_type NOT IN ('internal','qa','bot'))
  ),
  prev AS (
    SELECT e.session_id, e.device_id, e.event_name, e.occurred_at
    FROM public.analytics_events e, prev_range r
    WHERE e.occurred_at >= r.lo AND e.occurred_at < r.hi
      AND (e.traffic_type IS NULL OR e.traffic_type NOT IN ('internal','qa','bot'))
  ),

  curr_metrics AS (
    SELECT
      count(distinct session_id) AS sessions_started,
      count(distinct device_id)  AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'mode_started') AS mode_starts,
      count(*) FILTER (WHERE event_name = 'camera_granted') AS cam_granted,
      count(*) FILTER (WHERE event_name = 'camera_denied') AS cam_denied,
      count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS tracker_ok,
      count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS tracker_fail,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s)
         FROM (
           SELECT extract(epoch FROM (max(occurred_at)-min(occurred_at))) AS dur_s
           FROM curr GROUP BY session_id
           HAVING extract(epoch FROM (max(occurred_at)-min(occurred_at))) > 0
         ) s) AS median_session_s
    FROM curr
  ),
  prev_metrics AS (
    SELECT
      count(distinct session_id) AS sessions_started,
      count(distinct device_id) AS distinct_devices,
      count(distinct session_id) FILTER (WHERE event_name = 'mode_completed') AS sessions_completed,
      count(*) FILTER (WHERE event_name = 'mode_completed') AS mode_completions,
      count(*) FILTER (WHERE event_name = 'camera_granted') AS cam_granted,
      count(*) FILTER (WHERE event_name = 'camera_denied') AS cam_denied,
      count(*) FILTER (WHERE event_name = 'tracker_init_succeeded') AS tracker_ok,
      count(*) FILTER (WHERE event_name = 'tracker_init_failed') AS tracker_fail,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY dur_s)
         FROM (
           SELECT extract(epoch FROM (max(occurred_at)-min(occurred_at))) AS dur_s
           FROM prev GROUP BY session_id
           HAVING extract(epoch FROM (max(occurred_at)-min(occurred_at))) > 0
         ) s) AS median_session_s
    FROM prev
  ),
  spark AS (
    SELECT date_trunc('day', occurred_at) AS day,
           count(distinct session_id) AS sessions
    FROM public.analytics_events
    WHERE occurred_at > now() - interval '14 days'
      AND (traffic_type IS NULL OR traffic_type NOT IN ('internal','qa','bot'))
    GROUP BY 1 ORDER BY 1
  ),
  spark_array AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object('day', day, 'n', sessions) ORDER BY day), '[]'::jsonb) AS arr
    FROM spark
  )
SELECT jsonb_build_object(
  'days', in_days,
  'as_of', now(),
  'sparkline_sessions_14d', (SELECT arr FROM spark_array),
  'current', (SELECT to_jsonb(c) FROM curr_metrics c),
  'previous', (SELECT to_jsonb(p) FROM prev_metrics p),
  'deltas', jsonb_build_object(
    'sessions_started_pct', CASE WHEN (SELECT sessions_started FROM prev_metrics) > 0
                                 THEN round(100.0 * ((SELECT sessions_started FROM curr_metrics) - (SELECT sessions_started FROM prev_metrics))::numeric
                                            / (SELECT sessions_started FROM prev_metrics)::numeric, 1) ELSE NULL END,
    'distinct_devices_pct', CASE WHEN (SELECT distinct_devices FROM prev_metrics) > 0
                                 THEN round(100.0 * ((SELECT distinct_devices FROM curr_metrics) - (SELECT distinct_devices FROM prev_metrics))::numeric
                                            / (SELECT distinct_devices FROM prev_metrics)::numeric, 1) ELSE NULL END,
    'mode_completions_pct', CASE WHEN (SELECT mode_completions FROM prev_metrics) > 0
                                 THEN round(100.0 * ((SELECT mode_completions FROM curr_metrics) - (SELECT mode_completions FROM prev_metrics))::numeric
                                            / (SELECT mode_completions FROM prev_metrics)::numeric, 1) ELSE NULL END,
    'median_session_s_delta_s', CASE WHEN (SELECT median_session_s FROM prev_metrics) IS NOT NULL
                                          AND (SELECT median_session_s FROM curr_metrics) IS NOT NULL
                                     THEN round(((SELECT median_session_s FROM curr_metrics) - (SELECT median_session_s FROM prev_metrics))::numeric, 0) ELSE NULL END,
    'cam_grant_rate_curr_pct', CASE WHEN ((SELECT cam_granted FROM curr_metrics) + (SELECT cam_denied FROM curr_metrics)) > 0
                                    THEN round(100.0 * (SELECT cam_granted FROM curr_metrics)::numeric
                                               / ((SELECT cam_granted FROM curr_metrics) + (SELECT cam_denied FROM curr_metrics))::numeric, 1) ELSE NULL END,
    'cam_grant_rate_prev_pct', CASE WHEN ((SELECT cam_granted FROM prev_metrics) + (SELECT cam_denied FROM prev_metrics)) > 0
                                    THEN round(100.0 * (SELECT cam_granted FROM prev_metrics)::numeric
                                               / ((SELECT cam_granted FROM prev_metrics) + (SELECT cam_denied FROM prev_metrics))::numeric, 1) ELSE NULL END,
    'tracker_success_curr_pct', CASE WHEN ((SELECT tracker_ok FROM curr_metrics) + (SELECT tracker_fail FROM curr_metrics)) > 0
                                     THEN round(100.0 * (SELECT tracker_ok FROM curr_metrics)::numeric
                                                / ((SELECT tracker_ok FROM curr_metrics) + (SELECT tracker_fail FROM curr_metrics))::numeric, 1) ELSE NULL END,
    'completion_rate_curr_pct', CASE WHEN (SELECT sessions_started FROM curr_metrics) > 0
                                     THEN round(100.0 * (SELECT sessions_completed FROM curr_metrics)::numeric
                                                / (SELECT sessions_started FROM curr_metrics)::numeric, 1) ELSE NULL END,
    'completion_rate_prev_pct', CASE WHEN (SELECT sessions_started FROM prev_metrics) > 0
                                     THEN round(100.0 * (SELECT sessions_completed FROM prev_metrics)::numeric
                                                / (SELECT sessions_started FROM prev_metrics)::numeric, 1) ELSE NULL END
  )
);
$$;


ALTER FUNCTION "public"."dashboard_executive_summary"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_export_headline"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT jsonb_build_object(
        'export_version',     'lios-v1',
        'generated_at',       now(),
        'window_days',        in_days,
        'product',            'draw-in-the-air',
        'environment',        'production',
        'headline', jsonb_build_object(
            'attempts_in_window',  (SELECT count(*) FROM learning_attempts WHERE occurred_at > now() - (in_days || ' days')::interval),
            'sessions_in_window',  (SELECT count(DISTINCT session_id) FROM analytics_events WHERE occurred_at > now() - (in_days || ' days')::interval),
            'learners_in_window',  (SELECT count(DISTINCT device_id) FROM learning_attempts WHERE occurred_at > now() - (in_days || ' days')::interval AND device_id IS NOT NULL),
            'mastered_skills',     (SELECT count(*) FROM (
                                        SELECT DISTINCT ON (device_id, item_key, game_mode) to_state
                                        FROM mastery_episode_fact
                                        ORDER BY device_id, item_key, game_mode, transition_at DESC
                                    ) latest WHERE latest.to_state = 'Mastered'),
            'observations_in_window', (SELECT count(*) FROM human_observation_fact WHERE recorded_at > now() - (in_days || ' days')::interval),
            'adaptive_decisions_in_window', (SELECT count(*) FROM lios_adaptive_decisions WHERE made_at > now() - (in_days || ' days')::interval),
            'cron_runs_24h',       (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours'),
            'cron_failed_24h',     (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours' AND error_message IS NOT NULL)
        )
    );
$$;


ALTER FUNCTION "public"."dashboard_export_headline"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_friction_engineering"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH win AS (
        SELECT e.session_id, e.event_name, e.game_mode, e.age_band,
               e.context, e.occurred_at, e.meta
        FROM analytics_events e
        WHERE e.event_name LIKE 'friction\_%\_detected' ESCAPE '\'
          AND e.occurred_at > now() - (in_days || ' days')::interval
    ),
    by_det AS (
        SELECT event_name AS detector, count(*)::int AS n
        FROM win GROUP BY event_name
    ),
    by_mode_det AS (
        SELECT game_mode, event_name AS detector, count(*)::int AS n
        FROM win GROUP BY game_mode, event_name
    ),
    by_age_det AS (
        SELECT age_band, event_name AS detector, count(*)::int AS n
        FROM win WHERE age_band IS NOT NULL GROUP BY age_band, event_name
    ),
    recent AS (
        SELECT session_id, event_name AS detector, game_mode,
               age_band, context, occurred_at, meta
        FROM win ORDER BY occurred_at DESC LIMIT 50
    )
    SELECT jsonb_build_object(
        'days',     in_days,
        'as_of',    now(),
        'total',    (SELECT count(*) FROM win),
        'by_detector', COALESCE((SELECT jsonb_agg(jsonb_build_object('detector', detector, 'n', n) ORDER BY n DESC) FROM by_det), '[]'::jsonb),
        'by_mode',     COALESCE((SELECT jsonb_agg(jsonb_build_object('game_mode', game_mode, 'detector', detector, 'n', n)) FROM by_mode_det), '[]'::jsonb),
        'by_age',      COALESCE((SELECT jsonb_agg(jsonb_build_object('age_band', age_band, 'detector', detector, 'n', n)) FROM by_age_det), '[]'::jsonb),
        'recent',      COALESCE((SELECT jsonb_agg(jsonb_build_object('session_id', session_id, 'detector', detector, 'game_mode', game_mode, 'age_band', age_band, 'context', context, 'occurred_at', occurred_at, 'meta', meta) ORDER BY occurred_at DESC) FROM recent), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_friction_engineering"("in_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."dashboard_friction_engineering"("in_days" integer) IS 'LIOS friction engineering surface. Engineering-only.';



CREATE OR REPLACE FUNCTION "public"."dashboard_funnel"("in_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH steps(step_order, step_name) AS (
    VALUES
        (1,  'try_free_clicked'),
        (2,  'age_band_selected'),
        (3,  'session_started'),
        (4,  'camera_requested'),
        (5,  'camera_granted'),
        (6,  'tracker_init_started'),
        (7,  'tracker_init_succeeded'),
        (8,  'wave_first_hand_seen'),
        (9,  'wave_completed'),
        (10, 'mode_started'),
        (11, 'mode_completed')
), counted AS (
    SELECT s.step_order, s.step_name,
           (SELECT count(distinct e.session_id)
              FROM public.analytics_events e
              WHERE e.event_name = s.step_name
                AND e.occurred_at > now() - make_interval(days => in_days)
           ) AS sessions
    FROM steps s
), with_pct AS (
    SELECT step_order, step_name, sessions,
           CASE WHEN max(sessions) OVER () = 0 THEN 0
                ELSE round(100.0 * sessions / max(sessions) OVER (), 1)
           END AS pct_of_top
    FROM counted
)
SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'steps', coalesce(jsonb_agg(
        jsonb_build_object(
            'step_order', step_order,
            'step_name', step_name,
            'sessions', sessions,
            'pct_of_top', pct_of_top
        ) ORDER BY step_order
    ), '[]'::jsonb)
) FROM with_pct;
$$;


ALTER FUNCTION "public"."dashboard_funnel"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_gesture_quality"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH win AS (
        SELECT * FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
    ),
    by_mode AS (
        SELECT
            game_mode,
            count(*)::int                                          AS n_attempts,
            count(gq_path_accuracy_pct)::int                       AS n_with_accuracy,
            count(gq_path_efficiency)::int                         AS n_with_efficiency,
            count(gq_velocity_variance)::int                       AS n_with_velocity,
            avg(gq_path_accuracy_pct)::numeric(5, 2)               AS mean_accuracy_pct,
            avg(gq_path_efficiency)::numeric(5, 3)                 AS mean_efficiency,
            avg(gq_time_to_completion_ms)::int                     AS mean_completion_ms,
            avg(gq_spatial_error_mean_px)::numeric(7, 2)           AS mean_spatial_error_px,
            percentile_cont(0.50) WITHIN GROUP (
                ORDER BY gq_path_accuracy_pct)::numeric(5, 2)      AS median_accuracy_pct
        FROM win
        GROUP BY game_mode
    )
    SELECT jsonb_build_object(
        'days', in_days, 'as_of', now(),
        'total_attempts', (SELECT count(*) FROM win),
        'total_with_gq',  (SELECT count(*) FROM win WHERE gq_n_samples IS NOT NULL
                                                      OR gq_path_accuracy_pct IS NOT NULL
                                                      OR gq_path_efficiency IS NOT NULL),
        'by_mode', COALESCE((SELECT jsonb_agg(row_to_json(b) ORDER BY n_attempts DESC) FROM by_mode b), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_gesture_quality"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_ingest_latency"("in_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  WITH lat AS (
    SELECT EXTRACT(EPOCH FROM (received_at - client_ts)) * 1000.0 AS ms
    FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND received_at IS NOT NULL
      AND client_ts  IS NOT NULL
      AND received_at >= client_ts
  )
  SELECT jsonb_build_object(
    'days', in_days,
    'as_of', now(),
    'measurable', (SELECT count(*) FROM lat) > 0,
    'rows_with_latency', (SELECT count(*) FROM lat),
    'p50_latency_ms', (SELECT round(percentile_cont(0.50) WITHIN GROUP (ORDER BY ms)::numeric, 1) FROM lat),
    'p95_latency_ms', (SELECT round(percentile_cont(0.95) WITHIN GROUP (ORDER BY ms)::numeric, 1) FROM lat),
    'p99_latency_ms', (SELECT round(percentile_cont(0.99) WITHIN GROUP (ORDER BY ms)::numeric, 1) FROM lat)
  );
$$;


ALTER FUNCTION "public"."dashboard_ingest_latency"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_latest_sessions"("row_limit" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH per_session AS (
    SELECT session_id,
           min(device_id)    AS device_id,
           min(occurred_at)  AS started_at,
           max(occurred_at)  AS last_at,
           extract(epoch from (max(occurred_at) - min(occurred_at)))::int AS dur_s,
           count(*)::int     AS event_count,
           bool_or(event_name = 'mode_completed')      AS reached_completion,
           bool_or(event_name = 'wave_completed')      AS reached_wave,
           bool_or(event_name = 'tracker_init_failed') AS tracker_failed,
           bool_or(event_name = 'two_hands_detected')  AS two_hands_seen,
           max(age_band)      AS age_band,
           max(browser)       AS browser,
           max(device_type)   AS device_type,
           max(build_version) AS build_version,
           array_agg(distinct game_mode) filter (where game_mode is not null) AS modes_played
    FROM public.analytics_events
    GROUP BY session_id
    ORDER BY max(occurred_at) DESC
    LIMIT row_limit
)
SELECT jsonb_build_object(
    'as_of', now(),
    'sessions', coalesce(jsonb_agg(
        jsonb_build_object(
            'session_id', session_id,
            'device_id', device_id,
            'started_at', started_at,
            'last_at', last_at,
            'duration_seconds', dur_s,
            'event_count', event_count,
            'reached_wave', reached_wave,
            'reached_completion', reached_completion,
            'tracker_failed', tracker_failed,
            'two_hands_seen', two_hands_seen,
            'age_band', age_band,
            'browser', browser,
            'device_type', device_type,
            'build_version', build_version,
            'modes_played', modes_played
        ) ORDER BY last_at DESC
    ), '[]'::jsonb)
) FROM per_session;
$$;


ALTER FUNCTION "public"."dashboard_latest_sessions"("row_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_live"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH active AS (
    SELECT
        session_id,
        max(game_mode) FILTER (WHERE game_mode IS NOT NULL) AS last_mode,
        max(occurred_at) AS last_event,
        max(device_type) AS device_type,
        max(age_band) AS age_band
    FROM public.analytics_events
    WHERE occurred_at > now() - interval '5 minutes'
    GROUP BY session_id
)
SELECT jsonb_build_object(
    'as_of', now(),
    'active_count', (SELECT count(*) FROM active),
    'by_mode', (
        SELECT coalesce(jsonb_object_agg(coalesce(last_mode, 'between'), n), '{}'::jsonb)
        FROM (
            SELECT last_mode, count(*) AS n FROM active GROUP BY last_mode
        ) t
    ),
    'sessions', (
        SELECT coalesce(jsonb_agg(
            jsonb_build_object(
                'session_id', session_id,
                'last_mode', last_mode,
                'device_type', device_type,
                'age_band', age_band,
                'last_event', last_event
            ) ORDER BY last_event DESC
        ), '[]'::jsonb) FROM active
    )
);
$$;


ALTER FUNCTION "public"."dashboard_live"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_mastery"("in_days" integer DEFAULT 30, "in_min_attempts" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH per_item AS (
    SELECT game_mode,
           item_key,
           count(*)                           AS attempts,
           count(*) filter (where was_correct) AS correct,
           count(distinct device_id) filter (where device_id is not null) AS distinct_devices,
           round(avg(ms_to_attempt))::int     AS avg_ms
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
    GROUP BY game_mode, item_key
    HAVING count(*) >= in_min_attempts
)
SELECT jsonb_build_object(
    'days', in_days,
    'min_attempts', in_min_attempts,
    'as_of', now(),
    'items', coalesce(jsonb_agg(
        jsonb_build_object(
            'game_mode', game_mode,
            'item_key', item_key,
            'attempts', attempts,
            'correct', correct,
            'accuracy_pct', round(100.0 * correct / attempts, 1),
            'distinct_devices', distinct_devices,
            'avg_ms', avg_ms
        ) ORDER BY attempts DESC
    ), '[]'::jsonb)
) FROM per_item;
$$;


ALTER FUNCTION "public"."dashboard_mastery"("in_days" integer, "in_min_attempts" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_mastery_milestones"("in_days" integer DEFAULT 60, "in_min_attempts" integer DEFAULT 5, "in_threshold_pct" integer DEFAULT 80) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH ranked AS (
    SELECT device_id, game_mode, item_key, was_correct, occurred_at,
           row_number() OVER (PARTITION BY device_id, game_mode, item_key ORDER BY occurred_at DESC) AS rn,
           count(*) OVER (PARTITION BY device_id, game_mode, item_key) AS attempts_total
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND device_id IS NOT NULL
), last_n AS (
    SELECT device_id, game_mode, item_key,
           sum(CASE WHEN was_correct THEN 1 ELSE 0 END)::int AS correct_in_window,
           count(*)::int AS attempts_in_window,
           min(attempts_total)::int AS attempts_total
    FROM ranked
    WHERE rn <= in_min_attempts
    GROUP BY device_id, game_mode, item_key
), classified AS (
    SELECT device_id, game_mode, item_key, attempts_total,
           CASE WHEN attempts_in_window >= in_min_attempts
                  AND (100.0 * correct_in_window / attempts_in_window) >= in_threshold_pct
                THEN true ELSE false END AS mastered,
           round(100.0 * correct_in_window / attempts_in_window, 1) AS recent_accuracy_pct
    FROM last_n
), per_item AS (
    SELECT game_mode, item_key,
           count(*) filter (where mastered)              AS mastered_devices,
           count(*) filter (where not mastered)          AS practising_devices,
           count(*)                                       AS touched_devices,
           round(avg(recent_accuracy_pct)::numeric, 1)   AS avg_recent_accuracy
    FROM classified
    GROUP BY game_mode, item_key
    HAVING count(*) >= 1
)
SELECT jsonb_build_object(
    'days', in_days,
    'min_attempts', in_min_attempts,
    'threshold_pct', in_threshold_pct,
    'as_of', now(),
    'items', coalesce(jsonb_agg(
        jsonb_build_object(
            'game_mode', game_mode,
            'item_key', item_key,
            'mastered_devices', mastered_devices,
            'practising_devices', practising_devices,
            'touched_devices', touched_devices,
            'mastery_pct', CASE WHEN touched_devices > 0
                                THEN round(100.0 * mastered_devices / touched_devices, 1)
                                ELSE 0 END,
            'avg_recent_accuracy', avg_recent_accuracy
        ) ORDER BY mastered_devices DESC, touched_devices DESC
    ), '[]'::jsonb)
) FROM per_item;
$$;


ALTER FUNCTION "public"."dashboard_mastery_milestones"("in_days" integer, "in_min_attempts" integer, "in_threshold_pct" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_mastery_summary"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH per_device_item AS (
    SELECT game_mode, item_key, device_id,
        count(*) AS attempts,
        avg(CASE WHEN was_correct THEN 1 ELSE 0 END)::numeric * 100 AS acc_pct
    FROM public.learning_attempts
    WHERE occurred_at > now() - make_interval(days => in_days)
    GROUP BY game_mode, item_key, device_id
), classified AS (
    SELECT game_mode, item_key, device_id, attempts, acc_pct,
        CASE WHEN attempts >= 5 AND acc_pct >= 80 THEN 'strong'
             WHEN attempts >= 3 AND acc_pct >= 50 THEN 'practising'
             ELSE 'new' END AS bucket
    FROM per_device_item
), per_item AS (
    SELECT game_mode, item_key,
        count(*) FILTER (WHERE bucket = 'strong') AS strong,
        count(*) FILTER (WHERE bucket = 'practising') AS practising,
        count(*) FILTER (WHERE bucket = 'new') AS new_,
        count(*) AS total_devices,
        round(avg(acc_pct)::numeric, 1) AS mean_acc_pct,
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY acc_pct)::numeric, 1) AS median_acc_pct,
        round(avg(attempts)::numeric, 1) AS mean_attempts
    FROM classified GROUP BY game_mode, item_key
), totals AS (
    SELECT count(*) FILTER (WHERE strong > 0) AS items_with_mastery,
        sum(strong)::int AS total_strong, sum(practising)::int AS total_practising,
        sum(new_)::int AS total_new,
        count(DISTINCT (game_mode, item_key))::int AS distinct_items,
        count(DISTINCT game_mode)::int AS distinct_modes
    FROM per_item
)
SELECT jsonb_build_object(
    'days', in_days, 'as_of', now(),
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'items', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key,
        'strong', strong, 'practising', practising, 'new', new_,
        'total_devices', total_devices, 'mean_acc_pct', mean_acc_pct,
        'median_acc_pct', median_acc_pct, 'mean_attempts', mean_attempts
    ) ORDER BY total_devices DESC, mean_acc_pct DESC) FROM per_item), '[]'::jsonb),
    'struggling', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key,
        'total_devices', total_devices, 'median_acc_pct', median_acc_pct,
        'mean_attempts', mean_attempts
    ) ORDER BY median_acc_pct ASC, total_devices DESC) FROM per_item
       WHERE median_acc_pct < 60 AND total_devices >= 3 LIMIT 12), '[]'::jsonb),
    'top_strong', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'game_mode', game_mode, 'item_key', item_key, 'strong', strong,
        'total_devices', total_devices, 'mean_acc_pct', mean_acc_pct
    ) ORDER BY strong DESC, mean_acc_pct DESC) FROM per_item
       WHERE strong >= 1 LIMIT 12), '[]'::jsonb)
);
$$;


ALTER FUNCTION "public"."dashboard_mastery_summary"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_mastery_v2"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH latest AS (
        SELECT DISTINCT ON (device_id, item_key, game_mode)
            device_id, item_key, game_mode, to_state AS current_state,
            transition_at, age_band, theta_at_event, b_at_event
        FROM mastery_episode_fact
        ORDER BY device_id, item_key, game_mode, transition_at DESC
    ),
    totals AS (
        SELECT
            count(*) FILTER (WHERE current_state = 'Exposed')  AS exposed,
            count(*) FILTER (WHERE current_state = 'Acquired') AS acquired,
            count(*) FILTER (WHERE current_state = 'Mastered') AS mastered,
            count(*) FILTER (WHERE current_state = 'Decayed')  AS decayed,
            count(*)                                           AS total_pairs
        FROM latest
    ),
    by_state_mode AS (
        SELECT game_mode, current_state, count(*)::int AS n
        FROM latest WHERE game_mode IS NOT NULL GROUP BY game_mode, current_state
    ),
    by_age_state AS (
        SELECT age_band, current_state, count(*)::int AS n
        FROM latest WHERE age_band IS NOT NULL GROUP BY age_band, current_state
    ),
    recent_transitions AS (
        SELECT device_id, item_key, game_mode,
               from_state, to_state, transition_at, age_band, evidence
        FROM mastery_episode_fact
        WHERE transition_at > now() - (in_days || ' days')::interval
        ORDER BY transition_at DESC LIMIT 20
    ),
    top_mastered_items AS (
        SELECT item_key, game_mode, count(*)::int AS n_learners
        FROM latest WHERE current_state = 'Mastered'
        GROUP BY item_key, game_mode
        ORDER BY n_learners DESC LIMIT 15
    )
    SELECT jsonb_build_object(
        'days', in_days, 'as_of', now(),
        'totals', (SELECT row_to_json(t) FROM totals t),
        'by_state_mode',   COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_state_mode b), '[]'::jsonb),
        'by_age_state',    COALESCE((SELECT jsonb_agg(row_to_json(a)) FROM by_age_state a), '[]'::jsonb),
        'recent_transitions', COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY transition_at DESC) FROM recent_transitions r), '[]'::jsonb),
        'top_mastered',    COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM top_mastered_items t), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_mastery_v2"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_observability"("in_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH win AS (
        SELECT occurred_at, event_uid, client_ts, client_seq, event_name, build_version, received_at
        FROM analytics_events WHERE occurred_at > now() - (in_days || ' days')::interval
    ),
    ingest AS (
        SELECT
            count(*)::bigint AS events_total,
            count(*) FILTER (WHERE event_uid IS NOT NULL)::bigint AS events_with_envelope,
            count(*) FILTER (WHERE event_uid IS NULL)::bigint AS events_legacy,
            count(DISTINCT event_uid) FILTER (WHERE event_uid IS NOT NULL)::bigint AS distinct_event_uids,
            count(DISTINCT date_trunc('hour', occurred_at))::int AS hours_observed
        FROM win
    ),
    -- Real client->server INGESTION latency = received_at (server insert
    -- clock, set by DB default) - client_ts (client event-creation clock).
    -- occurred_at was the client clock too (== client_ts), so the old calc
    -- was always 0. Skew guard drops rows where the client clock ran ahead.
    latency AS (
        SELECT
            count(*)::bigint AS rows_with_client_ts,
            percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (received_at - client_ts)) * 1000)::numeric(10, 0) AS p50_latency_ms,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (received_at - client_ts)) * 1000)::numeric(10, 0) AS p95_latency_ms,
            percentile_cont(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (received_at - client_ts)) * 1000)::numeric(10, 0) AS p99_latency_ms
        FROM win WHERE client_ts IS NOT NULL AND received_at IS NOT NULL AND received_at >= client_ts
    ),
    by_hour AS (
        SELECT date_trunc('hour', occurred_at) AS h, count(*)::int AS n
        FROM win WHERE occurred_at > now() - interval '24 hours' GROUP BY 1 ORDER BY 1
    ),
    by_build AS (
        SELECT COALESCE(build_version, '(unknown)') AS build, count(*)::int AS n
        FROM win GROUP BY 1 ORDER BY n DESC LIMIT 10
    ),
    recent_anomalies AS (
        SELECT id, detected_at, metric, severity, current_value, baseline_mean, baseline_sd, z_score, reason
        FROM lios_anomaly_fact WHERE detected_at > now() - (in_days || ' days')::interval
        ORDER BY detected_at DESC LIMIT 30
    )
    SELECT jsonb_build_object(
        'days', in_days, 'as_of', now(),
        'ingest', (SELECT row_to_json(i) FROM ingest i),
        'latency', (SELECT row_to_json(l) FROM latency l),
        'by_hour_24h', COALESCE((SELECT jsonb_agg(jsonb_build_object('h', h, 'n', n)) FROM by_hour), '[]'::jsonb),
        'by_build', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_build b), '[]'::jsonb),
        'slos', jsonb_build_object(
            'event_durability', jsonb_build_object(
                'target_pct', 99.5,
                'current_pct', round(100.0 * (SELECT events_with_envelope FROM ingest) / nullif((SELECT events_total FROM ingest), 0), 2),
                'status', CASE
                    WHEN (SELECT events_total FROM ingest) = 0 THEN 'no_data'
                    WHEN 100.0 * (SELECT events_with_envelope FROM ingest) / nullif((SELECT events_total FROM ingest), 0) >= 99.5 THEN 'green'
                    WHEN 100.0 * (SELECT events_with_envelope FROM ingest) / nullif((SELECT events_total FROM ingest), 0) >= 95.0 THEN 'amber'
                    ELSE 'red' END),
            'idempotency', jsonb_build_object(
                'target_pct_max', 0.1,
                'current_pct', round(100.0 * ((SELECT events_with_envelope FROM ingest) - (SELECT distinct_event_uids FROM ingest)) / nullif((SELECT events_with_envelope FROM ingest), 0), 4),
                'duplicates_count', (SELECT events_with_envelope FROM ingest) - (SELECT distinct_event_uids FROM ingest),
                'status', CASE WHEN (SELECT events_with_envelope FROM ingest) - (SELECT distinct_event_uids FROM ingest) = 0 THEN 'green' ELSE 'red' END),
            'ingestion_latency_p99_ms', jsonb_build_object(
                'target_max', 2000,
                'current', (SELECT p99_latency_ms FROM latency),
                'status', CASE
                    WHEN (SELECT p99_latency_ms FROM latency) IS NULL THEN 'no_data'
                    WHEN (SELECT p99_latency_ms FROM latency) < 2000 THEN 'green'
                    WHEN (SELECT p99_latency_ms FROM latency) < 5000 THEN 'amber'
                    ELSE 'red' END),
            'session_quality', jsonb_build_object(
                'target_pct', 85.0,
                'current_pct', (SELECT round(100.0 * count(*) FILTER (WHERE credibility_score >= 0.6) / nullif(count(*), 0), 2)
                                FROM learning_attempts WHERE credibility_score IS NOT NULL AND occurred_at > now() - (in_days || ' days')::interval),
                'status', 'green'),
            'cron_health', jsonb_build_object(
                'target_failures_24h', 0,
                'current_failures_24h', (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours' AND error_message IS NOT NULL),
                'runs_24h', (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours'),
                'avg_duration_ms', (SELECT round(avg(duration_ms)::numeric, 0)::int FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours'),
                'status', CASE
                    WHEN (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours' AND error_message IS NOT NULL) = 0 THEN 'green'
                    WHEN (SELECT count(*) FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours' AND error_message IS NOT NULL) <= 3 THEN 'amber'
                    ELSE 'red' END)
        ),
        'recent_anomalies', COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY detected_at DESC) FROM recent_anomalies r), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_observability"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_observations"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH win AS (
        SELECT * FROM human_observation_fact
        WHERE recorded_at > now() - (in_days || ' days')::interval
    ),
    tag_counts AS (
        SELECT 'focus' AS family, unnest(focus_tags) AS tag, count(*)::int AS n FROM win GROUP BY 2
        UNION ALL SELECT 'affect', unnest(affect_tags), count(*)::int FROM win GROUP BY 2
        UNION ALL SELECT 'independence', unnest(independence_tags), count(*)::int FROM win GROUP BY 2
        UNION ALL SELECT 'social', unnest(social_tags), count(*)::int FROM win GROUP BY 2
        UNION ALL SELECT 'notable', unnest(notable_tags), count(*)::int FROM win GROUP BY 2
    ),
    by_classroom AS (
        SELECT classroom_code, count(*)::int AS n_observations,
               count(DISTINCT device_id)::int AS n_learners
        FROM win WHERE classroom_code IS NOT NULL
        GROUP BY classroom_code ORDER BY n_observations DESC LIMIT 25
    ),
    eng_vs_mast AS (
        SELECT w.device_id,
            (array_agg(w.focus_tags))[1] AS focus,
            (array_agg(w.affect_tags))[1] AS affect,
            (SELECT count(*) FROM learning_attempts a WHERE a.device_id = w.device_id) AS n_attempts,
            (SELECT count(*) FROM (
                SELECT DISTINCT ON (item_key, game_mode) to_state
                FROM mastery_episode_fact
                WHERE device_id = w.device_id
                ORDER BY item_key, game_mode, transition_at DESC
             ) latest WHERE latest.to_state = 'Mastered')::int AS n_mastered
        FROM win w GROUP BY w.device_id LIMIT 100
    ),
    recent AS (
        SELECT id, recorded_at, recorded_by, observer_role,
               device_id, session_id, classroom_code, age_band,
               focus_tags, affect_tags, independence_tags,
               social_tags, notable_tags, note
        FROM win ORDER BY recorded_at DESC LIMIT 30
    )
    SELECT jsonb_build_object(
        'days', in_days, 'as_of', now(),
        'total', (SELECT count(*) FROM win),
        'distinct_learners_observed', (SELECT count(DISTINCT device_id) FROM win),
        'distinct_classrooms', (SELECT count(DISTINCT classroom_code) FROM win WHERE classroom_code IS NOT NULL),
        'by_tag', COALESCE((SELECT jsonb_agg(row_to_json(t) ORDER BY family, n DESC) FROM tag_counts t), '[]'::jsonb),
        'by_classroom', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_classroom b), '[]'::jsonb),
        'engagement_vs_mastery', COALESCE((SELECT jsonb_agg(row_to_json(e)) FROM eng_vs_mast e), '[]'::jsonb),
        'recent', COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY recorded_at DESC) FROM recent r), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_observations"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_pipeline_status"("in_limit" integer DEFAULT 20) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH recent AS (
        SELECT * FROM lios_pipeline_runs ORDER BY run_at DESC LIMIT in_limit
    ),
    last_24h AS (
        SELECT
            count(*) AS runs,
            count(*) FILTER (WHERE error_message IS NOT NULL) AS failed,
            sum(trust_scored)        AS total_trust_scored,
            sum(elo_processed)       AS total_elo_processed,
            sum(mastery_transitions) AS total_mastery_transitions,
            sum(friction_detectors_fired) AS total_friction_fires,
            round(avg(duration_ms)::numeric, 0) AS avg_duration_ms,
            max(duration_ms)         AS max_duration_ms
        FROM lios_pipeline_runs
        WHERE run_at > now() - interval '24 hours'
    ),
    cron_job AS (
        SELECT jobid, jobname, schedule, active, command
        FROM cron.job WHERE jobname = 'lios-pipeline-every-5min'
    )
    SELECT jsonb_build_object(
        'as_of', now(),
        'cron_job',    (SELECT row_to_json(c) FROM cron_job c),
        'last_24h',    (SELECT row_to_json(l) FROM last_24h l),
        'recent_runs', COALESCE((SELECT jsonb_agg(row_to_json(r) ORDER BY run_at DESC) FROM recent r), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_pipeline_status"("in_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_progression_for_learner"("in_device_id" "text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH summary AS (
        SELECT
            count(*)::int                                    AS n_attempts,
            count(DISTINCT item_key || '|' || game_mode)::int AS n_distinct_items,
            count(DISTINCT session_id)::int                  AS n_sessions,
            min(occurred_at)                                 AS first_seen,
            max(occurred_at)                                 AS last_seen,
            avg(was_correct::int)::numeric(4, 3)             AS accuracy,
            avg(credibility_score)::numeric(4, 3)            AS mean_credibility,
            (array_agg(age_band) FILTER (WHERE age_band IS NOT NULL))[1] AS age_band
        FROM learning_attempts
        WHERE device_id = in_device_id
    ),
    current_states AS (
        SELECT DISTINCT ON (device_id, item_key, game_mode)
            item_key, game_mode, to_state AS current_state
        FROM mastery_episode_fact
        WHERE device_id = in_device_id
        ORDER BY device_id, item_key, game_mode, transition_at DESC
    ),
    state_totals AS (
        SELECT
            count(*) FILTER (WHERE current_state = 'Exposed')  AS exposed,
            count(*) FILTER (WHERE current_state = 'Acquired') AS acquired,
            count(*) FILTER (WHERE current_state = 'Mastered') AS mastered,
            count(*) FILTER (WHERE current_state = 'Decayed')  AS decayed,
            count(*)                                           AS total_pairs
        FROM current_states
    ),
    -- Top items by practice volume — these are what we'll chart
    top_items AS (
        SELECT item_key, game_mode, n_attempts FROM skill_state
        WHERE device_id = in_device_id
        ORDER BY n_attempts DESC, last_attempt_at DESC
        LIMIT 6
    ),
    -- θ-over-time series per top item
    trajectories AS (
        SELECT
            h.item_key, h.game_mode,
            jsonb_agg(jsonb_build_object(
                'day', h.day,
                'theta', h.theta,
                'n_attempts', h.n_attempts
            ) ORDER BY h.day) AS series
        FROM skill_state_history h
        JOIN top_items t USING (item_key, game_mode)
        WHERE h.device_id = in_device_id
        GROUP BY h.item_key, h.game_mode
    ),
    transitions AS (
        SELECT item_key, game_mode, from_state, to_state, transition_at, evidence
        FROM mastery_episode_fact
        WHERE device_id = in_device_id
        ORDER BY transition_at DESC
        LIMIT 25
    ),
    recent_attempts AS (
        SELECT a.occurred_at, a.game_mode, a.item_key, a.was_correct,
               a.ms_to_attempt, a.credibility_score, a.credibility_tier
        FROM learning_attempts a
        WHERE a.device_id = in_device_id
        ORDER BY a.occurred_at DESC
        LIMIT 20
    )
    SELECT jsonb_build_object(
        'device_id', in_device_id, 'as_of', now(),
        'summary',  (SELECT row_to_json(s) FROM summary s),
        'state_totals', (SELECT row_to_json(st) FROM state_totals st),
        'top_items', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM top_items t), '[]'::jsonb),
        'trajectories', COALESCE((SELECT jsonb_agg(row_to_json(tr)) FROM trajectories tr), '[]'::jsonb),
        'transitions', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM transitions t), '[]'::jsonb),
        'recent_attempts', COALESCE((SELECT jsonb_agg(row_to_json(r)) FROM recent_attempts r), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_progression_for_learner"("in_device_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_progression_top_learners"("in_days" integer DEFAULT 30, "in_limit" integer DEFAULT 25) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH activity AS (
        SELECT
            a.device_id,
            count(*)::int                              AS n_attempts,
            count(DISTINCT a.item_key || '|' || a.game_mode)::int AS n_distinct_items,
            count(DISTINCT a.session_id)::int          AS n_sessions,
            min(a.occurred_at)                         AS first_seen,
            max(a.occurred_at)                         AS last_seen,
            avg(a.was_correct::int)::numeric(4, 3)     AS accuracy,
            (array_agg(a.age_band) FILTER (WHERE a.age_band IS NOT NULL))[1] AS age_band
        FROM learning_attempts a
        WHERE a.device_id IS NOT NULL
          AND a.occurred_at > now() - (in_days || ' days')::interval
        GROUP BY a.device_id
    ),
    with_mastery AS (
        SELECT
            ac.*,
            (
                SELECT count(*)
                FROM (
                    SELECT DISTINCT ON (m.device_id, m.item_key, m.game_mode)
                        m.to_state
                    FROM mastery_episode_fact m
                    WHERE m.device_id = ac.device_id
                    ORDER BY m.device_id, m.item_key, m.game_mode, m.transition_at DESC
                ) latest
                WHERE latest.to_state = 'Mastered'
            )::int AS n_mastered
        FROM activity ac
    )
    SELECT jsonb_build_object(
        'days', in_days, 'limit', in_limit, 'as_of', now(),
        'learners', COALESCE((
            SELECT jsonb_agg(row_to_json(w) ORDER BY n_attempts DESC)
            FROM (
                SELECT * FROM with_mastery
                ORDER BY n_attempts DESC
                LIMIT in_limit
            ) w
        ), '[]'::jsonb)
    );
$$;


ALTER FUNCTION "public"."dashboard_progression_top_learners"("in_days" integer, "in_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_public_proof"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH
    win AS (
        SELECT * FROM public.analytics_events
        WHERE occurred_at > now() - interval '90 days'
    ),
    tracker AS (
        SELECT
            count(*) FILTER (WHERE event_name = 'tracker_init_succeeded')                          AS ok,
            count(*) FILTER (WHERE event_name IN ('tracker_init_succeeded','tracker_init_failed')) AS total
        FROM win
    ),
    mastered AS (
        WITH per_device_item AS (
            SELECT game_mode, item_key, device_id,
                count(*) AS attempts,
                avg(CASE WHEN was_correct THEN 1 ELSE 0 END)::numeric * 100 AS acc_pct
            FROM public.learning_attempts
            WHERE occurred_at > now() - interval '90 days'
            GROUP BY game_mode, item_key, device_id
        )
        SELECT count(DISTINCT (game_mode, item_key)) AS items
        FROM per_device_item
        WHERE attempts >= 5 AND acc_pct >= 80
    ),
    touched AS (
        SELECT count(DISTINCT (game_mode, item_key)) AS items
        FROM public.learning_attempts
        WHERE occurred_at > now() - interval '90 days'
    )
SELECT jsonb_build_object(
    'as_of', now(),
    'distinct_devices_90d',  (SELECT count(distinct device_id) FROM win WHERE device_id IS NOT NULL),
    'activities_completed',  (SELECT count(*)                  FROM win WHERE event_name = 'mode_completed'),
    'mode_plays',            (SELECT count(*)                  FROM win WHERE event_name = 'mode_started'),
    'tracker_success_pct',   CASE WHEN (SELECT total FROM tracker) > 0
                                  THEN round(100.0 * (SELECT ok FROM tracker) / (SELECT total FROM tracker), 1)
                                  ELSE 0 END,
    'items_touched',         (SELECT items FROM touched),
    'items_mastered',        (SELECT items FROM mastered)
);
$$;


ALTER FUNCTION "public"."dashboard_public_proof"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_retention_deep"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH device_first AS (
    SELECT device_id, min(occurred_at) AS first_at
    FROM public.analytics_events WHERE device_id IS NOT NULL GROUP BY device_id
), daily AS (
    SELECT date_trunc('day', e.occurred_at)::date AS day, e.device_id,
        date_trunc('day', df.first_at)::date AS first_day
    FROM public.analytics_events e JOIN device_first df USING (device_id)
    WHERE e.occurred_at > now() - interval '30 days' AND e.device_id IS NOT NULL
    GROUP BY day, e.device_id, df.first_at
), per_day AS (
    SELECT day, count(DISTINCT device_id) AS active,
        count(DISTINCT device_id) FILTER (WHERE day = first_day) AS new_devs,
        count(DISTINCT device_id) FILTER (WHERE day > first_day) AS returning_devs
    FROM daily GROUP BY day
), days_array AS (
    SELECT jsonb_agg(jsonb_build_object(
        'day', day, 'active', active, 'new_devices', new_devs, 'returning', returning_devs
    ) ORDER BY day) AS arr FROM per_day
), stickiness AS (
    SELECT
        (SELECT count(distinct device_id) FROM public.analytics_events WHERE occurred_at > now() - interval '1 day') AS dau,
        (SELECT count(distinct device_id) FROM public.analytics_events WHERE occurred_at > now() - interval '7 days') AS wau,
        (SELECT count(distinct device_id) FROM public.analytics_events WHERE occurred_at > now() - interval '30 days') AS mau
), returning_hooks AS (
    SELECT e.game_mode, count(distinct e.device_id) AS devices
    FROM public.analytics_events e JOIN device_first df USING (device_id)
    WHERE e.event_name = 'mode_started'
      AND e.occurred_at > df.first_at + interval '20 hours'
      AND e.occurred_at > now() - interval '30 days' AND e.game_mode IS NOT NULL
    GROUP BY e.game_mode
), cohorts AS (
    SELECT device_id, date_trunc('week', first_at)::date AS cohort_week
    FROM device_first WHERE first_at > now() - interval '8 weeks'
), cohort_sizes AS (
    SELECT cohort_week, count(*) AS cohort_size FROM cohorts GROUP BY cohort_week
), weeks AS (SELECT generate_series(0, 6) AS w),
matrix AS (
    SELECT c.cohort_week, w.w, cs.cohort_size,
        count(distinct CASE WHEN EXISTS (
            SELECT 1 FROM public.analytics_events e
            WHERE e.device_id = c.device_id
              AND date_trunc('week', e.occurred_at)::date = c.cohort_week + (w.w * 7)
        ) THEN c.device_id END) AS active
    FROM cohorts c CROSS JOIN weeks w
    JOIN cohort_sizes cs USING (cohort_week)
    GROUP BY c.cohort_week, w.w, cs.cohort_size
), heatmap AS (
    SELECT cohort_week, cohort_size,
        jsonb_agg(jsonb_build_object(
            'w', w,
            'pct', CASE WHEN cohort_size > 0 THEN round(100.0 * active / cohort_size, 1) ELSE NULL END,
            'active', active
        ) ORDER BY w) AS cells
    FROM matrix GROUP BY cohort_week, cohort_size
), heatmap_arr AS (
    SELECT jsonb_agg(jsonb_build_object(
        'cohort_week', cohort_week, 'cohort_size', cohort_size, 'cells', cells
    ) ORDER BY cohort_week DESC) AS arr FROM heatmap
)
SELECT jsonb_build_object(
    'as_of', now(),
    'daily', coalesce((SELECT arr FROM days_array), '[]'::jsonb),
    'dau', (SELECT dau FROM stickiness),
    'wau', (SELECT wau FROM stickiness),
    'mau', (SELECT mau FROM stickiness),
    'stickiness_dau_mau', CASE WHEN (SELECT mau FROM stickiness) > 0
                                THEN round(100.0 * (SELECT dau FROM stickiness)::numeric / (SELECT mau FROM stickiness)::numeric, 1)
                                ELSE 0 END,
    'returning_hooks', coalesce((SELECT jsonb_agg(jsonb_build_object('game_mode', game_mode, 'devices', devices) ORDER BY devices DESC) FROM returning_hooks), '[]'::jsonb),
    'cohort_heatmap', coalesce((SELECT arr FROM heatmap_arr), '[]'::jsonb)
);
$$;


ALTER FUNCTION "public"."dashboard_retention_deep"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_today"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH today AS (
    SELECT *
    FROM public.analytics_events
    WHERE occurred_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
), per_session AS (
    SELECT
        session_id,
        min(occurred_at) AS first_at,
        max(occurred_at) AS last_at,
        bool_or(event_name = 'mode_started'
                AND COALESCE(game_mode, '') NOT IN ('free'))         AS reached_eligible_start,
        bool_or(event_name = 'mode_completed')                       AS reached_completion,
        extract(epoch from (max(occurred_at) - min(occurred_at)))    AS dur_s
    FROM today
    GROUP BY session_id
)
SELECT jsonb_build_object(
    'sessions_started',    (SELECT count(*) FROM per_session),
    'sessions_completed',  (SELECT count(*) FROM per_session WHERE reached_completion),
    'completion_rate_pct',
        (SELECT round(
            100.0 * count(*) FILTER (WHERE reached_completion AND reached_eligible_start)
                  / NULLIF(count(*) FILTER (WHERE reached_eligible_start), 0),
            1)
         FROM per_session),
    'median_session_seconds', (SELECT round((percentile_cont(0.5) within group (order by dur_s))::numeric, 0)
                                 FROM per_session WHERE dur_s > 0),
    'mode_completions',  (SELECT count(*) FROM today WHERE event_name = 'mode_completed'),
    'mode_starts',       (SELECT count(*) FROM today WHERE event_name = 'mode_started'),
    'total_events',      (SELECT count(*) FROM today),
    'as_of',             now()
);
$$;


ALTER FUNCTION "public"."dashboard_today"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_top_modes"("in_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH per_session AS (
    SELECT
        game_mode,
        session_id,
        bool_or(event_name = 'mode_started')   AS did_start,
        bool_or(event_name = 'mode_completed') AS did_complete
    FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
      AND game_mode IS NOT NULL
    GROUP BY game_mode, session_id
), per_mode AS (
    SELECT
        game_mode,
        count(*) FILTER (WHERE did_start)                                  AS started,
        count(*) FILTER (WHERE did_complete AND did_start)                 AS completed,
        count(DISTINCT session_id) FILTER (WHERE did_start)                AS distinct_starters,
        (game_mode IN ('free'))                                            AS is_open_ended
    FROM per_session
    GROUP BY game_mode
)
SELECT jsonb_build_object(
    'days',  in_days,
    'as_of', now(),
    'modes', coalesce(jsonb_agg(
        jsonb_build_object(
            'game_mode',         game_mode,
            'started',           started,
            'completed',         completed,
            'distinct_starters', distinct_starters,
            'is_open_ended',     is_open_ended,
            'completion_rate_pct',
                CASE
                    WHEN is_open_ended THEN NULL
                    WHEN started > 0   THEN round(100.0 * completed / started, 1)
                    ELSE NULL
                END
        ) ORDER BY started DESC
    ), '[]'::jsonb)
) FROM per_mode;
$$;


ALTER FUNCTION "public"."dashboard_top_modes"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_tracker_health"("in_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH window_data AS (
    SELECT *
    FROM public.analytics_events
    WHERE occurred_at > now() - make_interval(days => in_days)
), succ AS (
    SELECT (meta ->> 'delegate') AS delegate,
           value_number AS init_ms
    FROM window_data
    WHERE event_name = 'tracker_init_succeeded'
), fail AS (
    SELECT (meta ->> 'code') AS code,
           count(*)::int AS n
    FROM window_data
    WHERE event_name = 'tracker_init_failed'
    GROUP BY meta ->> 'code'
)
SELECT jsonb_build_object(
    'days',                  in_days,
    'gpu_success',           (SELECT count(*) FROM succ WHERE delegate = 'GPU'),
    'cpu_success',           (SELECT count(*) FROM succ WHERE delegate = 'CPU'),
    'failed',                (SELECT count(*) FROM window_data WHERE event_name = 'tracker_init_failed'),
    'median_init_ms_gpu',    (SELECT round((percentile_cont(0.5) within group (order by init_ms))::numeric, 0)
                                FROM succ WHERE delegate = 'GPU' AND init_ms IS NOT NULL),
    'median_init_ms_cpu',    (SELECT round((percentile_cont(0.5) within group (order by init_ms))::numeric, 0)
                                FROM succ WHERE delegate = 'CPU' AND init_ms IS NOT NULL),
    'failures_by_code',      coalesce((SELECT jsonb_agg(jsonb_build_object('code', code, 'count', n) ORDER BY n DESC)
                                         FROM fail), '[]'::jsonb),
    'as_of',                 now()
);
$$;


ALTER FUNCTION "public"."dashboard_tracker_health"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_transparency_report"("in_days" integer DEFAULT 90) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH win AS (
        SELECT credibility_tier, credibility_score, game_mode
        FROM learning_attempts
        WHERE credibility_tier IS NOT NULL AND occurred_at > now() - (in_days || ' days')::interval
    ),
    totals AS (
        SELECT count(*) AS total,
               count(*) FILTER (WHERE credibility_tier='A') AS tier_a,
               count(*) FILTER (WHERE credibility_tier='B') AS tier_b,
               count(*) FILTER (WHERE credibility_tier='C') AS tier_c
        FROM win
    ),
    eligible_modes AS (
        SELECT game_mode FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval AND device_id IS NOT NULL
        GROUP BY game_mode HAVING count(DISTINCT device_id) >= 5
    ),
    by_mode_safe AS (
        SELECT w.game_mode, count(*) AS total,
               round(100.0 * count(*) FILTER (WHERE credibility_tier='A') / nullif(count(*),0), 1) AS pct_a,
               round(100.0 * count(*) FILTER (WHERE credibility_tier='B') / nullif(count(*),0), 1) AS pct_b,
               round(100.0 * count(*) FILTER (WHERE credibility_tier='C') / nullif(count(*),0), 1) AS pct_c
        FROM win w JOIN eligible_modes em USING (game_mode)
        GROUP BY w.game_mode
    )
    SELECT jsonb_build_object(
        'report_version', 'lios-transparency-v1',
        'generated_at',   now(),
        'window_days',    in_days,
        'methodology', jsonb_build_object(
            'trust_v1_thresholds', jsonb_build_object('tier_a_min', 0.80, 'tier_b_min', 0.40, 'tier_c_max', 0.40, 'publication_eligibility_min', 0.60),
            'rules', ARRAY['timing_reflex_floor','timing_distraction','timing_missing','tab_hidden_during_window','stuck_recent','two_hands_session'],
            'privacy_posture', ARRAY[
                'No personal data collected — pseudonymous device_id only.',
                'Raw video frames and coordinate paths never leave the device.',
                'Per-game-mode aggregates suppressed when fewer than 5 distinct learners (k=5).',
                'Attempts under Tier-A credibility (<0.80) are excluded from external efficacy claims.'
            ]
        ),
        'composition', jsonb_build_object(
            'attempts_rounded', 100 * round((SELECT total FROM totals) / 100.0),
            'tier_a_pct', round(100.0 * (SELECT tier_a FROM totals) / nullif((SELECT total FROM totals), 0), 1),
            'tier_b_pct', round(100.0 * (SELECT tier_b FROM totals) / nullif((SELECT total FROM totals), 0), 1),
            'tier_c_pct', round(100.0 * (SELECT tier_c FROM totals) / nullif((SELECT total FROM totals), 0), 1)
        ),
        'by_game_mode', COALESCE((SELECT jsonb_agg(row_to_json(b)) FROM by_mode_safe b), '[]'::jsonb),
        'coverage_disclaimer', 'Game modes with fewer than 5 distinct learners in the reporting window are suppressed under the k=5 anonymity policy.'
    );
$$;


ALTER FUNCTION "public"."dashboard_transparency_report"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_transparency_signals"("in_days" integer DEFAULT 90) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH win AS (
        SELECT * FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
    ),
    -- Modes with at least k=5 distinct learners
    eligible_modes AS (
        SELECT game_mode FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
          AND device_id IS NOT NULL
        GROUP BY game_mode HAVING count(DISTINCT device_id) >= 5
    ),
    -- Top engaging activity by raw attempts
    top_engagement AS (
        SELECT w.game_mode, count(*)::int AS n
        FROM win w JOIN eligible_modes em USING (game_mode)
        GROUP BY w.game_mode ORDER BY n DESC LIMIT 1
    ),
    -- Strongest positive signal: mode with highest Tier-A share
    strongest_signal AS (
        SELECT w.game_mode,
               round(100.0 * count(*) FILTER (WHERE credibility_tier='A') / nullif(count(*),0), 1) AS pct_a
        FROM win w JOIN eligible_modes em USING (game_mode)
        WHERE credibility_tier IS NOT NULL
        GROUP BY w.game_mode
        ORDER BY pct_a DESC NULLS LAST LIMIT 1
    ),
    -- Calibration-in-progress: mode with the lowest Tier-A share
    calibration AS (
        SELECT w.game_mode,
               round(100.0 * count(*) FILTER (WHERE credibility_tier='A') / nullif(count(*),0), 1) AS pct_a
        FROM win w JOIN eligible_modes em USING (game_mode)
        WHERE credibility_tier IS NOT NULL
        GROUP BY w.game_mode
        ORDER BY pct_a ASC NULLS LAST LIMIT 1
    ),
    -- Learning impact snapshot (all anonymised aggregates)
    impact AS (
        SELECT
            (SELECT count(*) FROM (
                SELECT DISTINCT ON (device_id, item_key, game_mode) to_state
                FROM mastery_episode_fact
                WHERE transition_at > now() - (in_days || ' days')::interval
                ORDER BY device_id, item_key, game_mode, transition_at DESC
            ) latest WHERE latest.to_state = 'Mastered') AS skills_mastered,
            (SELECT count(DISTINCT device_id) FROM win WHERE device_id IS NOT NULL) AS learners_active,
            (SELECT count(DISTINCT session_id) FROM win) AS sessions_run,
            (SELECT round(avg(c)::numeric, 0)::int FROM (
                SELECT count(*) AS c FROM win GROUP BY session_id
            ) s) AS avg_attempts_per_session
    ),
    -- Country signal. Use a per-day distinct learner count by classroom
    -- code when present; otherwise just count distinct classrooms as
    -- a proxy for breadth. Falls back to empty when we have no
    -- classroom data.
    classroom_breadth AS (
        SELECT count(DISTINCT (meta->>'class_code')) AS n
        FROM win WHERE meta ? 'class_code'
    )
    SELECT jsonb_build_object(
        'days', in_days, 'as_of', now(),
        'impact', jsonb_build_object(
            'skills_mastered',          (SELECT skills_mastered FROM impact),
            'learners_active',          (SELECT learners_active FROM impact),
            'sessions_run',             (SELECT sessions_run FROM impact),
            'avg_attempts_per_session', (SELECT avg_attempts_per_session FROM impact),
            'classrooms_engaged',       (SELECT n FROM classroom_breadth)
        ),
        'top_engaging_mode',  (SELECT game_mode FROM top_engagement),
        'strongest_signal',   (SELECT row_to_json(s) FROM strongest_signal s),
        'calibration_in_progress', (SELECT row_to_json(c) FROM calibration c)
    );
$$;


ALTER FUNCTION "public"."dashboard_transparency_signals"("in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_trust_strip"("in_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    WITH win AS (
        SELECT id, game_mode, credibility_tier, credibility_score, credibility_reasons
        FROM learning_attempts
        WHERE occurred_at > now() - (in_days || ' days')::interval
          AND credibility_tier IS NOT NULL
    ),
    totals AS (
        SELECT
            count(*)::int                                       AS total,
            count(*) FILTER (WHERE credibility_tier='A')::int   AS tier_a,
            count(*) FILTER (WHERE credibility_tier='B')::int   AS tier_b,
            count(*) FILTER (WHERE credibility_tier='C')::int   AS tier_c,
            avg(credibility_score)                              AS mean_score
        FROM win
    ),
    by_mode AS (
        SELECT
            game_mode,
            count(*)::int                                       AS total,
            count(*) FILTER (WHERE credibility_tier='A')::int   AS tier_a,
            count(*) FILTER (WHERE credibility_tier='B')::int   AS tier_b,
            count(*) FILTER (WHERE credibility_tier='C')::int   AS tier_c
        FROM win
        GROUP BY game_mode
    ),
    reasons_exploded AS (
        SELECT jsonb_array_elements_text(credibility_reasons) AS reason
        FROM win
        WHERE credibility_tier <> 'A'
    ),
    top_reasons AS (
        SELECT reason, count(*)::int AS n
        FROM reasons_exploded
        GROUP BY reason
        ORDER BY n DESC
    )
    SELECT jsonb_build_object(
        'days',       in_days,
        'as_of',      now(),
        'total',      t.total,
        'tier_a',     t.tier_a,
        'tier_b',     t.tier_b,
        'tier_c',     t.tier_c,
        'pct_a',      round(100.0 * t.tier_a / nullif(t.total, 0), 1),
        'pct_b',      round(100.0 * t.tier_b / nullif(t.total, 0), 1),
        'pct_c',      round(100.0 * t.tier_c / nullif(t.total, 0), 1),
        'mean_score', round(coalesce(t.mean_score, 0)::numeric, 2),
        'by_mode',    coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'game_mode', game_mode,
                'total',     total,
                'tier_a',    tier_a,
                'tier_b',    tier_b,
                'tier_c',    tier_c,
                'pct_a',     round(100.0 * tier_a / nullif(total, 0), 1),
                'pct_b',     round(100.0 * tier_b / nullif(total, 0), 1),
                'pct_c',     round(100.0 * tier_c / nullif(total, 0), 1)
            ) ORDER BY total DESC)
            FROM by_mode
        ), '[]'::jsonb),
        'top_reasons', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'reason', reason,
                'n',      n
            ) ORDER BY n DESC)
            FROM top_reasons
        ), '[]'::jsonb)
    )
    FROM totals t;
$$;


ALTER FUNCTION "public"."dashboard_trust_strip"("in_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."dashboard_trust_strip"("in_days" integer) IS 'LIOS Trust v1 — composition strip data for the dashboards.';



CREATE OR REPLACE FUNCTION "public"."export_family_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."export_family_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."export_family_data"() IS 'Human-readable family data export for PDF (0021). No internal ids, no PII beyond account email.';



CREATE OR REPLACE FUNCTION "public"."export_parent_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;
  select jsonb_build_object(
    'exported_at', now(),
    'parent', (select to_jsonb(p) from parent_profiles p where p.id = uid),
    'subscription', (select to_jsonb(s) from parent_subscriptions s where s.parent_id = uid),
    'children', (select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from child_profiles c where c.parent_id = uid),
    'learning_state', (select coalesce(jsonb_agg(to_jsonb(cls)),'[]'::jsonb) from child_learning_state cls
        where cls.child_profile_id in (select id from child_profiles where parent_id = uid)),
    'activity_summary', (select coalesce(jsonb_agg(to_jsonb(cas)),'[]'::jsonb) from child_activity_summary cas
        where cas.child_profile_id in (select id from child_profiles where parent_id = uid)),
    'controls', (select coalesce(jsonb_agg(to_jsonb(pc)),'[]'::jsonb) from parent_controls pc where pc.parent_id = uid),
    'consent', (select coalesce(jsonb_agg(to_jsonb(cr)),'[]'::jsonb) from consent_records cr where cr.parent_id = uid)
  ) into result;
  return result;
end;
$$;


ALTER FUNCTION "public"."export_parent_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_network_fingerprint"("in_ip" "text", "in_secret" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'extensions', 'pg_temp'
    AS $$
DECLARE
    v_normalized text;
BEGIN
    IF in_secret IS NULL OR in_secret = '' THEN
        RETURN NULL;
    END IF;

    IF in_secret = 'dev-override' THEN
        RETURN public.normalize_ip_for_network(in_ip);
    END IF;

    v_normalized := public.normalize_ip_for_network(in_ip);
    IF v_normalized IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN encode(extensions.hmac(v_normalized, in_secret, 'sha256'), 'hex');
END;
$$;


ALTER FUNCTION "public"."generate_network_fingerprint"("in_ip" "text", "in_secret" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_network_fingerprint"("in_ip" "text", "in_secret" "text") IS 'Generate HMAC-SHA256 hex digest of a normalized IP using the provided secret. If secret is NULL/empty returns NULL. If secret equals "dev-override" returns the normalized IP in plaintext for local development.';



CREATE OR REPLACE FUNCTION "public"."get_account_roles"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select jsonb_build_object(
    'parent',         exists (select 1 from parent_profiles p where p.id = auth.uid()),
    'teacher',        exists (select 1 from teacher_profiles t where t.auth_user_id = auth.uid()),
    'admin',          public.is_admin_user(auth.uid()),
    'platform_admin', public.is_admin_user(auth.uid()),
    'school_admin',   exists (
                        select 1 from tenant_members m
                        join tenants tn on tn.id = m.tenant_id
                        where m.user_id = auth.uid()
                          and tn.kind = 'school'
                          and m.member_role in ('owner','school_admin')
                      )
  );
$$;


ALTER FUNCTION "public"."get_account_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_child_dashboard"("p_child" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;

  select jsonb_build_object(
    'child', (select to_jsonb(c) from child_profiles c where c.id = p_child),
    'state', (select to_jsonb(s) from child_learning_state s where s.child_profile_id = p_child),
    'controls', (select to_jsonb(pc) from parent_controls pc where pc.child_profile_id = p_child),
    'totals', (
      select jsonb_build_object(
        'activities_played', count(distinct activity_key),
        'total_attempts', coalesce(sum(attempts),0),
        'total_completions', coalesce(sum(completions),0),
        'total_seconds', coalesce(sum(total_seconds),0),
        'mastered', count(*) filter (where status='mastered'),
        'practising', count(*) filter (where status='practising'),
        'struggling', count(*) filter (where status='struggling')
      ) from child_activity_summary where child_profile_id = p_child
    ),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'activity_key', activity_key, 'attempts', attempts, 'completions', completions,
        'completion_rate', completion_rate, 'mastery', mastery, 'status', status,
        'total_seconds', total_seconds, 'last_played_at', last_played_at
      ) order by last_played_at desc nulls last)
      from child_activity_summary where child_profile_id = p_child
    ), '[]'::jsonb),
    'skills', _get_child_skills(p_child),
    -- 7-day activity window for the weekly summary.
    -- learning_attempts uses (game_mode, was_correct, occurred_at) — no
    -- score or activity_key column. We project those to the names the
    -- dashboard expects so the frontend doesn't need to know the diff.
    'last_7_days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'activity_key', game_mode,
        'score', case when was_correct then 1 else 0 end,
        'created_at', occurred_at
      ) order by occurred_at)
      from learning_attempts
      where child_profile_id = p_child and occurred_at >= now() - interval '7 days'
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;


ALTER FUNCTION "public"."get_child_dashboard"("p_child" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_effective_tier"("teacher_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  teacher_record RECORD;
  school_record RECORD;
BEGIN
  SELECT tier, trial_started_at, trial_expires_at, school_id
  INTO teacher_record
  FROM teachers WHERE id = teacher_id;

  IF NOT FOUND THEN RETURN 'free'; END IF;

  IF teacher_record.school_id IS NOT NULL THEN
    SELECT license_tier INTO school_record
    FROM schools WHERE id = teacher_record.school_id;
    IF FOUND AND school_record.license_tier IN ('school', 'enterprise') THEN
      RETURN 'pro';
    END IF;
  END IF;

  IF teacher_record.tier = 'trial' THEN
    IF teacher_record.trial_expires_at IS NOT NULL
       AND teacher_record.trial_expires_at < NOW() THEN
      RETURN 'free';
    END IF;
    RETURN 'trial';
  END IF;

  RETURN COALESCE(teacher_record.tier, 'free');
END;
$$;


ALTER FUNCTION "public"."get_effective_tier"("teacher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_email_cron_key"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'app_private'
    AS $$
  select value from app_private.secrets where name = 'email_cron_key';
$$;


ALTER FUNCTION "public"."get_email_cron_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_parent_overview"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  uid uuid := auth.uid();
  active_count int;
  archived_count int;
  result jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;

  select count(*) filter (where status='active'),
         count(*) filter (where status='archived')
    into active_count, archived_count
  from child_profiles where parent_id = uid;

  select jsonb_build_object(
    'parent', (select to_jsonb(p) - 'stripe_customer_id' from parent_profiles p where p.id = uid),
    'subscription', (
      select jsonb_build_object(
        'state', parent_subscription_state(uid),
        'has_access', parent_has_access(uid),
        'status', s.status,
        'plan_interval', s.plan_interval,
        'included_child_slots', coalesce(s.included_child_slots, (select base_included_slots from pricing_config where id='default')),
        'billed_addon_quantity', s.billed_addon_quantity,
        'trial_end', s.trial_end,
        'current_period_end', s.current_period_end,
        'cancel_at_period_end', s.cancel_at_period_end
      )
      from parent_subscriptions s where s.parent_id = uid
    ),
    'plan_usage', jsonb_build_object(
      'active_children', active_count,
      'archived_children', archived_count,
      'included_slots', (select base_included_slots from pricing_config where id='default')
    ),
    'billing_preview', compute_billing_preview(
      coalesce((select plan_interval from parent_subscriptions where parent_id=uid), 'month'),
      active_count),
    'children', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'nickname', c.nickname, 'age_band', c.age_band,
        'avatar', c.avatar, 'learning_focus', c.learning_focus, 'status', c.status,
        'last_played_at', cls.last_played_at, 'streak_days', cls.streak_days,
        'recommended_activity_key', cls.recommended_activity_key
      ) order by c.created_at)
      from child_profiles c
      left join child_learning_state cls on cls.child_profile_id = c.id
      where c.parent_id = uid
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;


ALTER FUNCTION "public"."get_parent_overview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_student_assignments"("in_student_id" "uuid", "in_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_result jsonb;
BEGIN
    -- 1. Look up per-student assignments
    SELECT jsonb_agg(
        jsonb_build_object(
            'activity', saa.activity,
            'sequence_order', saa.sequence_order,
            'is_enabled', saa.is_enabled
        ) ORDER BY saa.sequence_order
    ) INTO v_result
    FROM public.student_activity_assignments saa
    WHERE saa.student_id = in_student_id
      AND saa.session_id = in_session_id;

    IF v_result IS NOT NULL THEN
        RETURN v_result;
    END IF;

    -- 2. Fallback: classroom defaults
    SELECT jsonb_agg(
        jsonb_build_object(
            'activity', cda_act,
            'sequence_order', row_number() OVER () - 1,
            'is_enabled', true
        )
    ) INTO v_result
    FROM public.classroom_default_activities cda,
         unnest(cda.activities) AS cda_act
    WHERE cda.session_id = in_session_id;

    IF v_result IS NOT NULL THEN
        RETURN v_result;
    END IF;

    -- 3. Final fallback: all standard game modes
    RETURN '[
        {"activity": "calibration",      "sequence_order": 0, "is_enabled": true},
        {"activity": "free",             "sequence_order": 1, "is_enabled": true},
        {"activity": "pre-writing",      "sequence_order": 2, "is_enabled": true},
        {"activity": "sort-and-place",   "sequence_order": 3, "is_enabled": true},
        {"activity": "word-search",      "sequence_order": 4, "is_enabled": true},
        {"activity": "colour-builder",   "sequence_order": 5, "is_enabled": true},
        {"activity": "balloon-math",     "sequence_order": 6, "is_enabled": true},
        {"activity": "rainbow-bridge",   "sequence_order": 7, "is_enabled": true},
        {"activity": "gesture-spelling", "sequence_order": 8, "is_enabled": true}
    ]'::jsonb;
END;
$$;


ALTER FUNCTION "public"."get_student_assignments"("in_student_id" "uuid", "in_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_student_assignments"("in_student_id" "uuid", "in_session_id" "uuid") IS 'SECURITY DEFINER. Returns ordered list of assigned activities for a student in a session. Falls back to classroom defaults then to all standard game modes. Returns [{ activity, sequence_order, is_enabled }].';



CREATE OR REPLACE FUNCTION "public"."get_student_class_state"("in_student_id" "uuid", "in_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_session   public.sessions%ROWTYPE;
    v_student   public.session_students%ROWTYPE;
    v_activity  public.session_activities%ROWTYPE;
    v_assign    jsonb;
    v_result    jsonb;
BEGIN
    SELECT * INTO v_student
    FROM public.session_students
    WHERE id = in_student_id AND session_id = in_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'STUDENT_NOT_FOUND');
    END IF;

    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = in_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'SESSION_NOT_FOUND');
    END IF;

    IF v_student.kicked_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'sessionId', in_session_id,
            'participantId', in_student_id,
            'sessionStatus', 'ended',
            'activityVersion', v_session.activity_version,
            'assignedActivity', null,
            'kicked', true,
            'kickedReason', v_student.kicked_reason
        );
    END IF;

    v_result := NULL;

    SELECT jsonb_agg(
        jsonb_build_object(
            'activity', saa.activity,
            'sequence_order', saa.sequence_order,
            'is_enabled', saa.is_enabled
        ) ORDER BY saa.sequence_order
    ) INTO v_assign
    FROM public.student_activity_assignments saa
    WHERE saa.student_id = in_student_id
      AND saa.session_id = in_session_id;

    IF v_session.current_activity_id IS NOT NULL THEN
        SELECT * INTO v_activity
        FROM public.session_activities
        WHERE id = v_session.current_activity_id;
        IF FOUND THEN
            IF v_assign IS NULL OR EXISTS (
                SELECT 1
                FROM public.student_activity_assignments saa
                WHERE saa.student_id = in_student_id
                  AND saa.session_id = in_session_id
                  AND saa.activity = v_activity.activity
                  AND saa.is_enabled = true
            ) THEN
                v_result := jsonb_build_object(
                    'activity', v_activity.activity,
                    'state', v_activity.state,
                    'sessionActivityId', v_activity.id
                );
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'sessionId', in_session_id,
        'participantId', in_student_id,
        'participantName', v_student.name,
        'sessionStatus',
            CASE
                WHEN v_session.class_state = 'ended' THEN 'ended'
                WHEN v_session.class_state = 'in_activity' AND v_activity.state = 'paused' THEN 'paused'
                WHEN v_session.class_state = 'in_activity' THEN 'active'
                WHEN v_session.class_state = 'between_activities' THEN 'waiting'
                ELSE 'waiting'
            END,
        'classState', v_session.class_state,
        'activityVersion', v_session.activity_version,
        'assignedActivity', v_result,
        'kicked', false,
        'kickedReason', null,
        'updatedAt', to_char(v_session.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
END;
$$;


ALTER FUNCTION "public"."get_student_class_state"("in_student_id" "uuid", "in_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_weekly_summary"("p_child" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  uid uuid := auth.uid();
  result jsonb;
  top_strengths jsonb := '[]'::jsonb;
  needs_support jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;

  -- lios_state may not exist in this environment. Read it via EXECUTE so the
  -- function CREATE doesn't try to validate the reference, and short-circuit
  -- the runtime read with to_regclass when the table is missing.
  if to_regclass('public.lios_state') is not null then
    execute $sql$
      select coalesce(jsonb_agg(jsonb_build_object('skill_key', skill_key, 'mastery', mastery) order by mastery desc), '[]'::jsonb)
      from (
        select skill_key, mastery from lios_state
        where child_profile_id = $1 and mastery >= 0.7
        order by mastery desc limit 3
      ) s
    $sql$ into top_strengths using p_child;

    execute $sql$
      select coalesce(jsonb_agg(jsonb_build_object('skill_key', skill_key, 'mastery', mastery) order by mastery asc), '[]'::jsonb)
      from (
        select skill_key, mastery from lios_state
        where child_profile_id = $1 and mastery < 0.4
        order by mastery asc limit 3
      ) s
    $sql$ into needs_support using p_child;
  end if;

  select jsonb_build_object(
    'window_start', date_trunc('day', now() - interval '7 days'),
    'window_end', now(),
    'sessions', coalesce((
      select count(distinct date_trunc('day', occurred_at))
      from learning_attempts
      where child_profile_id = p_child
        and occurred_at >= now() - interval '7 days'
    ), 0),
    'attempts', coalesce((
      select count(*) from learning_attempts
      where child_profile_id = p_child
        and occurred_at >= now() - interval '7 days'
    ), 0),
    'top_strengths', top_strengths,
    'needs_support', needs_support,
    'recommended_activity_key', (select recommended_activity_key from child_learning_state where child_profile_id = p_child)
  ) into result;

  return result;
end;
$_$;


ALTER FUNCTION "public"."get_weekly_summary"("p_child" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_parent_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Only create a parent_profiles row for users that look like parents.
  -- We use raw_user_meta_data.role = 'parent' so the existing teacher /
  -- admin OAuth flows (which don't set that) are untouched.
  -- If raw_user_meta_data is absent we still create the row — most parents
  -- will sign up via email+password through our own form, which always sets
  -- it. Teachers signing in via Google OAuth on /class never hit this
  -- branch because that flow does not call this trigger path.
  insert into parent_profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email,''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_parent_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_parent_user"() IS 'Provisions parent_profiles only for normalised role=parent. Never writes privileged columns. Hardened in 0017.';



CREATE OR REPLACE FUNCTION "public"."handle_new_teacher_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if (new.raw_user_meta_data ->> 'role') = 'teacher' then
    insert into public.teacher_profiles (auth_user_id, full_name, school_name)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', null),
      coalesce(new.raw_user_meta_data ->> 'school_name', null)
    )
    on conflict (auth_user_id) do nothing;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_teacher_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare claimed_role text := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', '')));
begin
  if claimed_role = 'teacher' then
    insert into public.teachers (id, email, name, avatar_url, is_admin)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
      coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', ''),
      false
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Provisions teachers only for normalised role=teacher, is_admin forced false. Never elevates via metadata. Hardened in 0017.';



CREATE OR REPLACE FUNCTION "public"."has_parent_role"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (select 1 from parent_profiles p where p.id = auth.uid());
$$;


ALTER FUNCTION "public"."has_parent_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_teacher_role"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (select 1 from teacher_profiles t where t.auth_user_id = auth.uid());
$$;


ALTER FUNCTION "public"."has_teacher_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_teacher_trial"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.tier IS NULL OR NEW.tier = 'free' THEN
    NEW.tier := 'trial';
    NEW.trial_started_at := NOW();
    NEW.trial_expires_at := NOW() + INTERVAL '5 days';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_teacher_trial"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"("check_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    coalesce((select is_admin from teachers where id = check_user_id), false)
    or exists (select 1 from platform_admins pa where pa.user_id = check_user_id);
$$;


ALTER FUNCTION "public"."is_admin_user"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select public.is_admin_user(auth.uid());
$$;


ALTER FUNCTION "public"."is_platform_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_school_admin"("in_tenant" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    public.is_admin_user(auth.uid())
    or exists (
      select 1 from tenant_members m
      where m.tenant_id = in_tenant
        and m.user_id = auth.uid()
        and m.member_role in ('owner','school_admin')
    );
$$;


ALTER FUNCTION "public"."is_school_admin"("in_tenant" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_school_admin"("in_tenant" "uuid") IS 'True if current user owns/administers the given school tenant, or is a platform_admin (0019).';



CREATE OR REPLACE FUNCTION "public"."landing_public_proof"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
WITH
    win AS (
        SELECT * FROM public.analytics_events
        WHERE occurred_at > now() - interval '90 days'
    ),
    tracker AS (
        SELECT
            count(*) FILTER (WHERE event_name = 'tracker_init_succeeded')                                     AS ok,
            count(*) FILTER (WHERE event_name IN ('tracker_init_succeeded','tracker_init_failed'))            AS total
        FROM win
    ),
    mastered AS (
        -- "Mastered" = items where at least one device hit ≥5 attempts and ≥80% accuracy
        WITH per_device_item AS (
            SELECT game_mode, item_key, device_id,
                count(*) AS attempts,
                avg(CASE WHEN was_correct THEN 1 ELSE 0 END)::numeric * 100 AS acc_pct
            FROM public.learning_attempts
            WHERE occurred_at > now() - interval '90 days'
            GROUP BY game_mode, item_key, device_id
        )
        SELECT count(DISTINCT (game_mode, item_key)) AS items
        FROM per_device_item
        WHERE attempts >= 5 AND acc_pct >= 80
    ),
    touched AS (
        SELECT count(DISTINCT (game_mode, item_key)) AS items
        FROM public.learning_attempts
        WHERE occurred_at > now() - interval '90 days'
    )
SELECT jsonb_build_object(
    'as_of', now(),
    'distinct_devices_90d',  (SELECT count(distinct device_id) FROM win WHERE device_id IS NOT NULL),
    'activities_completed',  (SELECT count(*)                  FROM win WHERE event_name = 'mode_completed'),
    'mode_plays',            (SELECT count(*)                  FROM win WHERE event_name = 'mode_started'),
    'tracker_success_pct',   CASE WHEN (SELECT total FROM tracker) > 0
                                  THEN round(100.0 * (SELECT ok FROM tracker) / (SELECT total FROM tracker), 1)
                                  ELSE 0 END,
    'items_touched',         (SELECT items FROM touched),
    'items_mastered',        (SELECT items FROM mastered)
);
$$;


ALTER FUNCTION "public"."landing_public_proof"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."learning_attempts_promote_meta"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
BEGIN
  BEGIN
    IF NEW.attempt_id IS NULL AND (NEW.meta ? 'attempt_id')
       AND (NEW.meta->>'attempt_id') ~ '^[0-9a-f-]{36}$' THEN
      NEW.attempt_id := (NEW.meta->>'attempt_id')::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."learning_attempts_promote_meta"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lios_detect_anomalies_v1"() RETURNS TABLE("detected" bigint, "by_metric" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_curr numeric; v_mean numeric; v_sd numeric; v_z numeric;
    v_sev text; v_context jsonb; v_reason text;
    v_detected bigint := 0; v_by jsonb := '{}'::jsonb;

    -- Helper: only insert if no row for this metric in the same hour
    PROCEDURE_INLINE constant boolean := true;
BEGIN
    -- A. event_rate_per_hour
    WITH baseline AS (
        SELECT count(*)::numeric / 168.0 AS expected_per_hour,
               stddev_samp(c)::numeric AS sd
        FROM (
            SELECT date_trunc('hour', occurred_at) AS h, count(*) AS c
            FROM analytics_events
            WHERE occurred_at BETWEEN now() - interval '7 days' AND now() - interval '1 hour'
            GROUP BY 1
        ) hourly
    ),
    current_hour AS (
        SELECT count(*)::numeric AS c FROM analytics_events WHERE occurred_at > now() - interval '1 hour'
    )
    SELECT current_hour.c, baseline.expected_per_hour, baseline.sd
    INTO v_curr, v_mean, v_sd FROM current_hour, baseline;

    IF v_mean IS NOT NULL AND v_sd IS NOT NULL AND v_sd > 0 THEN
        v_z := (v_curr - v_mean) / v_sd;
        IF abs(v_z) > 3.0 AND NOT EXISTS (
            SELECT 1 FROM lios_anomaly_fact
            WHERE metric = 'event_rate_per_hour'
              AND detected_at > date_trunc('hour', now())
        ) THEN
            v_sev := CASE WHEN abs(v_z) > 5.0 THEN 'critical' WHEN abs(v_z) > 3.5 THEN 'warn' ELSE 'info' END;
            v_context := jsonb_build_object('hours_observed_baseline', 168, 'direction', CASE WHEN v_z > 0 THEN 'spike' ELSE 'drop' END);
            v_reason := format('Event rate this hour %s is %s sd from the 7-day baseline mean %s (sd=%s).',
                round(v_curr, 0), round(v_z, 2), round(v_mean, 0), round(v_sd, 0));
            INSERT INTO lios_anomaly_fact (metric, severity, current_value, baseline_mean, baseline_sd, z_score, context, reason)
            VALUES ('event_rate_per_hour', v_sev, v_curr, v_mean, v_sd, v_z, v_context, v_reason);
            v_detected := v_detected + 1;
        END IF;
    END IF;

    -- B. trust_tier_a_pct_24h
    WITH baseline AS (
        SELECT avg(tier_a_pct)::numeric AS mean, stddev_samp(tier_a_pct)::numeric AS sd
        FROM (
            SELECT date_trunc('day', occurred_at) AS d,
                   100.0 * count(*) FILTER (WHERE credibility_tier='A') / nullif(count(*),0)::numeric AS tier_a_pct
            FROM learning_attempts
            WHERE credibility_tier IS NOT NULL
              AND occurred_at BETWEEN now() - interval '8 days' AND now() - interval '1 day'
            GROUP BY 1
        ) daily
    ),
    current_day AS (
        SELECT 100.0 * count(*) FILTER (WHERE credibility_tier='A') / nullif(count(*),0)::numeric AS pct
        FROM learning_attempts
        WHERE credibility_tier IS NOT NULL AND occurred_at > now() - interval '24 hours'
    )
    SELECT current_day.pct, baseline.mean, baseline.sd INTO v_curr, v_mean, v_sd FROM current_day, baseline;

    IF v_curr IS NOT NULL AND v_mean IS NOT NULL AND v_sd IS NOT NULL AND v_sd > 0 THEN
        v_z := (v_curr - v_mean) / v_sd;
        IF v_z < -2.5 AND NOT EXISTS (
            SELECT 1 FROM lios_anomaly_fact
            WHERE metric = 'trust_tier_a_pct_24h'
              AND detected_at > date_trunc('hour', now())
        ) THEN
            v_sev := CASE WHEN v_z < -4.0 THEN 'critical' WHEN v_z < -3.0 THEN 'warn' ELSE 'info' END;
            v_context := jsonb_build_object('direction', 'drop');
            v_reason := format('Tier-A %% in last 24h is %s, %s sd below the 7-day mean %s.', round(v_curr, 1), round(v_z, 2), round(v_mean, 1));
            INSERT INTO lios_anomaly_fact (metric, severity, current_value, baseline_mean, baseline_sd, z_score, context, reason)
            VALUES ('trust_tier_a_pct_24h', v_sev, v_curr, v_mean, v_sd, v_z, v_context, v_reason);
            v_detected := v_detected + 1;
        END IF;
    END IF;

    -- C. cron_pipeline_duration_ms
    WITH baseline AS (
        SELECT avg(duration_ms)::numeric AS mean, stddev_samp(duration_ms)::numeric AS sd
        FROM lios_pipeline_runs WHERE run_at BETWEEN now() - interval '8 days' AND now() - interval '30 minutes'
    ),
    recent AS (
        SELECT avg(duration_ms)::numeric AS m FROM (SELECT duration_ms FROM lios_pipeline_runs ORDER BY run_at DESC LIMIT 6) r
    )
    SELECT recent.m, baseline.mean, baseline.sd INTO v_curr, v_mean, v_sd FROM recent, baseline;

    IF v_curr IS NOT NULL AND v_mean IS NOT NULL AND v_sd IS NOT NULL AND v_sd > 0 THEN
        v_z := (v_curr - v_mean) / v_sd;
        IF v_z > 3.0 AND NOT EXISTS (
            SELECT 1 FROM lios_anomaly_fact
            WHERE metric = 'cron_pipeline_duration_ms'
              AND detected_at > date_trunc('hour', now())
        ) THEN
            v_sev := CASE WHEN v_z > 5.0 THEN 'critical' ELSE 'warn' END;
            v_context := jsonb_build_object('direction', 'slower');
            v_reason := format('Cron pipeline recent-avg duration %s ms is %s sd above 7-day mean %s ms.', round(v_curr, 0), round(v_z, 2), round(v_mean, 0));
            INSERT INTO lios_anomaly_fact (metric, severity, current_value, baseline_mean, baseline_sd, z_score, context, reason)
            VALUES ('cron_pipeline_duration_ms', v_sev, v_curr, v_mean, v_sd, v_z, v_context, v_reason);
            v_detected := v_detected + 1;
        END IF;
    END IF;

    -- D. pipeline_failure_rate_24h
    SELECT 100.0 * count(*) FILTER (WHERE error_message IS NOT NULL) / nullif(count(*),0)::numeric
    INTO v_curr FROM lios_pipeline_runs WHERE run_at > now() - interval '24 hours';

    IF v_curr IS NOT NULL AND v_curr > 1.0 AND NOT EXISTS (
        SELECT 1 FROM lios_anomaly_fact
        WHERE metric = 'pipeline_failure_rate_24h'
          AND detected_at > date_trunc('hour', now())
    ) THEN
        v_sev := CASE WHEN v_curr > 10.0 THEN 'critical' WHEN v_curr > 3.0 THEN 'warn' ELSE 'info' END;
        v_reason := format('Cron pipeline failure rate over last 24h is %s%%.', round(v_curr, 2));
        INSERT INTO lios_anomaly_fact (metric, severity, current_value, context, reason)
        VALUES ('pipeline_failure_rate_24h', v_sev, v_curr, jsonb_build_object('threshold_pct', 1.0), v_reason);
        v_detected := v_detected + 1;
    END IF;

    SELECT jsonb_object_agg(metric, n) INTO v_by
    FROM (SELECT metric, count(*)::int AS n FROM lios_anomaly_fact WHERE detected_at > now() - interval '5 minutes' GROUP BY metric) z;

    RETURN QUERY SELECT v_detected, COALESCE(v_by, '{}'::jsonb);
END;
$$;


ALTER FUNCTION "public"."lios_detect_anomalies_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lios_detect_friction_v1"("p_lookback" interval DEFAULT '24:00:00'::interval) RETURNS TABLE("sessions_processed" bigint, "detectors_fired" bigint, "by_detector" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_sessions bigint := 0;
    v_fires    bigint := 0;
    v_by_det   jsonb;
BEGIN
    WITH session_stats AS (
        SELECT
            a.session_id,
            a.game_mode,
            min(a.occurred_at) AS first_at,
            count(*)                                         AS n_attempts,
            avg(a.was_correct::int)::numeric(4,3)            AS accuracy,
            avg(a.credibility_score)::numeric(4,3)           AS mean_cred,
            (SELECT count(*) FROM analytics_events e
             WHERE e.session_id = a.session_id
               AND e.event_name = 'stuck_detected')          AS n_stuck,
            (SELECT count(*) FROM analytics_events e
             WHERE e.session_id = a.session_id
               AND e.event_name = 'tab_hidden')              AS n_tab_hidden,
            (SELECT count(*) FROM analytics_events e
             WHERE e.session_id = a.session_id
               AND e.event_name = 'mode_completed') > 0      AS reached_completion,
            (SELECT count(*) FROM analytics_events e
             WHERE e.session_id = a.session_id
               AND e.event_name = 'mode_abandoned') > 0      AS abandoned,
            (array_agg(a.device_id) FILTER (WHERE a.device_id IS NOT NULL))[1] AS device_id,
            (array_agg(a.age_band)  FILTER (WHERE a.age_band  IS NOT NULL))[1] AS age_band,
            (array_agg(a.context)   FILTER (WHERE a.context   IS NOT NULL))[1] AS context
        FROM learning_attempts a
        WHERE a.occurred_at > now() - p_lookback
        GROUP BY a.session_id, a.game_mode
        HAVING count(*) >= 4
    ),
    fires AS (
        SELECT
            s.session_id, s.game_mode, s.first_at,
            s.device_id, s.age_band, s.context,
            d.detector_name, d.matched,
            s.n_attempts, s.accuracy, s.mean_cred, s.n_stuck,
            s.reached_completion, s.abandoned
        FROM session_stats s
        CROSS JOIN LATERAL (
            VALUES
                ('friction_successful_learning_detected',
                    s.accuracy BETWEEN 0.65 AND 0.90 AND s.n_attempts >= 6
                    AND s.n_stuck <= 2 AND s.mean_cred >= 0.85 AND s.reached_completion),
                ('friction_productive_struggle_detected',
                    s.accuracy BETWEEN 0.50 AND 0.65 AND s.n_attempts >= 6
                    AND s.mean_cred >= 0.70 AND s.reached_completion),
                ('friction_cognitive_overload_detected',
                    s.accuracy < 0.50 AND s.n_stuck >= 3 AND s.n_attempts >= 4),
                ('friction_decision_fatigue_detected',
                    s.n_stuck >= 5 AND s.n_attempts >= 8
                    AND s.accuracy BETWEEN 0.40 AND 0.80),
                ('friction_attention_collapse_detected',
                    NOT s.reached_completion AND s.n_stuck >= 3 AND s.n_attempts < 8),
                ('friction_over_challenge_detected',
                    s.accuracy < 0.40 AND s.n_attempts >= 4),
                ('friction_boredom_detected',
                    s.accuracy > 0.95 AND s.n_attempts >= 8),
                ('friction_distraction_detected',
                    s.mean_cred < 0.85 AND s.n_attempts >= 4)
        ) AS d(detector_name, matched)
        WHERE d.matched
    ),
    inserted AS (
        INSERT INTO analytics_events (
            session_id, event_name, occurred_at,
            game_mode, device_id, age_band, context,
            event_uid, client_seq, client_ts,
            build_version, meta
        )
        SELECT
            f.session_id,
            f.detector_name,
            f.first_at + interval '1 second',
            f.game_mode,
            f.device_id,
            f.age_band,
            COALESCE(f.context, 'unknown'),
            md5(f.session_id::text || '|' || f.detector_name || '|v1')::uuid,
            NULL, NULL,
            'lios-friction-v1',
            jsonb_build_object(
                'detector_version', 'v1',
                'detector_name',    replace(f.detector_name, 'friction_', ''),
                'n_attempts',       f.n_attempts,
                'accuracy',         f.accuracy,
                'mean_credibility', f.mean_cred,
                'n_stuck',          f.n_stuck,
                'reached_completion', f.reached_completion,
                'abandoned',        f.abandoned
            )
        FROM fires f
        ON CONFLICT (event_uid) DO NOTHING
        RETURNING event_name
    )
    SELECT
        (SELECT count(DISTINCT session_id) FROM session_stats),
        (SELECT count(*) FROM inserted),
        (SELECT jsonb_object_agg(event_name, n)
         FROM (SELECT event_name, count(*) AS n FROM inserted GROUP BY event_name) g)
    INTO v_sessions, v_fires, v_by_det;

    RETURN QUERY SELECT v_sessions, v_fires, COALESCE(v_by_det, '{}'::jsonb);
END;
$$;


ALTER FUNCTION "public"."lios_detect_friction_v1"("p_lookback" interval) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."lios_detect_friction_v1"("p_lookback" interval) IS 'LIOS Cognitive Friction Detectors v1 — 8 rule-based detectors over learning_attempts + analytics_events.';



CREATE OR REPLACE FUNCTION "public"."lios_detect_mastery_episodes_v1"("p_lookback" interval DEFAULT NULL::interval) RETURNS TABLE("pairs_processed" bigint, "transitions_emitted" bigint, "by_to_state" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_pairs    bigint := 0;
    v_emitted  bigint := 0;
    v_by_state jsonb;
BEGIN
    WITH current_state AS (
        SELECT
            s.device_id, s.item_key, s.game_mode, s.age_band,
            s.theta, s.n_attempts, s.n_credible_attempts,
            i.b,
            (SELECT avg(was_correct::int)
             FROM (SELECT was_correct FROM learning_attempts
                   WHERE device_id=s.device_id AND item_key=s.item_key
                     AND game_mode=s.game_mode AND credibility_score >= 0.4
                   ORDER BY occurred_at DESC LIMIT 6) x) AS last6_acc,
            (SELECT avg(was_correct::int)
             FROM (SELECT was_correct FROM learning_attempts
                   WHERE device_id=s.device_id AND item_key=s.item_key
                     AND game_mode=s.game_mode
                   ORDER BY occurred_at DESC LIMIT 5) x) AS last5_acc,
            (SELECT count(DISTINCT session_id) FROM learning_attempts
             WHERE device_id=s.device_id AND item_key=s.item_key AND game_mode=s.game_mode) AS distinct_sessions,
            (SELECT EXTRACT(EPOCH FROM (now() - min(occurred_at)))/86400 FROM learning_attempts
             WHERE device_id=s.device_id AND item_key=s.item_key AND game_mode=s.game_mode) AS days_active
        FROM skill_state s
        LEFT JOIN item_difficulty i USING (item_key, game_mode)
        WHERE p_lookback IS NULL
           OR s.last_attempt_at > now() - p_lookback
    ),
    scored AS (
        SELECT cs.*,
            CASE cs.age_band
                WHEN '4-5'   THEN 0.65
                WHEN '6-7'   THEN 0.75
                WHEN '8-9'   THEN 0.80
                WHEN '10-11' THEN 0.80
                WHEN '12+'   THEN 0.85
                ELSE              0.75
            END AS acc_threshold
        FROM current_state cs
    ),
    classified AS (
        SELECT s.*,
            (SELECT to_state FROM mastery_episode_fact m
             WHERE m.device_id=s.device_id AND m.item_key=s.item_key AND m.game_mode=s.game_mode
             ORDER BY m.transition_at DESC LIMIT 1) AS previous_state,
            EXISTS (SELECT 1 FROM mastery_episode_fact m
                    WHERE m.device_id=s.device_id AND m.item_key=s.item_key
                      AND m.game_mode=s.game_mode AND m.to_state='Mastered') AS ever_mastered,
            CASE
                WHEN EXISTS (SELECT 1 FROM mastery_episode_fact m
                             WHERE m.device_id=s.device_id AND m.item_key=s.item_key
                               AND m.game_mode=s.game_mode AND m.to_state='Mastered')
                     AND COALESCE(s.last5_acc, 0) < 0.60 THEN 'Decayed'
                WHEN s.n_credible_attempts >= 6
                     AND COALESCE(s.last6_acc, 0) >= s.acc_threshold
                     AND s.theta > COALESCE(s.b, 0)
                     AND s.distinct_sessions >= 2
                     AND s.days_active >= 1 THEN 'Mastered'
                WHEN s.n_credible_attempts >= 6
                     AND COALESCE(s.last6_acc, 0) >= s.acc_threshold
                     AND s.theta > COALESCE(s.b, 0) THEN 'Acquired'
                ELSE 'Exposed'
            END AS current_state
        FROM scored s
    ),
    transitions AS (
        SELECT * FROM classified
        WHERE current_state IS DISTINCT FROM previous_state
    ),
    inserted AS (
        INSERT INTO mastery_episode_fact
            (device_id, item_key, game_mode, from_state, to_state, transition_at,
             age_band, theta_at_event, b_at_event, evidence)
        SELECT
            t.device_id, t.item_key, t.game_mode,
            t.previous_state, t.current_state, now(),
            t.age_band, t.theta::numeric(6,3), t.b::numeric(6,3),
            jsonb_build_object(
                'n_attempts',          t.n_attempts,
                'n_credible_attempts', t.n_credible_attempts,
                'last6_accuracy',      round(COALESCE(t.last6_acc, 0)::numeric, 3),
                'last5_accuracy',      round(COALESCE(t.last5_acc, 0)::numeric, 3),
                'distinct_sessions',   t.distinct_sessions,
                'days_active',         round(t.days_active::numeric, 2),
                'acc_threshold',       t.acc_threshold,
                'theta_minus_b',       round((t.theta - COALESCE(t.b, 0))::numeric, 3),
                'ever_mastered',       t.ever_mastered
            )
        FROM transitions t
        RETURNING to_state
    )
    SELECT
        (SELECT count(*) FROM classified),
        (SELECT count(*) FROM inserted),
        (SELECT jsonb_object_agg(to_state, n) FROM (SELECT to_state, count(*) AS n FROM inserted GROUP BY to_state) g)
    INTO v_pairs, v_emitted, v_by_state;

    RETURN QUERY SELECT v_pairs, v_emitted, COALESCE(v_by_state, '{}'::jsonb);
END;
$$;


ALTER FUNCTION "public"."lios_detect_mastery_episodes_v1"("p_lookback" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lios_recommend_next"("p_device_id" "text", "p_session_id" "uuid", "p_game_mode" "text", "p_current_item" "text" DEFAULT NULL::"text", "p_was_correct" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_recent             record;
    v_consec_failures    int := 0;
    v_recent_acc_4       numeric;
    v_recent_acc_8       numeric;
    v_n_total            int  := 0;
    v_age_band           text;
    v_context            text;
    v_regime             text := 'productive';
    v_recovery_step      int  := NULL;
    v_prev_recovery_step int  := NULL;
    v_current_b          numeric;
    v_candidate          record;
    v_next_item          text;
    v_scaffold_level     text := 'none';
    v_reward_intensity   text := 'quiet';
    v_suggest_break      boolean := false;
    v_p_expected         numeric;
    v_invariants         text[] := '{}';
    v_audit_id           uuid;
    v_reasoning          text  := '';
    v_inputs             jsonb;
BEGIN
    SELECT
        count(*)                                              AS n_total,
        avg(was_correct::int) FILTER (WHERE rn <= 4)::numeric AS acc4,
        avg(was_correct::int) FILTER (WHERE rn <= 8)::numeric AS acc8,
        max(age_band)                                         AS age_band,
        max(context)                                          AS context
    INTO v_recent
    FROM (
        SELECT was_correct, age_band, context,
               row_number() OVER (ORDER BY occurred_at DESC) AS rn
        FROM learning_attempts
        WHERE session_id = p_session_id AND device_id = p_device_id
          AND game_mode = p_game_mode
          AND COALESCE(credibility_score, 1.0) >= 0.4
        ORDER BY occurred_at DESC LIMIT 8
    ) rh;

    v_n_total      := COALESCE(v_recent.n_total, 0);
    v_recent_acc_4 := v_recent.acc4;
    v_recent_acc_8 := v_recent.acc8;
    v_age_band     := v_recent.age_band;
    v_context      := v_recent.context;

    IF p_current_item IS NOT NULL THEN
        WITH ordered AS (
            SELECT was_correct, row_number() OVER (ORDER BY occurred_at DESC) AS rn
            FROM learning_attempts
            WHERE session_id = p_session_id AND device_id = p_device_id
              AND game_mode = p_game_mode AND item_key = p_current_item
              AND COALESCE(credibility_score, 1.0) >= 0.4
            ORDER BY occurred_at DESC LIMIT 8
        ),
        first_correct AS (SELECT min(rn) AS rn FROM ordered WHERE was_correct)
        SELECT count(*) INTO v_consec_failures
        FROM ordered
        WHERE NOT was_correct
          AND rn < COALESCE((SELECT rn FROM first_correct), 999);
    END IF;

    IF p_current_item IS NOT NULL THEN
        SELECT b INTO v_current_b FROM item_difficulty
        WHERE item_key = p_current_item AND game_mode = p_game_mode;
        v_current_b := COALESCE(v_current_b, 0);
    END IF;

    IF v_n_total < 3 THEN
        v_regime := 'fresh';
        v_reasoning := 'Fresh — fewer than 3 credible attempts so far. ';
    ELSIF v_consec_failures >= 3 THEN
        v_regime := 'frustration';
        v_reasoning := format('Frustration — %s consecutive failures on %L. ', v_consec_failures, p_current_item);
    ELSIF v_recent_acc_8 IS NOT NULL AND v_recent_acc_8 > 0.92
          AND v_recent_acc_4 IS NOT NULL AND v_recent_acc_4 >= 1.0 THEN
        v_regime := 'boredom';
        v_reasoning := format('Boredom — last-8 accuracy %s, last-4 perfect. ', round(v_recent_acc_8, 2));
    ELSIF v_recent_acc_4 IS NOT NULL AND v_recent_acc_4 >= 0.75 AND v_recent_acc_4 <= 0.90 THEN
        v_regime := 'flow';
        v_reasoning := format('Flow — last-4 accuracy %s in desirable band. ', round(v_recent_acc_4, 2));
    ELSE
        v_regime := 'productive';
        v_reasoning := 'Productive practice — standard rules apply. ';
    END IF;

    IF v_regime = 'frustration' THEN
        SELECT recovery_step INTO v_prev_recovery_step
        FROM lios_adaptive_decisions
        WHERE device_id = p_device_id AND game_mode = p_game_mode
          AND current_item = p_current_item AND recovery_step IS NOT NULL
          AND made_at > now() - interval '30 minutes'
        ORDER BY made_at DESC LIMIT 1;
        v_recovery_step := LEAST(5, COALESCE(v_prev_recovery_step, 0) + 1);
        v_reasoning := v_reasoning || format('Recovery step %s of 5. ', v_recovery_step);
    END IF;

    IF v_recovery_step = 1 THEN
        v_next_item := p_current_item;
        v_scaffold_level := 'partial';
        v_reward_intensity := 'standard';
        v_reasoning := v_reasoning || 'Soft scaffold raise on the same item. ';
    ELSIF v_recovery_step = 2 THEN
        SELECT i.item_key, i.b, 1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
        INTO v_candidate FROM item_difficulty i
        LEFT JOIN skill_state s ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
        WHERE i.game_mode = p_game_mode AND i.b < v_current_b - 0.30
        ORDER BY abs(i.b - (v_current_b - 0.50)) ASC LIMIT 1;
        v_next_item := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level := 'full'; v_reward_intensity := 'standard';
        v_p_expected := v_candidate.pexp;
        v_reasoning := v_reasoning || format('Sibling substitution to %L (b=%s). ', v_candidate.item_key, round(COALESCE(v_candidate.b, 0), 2));
    ELSIF v_recovery_step = 3 THEN
        SELECT s.item_key, COALESCE(i.b, 0) AS b, 1.0 / (1.0 + exp(-(s.theta - COALESCE(i.b, 0)))) AS pexp
        INTO v_candidate FROM skill_state s
        LEFT JOIN item_difficulty i USING (item_key, game_mode)
        WHERE s.device_id = p_device_id AND s.game_mode = p_game_mode
          AND EXISTS (SELECT 1 FROM mastery_episode_fact m
                      WHERE m.device_id = p_device_id AND m.item_key = s.item_key
                        AND m.game_mode = s.game_mode AND m.to_state = 'Mastered')
        ORDER BY s.theta DESC NULLS LAST LIMIT 1;
        v_next_item := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level := 'none'; v_reward_intensity := 'big';
        v_p_expected := v_candidate.pexp;
        v_reasoning := v_reasoning || format('Confidence rebuild — surfacing mastered item %L. ', v_candidate.item_key);
    ELSIF v_recovery_step = 4 THEN
        SELECT s.item_key, COALESCE(i.b, 0) AS b, 1.0 / (1.0 + exp(-(s.theta - COALESCE(i.b, 0)))) AS pexp
        INTO v_candidate FROM skill_state s
        LEFT JOIN item_difficulty i USING (item_key, game_mode)
        WHERE s.device_id = p_device_id AND s.game_mode = p_game_mode
          AND s.item_key <> COALESCE(p_current_item, '') AND s.theta > 0
        ORDER BY s.theta DESC LIMIT 1;
        v_next_item := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level := 'partial'; v_reward_intensity := 'standard';
        v_p_expected := v_candidate.pexp;
        v_reasoning := v_reasoning || format('Activity rotation to %L. ', v_candidate.item_key);
    ELSIF v_recovery_step = 5 THEN
        v_next_item := NULL; v_scaffold_level := 'none';
        v_reward_intensity := 'standard'; v_suggest_break := true;
        v_reasoning := v_reasoning || 'Graceful exit — suggest "let''s stop here for now". ';
    ELSIF v_regime = 'boredom' THEN
        SELECT i.item_key, i.b, 1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
        INTO v_candidate FROM item_difficulty i
        LEFT JOIN skill_state s ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
        WHERE i.game_mode = p_game_mode AND i.b > COALESCE(v_current_b, 0) + 0.30
        ORDER BY abs(i.b - (COALESCE(v_current_b, 0) + 0.50)) ASC LIMIT 1;
        v_next_item := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level := 'none'; v_reward_intensity := 'quiet';
        v_p_expected := v_candidate.pexp;
        v_reasoning := v_reasoning || format('Pushing difficulty up to %L (b=%s). ', v_candidate.item_key, round(COALESCE(v_candidate.b, 0), 2));
    ELSIF v_regime = 'flow' THEN
        v_next_item := p_current_item; v_scaffold_level := 'none';
        v_reward_intensity := 'quiet';
        v_reasoning := v_reasoning || 'Protect flow — keep same item. ';
    ELSE
        SELECT i.item_key, i.b, 1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
        INTO v_candidate FROM item_difficulty i
        LEFT JOIN skill_state s ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
        WHERE i.game_mode = p_game_mode
        ORDER BY abs((1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b)))) - 0.78) ASC LIMIT 1;
        v_next_item := COALESCE(v_candidate.item_key, p_current_item);
        v_scaffold_level := CASE WHEN v_regime = 'fresh' THEN 'partial' ELSE 'none' END;
        v_reward_intensity := 'quiet';
        v_p_expected := v_candidate.pexp;
        v_reasoning := v_reasoning || format('Desirable-difficulty target — selected %L (P=%s). ', v_candidate.item_key, round(COALESCE(v_candidate.pexp, 0), 2));
    END IF;

    IF v_next_item IS NOT NULL THEN
        DECLARE v_streak int;
        BEGIN
            SELECT count(*) INTO v_streak FROM (
                SELECT item_key, row_number() OVER (ORDER BY occurred_at DESC) AS rn
                FROM learning_attempts
                WHERE session_id = p_session_id AND device_id = p_device_id AND game_mode = p_game_mode
                ORDER BY occurred_at DESC LIMIT 4
            ) r WHERE item_key = v_next_item;
            IF v_streak >= 3 THEN
                v_invariants := array_append(v_invariants, 'rotate_same_item_3x');
                SELECT i.item_key, 1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
                INTO v_candidate FROM item_difficulty i
                LEFT JOIN skill_state s ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
                WHERE i.game_mode = p_game_mode AND i.item_key <> v_next_item
                ORDER BY abs((1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b)))) - 0.78) ASC LIMIT 1;
                v_next_item := v_candidate.item_key;
                v_p_expected := v_candidate.pexp;
                v_reasoning := v_reasoning || '[INV: rotated due to 3x streak] ';
            END IF;
        END;
    END IF;

    IF v_regime = 'frustration' AND v_recovery_step IS NULL AND COALESCE(v_p_expected, 1.0) < 0.5 THEN
        v_invariants := array_append(v_invariants, 'avoid_p_lt_0p5_in_frustration');
        SELECT i.item_key, 1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b))) AS pexp
        INTO v_candidate FROM item_difficulty i
        LEFT JOIN skill_state s ON s.device_id = p_device_id AND s.game_mode = p_game_mode AND s.item_key = i.item_key
        WHERE i.game_mode = p_game_mode
          AND (1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b)))) >= 0.6
        ORDER BY abs((1.0 / (1.0 + exp(-(COALESCE(s.theta, 0) - i.b)))) - 0.7) ASC LIMIT 1;
        v_next_item := COALESCE(v_candidate.item_key, v_next_item);
        v_p_expected := v_candidate.pexp;
        v_reasoning := v_reasoning || '[INV: swapped to easier item] ';
    END IF;

    IF EXISTS (SELECT 1 FROM mastery_episode_fact
               WHERE device_id = p_device_id AND to_state = 'Mastered'
                 AND transition_at > now() - interval '60 seconds') THEN
        v_invariants := array_append(v_invariants, 'celebrate_recent_mastery');
        v_reward_intensity := 'big';
        v_reasoning := v_reasoning || '[INV: just-mastered → big celebration] ';
    END IF;

    v_inputs := jsonb_build_object(
        'n_recent_attempts',  v_n_total,
        'consec_failures',    v_consec_failures,
        'recent_acc_4',       round(COALESCE(v_recent_acc_4, 0)::numeric, 3),
        'recent_acc_8',       round(COALESCE(v_recent_acc_8, 0)::numeric, 3),
        'current_item',       p_current_item,
        'current_item_b',     round(COALESCE(v_current_b, 0)::numeric, 3),
        'was_correct',        p_was_correct,
        'prev_recovery_step', v_prev_recovery_step
    );

    INSERT INTO lios_adaptive_decisions (
        device_id, session_id, game_mode, age_band, context,
        current_item, next_item, scaffold_level, reward_intensity, suggest_break,
        regime, recovery_step, p_expected, invariants_applied, inputs, reasoning
    ) VALUES (
        p_device_id, p_session_id, p_game_mode, v_age_band, v_context,
        p_current_item, v_next_item, v_scaffold_level, v_reward_intensity, v_suggest_break,
        v_regime, v_recovery_step,
        CASE WHEN v_p_expected IS NULL THEN NULL ELSE round(v_p_expected::numeric, 3) END,
        v_invariants, v_inputs, trim(v_reasoning)
    ) RETURNING id INTO v_audit_id;

    RETURN jsonb_build_object(
        'audit_id',           v_audit_id,
        'next_item',          v_next_item,
        'scaffold_level',     v_scaffold_level,
        'reward_intensity',   v_reward_intensity,
        'suggest_break',      v_suggest_break,
        'regime',             v_regime,
        'recovery_step',      v_recovery_step,
        'p_expected',         CASE WHEN v_p_expected IS NULL THEN NULL ELSE round(v_p_expected::numeric, 3) END,
        'invariants_applied', v_invariants,
        'reasoning',          trim(v_reasoning)
    );
END;
$$;


ALTER FUNCTION "public"."lios_recommend_next"("p_device_id" "text", "p_session_id" "uuid", "p_game_mode" "text", "p_current_item" "text", "p_was_correct" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lios_record_observation"("p_device_id" "text", "p_focus_tags" "text"[] DEFAULT '{}'::"text"[], "p_affect_tags" "text"[] DEFAULT '{}'::"text"[], "p_independence_tags" "text"[] DEFAULT '{}'::"text"[], "p_social_tags" "text"[] DEFAULT '{}'::"text"[], "p_notable_tags" "text"[] DEFAULT '{}'::"text"[], "p_session_id" "uuid" DEFAULT NULL::"uuid", "p_classroom_code" "text" DEFAULT NULL::"text", "p_age_band" "text" DEFAULT NULL::"text", "p_note" "text" DEFAULT NULL::"text", "p_observer_role" "text" DEFAULT 'teacher'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_id uuid;
    v_recorder text;
BEGIN
    v_recorder := COALESCE(
        nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email',
        nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub',
        NULL
    );
    INSERT INTO human_observation_fact (
        device_id, session_id, classroom_code, age_band,
        focus_tags, affect_tags, independence_tags, social_tags, notable_tags,
        note, observer_role, recorded_by
    ) VALUES (
        p_device_id, p_session_id, p_classroom_code, p_age_band,
        COALESCE(p_focus_tags, '{}'),
        COALESCE(p_affect_tags, '{}'),
        COALESCE(p_independence_tags, '{}'),
        COALESCE(p_social_tags, '{}'),
        COALESCE(p_notable_tags, '{}'),
        p_note, p_observer_role, v_recorder
    ) RETURNING id INTO v_id;
    RETURN jsonb_build_object('id', v_id, 'recorded_at', now(), 'recorded_by', v_recorder);
END;
$$;


ALTER FUNCTION "public"."lios_record_observation"("p_device_id" "text", "p_focus_tags" "text"[], "p_affect_tags" "text"[], "p_independence_tags" "text"[], "p_social_tags" "text"[], "p_notable_tags" "text"[], "p_session_id" "uuid", "p_classroom_code" "text", "p_age_band" "text", "p_note" "text", "p_observer_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lios_run_pipeline"("p_lookback" interval DEFAULT '00:15:00'::interval) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_started_at timestamptz := clock_timestamp();
    v_run_id     bigint;
    v_trust_scored bigint; v_trust_tier_a bigint; v_trust_tier_b bigint; v_trust_tier_c bigint;
    v_elo_processed bigint; v_elo_learners bigint; v_elo_items bigint;
    v_mastery_pairs bigint; v_mastery_transitions bigint; v_mastery_by_state jsonb;
    v_friction_sessions bigint; v_friction_fires bigint; v_friction_by_detector jsonb;
    v_anomaly_detected bigint; v_anomaly_by_metric jsonb;
    v_error_message text := NULL; v_duration_ms int;
BEGIN
    BEGIN
        SELECT scored_rows, tier_a, tier_b, tier_c
        INTO v_trust_scored, v_trust_tier_a, v_trust_tier_b, v_trust_tier_c
        FROM public.lios_score_unscored_attempts(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') || 'trust=' || SQLERRM || '; ';
    END;
    BEGIN
        SELECT processed_attempts, distinct_learners, distinct_items
        INTO v_elo_processed, v_elo_learners, v_elo_items
        FROM public.lios_update_elo_v1(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') || 'elo=' || SQLERRM || '; ';
    END;
    BEGIN
        SELECT pairs_processed, transitions_emitted, by_to_state
        INTO v_mastery_pairs, v_mastery_transitions, v_mastery_by_state
        FROM public.lios_detect_mastery_episodes_v1(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') || 'mastery=' || SQLERRM || '; ';
    END;
    BEGIN
        SELECT sessions_processed, detectors_fired, by_detector
        INTO v_friction_sessions, v_friction_fires, v_friction_by_detector
        FROM public.lios_detect_friction_v1(p_lookback);
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') || 'friction=' || SQLERRM || '; ';
    END;
    -- NEW: anomaly detection
    BEGIN
        SELECT detected, by_metric
        INTO v_anomaly_detected, v_anomaly_by_metric
        FROM public.lios_detect_anomalies_v1();
    EXCEPTION WHEN OTHERS THEN
        v_error_message := COALESCE(v_error_message, '') || 'anomaly=' || SQLERRM || '; ';
    END;

    v_duration_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started_at))::int +
                     EXTRACT(SECOND      FROM (clock_timestamp() - v_started_at))::int * 1000;

    INSERT INTO lios_pipeline_runs (
        run_at, duration_ms,
        trust_scored, trust_tier_a, trust_tier_b, trust_tier_c,
        elo_processed, elo_distinct_learners, elo_distinct_items,
        mastery_pairs, mastery_transitions, mastery_by_state,
        friction_sessions, friction_detectors_fired, friction_by_detector,
        anomaly_detected, anomaly_by_metric,
        error_message
    ) VALUES (
        v_started_at, v_duration_ms,
        v_trust_scored, v_trust_tier_a, v_trust_tier_b, v_trust_tier_c,
        v_elo_processed, v_elo_learners, v_elo_items,
        v_mastery_pairs, v_mastery_transitions, v_mastery_by_state,
        v_friction_sessions, v_friction_fires, v_friction_by_detector,
        v_anomaly_detected, v_anomaly_by_metric,
        v_error_message
    ) RETURNING id INTO v_run_id;

    RETURN jsonb_build_object(
        'run_id', v_run_id, 'ok', v_error_message IS NULL,
        'started', v_started_at, 'duration_ms', v_duration_ms,
        'trust',    jsonb_build_object('scored', v_trust_scored, 'tier_a', v_trust_tier_a, 'tier_b', v_trust_tier_b, 'tier_c', v_trust_tier_c),
        'elo',      jsonb_build_object('processed', v_elo_processed, 'distinct_learners', v_elo_learners, 'distinct_items', v_elo_items),
        'mastery',  jsonb_build_object('pairs_processed', v_mastery_pairs, 'transitions_emitted', v_mastery_transitions, 'by_state', v_mastery_by_state),
        'friction', jsonb_build_object('sessions_processed', v_friction_sessions, 'detectors_fired', v_friction_fires, 'by_detector', v_friction_by_detector),
        'anomaly',  jsonb_build_object('detected', v_anomaly_detected, 'by_metric', v_anomaly_by_metric),
        'error', v_error_message
    );
END;
$$;


ALTER FUNCTION "public"."lios_run_pipeline"("p_lookback" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lios_score_unscored_attempts"("p_lookback" interval DEFAULT '24:00:00'::interval) RETURNS TABLE("scored_rows" bigint, "tier_a" bigint, "tier_b" bigint, "tier_c" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_scored bigint;
    v_a      bigint;
    v_b      bigint;
    v_c      bigint;
BEGIN
    WITH scoring AS (
        SELECT
            a.id,
            a.age_band,
            a.ms_to_attempt,
            a.session_id,
            a.occurred_at,
            EXISTS (
                SELECT 1 FROM analytics_events e
                WHERE e.session_id = a.session_id
                  AND e.event_name = 'tab_hidden'
                  AND e.occurred_at BETWEEN a.occurred_at - interval '10 seconds' AND a.occurred_at
            ) AS tab_hidden_recent,
            EXISTS (
                SELECT 1 FROM analytics_events e
                WHERE e.session_id = a.session_id
                  AND e.event_name = 'stuck_detected'
                  AND e.occurred_at BETWEEN a.occurred_at - interval '60 seconds' AND a.occurred_at
            ) AS stuck_recent,
            EXISTS (
                SELECT 1 FROM analytics_events e
                WHERE e.session_id = a.session_id
                  AND e.event_name = 'two_hands_detected'
                  AND e.occurred_at <= a.occurred_at
            ) AS two_hands_seen
        FROM learning_attempts a
        WHERE a.credibility_score IS NULL
          AND a.occurred_at > now() - p_lookback
    ),
    computed AS (
        SELECT
            s.id,
            CASE
                WHEN s.ms_to_attempt IS NULL THEN -0.10
                WHEN s.ms_to_attempt < 300  THEN -0.30
                WHEN s.ms_to_attempt > CASE s.age_band
                    WHEN '4-5'   THEN 12000
                    WHEN '6-7'   THEN 10000
                    WHEN '8-9'   THEN 15000
                    WHEN '10-11' THEN 15000
                    WHEN '12+'   THEN  8000
                    ELSE              12000
                END                       THEN -0.20
                ELSE 0
            END AS p1_timing,
            CASE WHEN s.tab_hidden_recent THEN -0.30 ELSE 0 END AS p2_tab,
            CASE WHEN s.stuck_recent      THEN -0.10 ELSE 0 END AS p3_stuck,
            CASE WHEN s.two_hands_seen    THEN -0.20 ELSE 0 END AS p4_hands,
            array_remove(ARRAY[
                CASE WHEN s.ms_to_attempt IS NULL              THEN 'timing_missing'              END,
                CASE WHEN s.ms_to_attempt < 300                THEN 'timing_reflex_floor'         END,
                CASE WHEN s.ms_to_attempt > CASE s.age_band
                    WHEN '4-5'   THEN 12000 WHEN '6-7'  THEN 10000
                    WHEN '8-9'   THEN 15000 WHEN '10-11' THEN 15000
                    WHEN '12+'   THEN  8000 ELSE          12000 END
                                                               THEN 'timing_distraction'         END,
                CASE WHEN s.tab_hidden_recent                  THEN 'tab_hidden_during_window'   END,
                CASE WHEN s.stuck_recent                       THEN 'stuck_recent'               END,
                CASE WHEN s.two_hands_seen                     THEN 'two_hands_session'          END
            ], NULL) AS reasons
        FROM scoring s
    ),
    finalised AS (
        SELECT
            id,
            GREATEST(0::numeric, LEAST(1::numeric, 1.0 + p1_timing + p2_tab + p3_stuck + p4_hands))::numeric(3, 2) AS score,
            reasons
        FROM computed
    )
    UPDATE learning_attempts la
    SET credibility_score    = f.score,
        credibility_tier     = CASE WHEN f.score >= 0.80 THEN 'A' WHEN f.score >= 0.40 THEN 'B' ELSE 'C' END,
        credibility_reasons  = to_jsonb(f.reasons),
        credibility_scored_at = now()
    FROM finalised f
    WHERE la.id = f.id;

    GET DIAGNOSTICS v_scored = ROW_COUNT;

    SELECT
        count(*) FILTER (WHERE credibility_tier = 'A'),
        count(*) FILTER (WHERE credibility_tier = 'B'),
        count(*) FILTER (WHERE credibility_tier = 'C')
    INTO v_a, v_b, v_c
    FROM learning_attempts
    WHERE credibility_scored_at > now() - interval '1 minute';

    RETURN QUERY SELECT v_scored, v_a, v_b, v_c;
END;
$$;


ALTER FUNCTION "public"."lios_score_unscored_attempts"("p_lookback" interval) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."lios_score_unscored_attempts"("p_lookback" interval) IS 'LIOS Trust v1 batch scorer. Idempotent — only scores rows where credibility_score IS NULL.';



CREATE OR REPLACE FUNCTION "public"."lios_update_elo_v1"("p_lookback" interval DEFAULT '24:00:00'::interval) RETURNS TABLE("processed_attempts" bigint, "distinct_learners" bigint, "distinct_items" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    K_LEARNER     constant numeric := 0.40;
    K_ITEM_FACTOR constant numeric := 0.10;
    THETA_CLAMP   constant numeric := 5.00;
    rec           record;
    v_theta       numeric;
    v_b           numeric;
    v_p_expected  numeric;
    v_outcome     numeric;
    v_c           numeric;
    v_delta_theta numeric;
    v_new_theta   numeric;
    v_new_b       numeric;
    v_new_n       bigint;
    v_processed   bigint := 0;
BEGIN
    FOR rec IN
        SELECT id, device_id, item_key, game_mode, was_correct,
               credibility_score, age_band, occurred_at
        FROM learning_attempts
        WHERE elo_processed_at IS NULL
          AND credibility_score IS NOT NULL
          AND device_id IS NOT NULL
          AND occurred_at > now() - p_lookback
        ORDER BY occurred_at, id
    LOOP
        v_c       := rec.credibility_score;
        v_outcome := CASE WHEN rec.was_correct THEN 1.0 ELSE 0.0 END;

        SELECT theta INTO v_theta
        FROM skill_state
        WHERE device_id = rec.device_id
          AND item_key  = rec.item_key
          AND game_mode = rec.game_mode;
        IF v_theta IS NULL THEN v_theta := 0; END IF;

        SELECT b INTO v_b
        FROM item_difficulty
        WHERE item_key  = rec.item_key
          AND game_mode = rec.game_mode;
        IF v_b IS NULL THEN v_b := 0; END IF;

        v_p_expected  := 1.0 / (1.0 + exp(-(v_theta - v_b)));
        v_delta_theta := K_LEARNER * v_c * (v_outcome - v_p_expected);
        v_new_theta   := LEAST(THETA_CLAMP, GREATEST(-THETA_CLAMP, v_theta + v_delta_theta));
        v_new_b       := LEAST(THETA_CLAMP, GREATEST(-THETA_CLAMP, v_b - v_delta_theta * K_ITEM_FACTOR));

        INSERT INTO skill_state
            (device_id, item_key, game_mode, theta, n_attempts, n_credible_attempts, last_attempt_at, age_band)
        VALUES
            (rec.device_id, rec.item_key, rec.game_mode, v_new_theta, 1, v_c, rec.occurred_at, rec.age_band)
        ON CONFLICT (device_id, item_key, game_mode) DO UPDATE
            SET theta               = EXCLUDED.theta,
                n_attempts          = skill_state.n_attempts + 1,
                n_credible_attempts = skill_state.n_credible_attempts + EXCLUDED.n_credible_attempts,
                last_attempt_at     = EXCLUDED.last_attempt_at,
                age_band            = COALESCE(skill_state.age_band, EXCLUDED.age_band);

        INSERT INTO item_difficulty (item_key, game_mode, b, n_attempts, last_updated)
        VALUES (rec.item_key, rec.game_mode, v_new_b, 1, rec.occurred_at)
        ON CONFLICT (item_key, game_mode) DO UPDATE
            SET b            = EXCLUDED.b,
                n_attempts   = item_difficulty.n_attempts + 1,
                last_updated = EXCLUDED.last_updated;

        SELECT n_attempts INTO v_new_n
        FROM skill_state
        WHERE device_id = rec.device_id
          AND item_key  = rec.item_key
          AND game_mode = rec.game_mode;

        INSERT INTO skill_state_history
            (device_id, item_key, game_mode, day, theta, n_attempts)
        VALUES
            (rec.device_id, rec.item_key, rec.game_mode, rec.occurred_at::date, v_new_theta, v_new_n)
        ON CONFLICT (device_id, item_key, game_mode, day) DO UPDATE
            SET theta      = EXCLUDED.theta,
                n_attempts = EXCLUDED.n_attempts;

        UPDATE learning_attempts SET elo_processed_at = now() WHERE id = rec.id;

        v_processed := v_processed + 1;
    END LOOP;

    RETURN QUERY
        SELECT v_processed,
               (SELECT count(DISTINCT device_id) FROM skill_state)::bigint,
               (SELECT count(*) FROM item_difficulty)::bigint;
END;
$$;


ALTER FUNCTION "public"."lios_update_elo_v1"("p_lookback" interval) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."lios_update_elo_v1"("p_lookback" interval) IS 'LIOS Sprint 2 credibility-weighted Elo updater. Idempotent — never re-processes a row.';



CREATE OR REPLACE FUNCTION "public"."log_security_event"("in_event_type" "text", "in_metadata" "jsonb" DEFAULT '{}'::"jsonb", "in_ip_hash" "text" DEFAULT NULL::"text", "in_ua_hash" "text" DEFAULT NULL::"text", "in_country" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_meta jsonb;
begin
  if in_event_type is null or length(trim(in_event_type)) = 0 then
    return;
  end if;

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
  return;
end;
$$;


ALTER FUNCTION "public"."log_security_event"("in_event_type" "text", "in_metadata" "jsonb", "in_ip_hash" "text", "in_ua_hash" "text", "in_country" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_security_event"("in_event_type" "text", "in_metadata" "jsonb", "in_ip_hash" "text", "in_ua_hash" "text", "in_country" "text") IS 'Best-effort security event writer. user_id from auth.uid() only; metadata scrubbed of sensitive/child keys (0020).';



CREATE OR REPLACE FUNCTION "public"."normalize_ip_for_network"("in_ip" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
DECLARE
    v_clean text;
    v_match text[];
BEGIN
    IF in_ip IS NULL OR btrim(in_ip) = '' THEN
        RETURN NULL;
    END IF;

    -- Strip port number (IPv6: [::1]:port, IPv4: x.x.x.x:port)
    v_clean := regexp_replace(btrim(in_ip), '^\[([^\]]+)\]:\d+$', '\1');
    v_clean := regexp_replace(v_clean, '^(\d+\.\d+\.\d+\.\d+):\d+$', '\1');

    -- Handle IPv4-mapped IPv6 (::ffff:x.x.x.x)
    SELECT regexp_matches(v_clean, '^::ffff:(\d+\.\d+\.\d+\.\d+)$') INTO v_match;
    IF v_match IS NOT NULL AND array_length(v_match, 1) > 0 THEN
        RETURN v_match[1];
    END IF;

    -- Check if it looks like IPv4 (simple dotted quad)
    IF v_clean ~ '^\d+\.\d+\.\d+\.\d+$' THEN
        RETURN v_clean;
    END IF;

    -- Check if it looks like IPv6 — extract /64 prefix (first 4 hextets)
    SELECT regexp_matches(v_clean, '^([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):([0-9a-fA-F]{1,4}):') INTO v_match;
    IF v_match IS NOT NULL AND array_length(v_match, 1) >= 4 THEN
        RETURN lower(v_match[1] || ':' || v_match[2] || ':' || v_match[3] || ':' || v_match[4] || '::');
    END IF;

    -- If we got here, it's not a recognised format
    RETURN NULL;
END;
$_$;


ALTER FUNCTION "public"."normalize_ip_for_network"("in_ip" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_ip_for_network"("in_ip" "text") IS 'Normalize an IP address for network comparison. IPv4 returned as-is; IPv6 extracts /64 prefix; IPv4-mapped IPv6 extracts the embedded IPv4. Returns NULL for invalid input.';



CREATE OR REPLACE FUNCTION "public"."parent_has_access"("p_parent" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select parent_subscription_state(p_parent) in
    ('trial_active','active_monthly','active_annual','cancelled_active','payment_failed');
$$;


ALTER FUNCTION "public"."parent_has_access"("p_parent" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."parent_subscription_state"("p_parent" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare s parent_subscriptions%rowtype;
begin
  select * into s from parent_subscriptions where parent_id = p_parent;
  if not found or s.status = 'none' then
    return 'none';
  end if;

  if s.status = 'trialing' then
    if s.trial_end is not null and s.trial_end <= now() then
      return 'trial_expired';
    end if;
    return 'trial_active';
  end if;

  if s.status in ('past_due','unpaid') then
    return 'payment_failed';
  end if;

  if s.status = 'active' then
    if s.cancel_at_period_end then
      return 'cancelled_active';
    end if;
    return case when s.plan_interval = 'year' then 'active_annual' else 'active_monthly' end;
  end if;

  if s.status = 'canceled' then
    if s.current_period_end is not null and s.current_period_end > now() then
      return 'cancelled_active';
    end if;
    return 'expired';
  end if;

  return 'expired';
end;
$$;


ALTER FUNCTION "public"."parent_subscription_state"("p_parent" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."pricing_amount_cents"("p_interval" "text", "p_active_children" integer) RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select case
    when p_interval = 'year' then
      cfg.base_annual_cents + greatest(0, p_active_children - cfg.base_included_slots) * cfg.addon_annual_cents_per_child
    else
      cfg.base_monthly_cents + greatest(0, p_active_children - cfg.base_included_slots) * cfg.addon_monthly_cents_per_child
  end
  from pricing_config cfg where cfg.id = 'default';
$$;


ALTER FUNCTION "public"."pricing_amount_cents"("p_interval" "text", "p_active_children" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_account_deletion_requests"("p_limit" integer DEFAULT 50) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."process_account_deletion_requests"("p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_account_deletion_requests"("p_limit" integer) IS 'Admin/cron processor for pending parent_account deletions, app-side cascade only (0021). Auth.users + Stripe handled by service-role job.';



CREATE OR REPLACE FUNCTION "public"."record_consent"("p_consent_type" "text", "p_consent_version" "text", "p_granted" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare uid uuid := auth.uid(); rid uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_consent_type not in ('account_terms','child_privacy','camera_use','data_retention','marketing') then
    raise exception 'unknown consent type';
  end if;
  insert into consent_records(parent_id, consent_type, consent_version, granted, withdrawn_at)
  values (uid, p_consent_type, p_consent_version, p_granted, case when p_granted then null else now() end)
  returning id into rid;
  return rid;
end;
$$;


ALTER FUNCTION "public"."record_consent"("p_consent_type" "text", "p_consent_version" "text", "p_granted" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_parent"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare u record; t_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select id, email, raw_user_meta_data into u from auth.users where id = auth.uid();
  insert into parent_profiles (id, email, display_name)
  values (
    u.id, u.email,
    coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name',
             split_part(coalesce(u.email,''), '@', 1))
  )
  on conflict (id) do nothing;
  t_id := public._ensure_tenant('parent', u.id, coalesce(u.raw_user_meta_data->>'display_name', u.email));
  update parent_profiles set tenant_id = t_id where id = u.id and tenant_id is null;
  perform public.start_parent_trial(u.id);
  return jsonb_build_object('ok', true, 'tenant_id', t_id);
end;
$$;


ALTER FUNCTION "public"."register_parent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_teacher"("in_full_name" "text" DEFAULT NULL::"text", "in_school_name" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare u record; t_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select id, email, raw_user_meta_data into u from auth.users where id = auth.uid();
  insert into teacher_profiles (auth_user_id, full_name, school_name)
  values (
    u.id,
    coalesce(in_full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    coalesce(in_school_name, u.raw_user_meta_data->>'school_name')
  )
  on conflict (auth_user_id) do nothing;
  insert into teachers (id, email, name, avatar_url)
  values (
    u.id, coalesce(u.email, ''),
    coalesce(in_full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
    coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do nothing;
  t_id := public._ensure_tenant('teacher', u.id, coalesce(in_full_name, u.email));
  update teacher_profiles set tenant_id = t_id where auth_user_id = u.id and tenant_id is null;
  update teachers set tenant_id = t_id where id = u.id and tenant_id is null;
  return jsonb_build_object('ok', true, 'tenant_id', t_id);
end;
$$;


ALTER FUNCTION "public"."register_teacher"("in_full_name" "text", "in_school_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_account_deletion"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare uid uuid := auth.uid(); req uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  insert into data_deletion_requests(parent_id, scope) values (uid, 'parent_account') returning id into req;
  -- Marked pending; a service-role job cancels Stripe + removes auth.users.
  -- Child + learning data cascade-delete via FKs once the parent row is removed.
  return req;
end;
$$;


ALTER FUNCTION "public"."request_account_deletion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_child_deletion"("p_child" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare uid uuid := auth.uid(); req uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;
  insert into data_deletion_requests(parent_id, scope, target_child_id)
    values (uid, 'child_profile', p_child) returning id into req;
  -- Immediate hard delete of the child record (cascades learning rows).
  delete from child_profiles where id = p_child and parent_id = uid;
  update data_deletion_requests set status='completed', completed_at=now() where id = req;
  return req;
end;
$$;


ALTER FUNCTION "public"."request_child_deletion"("p_child" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_child_profile"("p_child" "uuid") RETURNS "public"."child_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare row child_profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if not auth_owns_child(p_child) then raise exception 'not found'; end if;
  update child_profiles
     set status = 'active', archived_at = null
   where id = p_child and parent_id = auth.uid()
   returning * into row;
  return row;
end;
$$;


ALTER FUNCTION "public"."restore_child_profile"("p_child" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."session_lookup_by_code"("in_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
DECLARE
    r record;
BEGIN
    IF in_code IS NULL OR in_code !~ '^\d{4}$' THEN
        RETURN NULL;
    END IF;

    SELECT
        s.id,
        s.code,
        s.session_code,
        s.activity,
        s.status,
        s.class_state,
        s.round,
        s.timer_seconds,
        s.max_students,
        s.scoreboard_mode,
        s.class_name
    INTO r
    FROM public.sessions s
    WHERE (s.code = in_code OR s.session_code = in_code)
      AND (s.status      IN ('lobby', 'playing', 'paused')
           OR s.class_state IN ('lobby', 'in_activity'))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(r);
END
$_$;


ALTER FUNCTION "public"."session_lookup_by_code"("in_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."session_lookup_by_code"("in_code" "text") IS 'Public student-join lookup. Returns minimal join-screen fields (no teacher_id, no school_id, no metadata) for joinable sessions. Joinable rule aligned with class_validate_join (0028): status IN (lobby,playing,paused) OR class_state IN (lobby,in_activity).';



CREATE OR REPLACE FUNCTION "public"."session_set_network_fingerprint"("in_session_id" "uuid", "in_teacher_ip" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_fingerprint text;
    v_secret      text;
BEGIN
    -- Assert caller owns the session
    PERFORM public._class_assert_teacher(in_session_id);

    v_secret := current_setting('app.network_fingerprint_secret', true);
    v_fingerprint := public.generate_network_fingerprint(in_teacher_ip, v_secret);

    INSERT INTO public.session_network_fingerprints (session_id, network_hash, algorithm)
    VALUES (in_session_id, COALESCE(v_fingerprint, ''), 'hmac-sha256')
    ON CONFLICT (session_id)
    DO UPDATE SET network_hash = COALESCE(v_fingerprint, EXCLUDED.network_hash),
                  algorithm = 'hmac-sha256',
                  expires_at = NULL;

    RETURN jsonb_build_object(
        'session_id', in_session_id,
        'has_fingerprint', v_fingerprint IS NOT NULL
    );
END;
$$;


ALTER FUNCTION "public"."session_set_network_fingerprint"("in_session_id" "uuid", "in_teacher_ip" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."session_set_network_fingerprint"("in_session_id" "uuid", "in_teacher_ip" "text") IS 'SECURITY DEFINER. Sets the network fingerprint for a session based on the teacher IP. Asserts session ownership. Upserts into session_network_fingerprints. Returns { session_id, has_fingerprint }.';



CREATE OR REPLACE FUNCTION "public"."session_validate_network"("in_session_id" "uuid", "in_network_fingerprint" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_stored_hash  text;
BEGIN
    SELECT snf.network_hash INTO v_stored_hash
    FROM public.session_network_fingerprints snf
    WHERE snf.session_id = in_session_id;

    -- No fingerprint stored (dev mode / not set) — allow
    IF v_stored_hash IS NULL OR v_stored_hash = '' THEN
        RETURN jsonb_build_object('match', true, 'reason', 'no_fingerprint');
    END IF;

    -- No student fingerprint provided — reject
    IF in_network_fingerprint IS NULL OR in_network_fingerprint = '' THEN
        RETURN jsonb_build_object('match', false, 'reason', 'NETWORK_MISMATCH');
    END IF;

    IF in_network_fingerprint = v_stored_hash THEN
        RETURN jsonb_build_object('match', true, 'reason', 'OK');
    END IF;

    RETURN jsonb_build_object('match', false, 'reason', 'NETWORK_MISMATCH');
END;
$$;


ALTER FUNCTION "public"."session_validate_network"("in_session_id" "uuid", "in_network_fingerprint" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."session_validate_network"("in_session_id" "uuid", "in_network_fingerprint" "text") IS 'SECURITY DEFINER. Validates a student network fingerprint against the session stored fingerprint. Returns { match: bool, reason: text }. If no fingerprint stored, returns match=true (dev mode).';



CREATE OR REPLACE FUNCTION "public"."set_classroom_default_activities"("in_session_id" "uuid", "in_activities" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_updated_id uuid;
BEGIN
    -- Assert teacher ownership
    PERFORM public._class_assert_teacher(in_session_id);

    INSERT INTO public.classroom_default_activities (session_id, activities)
    VALUES (in_session_id, in_activities)
    ON CONFLICT (session_id)
    DO UPDATE SET activities = in_activities, updated_at = now()
    RETURNING id INTO v_updated_id;

    RETURN jsonb_build_object(
        'session_id', in_session_id,
        'count', coalesce(array_length(in_activities, 1), 0)
    );
END;
$$;


ALTER FUNCTION "public"."set_classroom_default_activities"("in_session_id" "uuid", "in_activities" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_classroom_default_activities"("in_session_id" "uuid", "in_activities" "text"[]) IS 'SECURITY DEFINER. Upserts the default activity list for a classroom session. Asserts teacher ownership. Returns { session_id, count: int }.';



CREATE OR REPLACE FUNCTION "public"."set_session_school_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  SELECT school_id INTO NEW.school_id
  FROM teachers WHERE id = NEW.teacher_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_session_school_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_student_assignments"("in_session_id" "uuid", "in_student_id" "uuid", "in_activities" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_count int;
BEGIN
    -- Assert teacher ownership
    PERFORM public._class_assert_teacher(in_session_id);

    -- Delete existing assignments for this student+session
    DELETE FROM public.student_activity_assignments
    WHERE session_id = in_session_id AND student_id = in_student_id;

    -- Insert new ones
    WITH inserted AS (
        INSERT INTO public.student_activity_assignments (session_id, student_id, activity, sequence_order, assigned_by)
        SELECT
            in_session_id,
            in_student_id,
            item->>'activity',
            (item->>'sequence_order')::int,
            auth.uid()
        FROM jsonb_array_elements(in_activities) AS item
        RETURNING 1
    )
    SELECT count(*) INTO v_count FROM inserted;

    RETURN jsonb_build_object('count', v_count);
END;
$$;


ALTER FUNCTION "public"."set_student_assignments"("in_session_id" "uuid", "in_student_id" "uuid", "in_activities" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_student_assignments"("in_session_id" "uuid", "in_student_id" "uuid", "in_activities" "jsonb") IS 'SECURITY DEFINER. Replaces all activity assignments for a student in a session. Takes JSON array of [{ activity: text, sequence_order: int }]. Asserts teacher ownership. Returns { count: int }.';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_parent_trial"("p_parent" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare d int;
begin
  select coalesce(trial_days, 7) into d from pricing_config where id = 'default';
  insert into parent_subscriptions (parent_id, status, trial_start, trial_end)
  values (p_parent, 'trialing', now(), now() + make_interval(days => coalesce(d, 7)))
  on conflict (parent_id) do nothing;
end;
$$;


ALTER FUNCTION "public"."start_parent_trial"("p_parent" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_teacher_school_tier"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE teachers SET tier = 'pro', school_id = NEW.school_id WHERE id = NEW.teacher_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teachers SET
      tier = CASE
        WHEN stripe_subscription_id IS NOT NULL THEN 'pro'
        WHEN trial_expires_at > NOW() THEN 'trial'
        ELSE 'free'
      END,
      school_id = NULL
    WHERE id = OLD.teacher_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."sync_teacher_school_tier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_class_children_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION "public"."touch_class_children_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_tenant_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tenant_id from tenant_members where user_id = auth.uid();
$$;


ALTER FUNCTION "public"."user_tenant_ids"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "data" "jsonb",
    "read_at" timestamp with time zone,
    "tenant_id" "uuid",
    CONSTRAINT "admin_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."admin_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_name" "text" NOT NULL,
    "page" "text",
    "component" "text",
    "game_mode" "text",
    "stage_id" "text",
    "chapter" integer,
    "level" integer,
    "age_band" "text",
    "school_id" "text",
    "class_id" "text",
    "build_version" "text",
    "device_type" "text",
    "browser" "text",
    "browser_version" "text",
    "viewport_w" integer,
    "viewport_h" integer,
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "referrer" "text",
    "value_number" double precision,
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "device_id" "text",
    "event_uid" "uuid",
    "client_seq" bigint,
    "client_ts" timestamp with time zone,
    "context" "text",
    "tenant_id" "uuid",
    "environment" "text",
    "traffic_type" "text",
    "attempt_id" "uuid",
    "received_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."analytics_events"."event_uid" IS 'Client-generated UUID at event creation. UNIQUE — idempotency key for offline-queue retries (LIOS May 2026).';



COMMENT ON COLUMN "public"."analytics_events"."client_seq" IS 'Per-session monotonic sequence number assigned at event creation. Used to reconstruct true event order independent of flush order.';



COMMENT ON COLUMN "public"."analytics_events"."client_ts" IS 'Client wall clock at event creation. With occurred_at lets downstream jobs estimate clock skew per session.';



COMMENT ON COLUMN "public"."analytics_events"."context" IS 'Session context: home / classroom / unknown. First-class dimension for the home-vs-classroom analytics.';



CREATE OR REPLACE VIEW "public"."analytics_events_real" WITH ("security_invoker"='on') AS
 SELECT "id",
    "session_id",
    "occurred_at",
    "event_name",
    "page",
    "component",
    "game_mode",
    "stage_id",
    "chapter",
    "level",
    "age_band",
    "school_id",
    "class_id",
    "build_version",
    "device_type",
    "browser",
    "browser_version",
    "viewport_w",
    "viewport_h",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "referrer",
    "value_number",
    "meta",
    "device_id",
    "event_uid",
    "client_seq",
    "client_ts",
    "context",
    "tenant_id",
    "environment",
    "traffic_type"
   FROM "public"."analytics_events"
  WHERE (("traffic_type" = 'real'::"text") AND ("environment" = 'production'::"text"));


ALTER VIEW "public"."analytics_events_real" OWNER TO "postgres";


COMMENT ON VIEW "public"."analytics_events_real" IS 'Real production traffic only. Internal/QA/demo/bot excluded. Source of truth for headline KPIs.';



CREATE TABLE IF NOT EXISTS "public"."billing_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_id" "uuid",
    "stripe_event_id" "text",
    "type" "text" NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."billing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."broadcast_log" (
    "campaign" "text" NOT NULL,
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "provider_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."broadcast_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."broadcast_log" IS 'Per-recipient send ledger for announcement broadcasts (announce edge function). Service-role only.';



CREATE TABLE IF NOT EXISTS "public"."child_activity_summary" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "child_profile_id" "uuid" NOT NULL,
    "activity_key" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "completions" integer DEFAULT 0 NOT NULL,
    "completion_rate" numeric DEFAULT 0 NOT NULL,
    "mastery" numeric DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'practising'::"text" NOT NULL,
    "total_seconds" integer DEFAULT 0 NOT NULL,
    "last_played_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."child_activity_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."child_learning_state" (
    "child_profile_id" "uuid" NOT NULL,
    "mode_preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "adaptive_difficulty" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "confidence_overall" numeric DEFAULT 0 NOT NULL,
    "streak_days" integer DEFAULT 0 NOT NULL,
    "last_streak_date" "date",
    "last_played_at" timestamp with time zone,
    "recommended_activity_key" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."child_learning_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_children" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "nickname" "text",
    "age_band" "text",
    "notes" "text",
    "archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "class_children_age_band_check" CHECK (("age_band" = ANY (ARRAY['3-4'::"text", '5-7'::"text"]))),
    CONSTRAINT "class_children_first_name_check" CHECK ((("length"(TRIM(BOTH FROM "first_name")) >= 1) AND ("length"(TRIM(BOTH FROM "first_name")) <= 40))),
    CONSTRAINT "class_children_nickname_check" CHECK ((("nickname" IS NULL) OR ("length"(TRIM(BOTH FROM "nickname")) <= 40))),
    CONSTRAINT "class_children_notes_check" CHECK ((("notes" IS NULL) OR ("length"("notes") <= 2000)))
);


ALTER TABLE "public"."class_children" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classroom_default_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "activities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."classroom_default_activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."classroom_default_activities" IS 'Default activity list for a classroom session. Used as fallback when a student has no per-student assignments. RLS: teacher-owned via session ownership.';



CREATE TABLE IF NOT EXISTS "public"."client_errors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "error_type" "text" NOT NULL,
    "message" "text",
    "user_agent" "text",
    "session_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "reported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "error_message" "text" GENERATED ALWAYS AS ("message") STORED,
    "error_stack" "text",
    "page_url" "text",
    "teacher_id" "uuid",
    "tenant_id" "uuid"
);


ALTER TABLE "public"."client_errors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consent_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "consent_type" "text" NOT NULL,
    "consent_version" "text" NOT NULL,
    "granted" boolean DEFAULT true NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "withdrawn_at" timestamp with time zone,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."consent_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_difficulty" (
    "item_key" "text" NOT NULL,
    "game_mode" "text" NOT NULL,
    "b" numeric(6,3) DEFAULT 0 NOT NULL,
    "n_attempts" bigint DEFAULT 0 NOT NULL,
    "last_updated" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."item_difficulty" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_state" (
    "device_id" "text" NOT NULL,
    "item_key" "text" NOT NULL,
    "game_mode" "text" NOT NULL,
    "theta" numeric(6,3) DEFAULT 0 NOT NULL,
    "n_attempts" bigint DEFAULT 0 NOT NULL,
    "n_credible_attempts" numeric(8,2) DEFAULT 0 NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "age_band" "text",
    "tenant_id" "uuid"
);


ALTER TABLE "public"."skill_state" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."dashboard_learner_progression" WITH ("security_invoker"='true') AS
 SELECT "s"."device_id",
    "s"."item_key",
    "s"."game_mode",
    "s"."theta",
    "s"."n_attempts",
    "s"."n_credible_attempts",
    "s"."last_attempt_at",
    "s"."age_band",
    "i"."b" AS "item_difficulty",
    ("s"."theta" - "i"."b") AS "expected_strength",
    (1.0 / (1.0 + "exp"((- ("s"."theta" - "i"."b"))))) AS "p_expected"
   FROM ("public"."skill_state" "s"
     LEFT JOIN "public"."item_difficulty" "i" USING ("item_key", "game_mode"));


ALTER VIEW "public"."dashboard_learner_progression" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "device_id" "text",
    "game_mode" "text" NOT NULL,
    "stage_id" "text",
    "stage_index" integer,
    "item_key" "text" NOT NULL,
    "age_band" "text",
    "was_correct" boolean NOT NULL,
    "attempt_number" integer,
    "ms_to_attempt" integer,
    "expected_value" "text",
    "actual_value" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "event_uid" "uuid",
    "client_seq" bigint,
    "client_ts" timestamp with time zone,
    "context" "text",
    "credibility_score" numeric(3,2),
    "credibility_tier" "text",
    "credibility_reasons" "jsonb" DEFAULT '[]'::"jsonb",
    "credibility_scored_at" timestamp with time zone,
    "elo_processed_at" timestamp with time zone,
    "gq_path_accuracy_pct" numeric(5,2),
    "gq_path_efficiency" numeric(5,3),
    "gq_spatial_error_mean_px" numeric(7,2),
    "gq_velocity_variance" numeric(10,3),
    "gq_pause_count" integer,
    "gq_directional_changes" integer,
    "gq_time_to_first_movement_ms" integer,
    "gq_time_to_completion_ms" integer,
    "gq_corrections_in_stroke" integer,
    "gq_n_samples" integer,
    "child_profile_id" "uuid",
    "tenant_id" "uuid",
    "attempt_id" "uuid",
    CONSTRAINT "learning_attempts_credibility_score_range" CHECK ((("credibility_score" IS NULL) OR (("credibility_score" >= (0)::numeric) AND ("credibility_score" <= (1)::numeric)))),
    CONSTRAINT "learning_attempts_credibility_tier_check" CHECK ((("credibility_tier" IS NULL) OR ("credibility_tier" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text"])))),
    CONSTRAINT "learning_attempts_gq_path_accuracy_range" CHECK ((("gq_path_accuracy_pct" IS NULL) OR (("gq_path_accuracy_pct" >= (0)::numeric) AND ("gq_path_accuracy_pct" <= (100)::numeric)))),
    CONSTRAINT "learning_attempts_gq_path_efficiency_range" CHECK ((("gq_path_efficiency" IS NULL) OR (("gq_path_efficiency" >= (0)::numeric) AND ("gq_path_efficiency" <= (1)::numeric)))),
    CONSTRAINT "learning_attempts_no_unknown_key" CHECK (("item_key" <> ALL (ARRAY['unknown_word'::"text", 'unknown'::"text", 'null'::"text", 'undefined'::"text", ''::"text"])))
);


ALTER TABLE "public"."learning_attempts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."learning_attempts"."event_uid" IS 'Mirrors analytics_events.event_uid for the originating item_dropped event. UNIQUE — guards mastery pipeline against duplicate attempts.';



COMMENT ON COLUMN "public"."learning_attempts"."client_seq" IS 'Per-session monotonic sequence number from the originating event.';



COMMENT ON COLUMN "public"."learning_attempts"."client_ts" IS 'Client wall clock at attempt resolution.';



COMMENT ON COLUMN "public"."learning_attempts"."context" IS 'Session context (home / classroom / unknown) inherited from the originating event.';



COMMENT ON COLUMN "public"."learning_attempts"."credibility_score" IS 'LIOS Trust v1 attempt credibility in [0,1]. NULL means not yet scored. Down-weighted attempts surface in product analytics but are quarantined from external efficacy claims when score < 0.6.';



COMMENT ON COLUMN "public"."learning_attempts"."credibility_tier" IS 'A (>=0.80) full, B (0.40-0.80) reduced, C (<0.40) quarantined.';



COMMENT ON COLUMN "public"."learning_attempts"."credibility_reasons" IS 'JSON array of rule codes that fired. Audit trail.';



COMMENT ON COLUMN "public"."learning_attempts"."credibility_scored_at" IS 'When the scorer last ran on this row.';



COMMENT ON COLUMN "public"."learning_attempts"."gq_path_accuracy_pct" IS 'Fraction of stroke frames within the ideal path zone, 0-100. Filled by path-tracing modes (pre-writing). NULL for free-form gestures.';



COMMENT ON COLUMN "public"."learning_attempts"."gq_path_efficiency" IS 'Net displacement / total path length, 0-1. Lower = jitterier stroke. NEVER store coordinates — this is the privacy-safe summary.';



COMMENT ON COLUMN "public"."learning_attempts"."gq_spatial_error_mean_px" IS 'Mean distance (px) from ideal path samples. Filled by path-tracing modes.';



COMMENT ON COLUMN "public"."learning_attempts"."gq_velocity_variance" IS 'Variance of frame-to-frame velocity. Higher = jerkier motion.';



COMMENT ON COLUMN "public"."learning_attempts"."gq_pause_count" IS 'Count of within-stroke hesitations (velocity dropped below threshold).';



COMMENT ON COLUMN "public"."learning_attempts"."gq_directional_changes" IS 'Count of sharp direction reversals during the stroke.';



COMMENT ON COLUMN "public"."learning_attempts"."gq_time_to_first_movement_ms" IS 'Latency from prompt presentation to first detected motion. Confidence proxy.';



COMMENT ON COLUMN "public"."learning_attempts"."gq_time_to_completion_ms" IS 'Total stroke duration. Distinct from ms_to_attempt which is grab-to-drop.';



COMMENT ON COLUMN "public"."learning_attempts"."gq_corrections_in_stroke" IS 'Count of in-stroke direction reversals that recovered toward target.';



COMMENT ON COLUMN "public"."learning_attempts"."gq_n_samples" IS 'Number of MediaPipe samples used to compute these scalars. Data-quality marker.';



CREATE OR REPLACE VIEW "public"."dashboard_trust_composition" WITH ("security_invoker"='true') AS
 SELECT "date_trunc"('day'::"text", "occurred_at") AS "day",
    "game_mode",
    "context",
    "credibility_tier",
    "count"(*) AS "n",
    ("avg"("credibility_score"))::numeric(3,2) AS "mean_score"
   FROM "public"."learning_attempts"
  WHERE ("credibility_tier" IS NOT NULL)
  GROUP BY ("date_trunc"('day'::"text", "occurred_at")), "game_mode", "context", "credibility_tier";


ALTER VIEW "public"."dashboard_trust_composition" OWNER TO "postgres";


COMMENT ON VIEW "public"."dashboard_trust_composition" IS 'LIOS Trust v1 composition strip — the data-quality denominator every dashboard chart should expose.';



CREATE TABLE IF NOT EXISTS "public"."data_deletion_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "scope" "text" NOT NULL,
    "target_child_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."data_deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_type" "text" NOT NULL,
    "email" "text",
    "name" "text",
    "school" "text",
    "role" "text",
    "message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ip_hash" "text",
    "tenant_id" "uuid"
);


ALTER TABLE "public"."form_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."human_observation_fact" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recorded_by" "text",
    "observer_role" "text" DEFAULT 'teacher'::"text" NOT NULL,
    "device_id" "text" NOT NULL,
    "session_id" "uuid",
    "classroom_code" "text",
    "age_band" "text",
    "focus_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "affect_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "independence_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "social_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "notable_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "note" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "human_observation_affect_check" CHECK (("affect_tags" <@ ARRAY['confident'::"text", 'calm'::"text", 'hesitant'::"text", 'frustrated'::"text"])),
    CONSTRAINT "human_observation_focus_check" CHECK (("focus_tags" <@ ARRAY['focused'::"text", 'distracted'::"text", 'disengaged'::"text"])),
    CONSTRAINT "human_observation_independence_check" CHECK (("independence_tags" <@ ARRAY['independent'::"text", 'supported'::"text", 'required_intervention'::"text"])),
    CONSTRAINT "human_observation_notable_check" CHECK (("notable_tags" <@ ARRAY['new_behaviour_good'::"text", 'new_behaviour_concern'::"text", 'help_needed'::"text", 'breakthrough'::"text", 'avoided_activity'::"text"])),
    CONSTRAINT "human_observation_note_length" CHECK ((("note" IS NULL) OR ("char_length"("note") <= 200))),
    CONSTRAINT "human_observation_observer_role_check" CHECK (("observer_role" = ANY (ARRAY['teacher'::"text", 'parent'::"text", 'researcher'::"text"]))),
    CONSTRAINT "human_observation_social_check" CHECK (("social_tags" <@ ARRAY['alone'::"text", 'collaborated'::"text", 'disrupted_by_peer'::"text"]))
);


ALTER TABLE "public"."human_observation_fact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."join_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "student_id" "uuid",
    "event" "text" NOT NULL,
    "result_code" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "join_audit_log_event_check" CHECK (("event" = ANY (ARRAY['join_attempt'::"text", 'join_success'::"text", 'join_failure'::"text", 'network_match'::"text", 'network_mismatch'::"text"])))
);


ALTER TABLE "public"."join_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."join_audit_log" IS 'Observability log for classroom join attempts. service_role writes; authenticated teachers/admins read for their sessions. anon has no access.';



CREATE TABLE IF NOT EXISTS "public"."join_rate_limits" (
    "ip_hash" "text" NOT NULL,
    "attempt_count" integer DEFAULT 1 NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."join_rate_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."join_rate_limits" IS 'Rate limiting table for classroom join attempts. Keyed by IP hash. Only accessible via SECURITY DEFINER functions.';



CREATE TABLE IF NOT EXISTS "public"."lios_adaptive_decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "made_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "device_id" "text" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "game_mode" "text" NOT NULL,
    "age_band" "text",
    "context" "text",
    "current_item" "text",
    "next_item" "text",
    "scaffold_level" "text" DEFAULT 'none'::"text" NOT NULL,
    "reward_intensity" "text" DEFAULT 'quiet'::"text" NOT NULL,
    "suggest_break" boolean DEFAULT false NOT NULL,
    "regime" "text" DEFAULT 'productive'::"text" NOT NULL,
    "recovery_step" integer,
    "p_expected" numeric(4,3),
    "invariants_applied" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "inputs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "reasoning" "text",
    "tenant_id" "uuid",
    CONSTRAINT "lios_adaptive_recovery_step_check" CHECK ((("recovery_step" IS NULL) OR (("recovery_step" >= 1) AND ("recovery_step" <= 5)))),
    CONSTRAINT "lios_adaptive_regime_check" CHECK (("regime" = ANY (ARRAY['fresh'::"text", 'flow'::"text", 'productive'::"text", 'boredom'::"text", 'frustration'::"text"]))),
    CONSTRAINT "lios_adaptive_reward_check" CHECK (("reward_intensity" = ANY (ARRAY['quiet'::"text", 'standard'::"text", 'big'::"text"]))),
    CONSTRAINT "lios_adaptive_scaffold_check" CHECK (("scaffold_level" = ANY (ARRAY['none'::"text", 'partial'::"text", 'full'::"text"])))
);


ALTER TABLE "public"."lios_adaptive_decisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lios_anomaly_fact" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metric" "text" NOT NULL,
    "severity" "text" DEFAULT 'warn'::"text" NOT NULL,
    "current_value" numeric,
    "baseline_mean" numeric,
    "baseline_sd" numeric,
    "z_score" numeric,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "reason" "text",
    "tenant_id" "uuid",
    CONSTRAINT "lios_anomaly_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warn'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."lios_anomaly_fact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lios_pipeline_runs" (
    "id" bigint NOT NULL,
    "run_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_ms" integer,
    "trust_scored" bigint,
    "trust_tier_a" bigint,
    "trust_tier_b" bigint,
    "trust_tier_c" bigint,
    "elo_processed" bigint,
    "elo_distinct_learners" bigint,
    "elo_distinct_items" bigint,
    "mastery_pairs" bigint,
    "mastery_transitions" bigint,
    "mastery_by_state" "jsonb",
    "friction_sessions" bigint,
    "friction_detectors_fired" bigint,
    "friction_by_detector" "jsonb",
    "error_message" "text",
    "anomaly_detected" bigint,
    "anomaly_by_metric" "jsonb",
    "tenant_id" "uuid"
);


ALTER TABLE "public"."lios_pipeline_runs" OWNER TO "postgres";


ALTER TABLE "public"."lios_pipeline_runs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."lios_pipeline_runs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."mastery_episode_fact" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "text" NOT NULL,
    "item_key" "text" NOT NULL,
    "game_mode" "text" NOT NULL,
    "from_state" "text",
    "to_state" "text" NOT NULL,
    "transition_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "age_band" "text",
    "theta_at_event" numeric(6,3),
    "b_at_event" numeric(6,3),
    "evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "mastery_episode_from_state_check" CHECK ((("from_state" IS NULL) OR ("from_state" = ANY (ARRAY['Exposed'::"text", 'Acquired'::"text", 'Mastered'::"text", 'Decayed'::"text"])))),
    CONSTRAINT "mastery_episode_to_state_check" CHECK (("to_state" = ANY (ARRAY['Exposed'::"text", 'Acquired'::"text", 'Mastered'::"text", 'Decayed'::"text"])))
);


ALTER TABLE "public"."mastery_episode_fact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."newsletter_subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "source" "text" DEFAULT 'website'::"text",
    "subscribed_at" timestamp with time zone DEFAULT "now"(),
    "unsubscribe_token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(16), 'hex'::"text"),
    "unsubscribed_at" timestamp with time zone,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."newsletter_subscribers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_controls" (
    "child_profile_id" "uuid" NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "daily_play_limit_minutes" integer,
    "allowed_categories" "text"[],
    "paused" boolean DEFAULT false NOT NULL,
    "sound_enabled" boolean DEFAULT true NOT NULL,
    "camera_reassurance" "text" DEFAULT 'standard'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."parent_controls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "display_name" "text",
    "stripe_customer_id" "text",
    "marketing_opt_in" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."parent_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parent_subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "status" "text" DEFAULT 'none'::"text" NOT NULL,
    "plan_interval" "text",
    "base_price_id" "text",
    "addon_price_id" "text",
    "included_child_slots" integer DEFAULT 2 NOT NULL,
    "billed_addon_quantity" integer DEFAULT 0 NOT NULL,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "canceled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    "reminder_2d_sent_at" timestamp with time zone,
    "reminder_expired_sent_at" timestamp with time zone,
    "welcome_sent_at" timestamp with time zone,
    "last_event_at" timestamp with time zone,
    "activated_sent_at" timestamp with time zone
);


ALTER TABLE "public"."parent_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_admins" (
    "user_id" "uuid" NOT NULL,
    "granted_by" "uuid",
    "note" "text",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."platform_admins" IS 'First-class platform operator allow-list (0018). is_admin_user = legacy teachers.is_admin OR membership here.';



CREATE TABLE IF NOT EXISTS "public"."platform_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scope" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data_snapshot" "jsonb",
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "source" "text" DEFAULT 'ai'::"text" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "platform_insights_scope_check" CHECK (("scope" = ANY (ARRAY['platform'::"text", 'activity'::"text", 'growth'::"text", 'operations'::"text"]))),
    CONSTRAINT "platform_insights_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'suggestion'::"text", 'warning'::"text"])))
);


ALTER TABLE "public"."platform_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "activities" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gestures" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "difficulty" "text" DEFAULT 'medium'::"text" NOT NULL,
    "duration_minutes" integer DEFAULT 20 NOT NULL,
    "school_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "playlists_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"])))
);


ALTER TABLE "public"."playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_config" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "base_included_slots" integer DEFAULT 2 NOT NULL,
    "base_monthly_cents" integer DEFAULT 499 NOT NULL,
    "base_annual_cents" integer DEFAULT 5499 NOT NULL,
    "addon_monthly_cents_per_child" integer DEFAULT 200 NOT NULL,
    "addon_annual_cents_per_child" integer DEFAULT 2199 NOT NULL,
    "trial_days" integer DEFAULT 14 NOT NULL,
    "max_children" integer,
    "active" boolean DEFAULT true NOT NULL,
    "effective_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."pricing_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."round_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "round" integer NOT NULL,
    "stars" integer NOT NULL,
    "raw_score" integer DEFAULT 0 NOT NULL,
    "activity" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "duration_seconds" integer,
    "completed" boolean DEFAULT true NOT NULL,
    "session_student_id" "uuid" GENERATED ALWAYS AS ("student_id") STORED,
    "round_number" integer GENERATED ALWAYS AS ("round") STORED,
    "gesture_name" "text" GENERATED ALWAYS AS ("activity") STORED,
    "accuracy" numeric GENERATED ALWAYS AS (((("stars")::numeric / 5.0) * 100.0)) STORED,
    "score" integer GENERATED ALWAYS AS ("raw_score") STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_activity_id" "uuid",
    "tenant_id" "uuid",
    CONSTRAINT "round_scores_stars_check" CHECK ((("stars" >= 1) AND ("stars" <= 5)))
);


ALTER TABLE "public"."round_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "school_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."school_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_teachers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'teacher'::"text" NOT NULL,
    "status" "text" DEFAULT 'invited'::"text" NOT NULL,
    "invited_by" "uuid",
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "joined_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "school_teachers_role_check" CHECK (("role" = ANY (ARRAY['teacher'::"text", 'school_admin'::"text"]))),
    CONSTRAINT "school_teachers_status_check" CHECK (("status" = ANY (ARRAY['invited'::"text", 'active'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."school_teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "license_tier" "text" DEFAULT 'starter_5'::"text" NOT NULL,
    "license_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "max_seats" integer DEFAULT 5 NOT NULL,
    "seats_used" integer DEFAULT 0 NOT NULL,
    "academic_year_end" "date" DEFAULT '2026-07-31'::"date" NOT NULL,
    "settings" "jsonb" DEFAULT '{"timezone": "Europe/London", "default_scoreboard": "personal"}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" "text",
    "logo_url" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "zip_code" "text",
    "country" "text" DEFAULT 'GB'::"text",
    "phone" "text",
    "website" "text",
    "subscription_tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "admin_teacher_id" "uuid" GENERATED ALWAYS AS ("admin_user_id") STORED,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "schools_license_status_check" CHECK (("license_status" = ANY (ARRAY['active'::"text", 'past_due'::"text", 'cancelled'::"text", 'grace_period'::"text"]))),
    CONSTRAINT "schools_license_tier_check" CHECK (("license_tier" = ANY (ARRAY['starter_5'::"text", 'standard_10'::"text", 'premium_25'::"text", 'unlimited'::"text"]))),
    CONSTRAINT "schools_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_audit_log" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "ip_hash" "text",
    "ua_hash" "text",
    "country" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."security_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."security_audit_log" IS 'Auth/security event trail. Hashed IP/UA only, no PII, no child data (0020).';



ALTER TABLE "public"."security_audit_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."security_audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."session_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "activity" "text" NOT NULL,
    "state" "text" DEFAULT 'starting'::"text" NOT NULL,
    "ordinal" integer NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "tenant_id" "uuid",
    CONSTRAINT "session_activities_state_check" CHECK (("state" = ANY (ARRAY['starting'::"text", 'playing'::"text", 'paused'::"text", 'results'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."session_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_network_fingerprints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "network_hash" "text" NOT NULL,
    "algorithm" "text" DEFAULT 'hmac-sha256'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."session_network_fingerprints" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_network_fingerprints" IS 'Stores HMAC network fingerprints per session for proximity-based join validation. Only accessible via SECURITY DEFINER functions or service_role.';



CREATE TABLE IF NOT EXISTS "public"."session_students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_connected" boolean DEFAULT true NOT NULL,
    "student_name" "text" GENERATED ALWAYS AS ("name") STORED,
    "student_avatar" "text",
    "left_at" timestamp with time zone,
    "is_active" boolean GENERATED ALWAYS AS ("is_connected") STORED,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kicked_at" timestamp with time zone,
    "kicked_reason" "text",
    "avatar_seed" "text",
    "tenant_id" "uuid",
    "class_child_id" "uuid"
);


ALTER TABLE "public"."session_students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "activity" "text",
    "status" "text" DEFAULT 'lobby'::"text" NOT NULL,
    "round" integer DEFAULT 1 NOT NULL,
    "timer_seconds" integer DEFAULT 90 NOT NULL,
    "max_students" integer DEFAULT 30 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "scoreboard_mode" "text" DEFAULT 'personal'::"text" NOT NULL,
    "school_id" "uuid",
    "playlist_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "session_code" "text" GENERATED ALWAYS AS ("code") STORED,
    "started_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "class_state" "text" DEFAULT 'lobby'::"text" NOT NULL,
    "current_activity_id" "uuid",
    "class_name" "text",
    "scoreboard_visible" boolean DEFAULT false NOT NULL,
    "tenant_id" "uuid",
    "activity_version" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "sessions_class_state_check" CHECK (("class_state" = ANY (ARRAY['lobby'::"text", 'in_activity'::"text", 'between_activities'::"text", 'ended'::"text"]))),
    CONSTRAINT "sessions_scoreboard_mode_check" CHECK (("scoreboard_mode" = ANY (ARRAY['full'::"text", 'top3'::"text", 'personal'::"text", 'class'::"text"]))),
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['lobby'::"text", 'playing'::"text", 'paused'::"text", 'results'::"text", 'ended'::"text"])))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_state_history" (
    "device_id" "text" NOT NULL,
    "item_key" "text" NOT NULL,
    "game_mode" "text" NOT NULL,
    "day" "date" NOT NULL,
    "theta" numeric(6,3) NOT NULL,
    "n_attempts" bigint NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."skill_state_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_price_map" (
    "price_key" "text" NOT NULL,
    "stripe_price_id" "text" NOT NULL,
    "interval" "text" NOT NULL,
    "role" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "stripe_price_map_interval_check" CHECK (("interval" = ANY (ARRAY['month'::"text", 'year'::"text"]))),
    CONSTRAINT "stripe_price_map_role_check" CHECK (("role" = ANY (ARRAY['base'::"text", 'addon'::"text"])))
);


ALTER TABLE "public"."stripe_price_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_activity_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "activity" "text" NOT NULL,
    "sequence_order" integer DEFAULT 0 NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_activity_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_activity_assignments" IS 'Per-student activity assignments within a classroom session. Teachers assign specific game modes to individual students. RLS: teachers own via session ownership; anon can read own student_id.';



CREATE TABLE IF NOT EXISTS "public"."teacher_insights" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "insight_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data_snapshot" "jsonb",
    "severity" "text" DEFAULT 'info'::"text" NOT NULL,
    "source" "text" DEFAULT 'ai'::"text" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dismissed_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "teacher_insights_insight_type_check" CHECK (("insight_type" = ANY (ARRAY['engagement'::"text", 'activity'::"text", 'timing'::"text", 'recommendation'::"text"]))),
    CONSTRAINT "teacher_insights_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'suggestion'::"text", 'warning'::"text"]))),
    CONSTRAINT "teacher_insights_source_check" CHECK (("source" = ANY (ARRAY['ai'::"text", 'rule_engine'::"text"])))
);


ALTER TABLE "public"."teacher_insights" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "full_name" "text",
    "school_name" "text",
    "role" "text" DEFAULT 'teacher'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."teacher_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "avatar_url" "text" DEFAULT ''::"text",
    "tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "trial_started_at" timestamp with time zone,
    "trial_expires_at" timestamp with time zone,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "school_id" "uuid",
    "is_admin" boolean DEFAULT false NOT NULL,
    "settings" "jsonb" DEFAULT '{"email_digest": false, "max_students": 30, "default_timer": 90, "default_scoreboard": "personal"}'::"jsonb" NOT NULL,
    "onboarded_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    CONSTRAINT "teachers_tier_check" CHECK (("tier" = ANY (ARRAY['free'::"text", 'trial'::"text", 'pro'::"text", 'school'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_members" (
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "member_role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_members_member_role_chk" CHECK (("member_role" = ANY (ARRAY['owner'::"text", 'school_admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."tenant_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "text" NOT NULL,
    "owner_user_id" "uuid",
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenants_kind_check" CHECK (("kind" = ANY (ARRAY['parent'::"text", 'teacher'::"text", 'school'::"text", 'platform'::"text"])))
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_activity_performance" WITH ("security_invoker"='true') AS
 SELECT "activity" AS "gesture_name",
    "count"(*) AS "total_attempts",
    "avg"(((("stars")::numeric / 5.0) * 100.0)) AS "avg_accuracy",
    ((("count"(*) FILTER (WHERE "completed"))::numeric * 100.0) / (NULLIF("count"(*), 0))::numeric) AS "completion_rate",
    "max"("submitted_at") AS "last_used_at"
   FROM "public"."round_scores" "rs"
  GROUP BY "activity";


ALTER VIEW "public"."v_activity_performance" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_engagement_metrics" WITH ("security_invoker"='true') AS
 SELECT "to_char"("date_trunc"('week'::"text", "s"."created_at"), 'YYYY-MM-DD'::"text") AS "period",
    "count"(DISTINCT "s"."teacher_id") AS "active_teachers",
    "count"(DISTINCT "s"."id") AS "total_sessions",
    "count"(DISTINCT "ss"."id") AS "total_students_engaged",
    COALESCE("avg"(((("rs"."stars")::numeric / 5.0) * 100.0)), (0)::numeric) AS "avg_session_accuracy"
   FROM (("public"."sessions" "s"
     LEFT JOIN "public"."session_students" "ss" ON (("ss"."session_id" = "s"."id")))
     LEFT JOIN "public"."round_scores" "rs" ON (("rs"."session_id" = "s"."id")))
  GROUP BY ("date_trunc"('week'::"text", "s"."created_at"));


ALTER VIEW "public"."v_engagement_metrics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_growth_metrics" WITH ("security_invoker"='true') AS
 SELECT "to_char"("date_trunc"('day'::"text", "t"."created_at"), 'YYYY-MM-DD'::"text") AS "cohort_date",
    "count"(DISTINCT "t"."id") AS "new_teachers",
    "count"(DISTINCT "sc"."id") AS "new_schools",
    "count"(DISTINCT "t"."id") FILTER (WHERE (("t"."tier" = ANY (ARRAY['pro'::"text", 'school'::"text"])) AND ("t"."trial_started_at" IS NOT NULL))) AS "trial_conversions",
    0 AS "churn_count"
   FROM ("public"."teachers" "t"
     LEFT JOIN "public"."schools" "sc" ON (("date_trunc"('day'::"text", "sc"."created_at") = "date_trunc"('day'::"text", "t"."created_at"))))
  GROUP BY ("date_trunc"('day'::"text", "t"."created_at"))
  ORDER BY ("to_char"("date_trunc"('day'::"text", "t"."created_at"), 'YYYY-MM-DD'::"text")) DESC;


ALTER VIEW "public"."v_growth_metrics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_school_overview" WITH ("security_invoker"='true') AS
 SELECT "sc"."id" AS "school_id",
    "sc"."name" AS "school_name",
    "count"(DISTINCT "st"."teacher_id") AS "teacher_count",
    "count"(DISTINCT "s"."id") AS "total_sessions",
    COALESCE("avg"("student_counts"."cnt"), (0)::numeric) AS "avg_students_per_session",
    "sc"."subscription_tier"
   FROM ((("public"."schools" "sc"
     LEFT JOIN "public"."school_teachers" "st" ON (("st"."school_id" = "sc"."id")))
     LEFT JOIN "public"."sessions" "s" ON (("s"."school_id" = "sc"."id")))
     LEFT JOIN ( SELECT "session_students"."session_id",
            "count"(*) AS "cnt"
           FROM "public"."session_students"
          GROUP BY "session_students"."session_id") "student_counts" ON (("student_counts"."session_id" = "s"."id")))
  GROUP BY "sc"."id", "sc"."name", "sc"."subscription_tier";


ALTER VIEW "public"."v_school_overview" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_teacher_session_stats" WITH ("security_invoker"='true') AS
 SELECT "s"."teacher_id",
    "count"(DISTINCT "s"."id") AS "total_sessions",
    "count"(DISTINCT "ss"."id") AS "total_students",
    "avg"((EXTRACT(epoch FROM ("s"."ended_at" - "s"."created_at")) / 60.0)) AS "avg_session_duration",
    "max"("s"."created_at") AS "last_session_at"
   FROM ("public"."sessions" "s"
     LEFT JOIN "public"."session_students" "ss" ON (("ss"."session_id" = "s"."id")))
  GROUP BY "s"."teacher_id";


ALTER VIEW "public"."v_teacher_session_stats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_stripe_event_id_key" UNIQUE ("stripe_event_id");



ALTER TABLE ONLY "public"."broadcast_log"
    ADD CONSTRAINT "broadcast_log_pkey" PRIMARY KEY ("campaign", "email");



ALTER TABLE ONLY "public"."child_activity_summary"
    ADD CONSTRAINT "child_activity_summary_child_profile_id_activity_key_key" UNIQUE ("child_profile_id", "activity_key");



ALTER TABLE ONLY "public"."child_activity_summary"
    ADD CONSTRAINT "child_activity_summary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."child_learning_state"
    ADD CONSTRAINT "child_learning_state_pkey" PRIMARY KEY ("child_profile_id");



ALTER TABLE ONLY "public"."child_profiles"
    ADD CONSTRAINT "child_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_children"
    ADD CONSTRAINT "class_children_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classroom_default_activities"
    ADD CONSTRAINT "classroom_default_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classroom_default_activities"
    ADD CONSTRAINT "classroom_default_activities_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."client_errors"
    ADD CONSTRAINT "client_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."human_observation_fact"
    ADD CONSTRAINT "human_observation_fact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_difficulty"
    ADD CONSTRAINT "item_difficulty_pkey" PRIMARY KEY ("item_key", "game_mode");



ALTER TABLE ONLY "public"."join_audit_log"
    ADD CONSTRAINT "join_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."join_rate_limits"
    ADD CONSTRAINT "join_rate_limits_pkey" PRIMARY KEY ("ip_hash");



ALTER TABLE ONLY "public"."learning_attempts"
    ADD CONSTRAINT "learning_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lios_adaptive_decisions"
    ADD CONSTRAINT "lios_adaptive_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lios_anomaly_fact"
    ADD CONSTRAINT "lios_anomaly_fact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lios_pipeline_runs"
    ADD CONSTRAINT "lios_pipeline_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mastery_episode_fact"
    ADD CONSTRAINT "mastery_episode_fact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_controls"
    ADD CONSTRAINT "parent_controls_pkey" PRIMARY KEY ("child_profile_id");



ALTER TABLE ONLY "public"."parent_profiles"
    ADD CONSTRAINT "parent_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_profiles"
    ADD CONSTRAINT "parent_profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."parent_subscriptions"
    ADD CONSTRAINT "parent_subscriptions_parent_id_key" UNIQUE ("parent_id");



ALTER TABLE ONLY "public"."parent_subscriptions"
    ADD CONSTRAINT "parent_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parent_subscriptions"
    ADD CONSTRAINT "parent_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."platform_insights"
    ADD CONSTRAINT "platform_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."playlists"
    ADD CONSTRAINT "playlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_config"
    ADD CONSTRAINT "pricing_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."round_scores"
    ADD CONSTRAINT "round_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."round_scores"
    ADD CONSTRAINT "round_scores_session_id_student_id_round_key" UNIQUE ("session_id", "student_id", "round");



ALTER TABLE ONLY "public"."school_invites"
    ADD CONSTRAINT "school_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_invites"
    ADD CONSTRAINT "school_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_school_id_teacher_id_key" UNIQUE ("school_id", "teacher_id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_activities"
    ADD CONSTRAINT "session_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_activities"
    ADD CONSTRAINT "session_activities_session_id_ordinal_key" UNIQUE ("session_id", "ordinal");



ALTER TABLE ONLY "public"."session_network_fingerprints"
    ADD CONSTRAINT "session_network_fingerprints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_network_fingerprints"
    ADD CONSTRAINT "session_network_fingerprints_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."session_students"
    ADD CONSTRAINT "session_students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_students"
    ADD CONSTRAINT "session_students_session_id_name_key" UNIQUE ("session_id", "name");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_state_history"
    ADD CONSTRAINT "skill_state_history_pkey" PRIMARY KEY ("device_id", "item_key", "game_mode", "day");



ALTER TABLE ONLY "public"."skill_state"
    ADD CONSTRAINT "skill_state_pkey" PRIMARY KEY ("device_id", "item_key", "game_mode");



ALTER TABLE ONLY "public"."stripe_price_map"
    ADD CONSTRAINT "stripe_price_map_pkey" PRIMARY KEY ("price_key");



ALTER TABLE ONLY "public"."student_activity_assignments"
    ADD CONSTRAINT "student_activity_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_activity_assignments"
    ADD CONSTRAINT "student_activity_assignments_student_id_activity_key" UNIQUE ("student_id", "activity");



ALTER TABLE ONLY "public"."teacher_insights"
    ADD CONSTRAINT "teacher_insights_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



CREATE INDEX "analytics_events_attempt_idx" ON "public"."analytics_events" USING "btree" ("attempt_id", "occurred_at") WHERE ("attempt_id" IS NOT NULL);



CREATE INDEX "analytics_events_device_idx" ON "public"."analytics_events" USING "btree" ("device_id", "occurred_at" DESC) WHERE ("device_id" IS NOT NULL);



CREATE UNIQUE INDEX "analytics_events_event_uid_uidx" ON "public"."analytics_events" USING "btree" ("event_uid");



COMMENT ON INDEX "public"."analytics_events_event_uid_uidx" IS 'LIOS idempotency arbiter. Non-partial so PostgREST resolution=ignore-duplicates can use it. Multiple NULLs allowed (Postgres default) so legacy rows without an event_uid coexist.';



CREATE INDEX "analytics_events_mode_idx" ON "public"."analytics_events" USING "btree" ("game_mode", "occurred_at" DESC) WHERE ("game_mode" IS NOT NULL);



CREATE INDEX "analytics_events_name_idx" ON "public"."analytics_events" USING "btree" ("event_name", "occurred_at" DESC);



CREATE INDEX "analytics_events_occurred_at_idx" ON "public"."analytics_events" USING "btree" ("occurred_at" DESC);



CREATE INDEX "analytics_events_real_prod_idx" ON "public"."analytics_events" USING "btree" ("occurred_at" DESC) WHERE (("traffic_type" = 'real'::"text") AND ("environment" = 'production'::"text"));



CREATE INDEX "analytics_events_session_idx" ON "public"."analytics_events" USING "btree" ("session_id", "occurred_at");



CREATE INDEX "class_children_teacher_idx" ON "public"."class_children" USING "btree" ("teacher_id") WHERE ("archived" = false);



CREATE INDEX "data_deletion_requests_target_child_id_idx" ON "public"."data_deletion_requests" USING "btree" ("target_child_id");



CREATE INDEX "human_observation_recorded_idx" ON "public"."human_observation_fact" USING "btree" ("recorded_at" DESC);



CREATE INDEX "idx_activity_summary_child" ON "public"."child_activity_summary" USING "btree" ("child_profile_id");



CREATE INDEX "idx_attempts_child" ON "public"."learning_attempts" USING "btree" ("child_profile_id");



CREATE INDEX "idx_billing_events_parent" ON "public"."billing_events" USING "btree" ("parent_id");



CREATE INDEX "idx_child_profiles_parent" ON "public"."child_profiles" USING "btree" ("parent_id");



CREATE INDEX "idx_child_profiles_status" ON "public"."child_profiles" USING "btree" ("parent_id", "status");



CREATE INDEX "idx_child_profiles_tenant" ON "public"."child_profiles" USING "btree" ("tenant_id") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_client_errors_reported" ON "public"."client_errors" USING "btree" ("reported_at" DESC);



CREATE INDEX "idx_client_errors_session_id" ON "public"."client_errors" USING "btree" ("session_id");



CREATE INDEX "idx_consent_parent" ON "public"."consent_records" USING "btree" ("parent_id");



CREATE INDEX "idx_deletion_parent" ON "public"."data_deletion_requests" USING "btree" ("parent_id");



CREATE INDEX "idx_form_submissions_created" ON "public"."form_submissions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_learning_attempts_tenant" ON "public"."learning_attempts" USING "btree" ("tenant_id") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_network_fingerprints_hash" ON "public"."session_network_fingerprints" USING "btree" ("network_hash");



CREATE INDEX "idx_network_fingerprints_session" ON "public"."session_network_fingerprints" USING "btree" ("session_id");



CREATE INDEX "idx_parent_controls_parent" ON "public"."parent_controls" USING "btree" ("parent_id");



CREATE INDEX "idx_parent_subscriptions_customer" ON "public"."parent_subscriptions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_parent_subscriptions_parent" ON "public"."parent_subscriptions" USING "btree" ("parent_id");



CREATE INDEX "idx_playlists_school_id" ON "public"."playlists" USING "btree" ("school_id");



CREATE INDEX "idx_playlists_teacher" ON "public"."playlists" USING "btree" ("teacher_id");



CREATE INDEX "idx_round_scores_activity" ON "public"."round_scores" USING "btree" ("activity");



CREATE INDEX "idx_round_scores_session_id" ON "public"."round_scores" USING "btree" ("session_id");



CREATE UNIQUE INDEX "idx_round_scores_unique_submission" ON "public"."round_scores" USING "btree" ("session_id", "student_id", "round_number") WHERE ("student_id" IS NOT NULL);



CREATE INDEX "idx_school_invites_invited_by" ON "public"."school_invites" USING "btree" ("invited_by");



CREATE INDEX "idx_school_invites_school_id" ON "public"."school_invites" USING "btree" ("school_id");



CREATE INDEX "idx_school_teachers_invited_by" ON "public"."school_teachers" USING "btree" ("invited_by");



CREATE INDEX "idx_school_teachers_school" ON "public"."school_teachers" USING "btree" ("school_id");



CREATE INDEX "idx_school_teachers_teacher" ON "public"."school_teachers" USING "btree" ("teacher_id");



CREATE INDEX "idx_schools_admin" ON "public"."schools" USING "btree" ("admin_user_id");



CREATE INDEX "idx_sec_audit_created" ON "public"."security_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sec_audit_type" ON "public"."security_audit_log" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_sec_audit_user" ON "public"."security_audit_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_session_students_tenant" ON "public"."session_students" USING "btree" ("tenant_id") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_sessions_school_id" ON "public"."sessions" USING "btree" ("school_id");



CREATE INDEX "idx_sessions_teacher_id" ON "public"."sessions" USING "btree" ("teacher_id");



CREATE INDEX "idx_sessions_teacher_status" ON "public"."sessions" USING "btree" ("teacher_id", "status");



CREATE INDEX "idx_sessions_tenant" ON "public"."sessions" USING "btree" ("tenant_id") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_student_assignments_session_activity" ON "public"."student_activity_assignments" USING "btree" ("session_id", "activity");



CREATE INDEX "idx_student_assignments_session_student_seq" ON "public"."student_activity_assignments" USING "btree" ("session_id", "student_id", "sequence_order");



CREATE INDEX "idx_student_assignments_student" ON "public"."student_activity_assignments" USING "btree" ("student_id");



CREATE INDEX "idx_teacher_insights_expires" ON "public"."teacher_insights" USING "btree" ("expires_at");



CREATE INDEX "idx_teacher_insights_teacher" ON "public"."teacher_insights" USING "btree" ("teacher_id");



CREATE INDEX "idx_teachers_school_id" ON "public"."teachers" USING "btree" ("school_id");



CREATE INDEX "learning_attempts_device_item_idx" ON "public"."learning_attempts" USING "btree" ("device_id", "item_key", "occurred_at" DESC);



CREATE INDEX "learning_attempts_elo_pending_idx" ON "public"."learning_attempts" USING "btree" ("occurred_at") WHERE (("elo_processed_at" IS NULL) AND ("credibility_score" IS NOT NULL));



CREATE UNIQUE INDEX "learning_attempts_event_uid_uidx" ON "public"."learning_attempts" USING "btree" ("event_uid");



COMMENT ON INDEX "public"."learning_attempts_event_uid_uidx" IS 'Mirrors analytics_events_event_uid_uidx. Non-partial so PostgREST ON CONFLICT works.';



CREATE INDEX "learning_attempts_mode_idx" ON "public"."learning_attempts" USING "btree" ("game_mode", "occurred_at" DESC);



CREATE INDEX "learning_attempts_session_idx" ON "public"."learning_attempts" USING "btree" ("session_id", "occurred_at");



CREATE INDEX "learning_attempts_tier_idx" ON "public"."learning_attempts" USING "btree" ("credibility_tier", "occurred_at" DESC) WHERE ("credibility_tier" IS NOT NULL);



CREATE INDEX "learning_attempts_unscored_idx" ON "public"."learning_attempts" USING "btree" ("occurred_at" DESC) WHERE ("credibility_score" IS NULL);



CREATE INDEX "lios_adaptive_decisions_device_idx" ON "public"."lios_adaptive_decisions" USING "btree" ("device_id", "made_at" DESC);



CREATE INDEX "lios_adaptive_decisions_made_idx" ON "public"."lios_adaptive_decisions" USING "btree" ("made_at" DESC);



CREATE INDEX "lios_anomaly_detected_idx" ON "public"."lios_anomaly_fact" USING "btree" ("detected_at" DESC);



CREATE INDEX "lios_anomaly_metric_idx" ON "public"."lios_anomaly_fact" USING "btree" ("metric", "detected_at" DESC);



CREATE INDEX "lios_pipeline_runs_time_idx" ON "public"."lios_pipeline_runs" USING "btree" ("run_at" DESC);



CREATE INDEX "mastery_episode_learner_idx" ON "public"."mastery_episode_fact" USING "btree" ("device_id", "item_key", "game_mode", "transition_at" DESC);



CREATE INDEX "mastery_episode_state_idx" ON "public"."mastery_episode_fact" USING "btree" ("to_state", "transition_at" DESC);



CREATE INDEX "mastery_episode_time_idx" ON "public"."mastery_episode_fact" USING "btree" ("transition_at" DESC);



CREATE INDEX "round_scores_activity_idx" ON "public"."round_scores" USING "btree" ("session_activity_id");



CREATE INDEX "round_scores_session_idx" ON "public"."round_scores" USING "btree" ("session_id", "round");



CREATE INDEX "round_scores_student_idx" ON "public"."round_scores" USING "btree" ("student_id");



CREATE INDEX "session_activities_session_idx" ON "public"."session_activities" USING "btree" ("session_id", "started_at" DESC);



CREATE INDEX "session_students_active_idx" ON "public"."session_students" USING "btree" ("session_id") WHERE ("kicked_at" IS NULL);



CREATE INDEX "session_students_class_child_idx" ON "public"."session_students" USING "btree" ("class_child_id") WHERE ("class_child_id" IS NOT NULL);



CREATE INDEX "session_students_session_idx" ON "public"."session_students" USING "btree" ("session_id");



CREATE UNIQUE INDEX "sessions_active_code_idx" ON "public"."sessions" USING "btree" ("code") WHERE ("status" <> 'ended'::"text");



CREATE INDEX "sessions_current_activity_id_idx" ON "public"."sessions" USING "btree" ("current_activity_id");



CREATE INDEX "sessions_playlist_id_idx" ON "public"."sessions" USING "btree" ("playlist_id");



CREATE INDEX "sessions_teacher_idx" ON "public"."sessions" USING "btree" ("teacher_id", "created_at" DESC);



CREATE INDEX "skill_state_device_idx" ON "public"."skill_state" USING "btree" ("device_id", "last_attempt_at" DESC);



CREATE INDEX "skill_state_item_idx" ON "public"."skill_state" USING "btree" ("item_key", "game_mode", "theta" DESC);



CREATE OR REPLACE TRIGGER "playlists_updated_at" BEFORE UPDATE ON "public"."playlists" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "schools_updated_at" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."billing_events" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_parent_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."child_activity_summary" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_child_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."child_learning_state" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_child_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."child_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_parent_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."consent_records" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_parent_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."data_deletion_requests" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_parent_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."learning_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_child_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."parent_controls" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_parent_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."parent_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_parent_profile_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."parent_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_parent_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."playlists" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_teacher_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."round_scores" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_session_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."session_activities" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_session_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."session_students" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_session_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_teacher_tenant"();



CREATE OR REPLACE TRIGGER "stamp_tenant" BEFORE INSERT ON "public"."teacher_insights" FOR EACH ROW EXECUTE FUNCTION "public"."_stamp_teacher_tenant"();



CREATE OR REPLACE TRIGGER "teachers_updated_at" BEFORE UPDATE ON "public"."teachers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_analytics_events_promote_meta" BEFORE INSERT ON "public"."analytics_events" FOR EACH ROW EXECUTE FUNCTION "public"."analytics_events_promote_meta"();



CREATE OR REPLACE TRIGGER "trg_attempt_bumps_activity_summary" AFTER INSERT ON "public"."learning_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."bump_child_activity_summary"();



CREATE OR REPLACE TRIGGER "trg_attempt_bumps_learning_state" AFTER INSERT ON "public"."learning_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."bump_child_learning_state"();



CREATE OR REPLACE TRIGGER "trg_child_activity_summary_updated" BEFORE UPDATE ON "public"."child_activity_summary" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_child_learning_state_updated" BEFORE UPDATE ON "public"."child_learning_state" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_child_profiles_updated" BEFORE UPDATE ON "public"."child_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_class_children_touch" BEFORE UPDATE ON "public"."class_children" FOR EACH ROW EXECUTE FUNCTION "public"."touch_class_children_updated_at"();



CREATE OR REPLACE TRIGGER "trg_initialize_trial" BEFORE INSERT ON "public"."teachers" FOR EACH ROW EXECUTE FUNCTION "public"."initialize_teacher_trial"();



CREATE OR REPLACE TRIGGER "trg_learning_attempts_promote_meta" BEFORE INSERT ON "public"."learning_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."learning_attempts_promote_meta"();



CREATE OR REPLACE TRIGGER "trg_parent_controls_updated" BEFORE UPDATE ON "public"."parent_controls" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_parent_profiles_updated" BEFORE UPDATE ON "public"."parent_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_parent_subscriptions_updated" BEFORE UPDATE ON "public"."parent_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pricing_config_updated" BEFORE UPDATE ON "public"."pricing_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE CONSTRAINT TRIGGER "trg_sessions_check_active_has_activity" AFTER INSERT OR UPDATE OF "class_state", "current_activity_id" ON "public"."sessions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."_check_active_has_activity"();



CREATE OR REPLACE TRIGGER "trg_set_session_school_id" BEFORE INSERT ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_session_school_id"();



CREATE OR REPLACE TRIGGER "trg_stripe_price_map_updated" BEFORE UPDATE ON "public"."stripe_price_map" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_teacher_school_tier" AFTER INSERT OR UPDATE ON "public"."school_teachers" FOR EACH ROW EXECUTE FUNCTION "public"."sync_teacher_school_tier"();



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_events"
    ADD CONSTRAINT "billing_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."child_activity_summary"
    ADD CONSTRAINT "child_activity_summary_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_activity_summary"
    ADD CONSTRAINT "child_activity_summary_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."child_learning_state"
    ADD CONSTRAINT "child_learning_state_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_learning_state"
    ADD CONSTRAINT "child_learning_state_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."child_profiles"
    ADD CONSTRAINT "child_profiles_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."child_profiles"
    ADD CONSTRAINT "child_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."class_children"
    ADD CONSTRAINT "class_children_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classroom_default_activities"
    ADD CONSTRAINT "classroom_default_activities_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_errors"
    ADD CONSTRAINT "client_errors_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_errors"
    ADD CONSTRAINT "client_errors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consent_records"
    ADD CONSTRAINT "consent_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_target_child_id_fkey" FOREIGN KEY ("target_child_id") REFERENCES "public"."child_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_deletion_requests"
    ADD CONSTRAINT "data_deletion_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."human_observation_fact"
    ADD CONSTRAINT "human_observation_fact_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."item_difficulty"
    ADD CONSTRAINT "item_difficulty_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."learning_attempts"
    ADD CONSTRAINT "learning_attempts_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_attempts"
    ADD CONSTRAINT "learning_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lios_adaptive_decisions"
    ADD CONSTRAINT "lios_adaptive_decisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lios_anomaly_fact"
    ADD CONSTRAINT "lios_anomaly_fact_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."lios_pipeline_runs"
    ADD CONSTRAINT "lios_pipeline_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."mastery_episode_fact"
    ADD CONSTRAINT "mastery_episode_fact_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."parent_controls"
    ADD CONSTRAINT "parent_controls_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_controls"
    ADD CONSTRAINT "parent_controls_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_controls"
    ADD CONSTRAINT "parent_controls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."parent_profiles"
    ADD CONSTRAINT "parent_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_profiles"
    ADD CONSTRAINT "parent_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."parent_subscriptions"
    ADD CONSTRAINT "parent_subscriptions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parent_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parent_subscriptions"
    ADD CONSTRAINT "parent_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."platform_admins"
    ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_insights"
    ADD CONSTRAINT "platform_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."playlists"
    ADD CONSTRAINT "playlists_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."playlists"
    ADD CONSTRAINT "playlists_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."playlists"
    ADD CONSTRAINT "playlists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."pricing_config"
    ADD CONSTRAINT "pricing_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."round_scores"
    ADD CONSTRAINT "round_scores_session_activity_id_fkey" FOREIGN KEY ("session_activity_id") REFERENCES "public"."session_activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."round_scores"
    ADD CONSTRAINT "round_scores_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."round_scores"
    ADD CONSTRAINT "round_scores_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."session_students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."round_scores"
    ADD CONSTRAINT "round_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."school_invites"
    ADD CONSTRAINT "school_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."school_invites"
    ADD CONSTRAINT "school_invites_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_invites"
    ADD CONSTRAINT "school_invites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_activities"
    ADD CONSTRAINT "session_activities_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_activities"
    ADD CONSTRAINT "session_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."session_network_fingerprints"
    ADD CONSTRAINT "session_network_fingerprints_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_students"
    ADD CONSTRAINT "session_students_class_child_id_fkey" FOREIGN KEY ("class_child_id") REFERENCES "public"."class_children"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_students"
    ADD CONSTRAINT "session_students_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_students"
    ADD CONSTRAINT "session_students_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_current_activity_id_fkey" FOREIGN KEY ("current_activity_id") REFERENCES "public"."session_activities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."skill_state_history"
    ADD CONSTRAINT "skill_state_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."skill_state"
    ADD CONSTRAINT "skill_state_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."stripe_price_map"
    ADD CONSTRAINT "stripe_price_map_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."student_activity_assignments"
    ADD CONSTRAINT "student_activity_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."student_activity_assignments"
    ADD CONSTRAINT "student_activity_assignments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_activity_assignments"
    ADD CONSTRAINT "student_activity_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."session_students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_insights"
    ADD CONSTRAINT "teacher_insights_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_insights"
    ADD CONSTRAINT "teacher_insights_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_profiles"
    ADD CONSTRAINT "teacher_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Anonymous insert analytics events" ON "public"."analytics_events" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Authenticated insert observations" ON "public"."human_observation_fact" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated select item_difficulty" ON "public"."item_difficulty" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Read session activities by session" ON "public"."session_activities" FOR SELECT USING (true);



CREATE POLICY "Service role can insert form submissions" ON "public"."form_submissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert subscribers" ON "public"."newsletter_subscribers" FOR INSERT WITH CHECK (true);



CREATE POLICY "Student reads own assignments" ON "public"."student_activity_assignments" FOR SELECT TO "anon" USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Teacher manages classroom defaults" ON "public"."classroom_default_activities" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "classroom_default_activities"."session_id") AND ("s"."teacher_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "classroom_default_activities"."session_id") AND ("s"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teacher manages own student assignments" ON "public"."student_activity_assignments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "student_activity_assignments"."session_id") AND ("s"."teacher_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "student_activity_assignments"."session_id") AND ("s"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can update own row" ON "public"."teachers" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Teachers read join audit log for own sessions" ON "public"."join_audit_log" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "join_audit_log"."session_id") AND ("s"."teacher_id" = "auth"."uid"())))) OR "public"."_is_admin"()));



CREATE POLICY "adaptive_select_admin" ON "public"."lios_adaptive_decisions" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."admin_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_alerts_select" ON "public"."admin_alerts" FOR SELECT USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "admin_alerts_update" ON "public"."admin_alerts" FOR UPDATE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "admin_read_form_submissions" ON "public"."form_submissions" FOR SELECT USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "admin_read_newsletter_subscribers" ON "public"."newsletter_subscribers" FOR SELECT USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "analytics_events_select_admin" ON "public"."analytics_events" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "anomaly_select_admin" ON "public"."lios_anomaly_fact" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "attempts_child_rows" ON "public"."learning_attempts" TO "authenticated" USING ((("child_profile_id" IS NOT NULL) AND "public"."auth_owns_child"("child_profile_id"))) WITH CHECK ((("child_profile_id" IS NOT NULL) AND "public"."auth_owns_child"("child_profile_id")));



CREATE POLICY "attempts_delete" ON "public"."learning_attempts" FOR DELETE TO "authenticated", "anon" USING ((("child_profile_id" IS NULL) OR (("child_profile_id" IS NOT NULL) AND "public"."auth_owns_child"("child_profile_id"))));



CREATE POLICY "attempts_insert" ON "public"."learning_attempts" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("child_profile_id" IS NULL) OR (("child_profile_id" IS NOT NULL) AND "public"."auth_owns_child"("child_profile_id"))));



CREATE POLICY "attempts_school_rows" ON "public"."learning_attempts" TO "authenticated", "anon" USING (("child_profile_id" IS NULL)) WITH CHECK (("child_profile_id" IS NULL));



CREATE POLICY "attempts_select_scoped" ON "public"."learning_attempts" FOR SELECT TO "authenticated" USING (("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")) OR (("child_profile_id" IS NOT NULL) AND "public"."auth_owns_child"("child_profile_id"))));



CREATE POLICY "attempts_update" ON "public"."learning_attempts" FOR UPDATE TO "authenticated", "anon" USING ((("child_profile_id" IS NULL) OR (("child_profile_id" IS NOT NULL) AND "public"."auth_owns_child"("child_profile_id")))) WITH CHECK ((("child_profile_id" IS NULL) OR (("child_profile_id" IS NOT NULL) AND "public"."auth_owns_child"("child_profile_id"))));



ALTER TABLE "public"."billing_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_events_select" ON "public"."billing_events" FOR SELECT TO "authenticated" USING (("parent_id" = "auth"."uid"()));



ALTER TABLE "public"."broadcast_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cas_delete" ON "public"."child_activity_summary" FOR DELETE TO "authenticated" USING ("public"."auth_owns_child"("child_profile_id"));



CREATE POLICY "cas_insert" ON "public"."child_activity_summary" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_owns_child"("child_profile_id"));



CREATE POLICY "cas_select" ON "public"."child_activity_summary" FOR SELECT TO "authenticated" USING ("public"."auth_owns_child"("child_profile_id"));



CREATE POLICY "cas_update" ON "public"."child_activity_summary" FOR UPDATE TO "authenticated" USING ("public"."auth_owns_child"("child_profile_id")) WITH CHECK ("public"."auth_owns_child"("child_profile_id"));



CREATE POLICY "cas_write" ON "public"."child_activity_summary" TO "authenticated" USING ("public"."auth_owns_child"("child_profile_id")) WITH CHECK ("public"."auth_owns_child"("child_profile_id"));



ALTER TABLE "public"."child_activity_summary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."child_learning_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."child_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "child_profiles_delete" ON "public"."child_profiles" FOR DELETE TO "authenticated" USING (("parent_id" = "auth"."uid"()));



CREATE POLICY "child_profiles_insert" ON "public"."child_profiles" FOR INSERT TO "authenticated" WITH CHECK (("parent_id" = "auth"."uid"()));



CREATE POLICY "child_profiles_select" ON "public"."child_profiles" FOR SELECT TO "authenticated" USING (("parent_id" = "auth"."uid"()));



CREATE POLICY "child_profiles_update" ON "public"."child_profiles" FOR UPDATE TO "authenticated" USING (("parent_id" = "auth"."uid"())) WITH CHECK (("parent_id" = "auth"."uid"()));



ALTER TABLE "public"."class_children" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "class_children_all_own" ON "public"."class_children" TO "authenticated" USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."classroom_default_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_errors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_errors_insert" ON "public"."client_errors" FOR INSERT WITH CHECK (true);



CREATE POLICY "client_errors_select_admin" ON "public"."client_errors" FOR SELECT USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "cls_delete" ON "public"."child_learning_state" FOR DELETE TO "authenticated" USING ("public"."auth_owns_child"("child_profile_id"));



CREATE POLICY "cls_insert" ON "public"."child_learning_state" FOR INSERT TO "authenticated" WITH CHECK ("public"."auth_owns_child"("child_profile_id"));



CREATE POLICY "cls_select" ON "public"."child_learning_state" FOR SELECT TO "authenticated" USING ("public"."auth_owns_child"("child_profile_id"));



CREATE POLICY "cls_update" ON "public"."child_learning_state" FOR UPDATE TO "authenticated" USING ("public"."auth_owns_child"("child_profile_id")) WITH CHECK ("public"."auth_owns_child"("child_profile_id"));



CREATE POLICY "cls_write" ON "public"."child_learning_state" TO "authenticated" USING ("public"."auth_owns_child"("child_profile_id")) WITH CHECK ("public"."auth_owns_child"("child_profile_id"));



CREATE POLICY "consent_insert" ON "public"."consent_records" FOR INSERT TO "authenticated" WITH CHECK (("parent_id" = "auth"."uid"()));



ALTER TABLE "public"."consent_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consent_select" ON "public"."consent_records" FOR SELECT TO "authenticated" USING (("parent_id" = "auth"."uid"()));



CREATE POLICY "consent_update" ON "public"."consent_records" FOR UPDATE TO "authenticated" USING (("parent_id" = "auth"."uid"())) WITH CHECK (("parent_id" = "auth"."uid"()));



CREATE POLICY "controls_delete" ON "public"."parent_controls" FOR DELETE TO "authenticated" USING (("parent_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "controls_insert" ON "public"."parent_controls" FOR INSERT TO "authenticated" WITH CHECK ((("parent_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."auth_owns_child"("child_profile_id")));



CREATE POLICY "controls_select" ON "public"."parent_controls" FOR SELECT TO "authenticated" USING (("parent_id" = "auth"."uid"()));



CREATE POLICY "controls_update" ON "public"."parent_controls" FOR UPDATE TO "authenticated" USING (("parent_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ((("parent_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."auth_owns_child"("child_profile_id")));



CREATE POLICY "controls_write" ON "public"."parent_controls" TO "authenticated" USING (("parent_id" = "auth"."uid"())) WITH CHECK ((("parent_id" = "auth"."uid"()) AND "public"."auth_owns_child"("child_profile_id")));



ALTER TABLE "public"."data_deletion_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deletion_insert" ON "public"."data_deletion_requests" FOR INSERT TO "authenticated" WITH CHECK (("parent_id" = "auth"."uid"()));



CREATE POLICY "deletion_select" ON "public"."data_deletion_requests" FOR SELECT TO "authenticated" USING (("parent_id" = "auth"."uid"()));



ALTER TABLE "public"."form_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."human_observation_fact" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insights_select_own" ON "public"."teacher_insights" FOR SELECT USING ((("teacher_id" = ( SELECT "auth"."uid"() AS "uid")) OR COALESCE(( SELECT "teachers"."is_admin"
   FROM "public"."teachers"
  WHERE ("teachers"."id" = ( SELECT "auth"."uid"() AS "uid"))), false)));



CREATE POLICY "insights_update_dismiss" ON "public"."teacher_insights" FOR UPDATE USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "invites_insert_admin" ON "public"."school_invites" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."admin_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "invites_select" ON "public"."school_invites" FOR SELECT USING ((("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."admin_user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR COALESCE(( SELECT "teachers"."is_admin"
   FROM "public"."teachers"
  WHERE ("teachers"."id" = ( SELECT "auth"."uid"() AS "uid"))), false)));



ALTER TABLE "public"."item_difficulty" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "join_active_session_only" ON "public"."session_students" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_students"."session_id") AND ("s"."status" = ANY (ARRAY['lobby'::"text", 'active'::"text", 'playing'::"text"]))))));



ALTER TABLE "public"."join_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."join_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lios_adaptive_decisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lios_anomaly_fact" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lios_pipeline_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lios_runs_select_admin" ON "public"."lios_pipeline_runs" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."mastery_episode_fact" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mastery_select_admin" ON "public"."mastery_episode_fact" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."newsletter_subscribers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "observations_select_admin" ON "public"."human_observation_fact" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."parent_controls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parent_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parent_profiles_insert" ON "public"."parent_profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "parent_profiles_select" ON "public"."parent_profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "parent_profiles_update" ON "public"."parent_profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."parent_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parent_subscriptions_select" ON "public"."parent_subscriptions" FOR SELECT TO "authenticated" USING (("parent_id" = "auth"."uid"()));



ALTER TABLE "public"."platform_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_admins_no_client" ON "public"."platform_admins" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."platform_insights" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_insights_admin" ON "public"."platform_insights" FOR SELECT USING (COALESCE(( SELECT "teachers"."is_admin"
   FROM "public"."teachers"
  WHERE ("teachers"."id" = ( SELECT "auth"."uid"() AS "uid"))), false));



ALTER TABLE "public"."playlists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "playlists_delete_own" ON "public"."playlists" FOR DELETE USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "playlists_insert_pro" ON "public"."playlists" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_effective_tier"(( SELECT "auth"."uid"() AS "uid")) = ANY (ARRAY['pro'::"text", 'admin'::"text"])));



CREATE POLICY "playlists_select" ON "public"."playlists" FOR SELECT USING ((("teacher_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("is_public" = true) OR COALESCE(( SELECT "teachers"."is_admin"
   FROM "public"."teachers"
  WHERE ("teachers"."id" = ( SELECT "auth"."uid"() AS "uid"))), false)));



CREATE POLICY "playlists_update_own" ON "public"."playlists" FOR UPDATE USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."pricing_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pricing_config_read" ON "public"."pricing_config" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."round_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "round_scores_select_scoped" ON "public"."round_scores" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "round_scores"."session_id") AND ("s"."teacher_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "round_scores"."session_id") AND ("s"."status" <> 'ended'::"text"))))));



ALTER TABLE "public"."school_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."school_teachers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_teachers_insert_admin" ON "public"."school_teachers" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."admin_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "school_teachers_select" ON "public"."school_teachers" FOR SELECT USING ((("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."admin_user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("teacher_id" = ( SELECT "auth"."uid"() AS "uid")) OR COALESCE(( SELECT "teachers"."is_admin"
   FROM "public"."teachers"
  WHERE ("teachers"."id" = ( SELECT "auth"."uid"() AS "uid"))), false)));



CREATE POLICY "school_teachers_update_admin" ON "public"."school_teachers" FOR UPDATE USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."admin_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schools_insert" ON "public"."schools" FOR INSERT WITH CHECK (("admin_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "schools_select_own" ON "public"."schools" FOR SELECT USING ((("admin_user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("id" IN ( SELECT "school_teachers"."school_id"
   FROM "public"."school_teachers"
  WHERE (("school_teachers"."teacher_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("school_teachers"."status" = 'active'::"text")))) OR COALESCE(( SELECT "teachers"."is_admin"
   FROM "public"."teachers"
  WHERE ("teachers"."id" = ( SELECT "auth"."uid"() AS "uid"))), false)));



CREATE POLICY "schools_update_admin" ON "public"."schools" FOR UPDATE USING (("admin_user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "sec_audit_select_admin" ON "public"."security_audit_log" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "sec_audit_select_own" ON "public"."security_audit_log" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."security_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role write join audit log" ON "public"."join_audit_log" FOR INSERT TO "service_role" WITH CHECK (true);



ALTER TABLE "public"."session_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_network_fingerprints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_students" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_students_select_scoped" ON "public"."session_students" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_students"."session_id") AND ("s"."teacher_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_students"."session_id") AND ("s"."status" <> 'ended'::"text"))))));



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions_delete_own" ON "public"."sessions" FOR DELETE USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "sessions_insert_teacher" ON "public"."sessions" FOR INSERT TO "authenticated" WITH CHECK ((("teacher_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."has_teacher_role"() AND ("public"."get_effective_tier"(( SELECT "auth"."uid"() AS "uid")) = ANY (ARRAY['trial'::"text", 'pro'::"text", 'admin'::"text"]))));



CREATE POLICY "sessions_select" ON "public"."sessions" FOR SELECT USING ((("teacher_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")) OR ("status" <> 'ended'::"text")));



CREATE POLICY "sessions_update_own" ON "public"."sessions" FOR UPDATE USING (("teacher_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."skill_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."skill_state_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "skill_state_history_select_admin" ON "public"."skill_state_history" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "skill_state_select_admin" ON "public"."skill_state" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."stripe_price_map" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stripe_price_map_read" ON "public"."stripe_price_map" FOR SELECT TO "authenticated", "anon" USING ("active");



ALTER TABLE "public"."student_activity_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students_update_own_in_active_session" ON "public"."session_students" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_students"."session_id") AND ("s"."status" <> 'ended'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_students"."session_id") AND ("s"."status" <> 'ended'::"text")))));



CREATE POLICY "submit_score_active_session_only" ON "public"."round_scores" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "round_scores"."session_id") AND ("s"."status" = ANY (ARRAY['active'::"text", 'playing'::"text"]))))));



ALTER TABLE "public"."teacher_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teachers self-insert" ON "public"."teacher_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "teachers self-select" ON "public"."teacher_profiles" FOR SELECT USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "teachers self-update" ON "public"."teacher_profiles" FOR UPDATE USING (("auth"."uid"() = "auth_user_id")) WITH CHECK (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "teachers_insert_teacher_role" ON "public"."teachers" FOR INSERT TO "authenticated" WITH CHECK ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."has_teacher_role"()));



CREATE POLICY "teachers_select_own_or_admin" ON "public"."teachers" FOR SELECT USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."tenant_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_members_select_own" ON "public"."tenant_members" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_select_member" ON "public"."tenants" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_members" "m"
  WHERE (("m"."tenant_id" = "tenants"."id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."_check_active_has_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."_check_active_has_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_check_active_has_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_class_assert_teacher"("in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_class_assert_teacher"("in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_class_assert_teacher"("in_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_ensure_tenant"("in_kind" "text", "in_owner" "uuid", "in_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_ensure_tenant"("in_kind" "text", "in_owner" "uuid", "in_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_get_child_skills"("p_child" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_get_child_skills"("p_child" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_get_child_skills"("p_child" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_stamp_child_tenant"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_stamp_child_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_stamp_child_tenant"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_stamp_parent_profile_tenant"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_stamp_parent_profile_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_stamp_parent_profile_tenant"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_stamp_parent_tenant"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_stamp_parent_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_stamp_parent_tenant"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_stamp_session_tenant"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_stamp_session_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_stamp_session_tenant"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."_stamp_teacher_tenant"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_stamp_teacher_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_stamp_teacher_tenant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."analytics_events_promote_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."analytics_events_promote_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."analytics_events_promote_meta"() TO "service_role";



GRANT ALL ON TABLE "public"."child_profiles" TO "anon";
GRANT ALL ON TABLE "public"."child_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."child_profiles" TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_child_profile"("p_child" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_child_profile"("p_child" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_child_profile"("p_child" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_owns_child"("child" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_owns_child"("child" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_owns_child"("child" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."bump_child_activity_summary"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bump_child_activity_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_child_activity_summary"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bump_child_learning_state"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bump_child_learning_state"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."bump_child_learning_state"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_join_rate_limit"("in_ip_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_join_rate_limit"("in_ip_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_join_rate_limit"("in_ip_hash" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_delete_session"("in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_delete_session"("in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_delete_session"("in_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_end_activity"("in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_end_activity"("in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_end_activity"("in_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_end_session"("in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_end_session"("in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_end_session"("in_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_end_stale_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_end_stale_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_end_stale_sessions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_get_activity"("in_activity_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_get_activity"("in_activity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."class_get_activity"("in_activity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_get_activity"("in_activity_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_get_self"("in_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_get_self"("in_student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."class_get_self"("in_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_get_self"("in_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_get_session"("in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_get_session"("in_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."class_get_session"("in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_get_session"("in_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_join"("in_session_id" "uuid", "in_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_join"("in_session_id" "uuid", "in_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."class_join"("in_session_id" "uuid", "in_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_join"("in_session_id" "uuid", "in_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_join_by_ip"("in_session_id" "uuid", "in_name" "text", "in_client_ip" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_join_by_ip"("in_session_id" "uuid", "in_name" "text", "in_client_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."class_join_by_ip"("in_session_id" "uuid", "in_name" "text", "in_client_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_join_by_ip"("in_session_id" "uuid", "in_name" "text", "in_client_ip" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_join_with_network"("in_session_id" "uuid", "in_name" "text", "in_network_fingerprint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_join_with_network"("in_session_id" "uuid", "in_name" "text", "in_network_fingerprint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_join_with_network"("in_session_id" "uuid", "in_name" "text", "in_network_fingerprint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_kick_student"("in_session_id" "uuid", "in_student_id" "uuid", "in_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_kick_student"("in_session_id" "uuid", "in_student_id" "uuid", "in_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_kick_student"("in_session_id" "uuid", "in_student_id" "uuid", "in_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_pause_activity"("in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_pause_activity"("in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_pause_activity"("in_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_resume_activity"("in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_resume_activity"("in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_resume_activity"("in_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_set_scoreboard_visibility"("in_session_id" "uuid", "in_visible" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_set_scoreboard_visibility"("in_session_id" "uuid", "in_visible" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_set_scoreboard_visibility"("in_session_id" "uuid", "in_visible" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_start_activity"("in_session_id" "uuid", "in_activity" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_start_activity"("in_session_id" "uuid", "in_activity" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_start_activity"("in_session_id" "uuid", "in_activity" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_student_stats"("in_session_id" "uuid", "in_student_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_student_stats"("in_session_id" "uuid", "in_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_student_stats"("in_session_id" "uuid", "in_student_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_summary"("in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_summary"("in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_summary"("in_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."class_validate_join"("in_code" "text", "in_network_fingerprint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_validate_join"("in_code" "text", "in_network_fingerprint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_validate_join"("in_code" "text", "in_network_fingerprint" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."class_validate_join"("in_code" "text", "in_network_fingerprint" "text") TO "anon";



REVOKE ALL ON FUNCTION "public"."class_validate_join_by_ip"("in_code" "text", "in_client_ip" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."class_validate_join_by_ip"("in_code" "text", "in_client_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."class_validate_join_by_ip"("in_code" "text", "in_client_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."class_validate_join_by_ip"("in_code" "text", "in_client_ip" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_billing_preview"("p_interval" "text", "p_active_children" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_billing_preview"("p_interval" "text", "p_active_children" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_billing_preview"("p_interval" "text", "p_active_children" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_child_profile"("p_nickname" "text", "p_age_band" "text", "p_learning_focus" "text", "p_avatar" "text", "p_preferred_hand" "text", "p_consent_version" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_child_profile"("p_nickname" "text", "p_age_band" "text", "p_learning_focus" "text", "p_avatar" "text", "p_preferred_hand" "text", "p_consent_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_child_profile"("p_nickname" "text", "p_age_band" "text", "p_learning_focus" "text", "p_avatar" "text", "p_preferred_hand" "text", "p_consent_version" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_ab_results"("in_flag" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_ab_results"("in_flag" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_ab_results"("in_flag" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_adaptive_decisions"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_adaptive_decisions"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_adaptive_decisions"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_anomaly_check"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_anomaly_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_anomaly_check"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_classrooms"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_classrooms"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_classrooms"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_cohort_curves"("in_weeks" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_cohort_curves"("in_weeks" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_cohort_curves"("in_weeks" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_cohort_retention"("in_weeks" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_cohort_retention"("in_weeks" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_cohort_retention"("in_weeks" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_context_split"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_context_split"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_context_split"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_curriculum_coverage"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_curriculum_coverage"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_curriculum_coverage"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_daily_digest"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_daily_digest"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_daily_digest"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_engagement_deep"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_engagement_deep"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_engagement_deep"("in_days" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."dashboard_engagement_deep"("in_days" integer) TO "anon";



REVOKE ALL ON FUNCTION "public"."dashboard_errors"("row_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_errors"("row_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_errors"("row_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_executive_summary"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_executive_summary"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_executive_summary"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_export_headline"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_export_headline"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_export_headline"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_friction_engineering"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_friction_engineering"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_friction_engineering"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_funnel"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_funnel"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_funnel"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_gesture_quality"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_gesture_quality"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_gesture_quality"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_ingest_latency"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_ingest_latency"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_ingest_latency"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_latest_sessions"("row_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_latest_sessions"("row_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_latest_sessions"("row_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_live"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_live"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_live"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_mastery"("in_days" integer, "in_min_attempts" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_mastery"("in_days" integer, "in_min_attempts" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_mastery"("in_days" integer, "in_min_attempts" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_mastery_milestones"("in_days" integer, "in_min_attempts" integer, "in_threshold_pct" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_mastery_milestones"("in_days" integer, "in_min_attempts" integer, "in_threshold_pct" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_mastery_milestones"("in_days" integer, "in_min_attempts" integer, "in_threshold_pct" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_mastery_summary"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_mastery_summary"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_mastery_summary"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_mastery_v2"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_mastery_v2"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_mastery_v2"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_observability"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_observability"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_observability"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_observations"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_observations"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_observations"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_pipeline_status"("in_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_pipeline_status"("in_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_pipeline_status"("in_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_progression_for_learner"("in_device_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_progression_for_learner"("in_device_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_progression_for_learner"("in_device_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_progression_top_learners"("in_days" integer, "in_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_progression_top_learners"("in_days" integer, "in_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_progression_top_learners"("in_days" integer, "in_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."dashboard_public_proof"() TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_public_proof"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_public_proof"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_retention_deep"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_retention_deep"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_retention_deep"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_today"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_today"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_today"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_top_modes"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_top_modes"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_top_modes"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_tracker_health"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_tracker_health"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_tracker_health"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_transparency_report"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_transparency_report"("in_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_transparency_report"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_transparency_report"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_transparency_signals"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_transparency_signals"("in_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_transparency_signals"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_transparency_signals"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_trust_strip"("in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_trust_strip"("in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_trust_strip"("in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."export_family_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."export_family_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."export_family_data"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."export_parent_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."export_parent_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."export_parent_data"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_network_fingerprint"("in_ip" "text", "in_secret" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_network_fingerprint"("in_ip" "text", "in_secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_network_fingerprint"("in_ip" "text", "in_secret" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_network_fingerprint"("in_ip" "text", "in_secret" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_account_roles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_account_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_roles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_child_dashboard"("p_child" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_child_dashboard"("p_child" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_child_dashboard"("p_child" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_effective_tier"("teacher_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_effective_tier"("teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_effective_tier"("teacher_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_email_cron_key"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_email_cron_key"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_parent_overview"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_parent_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_parent_overview"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_student_assignments"("in_student_id" "uuid", "in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_student_assignments"("in_student_id" "uuid", "in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_assignments"("in_student_id" "uuid", "in_session_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_student_assignments"("in_student_id" "uuid", "in_session_id" "uuid") TO "anon";



REVOKE ALL ON FUNCTION "public"."get_student_class_state"("in_student_id" "uuid", "in_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_student_class_state"("in_student_id" "uuid", "in_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_class_state"("in_student_id" "uuid", "in_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_class_state"("in_student_id" "uuid", "in_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_weekly_summary"("p_child" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_weekly_summary"("p_child" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_weekly_summary"("p_child" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_parent_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_parent_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_parent_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_teacher_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_teacher_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_teacher_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_parent_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_parent_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_parent_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_teacher_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_teacher_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_teacher_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."initialize_teacher_trial"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."initialize_teacher_trial"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_teacher_trial"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_user"("check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_user"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"("check_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_platform_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_school_admin"("in_tenant" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_school_admin"("in_tenant" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_school_admin"("in_tenant" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."landing_public_proof"() TO "anon";
GRANT ALL ON FUNCTION "public"."landing_public_proof"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."landing_public_proof"() TO "service_role";



GRANT ALL ON FUNCTION "public"."learning_attempts_promote_meta"() TO "anon";
GRANT ALL ON FUNCTION "public"."learning_attempts_promote_meta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."learning_attempts_promote_meta"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."lios_detect_anomalies_v1"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lios_detect_anomalies_v1"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lios_detect_anomalies_v1"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."lios_detect_friction_v1"("p_lookback" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lios_detect_friction_v1"("p_lookback" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lios_detect_friction_v1"("p_lookback" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."lios_detect_mastery_episodes_v1"("p_lookback" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lios_detect_mastery_episodes_v1"("p_lookback" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lios_detect_mastery_episodes_v1"("p_lookback" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."lios_recommend_next"("p_device_id" "text", "p_session_id" "uuid", "p_game_mode" "text", "p_current_item" "text", "p_was_correct" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lios_recommend_next"("p_device_id" "text", "p_session_id" "uuid", "p_game_mode" "text", "p_current_item" "text", "p_was_correct" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lios_recommend_next"("p_device_id" "text", "p_session_id" "uuid", "p_game_mode" "text", "p_current_item" "text", "p_was_correct" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."lios_record_observation"("p_device_id" "text", "p_focus_tags" "text"[], "p_affect_tags" "text"[], "p_independence_tags" "text"[], "p_social_tags" "text"[], "p_notable_tags" "text"[], "p_session_id" "uuid", "p_classroom_code" "text", "p_age_band" "text", "p_note" "text", "p_observer_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lios_record_observation"("p_device_id" "text", "p_focus_tags" "text"[], "p_affect_tags" "text"[], "p_independence_tags" "text"[], "p_social_tags" "text"[], "p_notable_tags" "text"[], "p_session_id" "uuid", "p_classroom_code" "text", "p_age_band" "text", "p_note" "text", "p_observer_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lios_record_observation"("p_device_id" "text", "p_focus_tags" "text"[], "p_affect_tags" "text"[], "p_independence_tags" "text"[], "p_social_tags" "text"[], "p_notable_tags" "text"[], "p_session_id" "uuid", "p_classroom_code" "text", "p_age_band" "text", "p_note" "text", "p_observer_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."lios_run_pipeline"("p_lookback" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lios_run_pipeline"("p_lookback" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lios_run_pipeline"("p_lookback" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."lios_score_unscored_attempts"("p_lookback" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lios_score_unscored_attempts"("p_lookback" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lios_score_unscored_attempts"("p_lookback" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."lios_update_elo_v1"("p_lookback" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lios_update_elo_v1"("p_lookback" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lios_update_elo_v1"("p_lookback" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_security_event"("in_event_type" "text", "in_metadata" "jsonb", "in_ip_hash" "text", "in_ua_hash" "text", "in_country" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_security_event"("in_event_type" "text", "in_metadata" "jsonb", "in_ip_hash" "text", "in_ua_hash" "text", "in_country" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_security_event"("in_event_type" "text", "in_metadata" "jsonb", "in_ip_hash" "text", "in_ua_hash" "text", "in_country" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."normalize_ip_for_network"("in_ip" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."normalize_ip_for_network"("in_ip" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_ip_for_network"("in_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_ip_for_network"("in_ip" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."parent_has_access"("p_parent" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."parent_has_access"("p_parent" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."parent_has_access"("p_parent" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."parent_subscription_state"("p_parent" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."parent_subscription_state"("p_parent" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."parent_subscription_state"("p_parent" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."pricing_amount_cents"("p_interval" "text", "p_active_children" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."pricing_amount_cents"("p_interval" "text", "p_active_children" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pricing_amount_cents"("p_interval" "text", "p_active_children" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_account_deletion_requests"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_account_deletion_requests"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_consent"("p_consent_type" "text", "p_consent_version" "text", "p_granted" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_consent"("p_consent_type" "text", "p_consent_version" "text", "p_granted" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_consent"("p_consent_type" "text", "p_consent_version" "text", "p_granted" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_parent"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_parent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_parent"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_teacher"("in_full_name" "text", "in_school_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_teacher"("in_full_name" "text", "in_school_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_teacher"("in_full_name" "text", "in_school_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_account_deletion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_account_deletion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_account_deletion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_child_deletion"("p_child" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_child_deletion"("p_child" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_child_deletion"("p_child" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."restore_child_profile"("p_child" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_child_profile"("p_child" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_child_profile"("p_child" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."session_lookup_by_code"("in_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."session_lookup_by_code"("in_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."session_lookup_by_code"("in_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."session_lookup_by_code"("in_code" "text") TO "anon";



REVOKE ALL ON FUNCTION "public"."session_set_network_fingerprint"("in_session_id" "uuid", "in_teacher_ip" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."session_set_network_fingerprint"("in_session_id" "uuid", "in_teacher_ip" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."session_set_network_fingerprint"("in_session_id" "uuid", "in_teacher_ip" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."session_validate_network"("in_session_id" "uuid", "in_network_fingerprint" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."session_validate_network"("in_session_id" "uuid", "in_network_fingerprint" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."session_validate_network"("in_session_id" "uuid", "in_network_fingerprint" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_classroom_default_activities"("in_session_id" "uuid", "in_activities" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_classroom_default_activities"("in_session_id" "uuid", "in_activities" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_classroom_default_activities"("in_session_id" "uuid", "in_activities" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_session_school_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_session_school_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_session_school_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_student_assignments"("in_session_id" "uuid", "in_student_id" "uuid", "in_activities" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_student_assignments"("in_session_id" "uuid", "in_student_id" "uuid", "in_activities" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_student_assignments"("in_session_id" "uuid", "in_student_id" "uuid", "in_activities" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_parent_trial"("p_parent" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_parent_trial"("p_parent" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_teacher_school_tier"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_teacher_school_tier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_teacher_school_tier"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_class_children_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_class_children_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_class_children_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_tenant_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_tenant_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_tenant_ids"() TO "service_role";



GRANT ALL ON TABLE "public"."admin_alerts" TO "anon";
GRANT ALL ON TABLE "public"."admin_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events_real" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events_real" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events_real" TO "service_role";



GRANT ALL ON TABLE "public"."billing_events" TO "anon";
GRANT ALL ON TABLE "public"."billing_events" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_events" TO "service_role";



GRANT ALL ON TABLE "public"."broadcast_log" TO "anon";
GRANT ALL ON TABLE "public"."broadcast_log" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcast_log" TO "service_role";



GRANT ALL ON TABLE "public"."child_activity_summary" TO "anon";
GRANT ALL ON TABLE "public"."child_activity_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."child_activity_summary" TO "service_role";



GRANT ALL ON TABLE "public"."child_learning_state" TO "anon";
GRANT ALL ON TABLE "public"."child_learning_state" TO "authenticated";
GRANT ALL ON TABLE "public"."child_learning_state" TO "service_role";



GRANT ALL ON TABLE "public"."class_children" TO "anon";
GRANT ALL ON TABLE "public"."class_children" TO "authenticated";
GRANT ALL ON TABLE "public"."class_children" TO "service_role";



GRANT ALL ON TABLE "public"."classroom_default_activities" TO "anon";
GRANT ALL ON TABLE "public"."classroom_default_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."classroom_default_activities" TO "service_role";



GRANT ALL ON TABLE "public"."client_errors" TO "anon";
GRANT ALL ON TABLE "public"."client_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."client_errors" TO "service_role";



GRANT ALL ON TABLE "public"."consent_records" TO "anon";
GRANT ALL ON TABLE "public"."consent_records" TO "authenticated";
GRANT ALL ON TABLE "public"."consent_records" TO "service_role";



GRANT ALL ON TABLE "public"."item_difficulty" TO "anon";
GRANT ALL ON TABLE "public"."item_difficulty" TO "authenticated";
GRANT ALL ON TABLE "public"."item_difficulty" TO "service_role";



GRANT ALL ON TABLE "public"."skill_state" TO "anon";
GRANT ALL ON TABLE "public"."skill_state" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_state" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_learner_progression" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_learner_progression" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_learner_progression" TO "service_role";



GRANT ALL ON TABLE "public"."learning_attempts" TO "anon";
GRANT ALL ON TABLE "public"."learning_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_trust_composition" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_trust_composition" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_trust_composition" TO "service_role";



GRANT ALL ON TABLE "public"."data_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."form_submissions" TO "anon";
GRANT ALL ON TABLE "public"."form_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."form_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."human_observation_fact" TO "anon";
GRANT ALL ON TABLE "public"."human_observation_fact" TO "authenticated";
GRANT ALL ON TABLE "public"."human_observation_fact" TO "service_role";



GRANT ALL ON TABLE "public"."join_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."join_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."join_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."lios_adaptive_decisions" TO "anon";
GRANT ALL ON TABLE "public"."lios_adaptive_decisions" TO "authenticated";
GRANT ALL ON TABLE "public"."lios_adaptive_decisions" TO "service_role";



GRANT ALL ON TABLE "public"."lios_anomaly_fact" TO "anon";
GRANT ALL ON TABLE "public"."lios_anomaly_fact" TO "authenticated";
GRANT ALL ON TABLE "public"."lios_anomaly_fact" TO "service_role";



GRANT ALL ON TABLE "public"."lios_pipeline_runs" TO "anon";
GRANT ALL ON TABLE "public"."lios_pipeline_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."lios_pipeline_runs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."lios_pipeline_runs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."lios_pipeline_runs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."lios_pipeline_runs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mastery_episode_fact" TO "anon";
GRANT ALL ON TABLE "public"."mastery_episode_fact" TO "authenticated";
GRANT ALL ON TABLE "public"."mastery_episode_fact" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."parent_controls" TO "anon";
GRANT ALL ON TABLE "public"."parent_controls" TO "authenticated";
GRANT ALL ON TABLE "public"."parent_controls" TO "service_role";



GRANT ALL ON TABLE "public"."parent_profiles" TO "anon";
GRANT ALL ON TABLE "public"."parent_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."parent_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."parent_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."parent_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."parent_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."platform_admins" TO "service_role";



GRANT ALL ON TABLE "public"."platform_insights" TO "anon";
GRANT ALL ON TABLE "public"."platform_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_insights" TO "service_role";



GRANT ALL ON TABLE "public"."playlists" TO "anon";
GRANT ALL ON TABLE "public"."playlists" TO "authenticated";
GRANT ALL ON TABLE "public"."playlists" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_config" TO "anon";
GRANT ALL ON TABLE "public"."pricing_config" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_config" TO "service_role";



GRANT ALL ON TABLE "public"."round_scores" TO "anon";
GRANT ALL ON TABLE "public"."round_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."round_scores" TO "service_role";



GRANT ALL ON TABLE "public"."school_invites" TO "anon";
GRANT ALL ON TABLE "public"."school_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."school_invites" TO "service_role";



GRANT ALL ON TABLE "public"."school_teachers" TO "anon";
GRANT ALL ON TABLE "public"."school_teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."school_teachers" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."security_audit_log" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."security_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."security_audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."security_audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."security_audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."security_audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."session_activities" TO "anon";
GRANT ALL ON TABLE "public"."session_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."session_activities" TO "service_role";



GRANT ALL ON TABLE "public"."session_network_fingerprints" TO "service_role";



GRANT ALL ON TABLE "public"."session_students" TO "anon";
GRANT ALL ON TABLE "public"."session_students" TO "authenticated";
GRANT ALL ON TABLE "public"."session_students" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT SELECT("activity_version") ON TABLE "public"."sessions" TO "anon";



GRANT ALL ON TABLE "public"."skill_state_history" TO "anon";
GRANT ALL ON TABLE "public"."skill_state_history" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_state_history" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_price_map" TO "anon";
GRANT ALL ON TABLE "public"."stripe_price_map" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_price_map" TO "service_role";



GRANT ALL ON TABLE "public"."student_activity_assignments" TO "anon";
GRANT ALL ON TABLE "public"."student_activity_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."student_activity_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_insights" TO "anon";
GRANT ALL ON TABLE "public"."teacher_insights" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_insights" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_profiles" TO "anon";
GRANT ALL ON TABLE "public"."teacher_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."teachers" TO "anon";
GRANT ALL ON TABLE "public"."teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."teachers" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_members" TO "anon";
GRANT ALL ON TABLE "public"."tenant_members" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_members" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."v_activity_performance" TO "anon";
GRANT ALL ON TABLE "public"."v_activity_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."v_activity_performance" TO "service_role";



GRANT ALL ON TABLE "public"."v_engagement_metrics" TO "anon";
GRANT ALL ON TABLE "public"."v_engagement_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."v_engagement_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."v_growth_metrics" TO "anon";
GRANT ALL ON TABLE "public"."v_growth_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."v_growth_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."v_school_overview" TO "anon";
GRANT ALL ON TABLE "public"."v_school_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."v_school_overview" TO "service_role";



GRANT ALL ON TABLE "public"."v_teacher_session_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_teacher_session_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_teacher_session_stats" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







