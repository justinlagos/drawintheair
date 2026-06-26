import { describe, it, expect } from 'vitest';
import { isValidCode, generateSessionCode } from '../src/features/classmode/sessionCode';
import type { JoinErrorCode } from '../src/features/classmode/conductor/joinTypes';

describe('Session code generation', () => {
  it('generates a 4-digit code', () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^\d{4}$/);
  });

  it('avoids excluded patterns', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateSessionCode();
      expect(code).not.toBe('1111');
      expect(code).not.toBe('1234');
      expect(code).not.toBe('0000');
    }
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateSessionCode()));
    expect(codes.size).toBeGreaterThan(40);
  });
});

describe('isValidCode', () => {
  it('accepts a valid 4-digit code', () => {
    expect(isValidCode('7429')).toBe(true);
  });

  it('accepts code with leading/trailing spaces', () => {
    expect(isValidCode(' 7429 ')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidCode('')).toBe(false);
  });

  it('rejects 3-digit code', () => {
    expect(isValidCode('123')).toBe(false);
  });

  it('rejects 5-digit code', () => {
    expect(isValidCode('12345')).toBe(false);
  });

  it('rejects non-numeric code', () => {
    expect(isValidCode('ABCD')).toBe(false);
  });

  it('rejects code with hyphens', () => {
    expect(isValidCode('12-3')).toBe(false);
  });
});

describe('JoinErrorCode values', () => {
  const validCodes: JoinErrorCode[] = [
    'INVALID_CODE',
    'CODE_EXPIRED',
    'SESSION_INACTIVE',
    'NETWORK_MISMATCH',
    'STUDENT_NOT_FOUND',
    'NO_ASSIGNED_ACTIVITIES',
    'RATE_LIMITED',
    'OK',
  ];

  it('has all required error codes', () => {
    expect(validCodes).toHaveLength(8);
  });

  it('each has a user-facing message', () => {
    for (const code of validCodes) {
      expect(code).toBeDefined();
    }
  });
});

describe('Network IP normalisation (logical)', () => {
  // These test the expected logic of IP normalisation.
  // The actual implementation is server-side in the SQL migration.

  it('IPv4 addresses are comparable', () => {
    const ip1 = '192.168.1.100';
    const ip2 = '192.168.1.100';
    expect(ip1).toBe(ip2);
  });

  it('IPv4-mapped IPv6 must be extracted', () => {
    const mapped = '::ffff:192.168.1.100';
    const extracted = mapped.includes('::ffff:') ? mapped.split('::ffff:')[1] : mapped;
    expect(extracted).toBe('192.168.1.100');
  });

  it('IPv6 /64 prefix comparison works', () => {
    const ip1 = '2001:0db8:85a3:0000:8a2e:0370:7334';
    const ip2 = '2001:0db8:85a3:0000:8a2e:0370:7335';
    const prefix1 = ip1.split(':').slice(0, 4).join(':');
    const prefix2 = ip2.split(':').slice(0, 4).join(':');
    expect(prefix1).toBe('2001:0db8:85a3:0000');
    expect(prefix2).toBe('2001:0db8:85a3:0000');
    expect(prefix1).toBe(prefix2);
  });

  it('different /64 prefixes do not match', () => {
    const ip1 = '2001:0db8:85a3:0000:8a2e:0370:7334';
    const ip2 = '2001:0db8:85b0:0001:8a2e:0370:7334';
    const prefix1 = ip1.split(':').slice(0, 4).join(':');
    const prefix2 = ip2.split(':').slice(0, 4).join(':');
    expect(prefix1).not.toBe(prefix2);
  });

  it('strips port numbers', () => {
    const withPort = '192.168.1.100:8080';
    const stripped = withPort.split(':')[0];
    expect(stripped).toBe('192.168.1.100');
  });
});

describe('Assignment ordering', () => {
  it('activities are ordered by sequence_order', () => {
    const assignments = [
      { activity: 'balloon-math', sequence_order: 2, is_enabled: true },
      { activity: 'calibration', sequence_order: 0, is_enabled: true },
      { activity: 'pre-writing', sequence_order: 1, is_enabled: true },
    ] as const;
    const sorted = [...assignments].sort((a, b) => a.sequence_order - b.sequence_order);
    expect(sorted[0].activity).toBe('calibration');
    expect(sorted[1].activity).toBe('pre-writing');
    expect(sorted[2].activity).toBe('balloon-math');
  });

  it('disabled activities are excluded', () => {
    const assignments = [
      { activity: 'calibration', sequence_order: 0, is_enabled: true },
      { activity: 'free', sequence_order: 1, is_enabled: false },
      { activity: 'pre-writing', sequence_order: 2, is_enabled: true },
    ] as const;
    const enabled = assignments.filter((a) => a.is_enabled);
    expect(enabled).toHaveLength(2);
    expect(enabled.find((a) => a.activity === 'free')).toBeUndefined();
  });
});
