-- WP1A.2 staging sync 01: extensions present in production but missing in staging
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
