import { collection, doc } from 'firebase/firestore';
import { db } from './firestore-db';
import { bindBlockApi, type BlockListApi } from './admin-block-list';

// Per-event ineligibility (the quarterly "not eligible for THIS exam/event" list).
// Lives under events/{eventId}/ineligibility/{empCode} — the same path the booking
// transactions read (functions/registration-scope.js). It resets per event; the
// global "permanent block" is a separate tier (admin-permanent-block.ts).

export { type BlockEntry as IneligibilityEntry, type BulkBlockInput as BulkIneligibilityInput } from './admin-block-list';

export const INELIGIBILITY_REASON_PRESETS: string[] = [
  'The required 12-month interval from your previous test date has not been met yet.',
  'Your contract start date is after the 15th of the 2nd month of this quarter. Please register again next quarter.',
];

export function makeEventIneligibilityApi(adminEmail: string, eventId: string): BlockListApi {
  return bindBlockApi(
    {
      col: () => collection(db, 'events', eventId, 'ineligibility'),
      ref: (empCode) => doc(db, 'events', eventId, 'ineligibility', empCode),
      auditUpsert: 'admin.upsertIneligibility',
      auditDelete: 'admin.deleteIneligibility',
      auditExtra: { eventId },
    },
    adminEmail,
  );
}
