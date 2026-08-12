/**
 * Barrel for the app's shared types and small utilities. The definitions live in
 * domain files so each stays focused and greppable; this file re-exports them so the
 * whole codebase keeps importing from a single '../lib/types' path:
 *
 *   types-core        Slot / UserProfile / TimeRange + overlaps / minToHHmm / formatDateVi
 *   assessment-types  the original slotted assessment flow (MyBooking / InitResult / BookingApi …)
 *   event-types       the multi-purpose event platform + "My registrations" history
 *   program-types     the Pronunciation Program vertical (+ programSlotKey / slotConfigToMinutes)
 */

export * from './types-core';
export * from './assessment-types';
export * from './event-types';
export * from './program-types';
