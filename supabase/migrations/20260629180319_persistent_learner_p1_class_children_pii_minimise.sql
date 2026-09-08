-- ════════════════════════════════════════════════════════════════════
-- Persistent learner — P1: class_children PII minimisation (Decision D3)
-- ════════════════════════════════════════════════════════════════════
--
-- STATUS: NOT APPLIED. Authored on branch feat/persistent-class-learner.
-- Apply order: STAGING FIRST, behind disabled feature work, and ONLY to
-- production after the §0 legal/privacy gate (R-L1–R-L5) in
-- docs/PERSISTENT_CLASS_LEARNER_MIGRATION_PLAN.md is closed.
--
-- WHY: live `class_children.first_name` is NOT NULL and stores a child's
-- real first name — fuller personal data than Decision D3 allows
-- ("first name or nickname and avatar only"). This migration makes the
-- table able to operate on minimised data. It is ADDITIVE and REVERSIBLE.
-- It does NOT itself wire joins to class_children (that is a later,
-- separately-gated step) and does NOT auto-erase existing data.
--
-- VERIFIED against live project fmrsfjxwswzhvicylaph (2026-06-29):
--   class_children(id, teacher_id, first_name NOT NULL, nickname, age_band,
--   notes, archived, created_at, updated_at, tenant_id); 1 row; RLS = 1
--   policy (ALL). `notes` is free text and may also contain PII (flagged).
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Additive columns (safe) ───────────────────────────────────────
alter table public.class_children
    add column if not exists display_name text,   -- shown to teacher/child; nickname or short first name
    add column if not exists avatar_seed  text;   -- visual token for child-friendly selection (D2)

-- ── 2. Relax the real-name requirement (reversible) ───────────────────
-- Stop REQUIRING a full first name. App code must move to display_name +
-- avatar_seed. first_name is retained (nullable) only until backfill +
-- legal sign-off decide its fate in §3 below.
alter table public.class_children
    alter column first_name drop not null;

comment on column public.class_children.first_name is
  'DEPRECATED / PII: do not collect real first names. Use display_name + avatar_seed. Pending erasure per Decision D3 after legal sign-off.';
comment on column public.class_children.notes is
  'PII RISK: free text. Review for personal data; consider removing/locking down per Decision D3.';

-- ── 3. Data minimisation of EXISTING rows — DO NOT RUN UNTIL R-L SIGN-OFF
-- Children's personal data. Left commented intentionally; run only after
-- legal/privacy approval and on staging first. Backfills a display token
-- from nickname (falling back to a generic label, NOT the real name) and
-- then erases the real first name.
--
-- update public.class_children
--    set display_name = coalesce(nullif(nickname, ''), 'Learner'),
--        first_name   = null
--  where first_name is not null;
--
-- (Decide separately whether to null/redact `notes`.)

-- ── ROLLBACK (reversible) ─────────────────────────────────────────────
-- alter table public.class_children alter column first_name set not null; -- only if no NULLs exist
-- alter table public.class_children drop column if exists display_name;
-- alter table public.class_children drop column if exists avatar_seed;
