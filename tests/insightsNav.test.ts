/**
 * Admin insights sidebar structure (Calm 2.0 restructure, July 2026).
 *
 * The dashboard shell routes tabs by TabKey and renders the sidebar
 * from SECTIONS. These invariants catch a tab being added to the type
 * union but forgotten in the sidebar (unreachable page) or listed
 * twice (ambiguous keyboard shortcuts).
 */
import { describe, expect, it } from 'vitest';
import { SECTIONS, TAB_KEYS } from '../src/pages/admin/insights/types';

describe('insights sidebar structure', () => {
    const sectionKeys = SECTIONS.flatMap(s => s.items.map(i => i.key));

    it('every TabKey appears in exactly one sidebar section', () => {
        expect([...sectionKeys].sort()).toEqual([...TAB_KEYS].sort());
        expect(new Set(sectionKeys).size).toBe(sectionKeys.length);
    });

    it('growth is the first tab (landing view + shortcut 1)', () => {
        expect(TAB_KEYS[0]).toBe('growth');
        expect(SECTIONS[0].items[0].key).toBe('growth');
    });

    it('keyboard shortcuts 1-9 map to distinct, existing tabs', () => {
        const first9 = TAB_KEYS.slice(0, 9);
        expect(first9).toHaveLength(9);
        expect(new Set(first9).size).toBe(9);
        for (const key of first9) expect(sectionKeys).toContain(key);
    });

    it('every sidebar item carries a human label', () => {
        for (const s of SECTIONS) {
            for (const item of s.items) {
                expect(item.label.trim().length).toBeGreaterThan(0);
            }
        }
    });
});
