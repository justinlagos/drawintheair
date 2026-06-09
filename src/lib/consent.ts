/**
 * consent — single source of truth for consent + privacy-notice versions.
 * (Auth Framework Phase 7.)
 *
 * Every consent we record (via record_consent / create_child_profile)
 * carries the version that was in force at the moment of capture, so a
 * later change to terms or privacy copy never retroactively alters what a
 * parent actually agreed to. Bump the relevant constant whenever the
 * corresponding notice text changes, and the next capture stores the new
 * version with a fresh timestamp.
 *
 * Consent types mirror the DB CHECK in record_consent():
 *   account_terms | child_privacy | camera_use | data_retention | marketing
 */

export const PRIVACY_NOTICE_VERSION = '2026-06-09';

export const CONSENT_VERSIONS = {
  account_terms: '2026-06-09',
  child_privacy: '2026-06-09',
  camera_use: '2026-06-09',
  data_retention: '2026-06-09',
  marketing: '2026-06-09',
} as const;

export type ConsentKind = keyof typeof CONSENT_VERSIONS;

/** Current version string for a consent kind (for record_consent calls). */
export function consentVersion(kind: ConsentKind): string {
  return CONSENT_VERSIONS[kind];
}

/** Short, parent-readable webcam privacy copy, shown at point of use. */
export const CAMERA_PRIVACY_COPY =
  'Your camera is used only to see hand movements, and everything is processed ' +
  'right here on this device. We never upload, record, or store any video or ' +
  'photos of your child.';
