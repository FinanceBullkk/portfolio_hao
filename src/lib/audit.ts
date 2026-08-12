import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firestore-db';
import { captureError } from './monitoring';

// Events the CLIENT writes directly to /auditLogs via auditLog() below. Each MUST
// appear in firestore.rules → validClientAuditLog() (which only permits `^admin\.…$`),
// or Firestore silently rejects the write and the audit row is lost. The
// `^admin\.` subset is the single source of truth; security.test.ts SEC-24b asserts
// CLIENT_AUDIT_EVENTS ⊆ that rule, so adding one here without the rule fails CI.
export const CLIENT_AUDIT_EVENTS = [
  'admin.updateConfig',
  'admin.createSlot',
  'admin.deleteSlot',
  'admin.upsertIneligibility',
  'admin.deleteIneligibility',
  'admin.upsertEligibility',
  'admin.deleteEligibility',
  'admin.upsertPermanentBlock',
  'admin.deletePermanentBlock',
] as const;

export type ClientAuditEvent = (typeof CLIENT_AUDIT_EVENTS)[number];

// Every event name the audit tab may render: the client-written set above PLUS
// events written SERVER-side by Cloud Functions (Admin SDK, which bypasses rules) —
// bookings, admin callables, scheduled cleanups. Superset of ClientAuditEvent; never
// pass a server-only event to auditLog() (the rules would reject a client write).
export type AuditEvent =
  | ClientAuditEvent
  | 'book.create'
  | 'book.update'
  | 'book.cancel'
  | 'book.rejected.blocked'
  | 'admin.deleteRegistration'
  | 'admin.updateRegistration'
  | 'admin.updateSlot'
  | 'admin.deleteEvent'
  | 'admin.reconcileEventCapacity'
  | 'admin.cleanupRegistrationEmailFields'
  | 'admin.cleanupFunctionRateLimits';

/**
 * Append an immutable entry to /auditLogs.
 * Non-blocking: failures are logged to console but never thrown
 * so they cannot break the calling operation.
 */
export async function auditLog(
  email: string,
  event: ClientAuditEvent,
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      timestamp: serverTimestamp(),
      email,
      event,
      detail: detail ?? {},
    });
  } catch (e) {
    // Never block the caller.
    captureError(e, { operation: 'auditLog' });
  }
}

export interface AuditEntry {
  id: string;
  timestamp: string | null;
  email: string;
  event: string;
  detail: Record<string, unknown>;
}

function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
    promise.then((res) => { clearTimeout(timer); resolve(res); }).catch((err) => { clearTimeout(timer); reject(err); });
  });
}

/** List recent audit log entries (admin only — rules enforce). */
export async function listAuditLogs(max = 200): Promise<AuditEntry[]> {
  try {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) throw new Error('Firestore not available');
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(max));
    const snap = await withTimeout(getDocs(q));
    return snap.docs.map((d) => {
      const data = d.data();
      const ts = data.timestamp as Timestamp | undefined;
      return {
        id: d.id,
        timestamp: ts ? ts.toDate().toISOString() : null,
        email: data.email ?? '',
        event: data.event ?? '',
        detail: (data.detail as Record<string, unknown>) ?? {},
      };
    });
  } catch (err) {
    console.warn('[listAuditLogs fallback]', err);
    return [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        email: 'admin@cyberlogitec.com',
        event: 'admin.init',
        detail: { note: 'Admin panel loaded' },
      },
    ];
  }
}
