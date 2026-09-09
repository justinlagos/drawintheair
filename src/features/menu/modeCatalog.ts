/**
 * modeCatalog. The one list of playable mode ids and their paid/free tier.
 *
 * Both the menu (badges, tap and dwell gating) and the mount guard in App.tsx
 * read the tier from here, so a mode cannot be free in one place and paid in
 * another. Keep this file free of React and browser APIs: it is imported by
 * pure decision functions that run in node unit tests.
 *
 * Hidden modes (reachable only by URL, not shown in the menu) are marked
 * premium on purpose. A mode nobody has decided to give away for free must
 * fail closed when someone deep links to it.
 */

import type { ModeTier } from './modeGate';

export type GameMode =
  | 'calibration'
  | 'free'
  | 'pre-writing'
  | 'sort-and-place'
  | 'word-search'
  | 'colour-builder'
  | 'balloon-math'
  | 'rainbow-bridge'
  | 'gesture-spelling'
  | 'building';

export interface ModeCatalogEntry {
  id: GameMode;
  title: string;
  icon: string;
  tier: ModeTier;
  /** False for URL-only modes that the menu does not list. */
  listed: boolean;
}

export const MODE_CATALOG: Record<GameMode, ModeCatalogEntry> = {
  'free':             { id: 'free',             title: 'Free Paint',     icon: '🎨', tier: 'free',    listed: true },
  'calibration':      { id: 'calibration',      title: 'Bubble Pop',     icon: '🫧', tier: 'free',    listed: true },
  'pre-writing':      { id: 'pre-writing',      title: 'Tracing',        icon: '✏️', tier: 'free',    listed: true },
  'gesture-spelling': { id: 'gesture-spelling', title: 'Spelling Stars', icon: '✍️', tier: 'premium', listed: true },
  'sort-and-place':   { id: 'sort-and-place',   title: 'Sort & Place',   icon: '🗂️', tier: 'premium', listed: true },
  'word-search':      { id: 'word-search',      title: 'Word Search',    icon: '🔍', tier: 'premium', listed: true },
  'balloon-math':     { id: 'balloon-math',     title: 'Balloon Math',   icon: '🎈', tier: 'premium', listed: true },
  'rainbow-bridge':   { id: 'rainbow-bridge',   title: 'Rainbow Bridge', icon: '🌈', tier: 'premium', listed: true },
  'colour-builder':   { id: 'colour-builder',   title: 'Colour Builder', icon: '🎨', tier: 'premium', listed: false },
  'building':         { id: 'building',         title: 'Building',       icon: '🧱', tier: 'premium', listed: false },
};

export const GAME_MODE_IDS = Object.keys(MODE_CATALOG) as GameMode[];

export function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MODE_CATALOG, value);
}

export function getModeTier(mode: GameMode): ModeTier {
  return MODE_CATALOG[mode].tier;
}
