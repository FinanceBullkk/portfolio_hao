import type { BookPayload, BookResult, CancelResult, InitResult } from './types';
import { captureError, friendlyFirestoreError } from './monitoring';
import { callable } from './callable';
import { validateIdentity } from './emp-code';

// One client over the slotted book/cancel/init callables, parameterized by the
// callable names + scope. The flat assessment (lib/db.ts) and a per-event slotted
// booking (lib/eventBookingDb.ts) used to be line-for-line twins of this: same
// client-side validation, the same stampState, and the same "use the fresh state
// the callable returned, else fall back to init()" ladder — differing only by
// callable name and an optional eventId. Server-side these flows already share one
// transaction (functions/slotted-booking.js); this is the client mirror.

type StateNoNow = Omit<InitResult, 'clientNow'>;

// The callables omit clientNow (state is built server-side); stamp it locally so
// App.tsx's clock-skew stays ≈0.
function stampState(state: StateNoNow | undefined): InitResult | undefined {
  return state ? { ...state, clientNow: new Date().toISOString() } : undefined;
}

export interface SlottedBookingClient {
  init: () => Promise<InitResult>;
  book: (payload: Omit<BookPayload, 'email'>) => Promise<BookResult>;
  cancel: () => Promise<CancelResult>;
}

export interface SlottedBookingClientConfig {
  initName: string; // initBooking | initEventBooking
  bookName: string; // bookRegistration | bookEventSlot
  cancelName: string; // cancelRegistration | cancelEventBooking
  // Extra args merged into every callable payload (e.g. { eventId }); empty for flat.
  scopeArgs?: Record<string, string>;
}

export function makeSlottedBookingClient(cfg: SlottedBookingClientConfig): SlottedBookingClient {
  const scopeArgs = cfg.scopeArgs ?? {};

  async function init(): Promise<InitResult> {
    const data = await callable<Record<string, string>, { state: StateNoNow }>(
      cfg.initName,
      { ...scopeArgs },
    );
    return { ...data.state, clientNow: new Date().toISOString() };
  }

  async function book(payload: Omit<BookPayload, 'email'>): Promise<BookResult> {
    const empCode = payload.empCode.trim();
    const fullName = payload.fullName.trim();
    const bu = payload.bu.trim();

    const identityError = validateIdentity({ empCode, fullName, bu });
    if (identityError) return { ok: false, error: identityError };
    // Which parts are required is per-event (examParts); the UI gates the exact set and
    // the server re-validates. Here we only guard the "picked nothing at all" case.
    if (!payload.speakingSlotId && !payload.skillsSlotId)
      return { ok: false, error: 'Please select a slot.' };

    try {
      const data = await callable<Record<string, string>, { emailSent?: boolean; state?: StateNoNow }>(
        cfg.bookName,
        {
          ...scopeArgs,
          empCode,
          fullName,
          bu,
          speakingSlotId: payload.speakingSlotId,
          skillsSlotId: payload.skillsSlotId,
        },
      );
      // Use the fresh state the callable returned; fall back to init() only if absent.
      let state = stampState(data.state);
      if (!state) {
        try { state = await init(); } catch (e) { captureError(e, { operation: `${cfg.bookName}.initFallback` }); }
      }
      return { ok: true, emailSent: data.emailSent === true, state };
    } catch (e) {
      captureError(e, { operation: `${cfg.bookName}.callable` });
      let state: InitResult | undefined;
      try { state = await init(); } catch (initErr) { captureError(initErr, { operation: `${cfg.bookName}.initCatch` }); }
      return { ok: false, error: friendlyFirestoreError(e), state };
    }
  }

  async function cancel(): Promise<CancelResult> {
    try {
      const data = await callable<Record<string, string>, { state?: StateNoNow }>(
        cfg.cancelName,
        { ...scopeArgs },
      );
      let state = stampState(data.state);
      if (!state) {
        try { state = await init(); } catch (e) { captureError(e, { operation: `${cfg.cancelName}.initFallback` }); }
      }
      return { ok: true, state };
    } catch (e) {
      captureError(e, { operation: `${cfg.cancelName}.callable` });
      return { ok: false, error: friendlyFirestoreError(e) };
    }
  }

  return { init, book, cancel };
}
