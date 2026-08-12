/**
 * Pure booking-decision tests (functions/program-booking-rules.js).
 *
 * Covers the date/cap math that the Session transaction relies on: ISO-week keys,
 * monthly/weekly caps, slot-in-grid match, registration window, past-slot (VN
 * wall-clock), and the admin bypass — all without the emulator.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const realRequire = createRequire(import.meta.url);
const { isoWeekKey, monthKey, slotInGrid, windowState, assertBookable } = realRequire(
  join(process.cwd(), 'functions/program-booking-rules.js')
);

// Normalized program config (as normalizeProgram would produce): Mon–Fri × 5 slots.
const PROGRAM = {
  timeSlots: [
    { startMin: 600, endMin: 660, label: '10:00–11:00' },
    { startMin: 660, endMin: 720, label: '11:00–12:00' },
    { startMin: 780, endMin: 840, label: '13:00–14:00' },
    { startMin: 840, endMin: 900, label: '14:00–15:00' },
    { startMin: 900, endMin: 960, label: '15:00–16:00' },
  ],
  weekdays: [1, 2, 3, 4, 5],
  openMonth: '2026-02',
  deadline: '2026-02-28T23:59:59+07:00',
  fillMode: false,
  monthlyCap: 4,
  weeklyCap: 1,
};

const NOW = Date.parse('2026-02-01T08:00:00+07:00'); // before every test date, window open

function book(overrides: Record<string, unknown> = {}) {
  return assertBookable({
    program: PROGRAM,
    isAdmin: false,
    date: '2026-02-02', // Monday in the open month
    startMin: 600,
    endMin: 660,
    blackoutExists: false,
    classSessions: [],
    nowMs: NOW,
    ...overrides,
  });
}

describe('isoWeekKey() / monthKey()', () => {
  it('matches ISO-8601 week numbering', () => {
    expect(isoWeekKey('2026-01-01')).toBe('2026-W01'); // Thu → W01
    expect(isoWeekKey('2025-12-29')).toBe('2026-W01'); // Mon belongs to 2026 W01
    expect(isoWeekKey('2026-01-30')).toBe('2026-W05'); // Fri
    expect(isoWeekKey('2026-02-02')).toBe('2026-W06'); // Mon (new week)
  });
  it('monthKey is the YYYY-MM prefix', () => {
    expect(monthKey('2026-02-02')).toBe('2026-02');
  });
});

describe('slotInGrid()', () => {
  it('matches an exact configured slot', () => {
    expect(slotInGrid(PROGRAM, 600, 660)).toBe(true);
  });
  it('rejects an off-by-one or non-grid slot', () => {
    expect(slotInGrid(PROGRAM, 600, 661)).toBe(false);
    expect(slotInGrid(PROGRAM, 601, 660)).toBe(false);
    expect(slotInGrid(PROGRAM, 720, 780)).toBe(false); // the 12:00 lunch gap
  });
});

describe('windowState()', () => {
  it('open inside the month before the deadline', () => {
    expect(windowState(PROGRAM, '2026-02-10', NOW).open).toBe(true);
  });
  it('closed for a different month', () => {
    expect(windowState(PROGRAM, '2026-03-02', NOW).open).toBe(false);
  });
  it('closed after the deadline', () => {
    const past = Date.parse('2026-03-01T00:00:00+07:00');
    expect(windowState(PROGRAM, '2026-02-10', past).open).toBe(false);
  });
});

describe('assertBookable()', () => {
  it('accepts a valid future cell', () => {
    expect(book()).toEqual({ ok: true });
  });

  it('rejects an off-grid slot', () => {
    expect(book({ endMin: 661 }).ok).toBe(false);
  });

  it('rejects a non-open weekday (Saturday)', () => {
    expect(book({ date: '2026-02-07' }).ok).toBe(false); // Sat
  });

  it('rejects a past slot', () => {
    const now = Date.parse('2026-02-02T12:00:00+07:00'); // after the 10:00 start
    expect(book({ nowMs: now }).ok).toBe(false);
  });

  it('rejects out-of-window month', () => {
    expect(book({ date: '2026-03-02' }).ok).toBe(false);
  });

  it('rejects a blacked-out cell', () => {
    expect(book({ blackoutExists: true }).ok).toBe(false);
  });

  it('enforces the monthly cap (4)', () => {
    const four = ['2026-02-03', '2026-02-10', '2026-02-17', '2026-02-24'].map((date) => ({ date }));
    expect(book({ classSessions: four }).ok).toBe(false);
  });

  it('enforces 1/week but allows a different ISO week', () => {
    // Same week as Mon 02-02 (Tue 02-03) → blocked.
    expect(book({ classSessions: [{ date: '2026-02-03' }] }).ok).toBe(false);
    // Fri 01-30 is the previous ISO week (and previous month) → allowed.
    expect(book({ classSessions: [{ date: '2026-01-30' }] })).toEqual({ ok: true });
  });

  it('fillMode relaxes the weekly cap but keeps the monthly cap', () => {
    const program = { ...PROGRAM, fillMode: true };
    expect(book({ program, classSessions: [{ date: '2026-02-03' }] })).toEqual({ ok: true });
    const four = ['2026-02-03', '2026-02-10', '2026-02-17', '2026-02-24'].map((date) => ({ date }));
    expect(book({ program, classSessions: four }).ok).toBe(false);
  });

  it('admin overrides window/past but is still blocked by blackout + caps', () => {
    const closedFar = { date: '2026-03-02', nowMs: Date.parse('2026-03-02T12:00:00+07:00') };
    // Soft rules (window + past) are HR-overridable → an out-of-window past cell is allowed.
    expect(book({ isAdmin: true, ...closedFar })).toEqual({ ok: true });
    // Hard rules now apply to admins too: a blackout blocks even HR.
    expect(book({ isAdmin: true, ...closedFar, blackoutExists: true }).ok).toBe(false);
    // …and the per-class caps block even HR (monthly cap of 4 here).
    const four = ['2026-02-03', '2026-02-10', '2026-02-17', '2026-02-24'].map((date) => ({ date }));
    expect(book({ isAdmin: true, classSessions: four }).ok).toBe(false);
    expect(book({ isAdmin: true, endMin: 661 }).ok).toBe(false); // still must be a real slot
  });
});
