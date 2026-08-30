import type { BookingApi, EventDoc, InitResult, MyBooking, Slot, UserProfile } from './types';
import { validateIdentity } from './emp-code';

/**
 * A small, deterministic adapter for the public Corgi77 demo.
 *
 * The production event flow remains callable-backed. This adapter gives the
 * portfolio iframe the same BookingFlow UI and validation shape while keeping
 * every read/write in a closure (no Firebase, credentials, or localStorage).
 */
export interface DemoEventBooking {
  initial: InitResult;
  api: BookingApi;
  snapshot: () => InitResult;
}

function makeSlots(event: EventDoc): Slot[] {
  const parts = event.examParts ?? 'both';
  const slots: Slot[] = [];
  if (parts !== 'skills') {
    slots.push(
      { slotId: `${event.eventId}-sp-1`, type: 'Speaking', date: event.eventDate ?? '2026-09-15', session: 'A', startMin: 540, endMin: 600, capacity: 8, remaining: 5, location: 'Room 4A', display: '09:00 - 10:00 (Room 4A)' },
      { slotId: `${event.eventId}-sp-2`, type: 'Speaking', date: event.eventDate ?? '2026-09-15', session: 'B', startMin: 630, endMin: 690, capacity: 8, remaining: 3, location: 'Room 4A', display: '10:30 - 11:30 (Room 4A)' },
    );
  }
  if (parts !== 'speaking') {
    slots.push(
      { slotId: `${event.eventId}-sk-1`, type: '3 Skills', date: event.eventDate ?? '2026-09-15', session: 'C', startMin: 720, endMin: 900, capacity: 16, remaining: 10, location: 'Lab 2', display: '12:00 - 15:00 (Lab 2)' },
      { slotId: `${event.eventId}-sk-2`, type: '3 Skills', date: '2026-09-16', session: 'A', startMin: 540, endMin: 720, capacity: 16, remaining: 12, location: 'Lab 2', display: '09:00 - 12:00 (Lab 2)' },
    );
  }
  return slots;
}

function cloneState(state: InitResult): InitResult {
  return { ...state, slots: state.slots.map((slot) => ({ ...slot })), myBooking: state.myBooking ? { ...state.myBooking } : null };
}

export function createDemoEventBooking(event: EventDoc, profile: UserProfile | null, email: string): DemoEventBooking {
  const identity = profile ?? { empCode: '262088', fullName: 'Demo Employee', bu: 'BSG' };
  let state: InitResult = {
    email,
    profile: identity,
    myBooking: null,
    slots: makeSlots(event),
    deadline: event.deadline,
    deadlinePassed: event.deadlinePassed,
    allowEnrollment: event.allowEnrollment,
    clientNow: new Date().toISOString(),
    maxChanges: 3,
    buList: [identity.bu, 'BSG', 'CHORUS', 'LBU', 'IT'].filter((value, index, list) => list.indexOf(value) === index),
    assessmentName: event.name,
    examParts: event.examParts ?? 'both',
  };

  const snapshot = () => cloneState(state);
  const changeSlotCapacity = (slotId: string | null, delta: number) => {
    if (!slotId) return;
    const slot = state.slots.find((item) => item.slotId === slotId);
    if (slot) slot.remaining = Math.max(0, Math.min(slot.capacity, slot.remaining + delta));
  };

  const api: BookingApi = {
    checkIneligibility: async () => null,
    book: async (_email, payload) => {
      const identityError = validateIdentity(payload);
      if (identityError) return { ok: false, error: identityError };
      const needsSpeaking = state.examParts !== 'skills';
      const needsSkills = state.examParts !== 'speaking';
      if ((needsSpeaking && !payload.speakingSlotId) || (needsSkills && !payload.skillsSlotId)) {
        return { ok: false, error: 'Please select the required slot(s).' };
      }
      const selected = [payload.speakingSlotId, payload.skillsSlotId].filter(Boolean);
      for (const slotId of selected) {
        const slot = state.slots.find((item) => item.slotId === slotId);
        if (!slot) return { ok: false, error: 'That slot is no longer available.' };
        const isCurrent = slotId === state.myBooking?.speakingSlotId || slotId === state.myBooking?.skillsSlotId;
        if (slot.remaining <= 0 && !isCurrent) return { ok: false, error: 'That slot is full. Choose another time.' };
      }
      const previous = state.myBooking;
      if (previous) {
        if (previous.speakingSlotId !== payload.speakingSlotId) changeSlotCapacity(previous.speakingSlotId, 1);
        if (previous.skillsSlotId !== payload.skillsSlotId) changeSlotCapacity(previous.skillsSlotId, 1);
      }
      if (!previous || previous.speakingSlotId !== payload.speakingSlotId) changeSlotCapacity(payload.speakingSlotId, -1);
      if (!previous || previous.skillsSlotId !== payload.skillsSlotId) changeSlotCapacity(payload.skillsSlotId, -1);
      const now = new Date().toISOString();
      const booking: MyBooking = {
        empCode: payload.empCode.trim(), fullName: payload.fullName.trim(), bu: payload.bu.trim(),
        speakingSlotId: payload.speakingSlotId || null, skillsSlotId: payload.skillsSlotId || null,
        createdAt: previous?.createdAt ?? now, updatedAt: now, changeCount: previous ? previous.changeCount + 1 : 0,
      };
      state = { ...state, profile: { empCode: booking.empCode, fullName: booking.fullName, bu: booking.bu }, myBooking: booking, clientNow: now };
      return { ok: true, emailSent: false, state: snapshot() };
    },
    cancel: async () => {
      if (state.myBooking) {
        changeSlotCapacity(state.myBooking.speakingSlotId, 1);
        changeSlotCapacity(state.myBooking.skillsSlotId, 1);
      }
      state = { ...state, myBooking: null, clientNow: new Date().toISOString() };
      return { ok: true, state: snapshot() };
    },
  };

  return { initial: snapshot(), api, snapshot };
}
