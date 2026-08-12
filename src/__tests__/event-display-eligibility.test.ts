import { describe, expect, it } from 'vitest';
import { deriveEvent } from '../events/dark/event-display';
import type { EventDoc } from '../lib/types';

// deriveEvent.eligibilityLocked drives the "visible-but-locked" CTA on the card + detail
// screen. It must lock ONLY when the event is gated AND the server said this user is not
// eligible (explicit false) — never on an ungated event, and never when eligibility is
// unknown (so a partial/cached event can't accidentally lock a user out of the UI).

function mk(over: Partial<EventDoc>): EventDoc {
  return {
    eventId: 'e1', name: 'E1', subtitle: '', category: '', type: 'simple',
    allowEnrollment: true, deadline: null, deadlinePassed: false,
    capacity: 10, remaining: 5, requireEligibility: false, emailConfirm: false,
    listed: true, archived: false, ...over,
  };
}

describe('deriveEvent · eligibilityLocked', () => {
  it('is false for an ungated event (even if eligible:false leaks through)', () => {
    expect(deriveEvent(mk({ requireEligibility: false, eligible: false })).eligibilityLocked).toBe(false);
  });

  it('is true for a gated event the user is NOT eligible for', () => {
    expect(deriveEvent(mk({ requireEligibility: true, eligible: false })).eligibilityLocked).toBe(true);
  });

  it('is false for a gated event the user IS eligible for', () => {
    expect(deriveEvent(mk({ requireEligibility: true, eligible: true })).eligibilityLocked).toBe(false);
  });

  it('is false when eligibility is unknown (undefined) — never lock without an explicit false', () => {
    expect(deriveEvent(mk({ requireEligibility: true, eligible: undefined })).eligibilityLocked).toBe(false);
  });
});

// The status pill must AGREE with the CTA: a closed/past event whose CTA reads "Registration
// closed" can't still show "Slots open"/"Booking open" (the misleading state on the Past tab).
describe('deriveEvent · status pill vs closed', () => {
  it('slotted + deadline passed → pill reads "Registration closed", not "Slots open"', () => {
    const d = deriveEvent(mk({ type: 'slotted', deadlinePassed: true }));
    expect(d.closed).toBe(true);
    expect(d.statusKind).toBe('closed');
    expect(d.statusLabel).toBe('Registration closed');
  });

  it('slotted + enrollment off → pill reads "Registration closed"', () => {
    const d = deriveEvent(mk({ type: 'slotted', allowEnrollment: false }));
    expect(d.statusKind).toBe('closed');
    expect(d.statusLabel).toBe('Registration closed');
  });

  it('slotted + open → still "Slots open"', () => {
    const d = deriveEvent(mk({ type: 'slotted' }));
    expect(d.statusKind).toBe('open');
    expect(d.statusLabel).toBe('Slots open');
  });

  it('simple + open seats → spots-left label', () => {
    const d = deriveEvent(mk({ remaining: 3 }));
    expect(d.statusKind).toBe('open');
    expect(d.statusLabel).toBe('3 spots left');
  });

  it('simple + full outranks closed → "Full"', () => {
    const d = deriveEvent(mk({ remaining: 0, deadlinePassed: true }));
    expect(d.statusKind).toBe('full');
    expect(d.statusLabel).toBe('Full');
  });
});
