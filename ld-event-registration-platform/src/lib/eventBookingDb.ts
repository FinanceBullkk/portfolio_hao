import type { BookingApi, InitResult } from './types';
import { makeSlottedBookingClient } from './slotted-booking-client';
import { checkEventEligibility } from './event-eligibility-client';

// Per-event slotted booking — the event-scoped adapter over the shared slotted
// booking client (slotted-booking-client.ts), the same client the flat assessment
// (lib/db.ts) uses. Same InitResult/BookResult shapes, so the assessment
// BookingFlow can be reused via a BookingApi bound to a specific eventId.

function eventClient(eventId: string) {
  return makeSlottedBookingClient({
    initName: 'initEventBooking',
    bookName: 'bookEventSlot',
    cancelName: 'cancelEventBooking',
    scopeArgs: { eventId },
  });
}

export function initEventBooking(eventId: string): Promise<InitResult> {
  return eventClient(eventId).init();
}

/**
 * Bind the slotted-event callables to one eventId so a generic BookingFlow can
 * drive them. The Step-1 preflight calls checkEventEligibility (advisory fast-fail);
 * the booking transaction re-runs the identical gate, so a stale/failed preflight
 * never lets an ineligible registration through. The `email` args are unused
 * (resolved server-side from auth) — kept for BookingApi call-site compatibility.
 */
export function makeEventBookingApi(eventId: string): BookingApi {
  const client = eventClient(eventId);
  return {
    book: (_email, payload) => client.book(payload),
    cancel: (_email) => client.cancel(),
    checkIneligibility: (empCode) => checkEventEligibility(eventId, empCode),
  };
}
