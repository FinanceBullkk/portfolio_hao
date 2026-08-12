import { collection, doc } from 'firebase/firestore';
import { db } from './firestore-db';
import { bindBlockApi, type BlockListApi } from './admin-block-list';

// Global permanent block (the "never allowed to register for ANY event" list, e.g.
// a former employee). Top-level /permanentBlock/{empCode} — the same path every
// booking transaction + the checkEventEligibility preflight read on the server
// (functions/permanent-block.js). Distinct from the per-event quarterly list
// (admin-ineligibility.ts); this one does NOT reset per event.

export { type BlockEntry as PermanentBlockEntry, type BulkBlockInput as BulkPermanentBlockInput } from './admin-block-list';

export const PERMANENT_BLOCK_REASON_PRESETS: string[] = [
  'No longer employed at the company.',
  'Permanently barred from registering by HR.',
];

export function makePermanentBlockApi(adminEmail: string): BlockListApi {
  return bindBlockApi(
    {
      col: () => collection(db, 'permanentBlock'),
      ref: (empCode) => doc(db, 'permanentBlock', empCode),
      auditUpsert: 'admin.upsertPermanentBlock',
      auditDelete: 'admin.deletePermanentBlock',
      auditExtra: {},
    },
    adminEmail,
  );
}
