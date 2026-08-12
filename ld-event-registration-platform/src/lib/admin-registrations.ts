import {
  collection,
  getCountFromServer,
  getDocs,
  documentId,
  query,
  startAfter,
  Timestamp,
  limit,
  orderBy,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firestore-db';
import type { MyBooking } from './types';
import { callable } from './callable';

export const REGISTRATIONS_PAGE_SIZE = 100;

export interface Registration extends MyBooking {
  email: string;
}

export type RegistrationPageCursor = QueryDocumentSnapshot<DocumentData>;

export interface RegistrationsPage {
  items: Registration[];
  nextCursor: RegistrationPageCursor | null;
  total: number;
}

function registrationFromDoc(d: { id: string; data: () => Record<string, any> }): Registration {
  const data = d.data();
  return {
    email: d.id,
    empCode: data.empCode ?? '',
    fullName: data.fullName ?? '',
    bu: data.bu ?? '',
    speakingSlotId: data.speakingSlotId ?? null,
    skillsSlotId: data.skillsSlotId ?? null,
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : null,
    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : null,
    changeCount: data.changeCount ?? 0,
  };
}

export async function countRegistrations(): Promise<number> {
  const snap = await getCountFromServer(collection(db, 'registrations'));
  return snap.data().count;
}

export async function listRegistrationsPage(
  cursor: RegistrationPageCursor | null = null,
  pageSize = REGISTRATIONS_PAGE_SIZE,
): Promise<RegistrationsPage> {
  const constraints = cursor
    ? [orderBy(documentId()), startAfter(cursor), limit(pageSize)]
    : [orderBy(documentId()), limit(pageSize)];
  const [snap, total] = await Promise.all([
    getDocs(query(collection(db, 'registrations'), ...constraints)),
    countRegistrations(),
  ]);
  return {
    items: snap.docs.map(registrationFromDoc),
    nextCursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
    total,
  };
}

/**
 * Admin: move a participant's booking to different slots on their behalf. The
 * server runs the same seat-move transaction used for self-booking (release old
 * seats, take new), enforcing capacity + no-overlap while bypassing the
 * deadline/eligibility/quota checks (admin override). Acting admin + audit are
 * derived/written server-side.
 */
export async function adminUpdateRegistration(
  targetEmail: string,
  speakingSlotId: string,
  skillsSlotId: string,
  eventId?: string,
): Promise<void> {
  await callable<{ targetEmail: string; speakingSlotId: string; skillsSlotId: string; eventId?: string }, { ok: boolean }>(
    'adminUpdateRegistration',
    { targetEmail, speakingSlotId, skillsSlotId, ...(eventId ? { eventId } : {}) },
  );
}
