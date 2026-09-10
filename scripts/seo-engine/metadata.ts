// scripts/seo-engine/metadata.ts
//
// The site metadata the engine owns: every PAGE_META entry keyed by canonical
// path. This is the executor's whole editable surface today. Pages whose head
// is generated elsewhere (trace spokes, seasonal pages) are read-only to the
// engine until their metadata is lifted into the same model.

import { PAGE_META } from '../../src/seo/seo-config';
import type { SiteMetadata } from '../../src/seo/autonomy/executor';
import { toPath } from '../../src/seo/autonomy/evidence';

export function loadSiteMetadata(): SiteMetadata {
  const out: SiteMetadata = {};
  for (const entry of Object.values(PAGE_META) as Array<{ title: string; description: string; keywords?: string[]; canonical: string }>) {
    out[toPath(entry.canonical)] = {
      title: entry.title,
      description: entry.description,
      keywords: entry.keywords ?? [],
      canonical: entry.canonical,
    };
  }
  return out;
}
