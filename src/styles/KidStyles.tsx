/**
 * KidStyles — single-mount component that injects the kid-UI design system
 * (tokens as CSS custom properties + named keyframes) into the document.
 *
 * Mount once near the app root (above any consumer of `--kid-*` vars or
 * the kidAnimation strings). Idempotent — React renders one <style> tag.
 */

import { kidTokensCss } from './tokens';
import { kidMotionCss } from './motion';

const KID_STYLES_BUNDLE = `${kidTokensCss}\n\n${kidMotionCss}`;

export const KidStyles = () => (
  <style id="kid-ui-styles" data-version="1">
    {KID_STYLES_BUNDLE}
  </style>
);
