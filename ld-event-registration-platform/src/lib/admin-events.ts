// Admin operations on /events (multi-purpose registration platform). Reads are
// done directly client-side where firestore.rules allow admins; writes that touch
// the `remaining` seat counter (upsert/delete/reconcile) delegate to server
// callables so the counter is derived from the real registration count.
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firestore-db';
import { minToHHmm, type EventDoc, type ExamParts, type MyRegistrationsResult } from './types';
import { callable } from './callable';
import { slotFromDoc } from './slot-helpers';
import { eventFromDoc } from './event-helpers';

import { handleMockCallable } from './mockStore';

function withTimeout<T>(promise: Promise<T>, ms = 200): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
    promise.then((res) => { clearTimeout(timer); resolve(res); }).catch((err) => { clearTimeout(timer); reject(err); });
  });
}

/** Fetch all events, sorted by name. Admin reads events directly (rules allow). */
export async function listEvents(): Promise<EventDoc[]> {
  try {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) throw new Error('Firestore not available');
    const snap = await withTimeout(getDocs(collection(db, 'events')));
    const events = await Promise.all(snap.docs.map(async (d) => {
      const event = eventFromDoc(d.id, d.data());
      if (event.type !== 'simple' || event.capacity == null) return event;
      const regs = await withTimeout(getDocs(collection(db, 'events', event.eventId, 'registrations'))).catch(() => ({ size: 0 }));
      return { ...event, remaining: Math.max(0, event.capacity - (regs.size || 0)) };
    }));
    if (events.length > 0) {
      return events.sort((a, b) => a.name.localeCompare(b.name));
    }
  } catch (err) {
    console.warn('[listEvents fallback to mockStore]', err);
  }
  const mock = handleMockCallable('initEvents', {});
  return mock.state.events;
}

// ── Per-event fill stats (Events overview cards) ──────────────────────────────
// Simple events derive fill from EventDoc.capacity/remaining (already loaded, no
// extra read). Slotted events have no aggregate on the event doc, so we fan out
// to their slots + registrations to compute real Speaking / 3 Skills fill and a
// registration headcount — the data the lifecycle cards need to drop the old
// "—" capacity column for slotted events. Failure-tolerant per event.

export interface EventTypeFill {
  capacity: number;
  booked: number;
}

export interface EventStat {
  registrations: number;
  speaking?: EventTypeFill;
  skills?: EventTypeFill;
}

export async function listEventStats(): Promise<Record<string, EventStat>> {
  try {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) throw new Error('Firestore not available');
    const snap = await withTimeout(getDocs(collection(db, 'events')));
    const entries = await Promise.allSettled(
      snap.docs.map(async (d) => {
        const event = eventFromDoc(d.id, d.data());
        // Simple events already carry capacity/remaining on the event doc.
        if (event.type !== 'slotted') return null;
        const [regsSnap, slotsSnap] = await Promise.all([
          withTimeout(getDocs(collection(db, 'events', event.eventId, 'registrations'))).catch(() => ({ size: 0, docs: [] })),
          withTimeout(getDocs(collection(db, 'events', event.eventId, 'slots'))).catch(() => ({ docs: [] })),
        ]);
        const speaking: EventTypeFill = { capacity: 0, booked: 0 };
        const skills: EventTypeFill = { capacity: 0, booked: 0 };
        for (const sd of slotsSnap.docs) {
          const s = slotFromDoc(sd.id, sd.data());
          const bucket = s.type === 'Speaking' ? speaking : skills;
          bucket.capacity += s.capacity;
          bucket.booked += Math.max(0, s.capacity - s.remaining);
        }
        return { eventId: event.eventId, stat: { registrations: regsSnap.size, speaking, skills } satisfies EventStat };
      }),
    );
    const out: Record<string, EventStat> = {};
    for (const r of entries) {
      if (r.status === 'fulfilled' && r.value) out[r.value.eventId] = r.value.stat;
    }
    return out;
  } catch (err) {
    console.warn('[listEventStats fallback]', err);
    return {};
  }
}

export interface EventRegistrationRow {
  email: string;
  empCode: string;
  fullName: string;
  bu: string;
  createdAt: string | null;
  // Slotted events only (null for simple) — used to prefill the move-slot drawer.
  speakingSlotId: string | null;
  skillsSlotId: string | null;
  changeCount: number;
  updatedAt: string | null;
}

/** Registrations for one event (admin). Each doc id is the registrant email. */
export async function listEventRegistrations(eventId: string): Promise<EventRegistrationRow[]> {
  const data = await callable<{ eventId: string }, { registrations: EventRegistrationRow[] }>(
    'adminListEventRegistrations',
    { eventId },
  );
  return data.registrations ?? [];
}

/**
 * Admin lookup of a single user's full registration history across ALL events
 * (incl. archived/closed). Delegates to the admin-guarded callable; reuses the
 * same server shaper as the user-facing listMyRegistrations.
 */
