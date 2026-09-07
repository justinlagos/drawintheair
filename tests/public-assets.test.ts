/**
 * Every PDF that the app links under /classroom-guides/ (and the old
 * /pilot-pack.pdf) must exist in public/. Track P removed three PDFs whose
 * copy no longer matched the product; this stops a link to a deleted file
 * from shipping as a dead download button.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|html)$/.test(name)) out.push(p);
  }
  return out;
}

describe('linked PDFs exist in public/', () => {
  const files = walk(join(ROOT, 'src'));
  files.push(join(ROOT, 'index.html'));
  const linked = new Set<string>();
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/\/classroom-guides\/([\w.-]+\.pdf)/g)) linked.add(`classroom-guides/${m[1]}`);
    // Guide tables hold bare file names and build the href with guideHref().
    for (const m of text.matchAll(/file:\s*'([\w.-]+\.pdf)'/g)) linked.add(`classroom-guides/${m[1]}`);
    if (/["'`]\/pilot-pack\.pdf/.test(text)) linked.add('pilot-pack.pdf');
  }

  it('finds the guide links (sanity)', () => {
    expect(linked.size).toBeGreaterThan(5);
  });

  it('has a file for every linked PDF', () => {
    const missing = [...linked].filter((rel) => !existsSync(join(ROOT, 'public', rel)));
    expect(missing).toEqual([]);
  });

  it('no longer links the removed pilot pack or out-of-date guides', () => {
    for (const rel of ['pilot-pack.pdf', 'classroom-guides/01-teacher-quick-start-guide.pdf', 'classroom-guides/05-parent-communication-pack.pdf']) {
      expect(linked.has(rel), rel).toBe(false);
    }
  });
});
