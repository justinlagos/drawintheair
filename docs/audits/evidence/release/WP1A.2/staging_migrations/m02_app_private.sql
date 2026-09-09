-- WP1A.2 staging sync 02: app_private schema + secrets table (structure only; synthetic placeholder value, NOT the production secret)
CREATE SCHEMA IF NOT EXISTS app_private AUTHORIZATION postgres;
CREATE TABLE IF NOT EXISTS app_private.secrets (
  name text NOT NULL,
  value text NOT NULL
);
ALTER TABLE app_private.secrets ADD CONSTRAINT secrets_pkey PRIMARY KEY (name);
INSERT INTO app_private.secrets (name, value) VALUES ('email_cron_key', 'staging-synthetic-cron-key-not-production')
ON CONFLICT (name) DO NOTHING;
