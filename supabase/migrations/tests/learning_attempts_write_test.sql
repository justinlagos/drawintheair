-- ═══════════════════════════════════════════════════════════════════════════
-- learning_attempts_write_test.sql  (M1 regression test)
--
-- Run AFTER applying 0023_learning_attempts_write_hardening.sql. Asserts that
-- anon can no longer UPDATE/DELETE learning_attempts, while anon INSERT (for
-- free-play) and authenticated owner access remain.
--
-- Usage (psql): \i supabase/migrations/tests/learning_attempts_write_test.sql
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  del_roles text;
  upd_roles text;
  ins_roles text;
begin
  select roles::text into del_roles from pg_policies
    where tablename='learning_attempts' and policyname='attempts_delete';
  select roles::text into upd_roles from pg_policies
    where tablename='learning_attempts' and policyname='attempts_update';
  select roles::text into ins_roles from pg_policies
    where tablename='learning_attempts' and policyname='attempts_insert';

  assert del_roles = '{authenticated}',
    format('attempts_delete must be {authenticated} only, got %s', del_roles);
  assert upd_roles = '{authenticated}',
    format('attempts_update must be {authenticated} only, got %s', upd_roles);
  assert ins_roles = '{anon,authenticated}',
    format('attempts_insert must remain {anon,authenticated}, got %s', ins_roles);

  -- The INSERT check must no longer be a blanket "child_profile_id IS NULL";
  -- it must reference the sessions table (active-session gating).
  assert (select with_check ~ 'sessions' from pg_policies
          where tablename='learning_attempts' and policyname='attempts_insert'),
    'attempts_insert WITH CHECK must gate school rows on an active session';

  raise notice 'M1 LEARNING_ATTEMPTS WRITE TEST PASSED';
end $$;
