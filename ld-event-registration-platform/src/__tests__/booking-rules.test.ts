/**
 * Pure booking-decision tests (functions/booking-rules.js).
 *
 * These cover the arithmetic that used to live inside the bookRegistration
 * transaction — now unit-testable without the emulator.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const realRequire = createRequire(import.meta.url);
const { slotsOverlap, detectNoop, computeChangeCount, computeSlotDeltas, returnSeatUpdate } =
  realRequire(join(process.cwd(), 'functions/booking-rules.js'));

const sp = { slotId: 'SP-1', date: '2026-06-22', startMin: 540, endMin: 600, remaining: 5 };
const sk = { slotId: '3S-1', date: '2026-06-22', startMin: 660, endMin: 810, remaining: 3 };

describe('slotsOverlap()', () => {
  it('overlapping same-day ranges clash', () => {
    expect(slotsOverlap({ date: 'd', startMin: 540, endMin: 600 }, { date: 'd', startMin: 570, endMin: 660 })).toBe(true);
  });
  it('adjacent ranges (end === start) do not clash', () => {
    expect(slotsOverlap({ date: 'd', startMin: 540, endMin: 600 }, { date: 'd', startMin: 600, endMin: 660 })).toBe(false);
  });
  it('same time on different days never clashes', () => {
    expect(slotsOverlap({ date: 'd1', startMin: 540, endMin: 600 }, { date: 'd2', startMin: 540, endMin: 600 })).toBe(false);
  });
});

describe('detectNoop()', () => {
  const same = { oldEmpCode: '262010', empCode: '262010', oldSpId: 'SP-1', speakingSlotId: 'SP-1', oldSkId: '3S-1', skillsSlotId: '3S-1' };
  it('true when an existing reg is re-submitted unchanged', () => {
    expect(detectNoop({ oldReg: {}, ...same })).toBe(true);
  });
  it('false when there is no existing reg', () => {
    expect(detectNoop({ oldReg: null, ...same })).toBe(false);
  });
  it('false when a slot changed', () => {
    expect(detectNoop({ oldReg: {}, ...same, speakingSlotId: 'SP-2' })).toBe(false);
  });
  it('false when the empCode changed', () => {
    expect(detectNoop({ oldReg: {}, ...same, empCode: '999999' })).toBe(false);
  });
});

describe('computeChangeCount()', () => {
  it('new reg with no saved quota starts at 0', () => {
    expect(computeChangeCount({ oldReg: null, savedQuota: null })).toEqual({ baseCount: 0, changeCount: 0 });
  });
  it('new reg carries over cancelled quota', () => {
    expect(computeChangeCount({ oldReg: null, savedQuota: 2 })).toEqual({ baseCount: 2, changeCount: 2 });
  });
  it('edit increments the previous count', () => {
    expect(computeChangeCount({ oldReg: { changeCount: 1 }, savedQuota: null })).toEqual({ baseCount: 1, changeCount: 2 });
  });
  it('edit with a missing count starts from 0 then +1', () => {
    expect(computeChangeCount({ oldReg: {}, savedQuota: null })).toEqual({ baseCount: 0, changeCount: 1 });
  });
  it('clamps a negative stored count to 0 before incrementing', () => {
    expect(computeChangeCount({ oldReg: { changeCount: -999 }, savedQuota: null })).toEqual({ baseCount: 0, changeCount: 1 });
  });
});

describe('computeSlotDeltas()', () => {
  it('not holding either slot → availability equals remaining', () => {
    expect(computeSlotDeltas({ sp, sk, oldSpId: null, oldSkId: null })).toEqual({ spAvail: 5, skAvail: 3 });
  });
  it('already holding a slot returns the seat first (+1) for the edit case', () => {
    expect(computeSlotDeltas({ sp, sk, oldSpId: 'SP-1', oldSkId: null })).toEqual({ spAvail: 6, skAvail: 3 });
  });
  // examParts: a part the event does not require passes null → its avail is null
  // (the caller skips the capacity check + decrement for that side).
  it('null skills slot (speaking-only event) → skAvail is null', () => {
    expect(computeSlotDeltas({ sp, sk: null, oldSpId: null, oldSkId: null })).toEqual({ spAvail: 5, skAvail: null });
  });
  it('null speaking slot (skills-only event) → spAvail is null', () => {
    expect(computeSlotDeltas({ sp: null, sk, oldSpId: null, oldSkId: null })).toEqual({ spAvail: null, skAvail: 3 });
  });
});

describe('returnSeatUpdate()', () => {
  it('adds one seat back', () => {
    expect(returnSeatUpdate({ capacity: 10, remaining: 7 })).toEqual({ remaining: 8 });
  });
  it('caps remaining at capacity (never overshoots)', () => {
    expect(returnSeatUpdate({ capacity: 10, remaining: 10 })).toEqual({ remaining: 10 });
  });
  it('treats a missing remaining as 0', () => {
    expect(returnSeatUpdate({ capacity: 5 })).toEqual({ remaining: 1 });
  });
  it('without a capacity, just increments (uncapped)', () => {
    expect(returnSeatUpdate({ remaining: 3 })).toEqual({ remaining: 4 });
  });
});
