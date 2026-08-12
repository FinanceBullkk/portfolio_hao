// Mail delivery status — admin-only reads from the /mail collection written by
// the Firestore "Trigger Email" extension. Defensive against missing fields and
// a missing compound index so the notifications panel always renders.
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firestore-db';

/** Shape returned by listMail — defensive reads from /mail docs. */
export interface MailEntry {
  id: string;
  to: string;
  subject: string;
  /** Delivery state written back by the Trigger Email extension. */
  state: 'SUCCESS' | 'ERROR' | 'PROCESSING' | 'PENDING';
  error: string | null;
  attempts: number;
  deliveredAt: string | null;
}

/**
 * Read the most recent /mail docs (newest first). The Firestore "Trigger Email"
 * extension appends a `delivery` field once it processes each doc:
 *   { state: 'SUCCESS'|'ERROR'|'PROCESSING', attempts, endTime, error }
 *
 * Reads are admin-only per firestore.rules (/mail/{id} allow read: if isAdmin()).
 * Defensively falls back for missing fields so pre-extension docs still render.
 */
function withTimeout<T>(promise: Promise<T>, ms = 200): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
    promise.then((res) => { clearTimeout(timer); resolve(res); }).catch((err) => { clearTimeout(timer); reject(err); });
  });
}

export async function listMail(max = 100): Promise<MailEntry[]> {
  try {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) throw new Error('Firestore not available');
    const q = query(collection(db, 'mail'), orderBy('delivery.startTime', 'desc'), limit(max));
    let snap;
    try {
      snap = await withTimeout(getDocs(q));
    } catch {
      const fallback = query(collection(db, 'mail'), limit(max));
      snap = await withTimeout(getDocs(fallback));
    }
    return snap.docs.map((d) => {
      const data = d.data();
      const msg = typeof data.message === 'object' && data.message !== null ? data.message : {};
      const delivery = typeof data.delivery === 'object' && data.delivery !== null ? data.delivery : {};
      const rawState = typeof delivery.state === 'string' ? delivery.state.toUpperCase() : '';
      const state: MailEntry['state'] =
        rawState === 'SUCCESS' ? 'SUCCESS'
        : rawState === 'ERROR' ? 'ERROR'
        : rawState === 'PROCESSING' ? 'PROCESSING'
        : 'PENDING';
      const endTime = delivery.endTime as Timestamp | undefined;
      const deliveredAt = endTime && typeof endTime.toDate === 'function'
        ? endTime.toDate().toISOString()
        : null;
      return {
        id: d.id,
        to: typeof data.to === 'string' ? data.to : '',
        subject: typeof msg.subject === 'string' ? msg.subject : '',
        state,
        error: typeof delivery.error === 'string' ? delivery.error : null,
        attempts: typeof delivery.attempts === 'number' ? delivery.attempts : 0,
        deliveredAt,
      };
    });
  } catch (err) {
    console.warn('[listMail fallback]', err);
    return [];
  }
}
