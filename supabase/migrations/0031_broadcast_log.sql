-- =====================================================================
-- 0031_broadcast_log
--
-- Idempotency + audit for one-off announcement broadcasts sent via the
-- `announce` edge function (Resend). One row per (campaign, email) that
-- was successfully accepted by the provider, so re-invoking a campaign
-- never emails the same person twice.
--
-- Additive and reversible. RLS enabled with NO policies, so only the
-- service-role (used by the edge function) can read or write it; anon
-- and authenticated clients have no access.
--
-- ROLLBACK: drop table public.broadcast_log;
-- =====================================================================

create table if not exists public.broadcast_log (
  campaign    text        not null,
  email       text        not null,
  status      text        not null default 'sent',
  provider_id text,
  created_at  timestamptz not null default now(),
  primary key (campaign, email)
);

alter table public.broadcast_log enable row level security;

comment on table public.broadcast_log is
  'Per-recipient send ledger for announcement broadcasts (announce edge function). Service-role only.';
