import { collection, doc } from 'firebase/firestore';
import { db } from './firestore-db';
import { bindBlockApi, type BlockListApi } from './admin-block-list';

// Per-event eligibility ALLOWLIST (the "only these people may see + register" list).
// Lives under events/{eventId}/eligibility/{empCode} — the same path the booking
// transactions + initEvents visibility gate read (functions/registration-scope.js).
// When the event has requireEligibility, only empCodes on this list see the event.
// Reuses the generic block-list plumbing (an entry is just empCode + optional name +
// optional note, stored in the `reason` field); semantics are allow, not block.

export { type BlockEntry as EligibilityEntry, type BulkBlockInput as BulkEligibilityInput } from './admin-block-list';

// Optional note presets (the shared list UI repurposes the "reason" field as a note).
export const ELIGIBILITY_NOTE_PRESETS: string[] = [
  'Approved by HR',
  'Selected participant',
];

export function makeEventEligibilityApi(adminEmail: string, eventId: string): BlockListApi {
  return bindBlockApi(
    {
      col: () => collection(db, 'events', eventId, 'eligibility'),
      ref: (empCode) => doc(db, 'events', eventId, 'eligibility', empCode),
      auditUpsert: 'admin.upsertEligibility',
      auditDelete: 'admin.deleteEligibility',
      auditExtra: { eventId },
    },
    adminEmail,
  );
}
