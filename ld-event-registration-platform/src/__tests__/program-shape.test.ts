/**
 * Pure shape/validation tests (functions/program-shape.js): slot math, fail-closed
 * grid validation, mode participant caps, Class validation, and the cell key.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const realRequire = createRequire(import.meta.url);
const {
  slotKey, slotToMinutes, validateTimeSlots, findSlot,
  validateClass, normalizeProgram,
} = realRequire(join(process.cwd(), 'functions/program-shape.js'));

describe('slotKey()', () => {
  it('joins date and start minute', () => {
    expect(slotKey('2026-02-02', 600)).toBe('2026-02-02_600');
  });
});

describe('slotToMinutes()', () => {
  it('converts a valid slot', () => {
    expect(slotToMinutes({ sh: 10, sm: 0, eh: 11, em: 0 })).toEqual({ startMin: 600, endMin: 660 });
    expect(slotToMinutes({ sh: 10, sm: 30, eh: 11, em: 0 })).toEqual({ startMin: 630, endMin: 660 });
  });
  it('rejects end ≤ start, out-of-range, or non-int', () => {
    expect(slotToMinutes({ sh: 11, sm: 0, eh: 10, em: 0 })).toBeNull();
    expect(slotToMinutes({ sh: 24, sm: 0, eh: 25, em: 0 })).toBeNull();
    expect(slotToMinutes({ sh: 10, sm: 0, eh: 10, em: 0 })).toBeNull();
    expect(slotToMinutes({ sh: '10', sm: 0, eh: 11, em: 0 } as never)).toBeNull();
  });
});

describe('validateTimeSlots()', () => {
  const ok = [
    { sh: 10, sm: 0, eh: 11, em: 0 },
    { sh: 13, sm: 0, eh: 14, em: 0 },
  ];
  it('accepts non-overlapping slots', () => {
    expect(validateTimeSlots(ok)).toBeNull();
  });
  it('accepts an empty grid (fail-closed elsewhere, valid config here)', () => {
    expect(validateTimeSlots([])).toBeNull();
  });
  it('rejects overlapping slots', () => {
    const overlap = [
      { sh: 10, sm: 0, eh: 11, em: 30 },
      { sh: 11, sm: 0, eh: 12, em: 0 },
    ];
    expect(validateTimeSlots(overlap)).toMatch(/overlap/i);
  });
  it('rejects a malformed slot', () => {
    expect(validateTimeSlots([{ sh: 11, sm: 0, eh: 10, em: 0 }])).toBeTruthy();
    expect(validateTimeSlots('nope' as never)).toBeTruthy();
  });
});

describe('findSlot()', () => {
  const slots = [{ sh: 10, sm: 0, eh: 11, em: 0 }];
  it('finds an exact match, rejects a near-miss', () => {
    expect(findSlot(slots, 600, 660)).toEqual({ startMin: 600, endMin: 660 });
    expect(findSlot(slots, 600, 661)).toBeNull();
  });
});

describe('validateClass()', () => {
  const base = { code: 'EL001', name: 'Foundation', bu: 'CHORUS', picEmail: 'nhat.nguyen@cyberlogitec.com', expectedSize: 8 };
  it('accepts a well-formed class', () => {
    expect(validateClass(base)).toBeNull();
  });
  it('rejects a non-company PIC email', () => {
    expect(validateClass({ ...base, picEmail: 'someone@gmail.com' })).toMatch(/cyberlogitec/i);
  });
  it('rejects a missing code / bad capacity', () => {
    expect(validateClass({ ...base, code: '' })).toBeTruthy();
    expect(validateClass({ ...base, expectedSize: -2 })).toBeTruthy();
  });
});

describe('normalizeProgram()', () => {
  it('expands config slots to {startMin,endMin,label} and applies defaults', () => {
    const p = normalizeProgram({ timeSlots: [{ sh: 10, sm: 0, eh: 11, em: 0 }] });
    expect(p.timeSlots[0]).toMatchObject({ startMin: 600, endMin: 660 });
    expect(p.monthlyCap).toBe(4);
    expect(p.weeklyCap).toBe(2);
    expect(p.weekdays).toEqual([1, 2, 3, 4, 5]);
  });
  it('drops malformed slots (fail-closed)', () => {
    const p = normalizeProgram({ timeSlots: [{ sh: 11, sm: 0, eh: 10, em: 0 }] });
    expect(p.timeSlots).toEqual([]);
  });
});
