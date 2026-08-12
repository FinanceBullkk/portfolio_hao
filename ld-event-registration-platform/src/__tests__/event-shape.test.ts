import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// event-shape.js is the pure (no-I/O) validate/normalize owner for events; load the
// CJS module directly like the other functions tests.
const realRequire = createRequire(import.meta.url);
const { eventIdValid, validateEventInput, normalizeEvent } = realRequire(
  join(process.cwd(), 'functions/event-shape.js'),
);

describe('event-shape', () => {
  it('eventIdValid accepts path-safe slugs, rejects the rest', () => {
    expect(eventIdValid('training-2026')).toBe(true);
    expect(eventIdValid('a1')).toBe(true);
    expect(eventIdValid('Bad_ID')).toBe(false);
    expect(eventIdValid('-lead')).toBe(false);
    expect(eventIdValid('a')).toBe(false); // < 2 chars
    expect(eventIdValid('')).toBe(false);
  });

  // U1: simple events now require schedule metadata — spread into valid-simple cases.
  const SM = { eventDate: '2026-06-27', startTime: '09:00', endTime: '12:30', format: 'onsite', location: 'Room A12' };

  it('validateEventInput: accepts a valid simple event', () => {
    const r = validateEventInput({ eventId: 't1', name: 'Train', type: 'simple', capacity: 30, allowEnrollment: true, ...SM });
    expect(r.error).toBeUndefined();
    expect(r.eventId).toBe('t1');
    expect(r.value).toMatchObject({ name: 'Train', type: 'simple', capacity: 30, allowEnrollment: true });
  });

  it('validateEventInput: rejects bad id, missing name, bad capacity', () => {
    expect(validateEventInput({ eventId: 'BAD', name: 'x', type: 'simple', capacity: 1 }).error).toMatch(/Event ID/);
    expect(validateEventInput({ eventId: 't1', name: '', type: 'simple', capacity: 1 }).error).toMatch(/name/i);
    expect(validateEventInput({ eventId: 't1', name: 'x', type: 'simple', capacity: -1 }).error).toMatch(/Capacity/i);
  });

  it('validateEventInput: slotted event carries no event-level capacity', () => {
    const r = validateEventInput({ eventId: 'asm', name: 'A', type: 'slotted' });
    expect(r.error).toBeUndefined();
    expect(r.value.type).toBe('slotted');
    expect(r.value.capacity).toBeUndefined();
  });

  it('validateEventInput: trims category and caps it at 40 chars', () => {
    const r = validateEventInput({ eventId: 't1', name: 'T', type: 'simple', capacity: 1, category: '  Training  ', ...SM });
    expect(r.value.category).toBe('Training');
    const long = validateEventInput({ eventId: 't1', name: 'T', type: 'simple', capacity: 1, category: 'x'.repeat(60), ...SM });
    expect(long.value.category).toHaveLength(40);
    // Missing category normalizes to an empty string (legacy events).
    expect(validateEventInput({ eventId: 't1', name: 'T', type: 'simple', capacity: 1, ...SM }).value.category).toBe('');
  });

  it('normalizeEvent: reads category, defaulting to empty string', () => {
    expect(normalizeEvent('t1', { type: 'simple', category: 'Assessment' }).category).toBe('Assessment');
    expect(normalizeEvent('t1', { type: 'simple' }).category).toBe('');
  });

  it('normalizeEvent: applies defaults and remaining falls back to capacity', () => {
    const n = normalizeEvent('t1', { name: 'T', type: 'simple', capacity: 10, allowEnrollment: true });
    expect(n).toMatchObject({ eventId: 't1', type: 'simple', capacity: 10, remaining: 10, listed: true, archived: false });
  });

  it('normalizeEvent: unknown type falls back to simple; deadlinePassed computed', () => {
    const n = normalizeEvent('t1', { type: 'weird', deadline: { toDate: () => new Date('2000-01-01') } });
    expect(n.type).toBe('simple');
    expect(n.deadlinePassed).toBe(true);
  });

  // ── Luma-style presentation fields (optional) ──────────────────────────────
  it('normalizeEvent: reads presentation fields, defaulting each to empty string', () => {
    const n = normalizeEvent('t1', {
      type: 'simple',
      coverImageUrl: 'https://x/cover.png',
      organizerBu: 'CHORUS',
      description: '## Agenda',
      locationText: '5F CLT Tower',
    });
    expect(n).toMatchObject({
      coverImageUrl: 'https://x/cover.png',
      organizerBu: 'CHORUS',
      description: '## Agenda',
      locationText: '5F CLT Tower',
    });
    // Legacy event (none set) → empty strings, never undefined, so the card renders.
    const legacy = normalizeEvent('t1', { type: 'simple' });
    expect(legacy.coverImageUrl).toBe('');
    expect(legacy.organizerBu).toBe('');
    expect(legacy.description).toBe('');
    expect(legacy.locationText).toBe('');
  });

  it('validateEventInput: trims + length-caps the presentation fields', () => {
    const r = validateEventInput({
      eventId: 't1', name: 'T', type: 'simple', capacity: 1, ...SM,
      coverImageUrl: '  https://x/c.png  ',
      organizerBu: '  CHORUS  ',
      description: 'd'.repeat(5000),
      locationText: '  ' + 'L'.repeat(300) + '  ',
    });
    expect(r.value.coverImageUrl).toBe('https://x/c.png');
    expect(r.value.organizerBu).toBe('CHORUS');
    expect(r.value.description).toHaveLength(4000);
    expect(r.value.locationText).toHaveLength(200); // trimmed then sliced
    // Absent → empty strings (presentation is always optional).
    const bare = validateEventInput({ eventId: 't1', name: 'T', type: 'simple', capacity: 1, ...SM });
    expect(bare.value).toMatchObject({ coverImageUrl: '', organizerBu: '', description: '', locationText: '' });
  });

  // ── themeColor (bounded preset key, Principle VII) ─────────────────────────
  it('themeColor: a whitelisted key is kept; unknown/absent fall back to ""', () => {
    // normalizeEvent
    expect(normalizeEvent('t1', { type: 'simple', themeColor: 'violet' }).themeColor).toBe('violet');
    expect(normalizeEvent('t1', { type: 'simple', themeColor: 'neon-pink' }).themeColor).toBe('');
    expect(normalizeEvent('t1', { type: 'simple' }).themeColor).toBe('');
    // validateEventInput — never errors on a bad color, just drops it to ''
    const ok = validateEventInput({ eventId: 't1', name: 'T', type: 'simple', capacity: 1, ...SM, themeColor: 'emerald' });
    expect(ok.error).toBeUndefined();
    expect(ok.value.themeColor).toBe('emerald');
    const bad = validateEventInput({ eventId: 't1', name: 'T', type: 'simple', capacity: 1, ...SM, themeColor: 'rgb(1,2,3)' });
    expect(bad.error).toBeUndefined();
    expect(bad.value.themeColor).toBe('');
    const none = validateEventInput({ eventId: 't1', name: 'T', type: 'simple', capacity: 1, ...SM });
    expect(none.value.themeColor).toBe('');
  });

  // ── examParts (required exam parts for slotted events) ─────────────────────
  it('examParts: normalizeEvent defaults to "both"; unknown/absent fall back', () => {
    expect(normalizeEvent('t1', { type: 'slotted', examParts: 'speaking' }).examParts).toBe('speaking');
    expect(normalizeEvent('t1', { type: 'slotted', examParts: 'skills' }).examParts).toBe('skills');
    expect(normalizeEvent('t1', { type: 'slotted', examParts: 'both' }).examParts).toBe('both');
    expect(normalizeEvent('t1', { type: 'slotted', examParts: 'nonsense' }).examParts).toBe('both');
    expect(normalizeEvent('t1', { type: 'slotted' }).examParts).toBe('both'); // legacy events
  });

  it('examParts: validateEventInput persists it for slotted, omits it for simple', () => {
    const slotted = validateEventInput({ eventId: 'a1', name: 'A', type: 'slotted', examParts: 'skills' });
    expect(slotted.error).toBeUndefined();
    expect(slotted.value.examParts).toBe('skills');
    // Unknown value is coerced (never rejected) to 'both'.
    const bad = validateEventInput({ eventId: 'a1', name: 'A', type: 'slotted', examParts: 'weird' });
    expect(bad.value.examParts).toBe('both');
    // Simple events carry no examParts.
    const simple = validateEventInput({ eventId: 't1', name: 'T', type: 'simple', capacity: 1, ...SM, examParts: 'speaking' });
    expect(simple.value.examParts).toBeUndefined();
  });
});
