// Slots inside a slotted event (assessment-style), plus cross-event aggregation.
// Event-scoped twins of the flat-collection slot admin (admin-slots.ts):
// create/delete are client-side (rules allow admin write under
// /events/{id}/slots); capacity edits go through the adminUpdateSlot callable
// (eventId param) so `remaining` is recomputed server-side from the real count.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firestore-db';
import { minToHHmm, overlaps, type Slot } from './types';
import { auditLog } from './audit';
import { callable } from './callable';
import { slotFromDoc } from './slot-helpers';
import { generateSlotId } from './admin-slots';

export async function listEventSlots(eventId: string): Promise<Slot[]> {
  const snap = await getDocs(collection(db, 'events', eventId, 'slots'));
  const slots = snap.docs.map((d) => slotFromDoc(d.id, d.data()));
  slots.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.startMin - b.startMin));
  return slots;
}

export async function adminCreateEventSlot(
  adminEmail: string,
  eventId: string,
  payload: Omit<Slot, 'slotId' | 'remaining' | 'display'>,
): Promise<string> {
  const slotId = generateSlotId(payload.type, payload.date, payload.startMin);
  const ref = doc(db, 'events', eventId, 'slots', slotId);
  const existing = await getDoc(ref);
  if (existing.exists()) throw new Error(`Slot "${slotId}" already exists.`);
  if (payload.startMin >= payload.endMin) throw new Error('Start time must be before end time.');
  if (payload.capacity < 0) throw new Error('Invalid capacity.');

  // Same business rule as assessment: no two same-type slots overlap on a day.
  const sameDaySnap = await getDocs(query(collection(db, 'events', eventId, 'slots'), where('date', '==', payload.date)));
  const probe = { date: payload.date, startMin: payload.startMin, endMin: payload.endMin };
  const clash = sameDaySnap.docs.map((d) => slotFromDoc(d.id, d.data())).find(
    (s) => s.type === payload.type && overlaps(probe, s),
  );
  if (clash) {
    throw new Error(
      `This slot overlaps with "${clash.slotId}" (${minToHHmm(clash.startMin)}–${minToHHmm(clash.endMin)}) of the same type ${payload.type} on the same day.`,
    );
  }

  // A new slot always starts full. `remaining` is never client-supplied —
  // later capacity edits recompute it server-side from the real holder count
  // (adminUpdateSlot), so it can't drift below the truth on create.
  const remaining = payload.capacity;
  await setDoc(ref, {
    type: payload.type,
    date: payload.date,
    session: payload.session ?? '',
    startMin: payload.startMin,
    endMin: payload.endMin,
    capacity: payload.capacity,
    remaining,
    location: payload.location ?? '',
  });
  void auditLog(adminEmail, 'admin.createSlot', { slotId, eventId, ...payload, remaining });
  return slotId;
}

export async function adminDeleteEventSlot(adminEmail: string, eventId: string, slotId: string): Promise<void> {
  void adminEmail; // acting admin derived from auth server-side
  await callable('adminDeleteEventSlot', { eventId, slotId });
}

export async function updateEventSlot(
  adminEmail: string,
  eventId: string,
  slotId: string,
  fields: { capacity: number; location: string },
): Promise<{ ok: boolean; capacity: number; remaining: number; realUsed: number }> {
  void adminEmail; // acting admin derived from auth server-side
  if (!Number.isInteger(fields.capacity) || fields.capacity < 0) {
    throw new Error('Capacity must be a non-negative integer.');
  }
  return callable('adminUpdateSlot', { slotId, eventId, capacity: fields.capacity, location: fields.location });
}

// ── Cross-event slot aggregation ──────────────────────────────────────────────

/**
 * Fetch slots from ALL events' subcollections and merge them into a single
 * sorted array. Used by the Audit tab so slot IDs in booking/move audit rows
 * resolve to human labels (e.g. "22/06 · 13:30–14:00") across all events.
 * Resilient: any per-event failure is swallowed so the audit tab still loads.
 */
function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
    promise.then((res) => { clearTimeout(timer); resolve(res); }).catch((err) => { clearTimeout(timer); reject(err); });
  });
}

export async function listAllEventSlots(): Promise<Slot[]> {
  try {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) throw new Error('Firestore not available');
    const eventsSnap = await withTimeout(getDocs(collection(db, 'events')));
    const perEvent = await Promise.allSettled(
      eventsSnap.docs.map((evDoc) =>
        withTimeout(getDocs(collection(db, 'events', evDoc.id, 'slots'))).then((snap) =>
          snap.docs.map((d) => slotFromDoc(d.id, d.data())),
        ),
      ),
    );
    const all: Slot[] = [];
    for (const r of perEvent) {
      if (r.status === 'fulfilled') all.push(...r.value);
    }
    all.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.startMin - b.startMin));
    return all;
  } catch (err) {
    console.warn('[listAllEventSlots fallback]', err);
    return [];
  }
}
