import { describe, expect, it } from 'vitest';
import { makeToteId, todayStamp, uuid } from './ids';

describe('todayStamp', () => {
  it('formats YYMMDD with zero-padding', () => {
    const d = new Date(2026, 3, 7); // April 7 2026 (local time)
    expect(todayStamp(d)).toBe('260407');
  });

  it('zero-pads single-digit month and day', () => {
    const d = new Date(2025, 0, 1); // Jan 1 2025
    expect(todayStamp(d)).toBe('250101');
  });

  it('uses two-digit year from the end of the year', () => {
    const d = new Date(1999, 11, 31);
    expect(todayStamp(d)).toBe('991231');
  });
});

describe('makeToteId', () => {
  it('follows RH-YYMMDD-NNN convention', () => {
    const id = makeToteId(7, new Date(2026, 3, 14));
    expect(id).toBe('RH-260414-007');
  });

  it('zero-pads sequence numbers to 3 digits', () => {
    const date = new Date(2026, 3, 14);
    expect(makeToteId(1, date)).toBe('RH-260414-001');
    expect(makeToteId(42, date)).toBe('RH-260414-042');
    expect(makeToteId(999, date)).toBe('RH-260414-999');
  });

  it('allows sequence numbers beyond 999 (no truncation)', () => {
    // Convention is 3 digits but padStart won't truncate. Document the behavior.
    const id = makeToteId(1234, new Date(2026, 3, 14));
    expect(id).toBe('RH-260414-1234');
  });
});

describe('uuid', () => {
  it('returns a non-empty string', () => {
    const id = uuid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns unique values on successive calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(uuid());
    expect(seen.size).toBe(100);
  });
});
