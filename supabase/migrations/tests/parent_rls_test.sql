-- parent_rls_test.sql
-- Manual smoke test for the parent-subscription RLS policies added in
-- migrations 0004–0007. Run with the Supabase SQL editor while signed in
-- as a normal authenticated user (NOT service role) for the "owner" half
-- of each test, then again as a different user for the "intruder" half.
--
-- This file is intentionally `.sql` (not part of any test runner) so it can
-- be run interactively in the dashboard, against a freshly-seeded staging
-- DB, without dragging in a Node/Deno test framework.
--
-- Steps:
--   1. Sign in as parent A (Auth → users → impersonate) in the SQL editor.
--   2. Run sections labelled "AS PARENT A".
--   3. Sign in as parent B and run sections labelled "AS PARENT B".
--   4. Confirm each EXPECT comment matches.
--
-- Anything that EXPECTs "0 rows" but returns more = RLS hole. Stop and
-- investigate before deploying.

-- =========================================================================
-- AS PARENT A — set up some data
-- =========================================================================
-- 1A. Insert (or upsert) my own profile row. RLS allows this because id = auth.uid().
insert into parent_profiles (id, email, display_name)
values (auth.uid(), 'parent-a@example.com', 'Parent A')
on conflict (id) do nothing;

-- 1B. Create a child profile for me.
insert into child_profiles (parent_id, nickname, age_band)
values (auth.uid(), 'Amara', '5-6')
returning id; -- copy this id for later steps.

-- 1C. Verify I can read MY profile + MY children.
select count(*) as my_profile from parent_profiles where id = auth.uid();        -- EXPECT 1
select count(*) as my_children from child_profiles where parent_id = auth.uid(); -- EXPECT ≥ 1

-- 1D. Try to read the price table (anonymous-readable).
select count(*) as price_rows from stripe_price_map where active;                 -- EXPECT 4

-- 1E. Try to write a billing_events row from the client. Should be blocked.
do $$ begin
  begin
    insert into billing_events (parent_id, type) values (auth.uid(), 'manual_test');
    raise notice 'FAIL: client managed to insert into billing_events';
  exception when others then
    raise notice 'PASS: billing_events insert correctly blocked (%)', sqlerrm;
  end;
end $$;

-- =========================================================================
-- AS PARENT B — try to read parent A's data
-- =========================================================================
-- 2A. Insert my own profile.
insert into parent_profiles (id, email, display_name)
values (auth.uid(), 'parent-b@example.com', 'Parent B')
on conflict (id) do nothing;

-- 2B. Try to read parent A's children. Must return zero rows.
select count(*) as leaked_children
from child_profiles
where parent_id != auth.uid();                                                   -- EXPECT 0

-- 2C. Try to read parent A's controls. Must return zero rows.
select count(*) as leaked_controls
from parent_controls
where parent_id != auth.uid();                                                   -- EXPECT 0

-- 2D. Try to read parent A's subscription. Must return zero rows.
select count(*) as leaked_subs
from parent_subscriptions
where parent_id != auth.uid();                                                   -- EXPECT 0

-- 2E. Try to use the dashboard RPC scoped at A. Must error/return null.
--     get_parent_overview is self-scoped to auth.uid(), so it should
--     return *my* (empty) view, not parent A's.
select get_parent_overview();                                                    -- EXPECT my own data only

-- 2F. Try to call request_child_deletion on parent A's child id (replace UUID).
--     Must raise 'not found'.
-- select request_child_deletion('A-CHILD-UUID-HERE'::uuid);

-- =========================================================================
-- AS SERVICE ROLE — sanity check that webhook writes still work
-- =========================================================================
-- This block ONLY runs successfully with service_role credentials.
-- It demonstrates that policies don't accidentally block backend writes.
-- (Skip unless running the test as service_role.)
--
-- insert into billing_events (parent_id, stripe_event_id, type)
-- values ('A-PARENT-UUID-HERE'::uuid, 'evt_test_'||gen_random_uuid()::text, 'service_test');
