/**
 * Session code utilities for Class Mode.
 * Generates 4-digit numeric codes and validates them.
 */

/**
 * Generate a random 4-digit code (1000-9999).
 * Avoids easily confused patterns like 1111, 0000, sequential runs.
 */
export function generateSessionCode(): string {
  const EXCLUDED = new Set(['1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '0000', '1234', '4321', '6789', '9876']);

  let code: string;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (EXCLUDED.has(code));

  return code;
}

/**
 * Validate a 4-digit code string.
 */
export function isValidCode(code: string): boolean {
  return /^\d{4}$/.test(code.trim());
}
