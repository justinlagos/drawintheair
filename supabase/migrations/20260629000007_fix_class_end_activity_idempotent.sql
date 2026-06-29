-- ════════════════════════════════════════════════════════════════════
-- Fix: class_end_activity is now idempotent (no scary "no active activity")
-- ════════════════════════════════════════════════════════════════════
-- This is a CORE conductor fix (not behind the tokenJoinV1 flag): it affects
-- every class. Previously, ending an activity when none was active raised
-- 'no active activity', surfacing a red HTTP 400 banner to the teacher on a
-- stale/double "End activity" (e.g. a dropped realtime update). Now it settles
-- the session into 'between_activities' regardless and reports already_ended,
-- so the teacher never sees an error for a harmless no-op. Validated on STAGING.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.class_end_activity(in_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare cur uuid; new_ver int;
begin
    perform public._class_assert_teacher(in_session_id);

    select current_activity_id into cur from public.sessions where id = in_session_id;
    if cur is null then
        select id into cur from public.session_activities
        where session_id = in_session_id and state in ('starting','playing','paused','results')
        order by started_at desc limit 1;
    end if;

    -- Close the active activity if there is one (otherwise this is a harmless no-op).
    if cur is not null then
        update public.session_activities
        set state = 'ended', ended_at = coalesce(ended_at, now())
        where id = cur;
    end if;

    -- Idempotent: always settle the session into between_activities (unless it
    -- has already ended), whether or not an active activity was found.
    update public.sessions
    set class_state = case when class_state = 'ended' then class_state else 'between_activities' end,
        current_activity_id = null,
        status = case when status = 'ended' then status else 'lobby' end,
        activity = null,
        activity_version = activity_version + 1,
        updated_at = now()
    where id = in_session_id
    returning activity_version into new_ver;

    return jsonb_build_object(
        'session_activity_id', cur,
        'state', 'ended',
        'class_state', 'between_activities',
        'status', 'lobby',
        'activity_version', new_ver,
        'already_ended', (cur is null)
    );
end;
$function$;
