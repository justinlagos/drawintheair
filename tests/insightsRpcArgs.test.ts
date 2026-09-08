/**
 * Guards the argument names the Insights client sends against the argument
 * names the database functions actually declare.
 *
 * History: `dashboard_errors` and `dashboard_latest_sessions` declare
 * `row_limit`, but the client sent `in_limit`. PostgREST resolves an RPC by
 * its argument names, so both calls 404'd and two admin panels were dead in
 * production with no error anyone would notice. Found 8 Sept 2026 during the
 * WP2A.2 rehearsal, by reading the live signatures rather than the code.
 *
 * The expected map below is taken from production's
 * pg_get_function_identity_arguments output. If a migration changes a
 * signature, change it here in the same PR.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const RPC_SRC = path.resolve(__dirname, '../src/pages/admin/insights/rpc.ts');

/** fn name → the exact argument names the database declares. */
const DECLARED_ARGS: Record<string, string[]> = {
    dashboard_errors: ['row_limit'],
    dashboard_latest_sessions: ['row_limit'],
    dashboard_progression_top_learners: ['in_days', 'in_limit'],
};

describe('Insights RPC argument names match the database signatures', () => {
    const src = fs.readFileSync(RPC_SRC, 'utf8');

    for (const [fn, expectedArgs] of Object.entries(DECLARED_ARGS)) {
        it(`${fn} is called with ${expectedArgs.join(', ')}`, () => {
            // callRpc<...>('fn', { a: x, b: y })
            const call = new RegExp(`'${fn}'\\s*,\\s*\\{([^}]*)\\}`).exec(src);
            expect(call, `no callRpc for ${fn} found in rpc.ts`).not.toBeNull();

            const sent = [...call![1].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)]
                .map(m => m[1])
                .sort();

            expect(sent).toEqual([...expectedArgs].sort());
        });
    }

    it('no Insights RPC sends in_limit to a function that declares row_limit', () => {
        for (const fn of ['dashboard_errors', 'dashboard_latest_sessions']) {
            const call = new RegExp(`'${fn}'\\s*,\\s*\\{([^}]*)\\}`).exec(src);
            expect(call![1]).not.toMatch(/\bin_limit\b/);
        }
    });
});