export async function adminListUserRegistrations(email: string): Promise<MyRegistrationsResult> {
  const data = await callable<{ email: string }, MyRegistrationsResult>(
    'adminListUserRegistrations',
    { email: email.trim().toLowerCase() },
  );
  return { email: data.email, registrations: data.registrations ?? [] };
}

export interface UpsertEventInput {
  eventId: string;
  name: string;
  subtitle: string;
  category: string;
  type: 'simple' | 'slotted';
  // Required exam parts for slotted events (server defaults to 'both'; omit for simple).
  examParts?: ExamParts;
  capacity?: number;
  allowEnrollment: boolean;
  deadline?: string | null;
  emailConfirm: boolean;
  requireEligibility: boolean;
  listed: boolean;
  archived: boolean;
  // U1 schedule metadata (simple events). Times as 'HH:mm'; server parses to minutes.
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  format?: 'onsite' | 'online';
  location?: string;
  // Luma-style presentation metadata (optional). coverImageUrl is a Storage download
  // URL produced by the admin upload path; organizerBu is chosen from buList.
  coverImageUrl?: string;
  organizerBu?: string;
  description?: string;
  locationText?: string;
  // Preset theme-color key (event-theme.ts); server whitelists against EVENT_THEME_COLORS.
  themeColor?: string;
}

/**
 * Map an existing EventDoc back to a COMPLETE UpsertEventInput. A partial edit
 * (toggle enrollment / archive) must round-trip every field the server still
 * requires — for simple events that includes the U1 schedule metadata, which
 * `validateEventInput` rejects when absent. Times convert minutes → 'HH:mm'.
 * Legacy simple events with no schedule yet pass empty strings; the server will
 * ask the admin to fill them on the next edit (open the Edit drawer).
 */
export function eventToUpsertInput(ev: EventDoc): UpsertEventInput {
  return {
    eventId: ev.eventId,
    name: ev.name,
    subtitle: ev.subtitle,
    category: ev.category,
    type: ev.type,
    ...(ev.capacity != null ? { capacity: ev.capacity } : {}),
    allowEnrollment: ev.allowEnrollment,
    deadline: ev.deadline ?? null,
    emailConfirm: ev.emailConfirm,
    requireEligibility: ev.requireEligibility,
    listed: ev.listed,
    archived: ev.archived,
    // Round-trip presentation fields unconditionally so a partial save (toggle
    // enrollment / capacity) never drops the cover, organizer, description or location.
    coverImageUrl: ev.coverImageUrl ?? '',
    organizerBu: ev.organizerBu ?? '',
    description: ev.description ?? '',
    locationText: ev.locationText ?? '',
    themeColor: ev.themeColor ?? '',
    ...(ev.type === 'slotted' ? { examParts: ev.examParts ?? 'both' } : {}),
    ...(ev.type === 'simple'
      ? {
          eventDate: ev.eventDate ?? '',
          startTime: ev.startMin != null ? minToHHmm(ev.startMin) : '',
          endTime: ev.endMin != null ? minToHHmm(ev.endMin) : '',
          format: ev.format ?? 'onsite',
          location: ev.location ?? '',
        }
      : {}),
  };
}

/**
 * Create/update an event. Delegates to the `adminUpsertEvent` callable so
 * `remaining` is derived server-side from the real registration count (the
 * browser never writes the seat counter) — same rule as updateSlot.
 */
export async function upsertEvent(
  adminEmail: string,
  input: UpsertEventInput,
): Promise<{ ok: boolean; eventId: string; capacity: number | null; remaining: number | null; created: boolean }> {
  void adminEmail; // acting admin derived from auth server-side
  return callable('adminUpsertEvent', input);
}

export interface DeleteEventResult {
  ok: boolean;
  eventId: string;
  deleted: Record<string, number>;
}

/** Hard-delete an event and its known child collections. Server-owned. */
export async function deleteEvent(adminEmail: string, eventId: string): Promise<DeleteEventResult> {
  void adminEmail; // acting admin derived from auth server-side
  return callable('adminDeleteEvent', { eventId });
}

export interface ReconcileEventCapacityResult {
  ok: boolean;
  checked: number;
  reconciled: Array<{
    eventId: string;
    capacity: number;
    realUsed: number;
    remaining: number;
    claimCount: number;
  }>;
  skipped: Array<{ eventId: string; reason: string }>;
}

/** Admin: backfill/recompute simple-event capacity (seat claims) from registrations. */
export async function reconcileEventCapacity(
  adminEmail: string,
  eventId?: string,
): Promise<ReconcileEventCapacityResult> {
  void adminEmail; // acting admin derived from auth server-side
  return callable('adminReconcileEventCapacity', eventId ? { eventId } : {});
}

/** Admin: delete a participant's registration in an event (returns the seat). */
export async function deleteEventRegistration(
  adminEmail: string,
  eventId: string,
  targetEmail: string,
): Promise<void> {
  void adminEmail; // acting admin derived from auth server-side
  await callable('adminDeleteEventRegistration', { eventId, targetEmail });
}
