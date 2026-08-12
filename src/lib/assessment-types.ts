/**
 * Types for the original slotted ASSESSMENT flow (flat-collection booking): the user's
 * single booking, the init payload, and the book/cancel data-access seam. Re-exported via
 * the `types.ts` barrel.
 */

import type { Slot, UserProfile } from './types-core';
import type { ExamParts } from './event-types';

export interface MyBooking {
  empCode: string;
  fullName: string;
  bu: string;
  speakingSlotId: string | null;
  skillsSlotId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  changeCount: number;
}

export interface InitResult {
  email: string;
  myBooking: MyBooking | null;
  profile?: UserProfile | null;
  slots: Slot[];
  deadline: string | null;
  deadlinePassed: boolean;
  allowEnrollment: boolean;
  clientNow: string;
  maxChanges: number;
  buList: string[];
  assessmentName: string;
  // Required exam parts for this (slotted) event — drives which picker(s) show and the
  // submit gate. Optional so the flat-legacy fixtures needn't set it; absent → 'both'.
  examParts?: ExamParts;
}

export interface BookPayload {
  empCode: string;
  fullName: string;
  bu: string;
  speakingSlotId: string;
  skillsSlotId: string;
}

export interface BookResult {
  ok: boolean;
  error?: string;
  emailSent?: boolean;
  state?: InitResult;
}

export interface CancelResult {
  ok: boolean;
  error?: string;
  state?: InitResult;
}

/**
 * Data-access seam for the slotted BookingFlow. The assessment flow binds these to
 * the flat-collection functions (lib/db.ts); a slotted EVENT binds them to the
 * event-scoped callables (lib/eventBookingDb.ts). Lets one BookingFlow serve both.
 */
export interface BookingApi {
  book: (email: string, payload: Omit<BookPayload, 'email'>) => Promise<BookResult>;
  cancel: (email: string) => Promise<CancelResult>;
  checkIneligibility: (empCode: string, email?: string) => Promise<string | null>;
}
