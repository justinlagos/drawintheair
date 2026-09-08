/**
 * WP1A.3 (DIA-004) migration reconciliation guard.
 *
 * Production records applied migrations in supabase_migrations.schema_migrations by
 * version, and the Supabase CLI matches local files to those rows on the version alone.
 * When the two disagree the CLI reads applied migrations as unapplied and offers to mark
 * them reverted, which is how the 33-of-39 hazard arose.
 *
 * The snapshot of production's history taken on 2026-09-08 is the reference:
 * docs/audits/evidence/release/WP1A.3/prod_migration_history.json
 *
 * These tests fail if anyone renames a reconciled file, reuses a version, or adds a
 * migration whose filename does not follow the version_name convention.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const HISTORY_FILE = join(
  ROOT,
  'docs',
  'audits',
  'evidence',
  'release',
  'WP1A.3',
  'prod_migration_history.json',
);

const FILENAME = /^(\d+)_(.+)\.sql$/;

interface HistoryRow {
  version: string;
  name: string;
}

function localMigrations(): { version: string; name: string; file: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((file) => {
      const m = FILENAME.exec(file);
      if (!m) return { version: '', name: '', file };
      return { version: m[1], name: m[2], file };
    });
}

function productionHistory(): HistoryRow[] {
  return JSON.parse(readFileSync(HISTORY_FILE, 'utf8')).rows as HistoryRow[];
}

describe('supabase migration files', () => {
  it('all follow the <version>_<name>.sql convention', () => {
    const bad = localMigrations().filter((m) => m.version === '');
    expect(bad.map((m) => m.file)).toEqual([]);
  });

  it('have no duplicate versions', () => {
    const seen = new Map<string, string[]>();
    for (const m of localMigrations()) {
      seen.set(m.version, [...(seen.get(m.version) ?? []), m.file]);
    }
    const dupes = [...seen.entries()].filter(([, files]) => files.length > 1);
    expect(dupes).toEqual([]);
  });
});

describe('repo migrations against the production history snapshot', () => {
  it('has a local file for every version production recorded', () => {
    const local = new Set(localMigrations().map((m) => m.version));
    const missing = productionHistory()
      .filter((r) => !local.has(r.version))
      .map((r) => `${r.version}_${r.name}`);
    expect(missing).toEqual([]);
  });

  it('names each of those files exactly as production named the migration', () => {
    const byVersion = new Map(localMigrations().map((m) => [m.version, m]));
    const mismatched = productionHistory()
      .filter((r) => {
        const m = byVersion.get(r.version);
        return m !== undefined && m.name !== r.name;
      })
      .map((r) => `${r.version}: production has "${r.name}"`);
    expect(mismatched).toEqual([]);
  });

  it('carries the verified baseline, and nothing sorts between it and the history', () => {
    const local = localMigrations().map((m) => m.version);
    expect(local).toContain('20260908000000');

    // Everything that is not in production's history must be either one of the
    // migrations WP1A.3 marks applied, or a genuinely pending forward migration
    // that sorts at or after the baseline. A new file between the newest history
    // row and the baseline would be applied out of order on a rebuild.
    const historyVersions = new Set(productionHistory().map((r) => r.version));
    const markedApplied = new Set([
      '0011',
      '0012',
      '0013',
      '0014',
      '0015',
      '0016',
      '0017',
      '0018',
      '0019',
      '0020',
      '0021',
      '20260613200346',
      '20260613200347',
      '20260613200348',
      '20260615113208',
      '20260615113209',
      '20260615113210',
      '20260907120000',
      '20260908000000',
    ]);
    const strays = local.filter(
      (v) => !historyVersions.has(v) && !markedApplied.has(v) && v < '20260908000000',
    );
    expect(strays).toEqual([]);
  });
});
