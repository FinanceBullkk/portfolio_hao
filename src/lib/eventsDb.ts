import type {
  EventsInitResult,
  EventRegisterPayload,
  EventActionResult,
  MyRegistrationsResult,
} from './types';
import { captureError, friendlyFirestoreError } from './monitoring';
import { callable } from './callable';
import { validateIdentity } from './emp-code';

// User-facing API for the multi-purpose event platform. Mirrors lib/db.ts (the
// assessment flow) but for "simple" events: a single seat per registration, no
// slot/time selection. All writes go through callables (region pinned in
// callable.ts). Registration returns after durable writes; the UI refreshes the
// broad landing state in the background. Cancellation still returns fresh state.

// The callables return EventsInitResult minus clientNow (built server-side,
// co-located with Firestore). Stamp clientNow locally to keep clock-skew ≈0.
function stampState(state: Omit<EventsInitResult, 'clientNow'> | undefined): EventsInitResult | undefined {
  return state ? { ...state, clientNow: new Date().toISOString() } : undefined;
}

/** Initial events-landing load. */
export async function initEvents(): Promise<EventsInitResult> {
  const data = await callable<Record<string, never>, { state: Omit<EventsInitResult, 'clientNow'> }>(
    'initEvents',
    {},
  );
  return { ...data.state, clientNow: new Date().toISOString() };
}

export async function registerForEventDb(payload: EventRegisterPayload): Promise<EventActionResult> {
  const empCode = payload.empCode.trim();
  if (!payload.eventId) return { ok: false, error: 'Missing event.' };
  const identityError = validateIdentity({ empCode, fullName: payload.fullName, bu: payload.bu });
  if (identityError) return { ok: false, error: identityError };

  try {
    const data = await callable<EventRegisterPayload, { state?: Omit<EventsInitResult, 'clientNow'> }>(
      'registerForEvent',
      { eventId: payload.eventId, empCode, fullName: payload.fullName.trim(), bu: payload.bu.trim() },
    );
    return { ok: true, state: stampState(data.state) };
  } catch (e) {
    captureError(e, { operation: 'registerForEvent' });
    return { ok: false, error: friendlyFirestoreError(e) };
  }
}

/**
 * Read-only "My registrations" history across ALL events (incl. archived/closed).
 * Loaded on demand when the user opens the history screen, never on the landing
 * critical path.
 */
export async function listMyRegistrationsDb(): Promise<MyRegistrationsResult> {
  const data = await callable<Record<string, never>, MyRegistrationsResult>(
    'listMyRegistrations',
    {},
  );
  return { email: data.email, registrations: data.registrations ?? [] };
}

export async function cancelEventRegistrationDb(eventId: string): Promise<EventActionResult> {
  try {
    const data = await callable<{ eventId: string }, { state?: Omit<EventsInitResult, 'clientNow'> }>(
      'cancelEventRegistration',
      { eventId },
    );
    return { ok: true, state: stampState(data.state) };
  } catch (e) {
    captureError(e, { operation: 'cancelEventRegistration' });
    return { ok: false, error: friendlyFirestoreError(e) };
  }
}
