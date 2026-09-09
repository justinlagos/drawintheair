# Gate 1A runbook, founder-run (WP1A.1 recovery position, WP1A.2 synthetic staging)

Run on your Mac in Terminal. Nothing here goes through chat. The database password never leaves your machine.

Prerequisites: Supabase CLI (`brew install supabase/tap/supabase`), `age` (`brew install age`), `rclone` (`brew install rclone`), and you are logged in (`supabase login`).

Slot arithmetic: free plan allows 2 active projects. Production `fmrsfjxwswzhvicylaph` is one. Staging `dcivdrhxeaiulbbhsgfv` is paused and does not count while paused. Order below: dump, restore drill into a temporary project (slot 2), delete it, then unpause staging into slot 2.

## Step 1: first dump (10 min)

Get the database password from Supabase dashboard, Project Settings, Database. If you do not know it, reset it there (this only affects direct connections; the app uses the anon key and is unaffected).

```bash
mkdir -p ~/dia-backups && cd ~/dia-backups
export PGPASSWORD='<paste, then clear history: history -c>'
DBURL="postgresql://postgres.fmrsfjxwswzhvicylaph:${PGPASSWORD}@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
supabase db dump --db-url "$DBURL" -f "schema-$STAMP.sql"
supabase db dump --db-url "$DBURL" --data-only --use-copy -f "data-$STAMP.sql"
supabase db dump --db-url "$DBURL" --role-only -f "roles-$STAMP.sql"
ls -la
```

If the pooler host differs, copy the exact "Session pooler" connection string from the dashboard and swap it in. Session mode (port 5432), not transaction mode (6543).

## Step 2: encrypt at rest (2 min)

```bash
age-keygen -o ~/.dia-backup-key.txt          # ONE time. Back this key up in your password manager. Lose it, lose the backups.
PUB=$(grep 'public key' ~/.dia-backup-key.txt | awk '{print $4}')
tar czf - schema-$STAMP.sql data-$STAMP.sql roles-$STAMP.sql | age -r "$PUB" -o "dia-prod-$STAMP.tar.gz.age"
rm schema-$STAMP.sql data-$STAMP.sql roles-$STAMP.sql   # plaintext contains child first names; do not keep it
```

## Step 3: off-site copy (5 min)

Google Drive, in a folder only you can see (you already own it, no new spend):

```bash
rclone config        # new remote "gdrive", type drive, default scope, follow the browser auth
rclone mkdir gdrive:DIA-Backups
rclone copy "dia-prod-$STAMP.tar.gz.age" gdrive:DIA-Backups/
rclone ls gdrive:DIA-Backups/
```

## Step 4: restore drill into a temporary project (20 min)

Dashboard: New project, name `dia-restore-drill`, region London, any strong password (throwaway). Wait until it is Active. Copy its session-pooler connection string.

```bash
TMPURL='<temporary project connection string>'
age -d -i ~/.dia-backup-key.txt "dia-prod-$STAMP.tar.gz.age" | tar xzf -
psql "$TMPURL" -v ON_ERROR_STOP=0 -f roles-$STAMP.sql
psql "$TMPURL" -v ON_ERROR_STOP=1 -f schema-$STAMP.sql
psql "$TMPURL" -v ON_ERROR_STOP=1 -f data-$STAMP.sql
# verify counts (run the same on prod via the dashboard SQL editor and compare)
psql "$TMPURL" -c "select 'sessions', count(*) from sessions union all select 'session_students', count(*) from session_students union all select 'class_children', count(*) from class_children union all select 'subscriptions', count(*) from subscriptions union all select 'analytics_events', count(*) from analytics_events union all select 'auth.users', count(*) from auth.users;"
rm schema-$STAMP.sql data-$STAMP.sql roles-$STAMP.sql
```

Paste the two count tables into `docs/audits/evidence/release/WP1A/drill-$STAMP.md`. Then dashboard: delete project `dia-restore-drill`. Confirm it is gone. Slot 2 is free again.

Expected wrinkles: role statements may error for `supabase_admin`/`authenticator` (fine, ON_ERROR_STOP=0 on roles only). If `auth` schema objects clash, restore succeeded for the application schema and that is what the drill proves; note it.

