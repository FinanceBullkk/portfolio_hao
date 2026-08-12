import {
  deleteDoc, getDocs, setDoc, writeBatch,
  type CollectionReference, type DocumentReference,
} from 'firebase/firestore';
import { db } from './firestore-db';
import { auditLog, type ClientAuditEvent } from './audit';
import { isValidEmpCode } from './emp-code';

// Generic blocklist CRUD shared by the two block tiers (see permanent-block.js on
// the server for the split):
//   • per-event ineligibility — events/{id}/ineligibility/{empCode}  (admin-ineligibility.ts)
//   • global permanent block  — /permanentBlock/{empCode}            (admin-permanent-block.ts)
// They differ only in collection path + audit identity, so the validation, bulk
// parsing and write batching live here once.

export interface BlockEntry {
  empCode: string;
  reason: string;
  email?: string;
  fullName?: string;
}

export type BulkBlockInput = BlockEntry;

// Binds the generic CRUD to a concrete Firestore collection + audit identity.
export interface BlockScope {
  col: () => CollectionReference;
  ref: (empCode: string) => DocumentReference;
  auditUpsert: ClientAuditEvent;
  auditDelete: ClientAuditEvent;
  auditExtra: Record<string, unknown>; // e.g. { eventId } for the per-event list
}

// Bound, scope-free surface the admin UI consumes — no empCode-path knowledge leaks
// into the components.
export interface BlockListApi {
  list: () => Promise<BlockEntry[]>;
  upsert: (empCode: string, data: { reason: string; email?: string; fullName?: string }) => Promise<void>;
  bulkUpsert: (entries: BulkBlockInput[]) => Promise<{ count: number }>;
  remove: (empCode: string) => Promise<void>;
}

function buildPayload(reason: string, email?: string, fullName?: string): Record<string, unknown> {
  const payload: Record<string, unknown> = { reason };
  if (email !== undefined && email.trim()) payload.email = email.trim().toLowerCase();
  if (fullName !== undefined && fullName.trim()) payload.fullName = fullName.trim();
  return payload;
}

export function bindBlockApi(scope: BlockScope, adminEmail: string): BlockListApi {
  return {
    async list() {
      const snap = await getDocs(scope.col());
      return snap.docs.map((d) => ({
        empCode: d.id,
        reason: (d.data().reason as string) ?? '',
        email: d.data().email,
        fullName: d.data().fullName,
      }));
    },

    async upsert(empCode, data) {
      const code = empCode.trim();
      if (!isValidEmpCode(code)) throw new Error('Employee Code must be 6 digits.');
      const reason = data.reason.trim();
      if (!reason) throw new Error('Please enter a reason.');
      const payload = buildPayload(reason, data.email, data.fullName);
      await setDoc(scope.ref(code), payload, { merge: true });
      void auditLog(adminEmail, scope.auditUpsert, { ...scope.auditExtra, empCode: code, ...payload });
    },

    async bulkUpsert(entries) {
      if (entries.length === 0) throw new Error('No valid Employee Code to import.');

      const normalized = entries.map((entry) => {
        const empCode = entry.empCode.trim();
        if (!isValidEmpCode(empCode)) throw new Error(`Employee Code "${entry.empCode}" must be 6 digits.`);
        const reason = entry.reason.trim();
        if (!reason) throw new Error(`Please enter a reason for Employee Code ${empCode}.`);
        return { empCode, payload: buildPayload(reason, entry.email, entry.fullName) };
      });

      for (let i = 0; i < normalized.length; i += 450) {
        const batch = writeBatch(db);
        for (const entry of normalized.slice(i, i + 450)) {
          batch.set(scope.ref(entry.empCode), entry.payload, { merge: true });
        }
        await batch.commit();
      }

      void auditLog(adminEmail, scope.auditUpsert, {
        ...scope.auditExtra,
        mode: 'bulk',
        count: normalized.length,
        empCodes: normalized.slice(0, 50).map((entry) => entry.empCode),
        truncated: normalized.length > 50,
      });
      return { count: normalized.length };
    },

    async remove(empCode) {
      const code = empCode.trim();
      await deleteDoc(scope.ref(code));
      void auditLog(adminEmail, scope.auditDelete, { ...scope.auditExtra, empCode: code });
    },
  };
}
