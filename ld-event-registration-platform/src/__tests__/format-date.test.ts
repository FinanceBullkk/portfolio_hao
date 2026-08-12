import { describe, it, expect } from 'vitest';
import { formatDate, formatTime, formatDateTime, formatDateWeekday, formatDateWeekdayShort } from '../lib/format-date';

// Fixed instants; tests assert the canonical dd/MM/yyyy family (audit P0-1).
// A concrete local timestamp keeps these deterministic regardless of host TZ.
const local = new Date(2026, 5, 25, 18, 39, 57); // 25 Jun 2026 18:39:57 local

describe('format-date', () => {
  it('formatDate → dd/MM/yyyy with zero padding', () => {
    expect(formatDate(local)).toBe('25/06/2026');
    expect(formatDate(new Date(2026, 0, 1, 0, 0))).toBe('01/01/2026');
  });

  it('formatDate on a date-only key is TZ-stable (no day shift)', () => {
    expect(formatDate('2026-07-01')).toBe('01/07/2026');
    expect(formatDate('2026-06-25')).toBe('25/06/2026');
  });

  it('formatTime → HH:mm 24h', () => {
    expect(formatTime(local)).toBe('18:39');
    expect(formatTime(new Date(2026, 5, 25, 9, 5))).toBe('09:05');
  });

  it('formatDateTime → dd/MM/yyyy HH:mm', () => {
    expect(formatDateTime(local)).toBe('25/06/2026 18:39');
  });

  it('formatDateWeekday → EEE dd/MM/yyyy', () => {
    expect(formatDateWeekday('2026-06-25')).toBe('Thu 25/06/2026');
  });

  it('formatDateWeekdayShort drops the year only for the current year', () => {
    const now = new Date(2026, 5, 29); // treat 2026 as "this year"
    expect(formatDateWeekdayShort('2026-07-10', now)).toBe('Fri 10/07');   // same year → no year
    expect(formatDateWeekdayShort('2027-01-05', now)).toBe('Tue 05/01/2027'); // other year → keep year
    expect(formatDateWeekdayShort('', now)).toBe('');
  });

  it('returns empty string for missing/invalid input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDateTime('not-a-date')).toBe('');
    expect(formatTime(NaN)).toBe('');
  });

  it('accepts epoch millis and ISO timestamps', () => {
    const iso = '2026-06-25T11:39:00.000Z';
    expect(formatDate(iso)).not.toBe('');
    expect(formatDate(Date.parse(iso))).toBe(formatDate(new Date(iso)));
  });
});
