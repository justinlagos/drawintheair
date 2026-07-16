-- 20260716_pilot_class_3760_reconcile.sql
-- ============================================================================
-- ONE-OFF DATA REPAIR - pilot teacher's class (session code 3760).
-- Run ONCE against prod fmrsfjxwswzhvicylaph, only with founder approval,
-- and only AFTER migration 20260716000001 (class_join v2) is applied.
--
-- What it does (dry-run verified 16 Jul 2026):
--   MERGE  3 duplicate rejoin rows created by the old counter-suffix logic:
--          Kaito2 -> Kaito, Daniel2 -> Daniel, Faithwin2 -> Faithwin
--          (re-points round_scores / student_activity_assignments /
--           class_session_tokens, then deletes the duplicate row)
--   LINK   26 session_students rows to the teacher's class_children roster
--          where the name matches exactly one unarchived child.
--   SKIP   Evelyn (2 roster children with that name - ambiguous, never
--          guessed), Sena + Sofia (no exact roster match; "Sofia-Rose" is
--          not assumed).
--
-- Scope guard: everything is constrained to the one session and teacher.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Scope
-- ---------------------------------------------------------------------------
create temp table _scope on commit drop as
select '4ce5fd6c-49c2-44a9-a4f2-14605e304b69'::uuid as session_id,
       '814e9d67-f179-4730-90d0-2d53c1b22751'::uuid as teacher_id;

-- ---------------------------------------------------------------------------
-- 1. Duplicate pairs: a row whose name is <base><digits> where <base> also
--    exists in the same session, keeping the OLDER row as the original.
-- ---------------------------------------------------------------------------
create temp table _dupes on commit drop as
select d.id as dupe_id, o.id as orig_id, d.name as dupe_name, o.name as orig_name
from public.session_students d
join public.session_students o
  on o.session_id = d.session_id
 and lower(btrim(o.name)) = lower(btrim(regexp_replace(d.name, '[0-9]+$', '')))
 and o.id <> d.id
 and o.joined_at < d.joined_at
where d.session_id = (select session_id from _scope)
  and d.name ~ '[0-9]+$';

-- Expect exactly 3 rows (Kaito2, Daniel2, Faithwin2). Abort otherwise.
do $$
declare n int;
begin
  select count(*) into n from _dupes;
  if n <> 3 then
    raise exception 'expected 3 duplicate rows, found % - aborting', n;
  end if;
end $$;

-- 1a. Re-point child-owned data from dupe to original.
--     round_scores has UNIQUE(session_id, student_id, round): move only
--     non-colliding rows; colliding dupes (same round already scored on the
--     original) are dropped with the dupe row via ON DELETE CASCADE / below.
update public.round_scores rs
set student_id = d.orig_id
from _dupes d
where rs.student_id = d.dupe_id
  and not exists (
    select 1 from public.round_scores k
    where k.session_id = rs.session_id
      and k.student_id = d.orig_id
      and k.round = rs.round
  );
delete from public.round_scores rs using _dupes d where rs.student_id = d.dupe_id;

update public.student_activity_assignments saa
set student_id = d.orig_id
from _dupes d
where saa.student_id = d.dupe_id;

update public.class_session_tokens cst
set claimed_session_student_id = d.orig_id
from _dupes d
where cst.claimed_session_student_id = d.dupe_id;

-- 1b. Remove the duplicate roster rows.
delete from public.session_students ss using _dupes d where ss.id = d.dupe_id;

-- ---------------------------------------------------------------------------
-- 2. Link remaining unlinked rows to the roster - exact, unambiguous matches
--    only (same rule as class_join v2).
-- ---------------------------------------------------------------------------
update public.session_students ss
set class_child_id = m.child_id
from (
  select ss2.id as row_id, min(cc.id::text)::uuid as child_id
  from public.session_students ss2
  join public.class_children cc
    on cc.teacher_id = (select teacher_id from _scope)
   and cc.archived = false
   and lower(btrim(ss2.name)) in (
         lower(btrim(coalesce(cc.first_name, ''))),
         lower(btrim(coalesce(cc.nickname,  '')))
       )
  where ss2.session_id = (select session_id from _scope)
    and ss2.class_child_id is null
  group by ss2.id
  having count(distinct cc.id) = 1
) m
where ss.id = m.row_id;

-- ---------------------------------------------------------------------------
-- 3. Verification (inspect before COMMIT if run interactively)
-- ---------------------------------------------------------------------------
do $$
declare v_rows int; v_linked int; v_dupes int;
begin
  select count(*),
         count(*) filter (where class_child_id is not null)
    into v_rows, v_linked
  from public.session_students
  where session_id = (select session_id from _scope);

  select count(*) into v_dupes
  from public.session_students
  where session_id = (select session_id from _scope)
    and name in ('Kaito2', 'Daniel2', 'Faithwin2');

  raise notice 'post-repair: % rows, % linked to roster, % leftover dupes',
    v_rows, v_linked, v_dupes;
  if v_dupes <> 0 then
    raise exception 'duplicates still present - aborting';
  end if;
  if v_linked < 26 then
    raise exception 'expected >= 26 linked rows, got % - aborting', v_linked;
  end if;
end $$;

commit;
