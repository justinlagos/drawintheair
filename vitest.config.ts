import { defineConfig } from 'vitest/config';

// Unit tests for pure logic only (H3 webhook ordering, H4 PKCE helpers).
// Scoped to tests/** so it never picks up the Deno edge-function test
// (supabase/functions/**/*.test.ts, run via `deno test`) or vendored tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