## Step 5: schedule it (15 min)

Nightly, unattended, monitored. Use a GitHub Actions workflow on a PRIVATE helper repo (not the public product repo), secrets: `DIA_DB_URL`, `AGE_PUBLIC_KEY`, `RCLONE_CONF` (base64 of `~/.config/rclone/rclone.conf`), `BETTERSTACK_HEARTBEAT_URL`.

```yaml
name: dia-nightly-dump
on:
  schedule: [{cron: "17 2 * * *"}]
  workflow_dispatch:
jobs:
  dump:
    runs-on: ubuntu-latest
    steps:
      - run: |
          sudo apt-get install -y age rclone postgresql-client
          npm i -g supabase
          STAMP=$(date -u +%Y%m%dT%H%M%SZ)
          supabase db dump --db-url "$DIA_DB_URL" -f schema.sql
          supabase db dump --db-url "$DIA_DB_URL" --data-only --use-copy -f data.sql
          supabase db dump --db-url "$DIA_DB_URL" --role-only -f roles.sql
          tar czf - schema.sql data.sql roles.sql | age -r "$AGE_PUBLIC_KEY" -o "dia-prod-$STAMP.tar.gz.age"
          mkdir -p ~/.config/rclone && echo "$RCLONE_CONF" | base64 -d > ~/.config/rclone/rclone.conf
          rclone copy "dia-prod-$STAMP.tar.gz.age" gdrive:DIA-Backups/
          rclone delete gdrive:DIA-Backups/ --min-age 35d      # retention window: 35 days
          rclone ls gdrive:DIA-Backups/ | grep -q "$STAMP" && curl -fsS "$BETTERSTACK_HEARTBEAT_URL"
        env:
          DIA_DB_URL: ${{ secrets.DIA_DB_URL }}
          AGE_PUBLIC_KEY: ${{ secrets.AGE_PUBLIC_KEY }}
          RCLONE_CONF: ${{ secrets.RCLONE_CONF }}
          BETTERSTACK_HEARTBEAT_URL: ${{ secrets.BETTERSTACK_HEARTBEAT_URL }}
```

Better Stack: create a Heartbeat monitor, period 1 day, grace 2 hours, alert to your email. A missed ping is the alarm. Without this step the dump job is DIA-008 again.

Retention window 35 days is the WP1A.1 contract: purged identifiers survive at most 35 days in backups. WP2A.1 references this number.

## Step 6: staging (WP1A.2, 15 min plus unpause wait)

Dashboard: unpause `dcivdrhxeaiulbbhsgfv`. Wait for Active.

```bash
STGURL='<staging session-pooler connection string>'
# schema ONLY, never data
age -d -i ~/.dia-backup-key.txt "dia-prod-$STAMP.tar.gz.age" | tar xzf - schema-$STAMP.sql roles-$STAMP.sql
psql "$STGURL" -v ON_ERROR_STOP=0 -f roles-$STAMP.sql
psql "$STGURL" -v ON_ERROR_STOP=1 -f schema-$STAMP.sql
rm schema-$STAMP.sql roles-$STAMP.sql
psql "$STGURL" -c "select count(*) from sessions;"     # must be 0
```

Then Vercel, project `drawintheair`, Settings, Environment Variables: for the Preview environment only, set `VITE_SUPABASE_URL` to `https://dcivdrhxeaiulbbhsgfv.supabase.co` and `VITE_SUPABASE_ANON_KEY` to staging's anon key (dashboard, Project Settings, API). Leave Production untouched. Tell me when done; I will seed synthetic teachers, children and sessions into staging and run the acceptance check (a preview deployment writes to staging, production row counts unchanged).

Free tier pauses staging after 7 idle days; the nightly dump job does not touch staging, so expect to unpause it by hand when a package needs it.

## Step 7: push the release branch and tags

After I hand you the release bundle (see chat), in the repo:

```bash
cd ~/drawintheair-main
git fetch _release.bundle release/new-term:release/new-term
git tag production-2026-08-25-cca72f5 cca72f5
git push origin release/new-term production-2026-08-25-cca72f5
```

Then open the PR `release/new-term` into `master` on GitHub. Do not merge yet: Gate 2 packages land on this branch first, and Gate 3 is the single merge.
