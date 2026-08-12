import { describe, expect, it } from 'vitest';
import type { EventDoc } from '../lib/types';
import type { EventStat } from '../lib/adminDb';
import {
  deadlineInfo, enrollBadge, enrollmentOpen, enrollmentTogglePatch,
  fillColor, fillView, lifecycleOf, pct,
} from '../admin/event-fill';

// Pure derivation logic behind the admin Events lifecycle cards.

function ev(over: Partial<EventDoc> = {}): EventDoc {
  return {
    eventId: 'evt', name: 'Event', subtitle: '', category: '', type: 'simple',
    allowEnrollment: true, deadline: null, deadlinePassed: false,
    capacity: 40, remaining: 6, requireEligibility: false,
    emailConfirm: false, listed: true, archived: false,
    ...over,
  };
}

describe('lifecycleOf', () => {
  it('archived wins over everything', () => {
    expect(lifecycleOf(ev({ archived: true, allowEnrollment: true }))).toBe('archived');
  });
  it('open + within deadline + seats left = active', () => {
    expect(lifecycleOf(ev({ allowEnrollment: true, deadlinePassed: false }))).toBe('active');
  });
  it('enrollment off = closed', () => {
    expect(lifecycleOf(ev({ allowEnrollment: false }))).toBe('closed');
  });
  it('deadline passed = closed', () => {
    expect(lifecycleOf(ev({ deadlinePassed: true }))).toBe('closed');
  });
  it('simple event with no seats left = closed', () => {
    expect(lifecycleOf(ev({ capacity: 20, remaining: 0 }))).toBe('closed');
  });
});

describe('enrollBadge', () => {
  it('archived → Ended', () => expect(enrollBadge(ev({ archived: true })).tone).toBe('ended'));
  it('open → Open', () => expect(enrollBadge(ev()).tone).toBe('open'));
  it('closed → Closed', () => expect(enrollBadge(ev({ allowEnrollment: false })).tone).toBe('closed'));
});

describe('enrollmentOpen (effective toggle state)', () => {
  it('open flag + within deadline → open', () => expect(enrollmentOpen(ev())).toBe(true));
  it('archived → closed', () => expect(enrollmentOpen(ev({ archived: true }))).toBe(false));
  it('flag off → closed', () => expect(enrollmentOpen(ev({ allowEnrollment: false }))).toBe(false));
  it('deadline passed → closed even with flag on', () =>
    expect(enrollmentOpen(ev({ allowEnrollment: true, deadlinePassed: true }))).toBe(false));
});

describe('enrollmentTogglePatch (click action matches what the toggle shows)', () => {
  it('open → close just lowers the flag, keeps the deadline', () => {
    const t = enrollmentTogglePatch(ev({ allowEnrollment: true, deadlinePassed: false }));
    expect(t.opening).toBe(false);
    expect(t.patch).toEqual({ allowEnrollment: false });
  });
  it('flag-off (no deadline) → open just raises the flag', () => {
    const t = enrollmentTogglePatch(ev({ allowEnrollment: false, deadline: null, deadlinePassed: false }));
    expect(t.opening).toBe(true);
    expect(t.clearedDeadline).toBe(false);
    expect(t.patch).toEqual({ allowEnrollment: true });
  });
  it('deadline-passed → reopen raises the flag AND clears the past deadline', () => {
    // The bug: the toggle reads "Closed", but flipping only allowEnrollment left
    // deadlinePassed true, so the reopen was a silent no-op. The deadline must clear.
    const t = enrollmentTogglePatch(ev({ allowEnrollment: true, deadline: '2026-06-01T00:00:00.000Z', deadlinePassed: true }));
    expect(t.opening).toBe(true);
    expect(t.clearedDeadline).toBe(true);
    expect(t.patch).toEqual({ allowEnrollment: true, deadline: null });
  });
});

describe('pct / fillColor ramp', () => {
  it('clamps and rounds percentages', () => {
    expect(pct(34, 40)).toBe(85);
    expect(pct(50, 40)).toBe(100); // never exceeds 100
    expect(pct(0, 0)).toBe(0);     // guards divide-by-zero
  });
  it('escalates colour with fill', () => {
    expect(fillColor(50)).toContain('brand');
    expect(fillColor(85)).toContain('warn');
    expect(fillColor(100)).toContain('danger');
  });
});

describe('fillView', () => {
  it('simple: derives X / Y from capacity/remaining', () => {
    const v = fillView(ev({ type: 'simple', capacity: 40, remaining: 6 }), undefined);
    expect(v.kind).toBe('simple');
    if (v.kind === 'simple') {
      expect(v.label).toBe('34 / 40');
      expect(v.pct).toBe(85);
      expect(v.full).toBe(false);
    }
  });
  it('simple: marks full at capacity', () => {
    const v = fillView(ev({ type: 'simple', capacity: 20, remaining: 0 }), undefined);
    if (v.kind === 'simple') {
      expect(v.full).toBe(true);
      expect(v.label).toContain('full');
    }
  });
  it('slotted: pending while stat not loaded', () => {
    const v = fillView(ev({ type: 'slotted', capacity: null, remaining: null }), undefined);
    expect(v.kind).toBe('slotted');
    if (v.kind === 'slotted') expect(v.pending).toBe(true);
  });
  it('slotted: settled-without-data shows a fallback, not a stuck spinner', () => {
    const v = fillView(ev({ type: 'slotted', capacity: null, remaining: null }), undefined, true);
    if (v.kind === 'slotted') {
      expect(v.pending).toBe(false);
      expect(v.regLabel).toBe('Fill unavailable');
    }
  });
  it('slotted: builds dual meters + reg label from stat', () => {
    const stat: EventStat = { registrations: 148, speaking: { capacity: 50, booked: 38 }, skills: { capacity: 50, booked: 36 } };
    const v = fillView(ev({ type: 'slotted', capacity: null, remaining: null }), stat);
    if (v.kind === 'slotted') {
      expect(v.pending).toBe(false);
      expect(v.regLabel).toBe('148 registrations');
      expect(v.speaking).toEqual({ pct: 76, label: '38/50' });
      expect(v.skills).toEqual({ pct: 72, label: '36/50' });
    }
  });
});

describe('deadlineInfo', () => {
  const now = new Date(2026, 5, 17, 12, 0).getTime(); // 17/06/2026 12:00
  it('hidden for archived events', () => {
    expect(deadlineInfo(ev({ archived: true, deadline: new Date(2026, 5, 25).toISOString() }), now)).toBeNull();
  });
  it('null when no deadline', () => {
    expect(deadlineInfo(ev({ deadline: null }), now)).toBeNull();
  });
  it('urgent within 2 days', () => {
    const info = deadlineInfo(ev({ deadline: new Date(2026, 5, 19, 12, 0).toISOString() }), now);
    expect(info?.urgent).toBe(true);
    expect(info?.label).toContain('Closes 19/06');
  });
  it('not urgent when far out', () => {
    const info = deadlineInfo(ev({ deadline: new Date(2026, 5, 25, 12, 0).toISOString() }), now);
    expect(info?.urgent).toBe(false);
    expect(info?.passed).toBe(false);
  });
  it('passed when deadlinePassed flag set', () => {
    const info = deadlineInfo(ev({ deadline: new Date(2026, 5, 10).toISOString(), deadlinePassed: true }), now);
    expect(info?.passed).toBe(true);
    expect(info?.label).toContain('Closed');
  });
});
