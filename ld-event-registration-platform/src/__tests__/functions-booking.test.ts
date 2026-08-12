import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DocData = Record<string, any>;
const realRequire = createRequire(import.meta.url);
const { buildBookingIcs } = realRequire(join(process.cwd(), 'functions/ics-helpers.js'));

class FakeHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

class FakeDocRef {
  path: string;
  id: string;
  private store: Map<string, DocData>;

  constructor(path: string, store: Map<string, DocData>) {
    this.path = path;
    this.id = path.split('/').pop() || path;
    this.store = store;
  }

  async get() {
    return snap(this, this.store.get(this.path));
  }

  async set(data: DocData, opts?: { merge?: boolean }) {
    if (!opts?.merge) { this.store.set(this.path, { ...data }); return; }
    const next = { ...(this.store.get(this.path) || {}) };
    for (const [key, value] of Object.entries(data)) {
      if (value === 'FIELD_DELETE') delete next[key];
      else next[key] = value;
    }
    this.store.set(this.path, next);
  }

  async update(data: DocData) {
    const current = this.store.get(this.path) || {};
    const next = { ...current };
    for (const [key, value] of Object.entries(data)) {
      if (value === 'FIELD_DELETE') delete next[key];
      else next[key] = value;
    }
    this.store.set(this.path, next);
  }

  async delete() {
    this.store.delete(this.path);
  }
}

class FakeDb {
  store = new Map<string, DocData>();
  collectionAdds: Array<{ path: string; data: DocData }> = [];
  transactionLog: Array<{ op: string; path: string; data?: DocData }> = [];
  failCollectionAdds = new Set<string>();

  doc(path: string) {
    return new FakeDocRef(path, this.store);
  }

  private snapshot(path: string, filter?: { field: string; value: unknown }) {
    const prefix = `${path}/`;
    const docs = Array.from(this.store.entries())
      .filter(([docPath]) => docPath.startsWith(prefix) && docPath.slice(prefix.length).indexOf('/') === -1)
      .filter(([, data]) => !filter || data[filter.field] === filter.value)
      .map(([docPath, data]) => ({
        id: docPath.slice(prefix.length),
        ref: this.doc(docPath),
        data: () => data,
      }));
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      forEach: (fn: (doc: { id: string; data: () => DocData }) => void) => docs.forEach(fn),
    };
  }

  collection(path: string) {
    const sliceSnap = (filter: { field: string; value: unknown } | undefined, n?: number) => {
      const s = this.snapshot(path, filter);
      if (n == null) return s;
      const docs = s.docs.slice(0, n);
      return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: any) => docs.forEach(fn) };
    };
    return {
      // A CollectionReference is a Query in Firestore, so tx.get(collectionRef) is
      // valid — mark it so the fake transaction returns the whole-collection snapshot.
      __isQuery: true as const,
      add: async (data: DocData) => {
        if (this.failCollectionAdds.has(path)) throw new Error(`${path} add failed`);
        this.collectionAdds.push({ path, data });
        const id = `${path}-${this.collectionAdds.length}`;
        this.store.set(`${path}/${id}`, data);
        return this.doc(`${path}/${id}`);
      },
      get: async () => this.snapshot(path),
      where: (field: string, _op: string, value: unknown) => ({
        __isQuery: true as const,
        get: async () => sliceSnap({ field, value }),
        limit: (n: number) => ({ __isQuery: true as const, get: async () => sliceSnap({ field, value }, n) }),
      }),
    };
  }

  batch() {
    const ops: Array<() => void> = [];
    const applyMerge = (ref: FakeDocRef, data: DocData) => {
      const next = { ...(this.store.get(ref.path) || {}) };
      for (const [k, v] of Object.entries(data)) { if (v === 'FIELD_DELETE') delete next[k]; else next[k] = v; }
      this.store.set(ref.path, next);
    };
    return {
      create: (ref: FakeDocRef, data: DocData) => {
        ops.push(() => {
          if (this.store.has(ref.path)) {
            const err: any = new Error(`Document already exists: ${ref.path}`);
            err.code = 6;
            throw err;
          }
          this.store.set(ref.path, { ...data });
        });
      },
      set: (ref: FakeDocRef, data: DocData, opts?: { merge?: boolean }) => {
        ops.push(() => { if (opts?.merge) applyMerge(ref, data); else this.store.set(ref.path, { ...data }); });
      },
      update: (ref: FakeDocRef, data: DocData) => { ops.push(() => applyMerge(ref, data)); },
      delete: (ref: FakeDocRef) => { ops.push(() => { this.store.delete(ref.path); }); },
      commit: async () => { ops.forEach((op) => op()); ops.length = 0; },
    };
  }

  async runTransaction(fn: (tx: any) => Promise<void>) {
    const tx = {
      get: async (refOrQuery: any) => (refOrQuery && refOrQuery.__isQuery)
        ? refOrQuery.get()
        : snap(refOrQuery, this.store.get(refOrQuery.path)),
      // tx.create fails if the doc exists (Firestore's ALREADY_EXISTS, code 6) — the
      // mechanism behind the program's global (date,slot) lock. We throw synchronously
      // so the rejection propagates out of runTransaction, like a real commit failure.
      create: (ref: FakeDocRef, data: DocData) => {
        this.transactionLog.push({ op: 'create', path: ref.path });
        if (this.store.has(ref.path)) { const err: any = new Error(`Document already exists: ${ref.path}`); err.code = 6; throw err; }
        this.store.set(ref.path, { ...data });
      },
      set: (ref: FakeDocRef, data: DocData, opts?: { merge?: boolean }) => {
        this.transactionLog.push({ op: 'set', path: ref.path, data });
        this.store.set(ref.path, opts?.merge ? { ...(this.store.get(ref.path) || {}), ...data } : { ...data });
      },
      update: (ref: FakeDocRef, data: DocData) => {
        this.transactionLog.push({ op: 'update', path: ref.path, data });
        this.store.set(ref.path, { ...(this.store.get(ref.path) || {}), ...data });
      },
      delete: (ref: FakeDocRef) => {
        this.transactionLog.push({ op: 'delete', path: ref.path });
        this.store.delete(ref.path);
      },
    };
    await fn(tx);
  }
}

function snap(ref: FakeDocRef, data: DocData | undefined) {
  return {
    id: ref.id,
    ref,
    exists: data !== undefined,
    data: () => data || {},
  };
}

function ts(date = '2026-05-01T00:00:00.000Z') {
  const d = new Date(date);
  return {
    toDate: () => d,
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: (d.getTime() % 1000) * 1_000_000,
  };
}

function signed(email = 'user@cyberlogitec.com') {
  return { auth: { token: { email, email_verified: true } }, data: {} };
}

function seedOpenConfig(db: FakeDb, overrides: DocData = {}) {
  db.store.set('config/main', {
    allowEnrollment: true,
    maxChanges: 3,
    deadline: null,
    emailConfirm: false,
    adminEmails: ['admin@cyberlogitec.com'],
    ...overrides,
  });
}

function loadFunctions(db: FakeDb) {
  const exports: Record<string, any> = {};
  const code = readFileSync(join(process.cwd(), 'functions/index.js'), 'utf8');
  const fakeRequire = (id: string) => {
    if (id === 'firebase-functions/v2/https') {
      return { onCall: (optionsOrHandler: any, maybeHandler?: any) => maybeHandler ?? optionsOrHandler, HttpsError: FakeHttpsError };
    }
    if (id === 'firebase-functions/v2/scheduler') {
      return { onSchedule: (_schedule: string, handler: any) => handler };
    }
    if (id === 'firebase-functions/v2') {
      return { setGlobalOptions: (_opts: any) => {} };
    }
    if (id === 'firebase-admin/app') {
      return { initializeApp: vi.fn() };
    }
    if (id === 'firebase-admin/firestore') {
      return {
        getFirestore: () => db,
        FieldValue: { delete: () => 'FIELD_DELETE' },
        Timestamp: {
          now: () => ts('2026-05-30T00:00:00.000Z'),
          fromMillis: (ms: number) => ts(new Date(ms).toISOString()),
          fromDate: (d: Date) => ts(d.toISOString()),
        },
      };
    }
    if (id === './email-helpers' || id === './format-helpers' || id === './ics-helpers' || id === './maintenance' || id === './eligibility-rules' || id === './handler-helpers' || id === './booking-rules' || id === './release-booking' || id === './slot-admin' || id === './admin-registration-edit' || id === './defaults' || id === './event-handlers' || id === './event-admin' || id === './event-capacity-reconcile' || id === './event-client-state' || id === './event-shape' || id === './event-booking-handlers' || id === './event-booking-state' || id === './my-registrations' || id === './user-profile' || id === './profile-handlers' || id === './event-eligibility-preflight' || id === './program-handlers' || id === './program-state' || id === './program-admin' || id === './mail-test' || id === './admin-event-registration-list') {
      return realRequire(join(process.cwd(), 'functions', `${id.slice(2)}.js`));
    }
    throw new Error(`Unexpected require: ${id}`);
  };
  vm.runInNewContext(code, {
    exports,
    require: fakeRequire,
    console,
    Date,
    Promise,
    Map,
    String,
    Math,
    RegExp,
  });
  return exports;
}

describe('Cloud Functions booking handlers', () => {
  let db: FakeDb;
  let fns: Record<string, any>;

  beforeEach(() => {
    db = new FakeDb();
    fns = loadFunctions(db);
  });

  it('builds booking ICS with stable UIDs, sequence, alarms, CRLF, escaping and UTC times', () => {
    const ics = buildBookingIcs({
      empCode: '262010',
      sp: {
        type: 'Speaking',
        date: '2026-06-22',
        startMin: 540,
        endMin: 600,
        location: 'Room A, B; C',
      },
      sk: {
        type: '3 Skills',
        date: '2026-06-22',
        startMin: 660,
        endMin: 840,
        location: 'Room D',
      },
      sequence: 2,
      assessmentName: 'Assessment Q2 2026',
      now: new Date('2026-05-31T00:00:00.000Z'),
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect((ics.match(/BEGIN:VEVENT/g) || [])).toHaveLength(2);
    expect((ics.match(/BEGIN:VALARM/g) || [])).toHaveLength(4);
    expect(ics).toContain('UID:262010-SP@assessment-booking');
    expect(ics).toContain('UID:262010-3S@assessment-booking');
    expect(ics).toContain('DTSTART:20260622T020000Z');
    expect(ics).toContain('SEQUENCE:2');
    expect(ics).toContain('LOCATION:Room A\\, B\\; C');
    expect(ics).toContain('\r\n');
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  // ─── Admin slot capacity edits + reconcile ──────────────────────────────────

  describe('adminUpdateSlot — server-owned capacity edit (event-scoped)', () => {
    const EV = 'ev1';
    const seedSkSlot = (over: DocData = {}) => {
      seedOpenConfig(db, { adminEmails: ['admin@cyberlogitec.com'] });
      db.store.set(`events/${EV}/slots/3S-2206-1100`, {
        type: '3 Skills', date: '2026-06-22', session: 'S2', startMin: 660, endMin: 720,
        capacity: 16, remaining: 16, location: 'Room B', ...over,
      });
    };
    const seedHolders = (n: number, slotId = '3S-2206-1100') => {
      for (let i = 0; i < n; i += 1) {
        db.store.set(`events/${EV}/registrations/u${i}@cyberlogitec.com`, { empCode: `26200${i}`, skillsSlotId: slotId });
      }
    };

    it('derives remaining from the REAL registration count, not the stored counter', async () => {
      // The production bug: counter says used=15 (rem 1) but 16 people really hold the slot.
      seedSkSlot({ capacity: 16, remaining: 1 });
      seedHolders(16);

      const res = await fns.adminUpdateSlot({
        ...signed('admin@cyberlogitec.com'),
        data: { eventId: EV, slotId: '3S-2206-1100', capacity: 16, location: 'Room B' },
      });

      expect(res).toMatchObject({ ok: true, capacity: 16, remaining: 0, realUsed: 16 });
      expect(db.store.get(`events/${EV}/slots/3S-2206-1100`)?.remaining).toBe(0);
      expect(db.collectionAdds.find((c) => c.path === 'auditLogs')?.data.event).toBe('admin.updateSlot');
    });

    it('recomputes remaining when capacity changes', async () => {
      seedSkSlot({ capacity: 16, remaining: 0 });
      seedHolders(10);

      const res = await fns.adminUpdateSlot({
        ...signed('admin@cyberlogitec.com'),
        data: { eventId: EV, slotId: '3S-2206-1100', capacity: 12, location: 'Room X' },
      });

      expect(res).toMatchObject({ capacity: 12, remaining: 2, realUsed: 10 });
      expect(db.store.get(`events/${EV}/slots/3S-2206-1100`)).toMatchObject({ capacity: 12, remaining: 2, location: 'Room X' });
    });

    it('rejects reducing capacity below the real registration count', async () => {
      seedSkSlot({ capacity: 16, remaining: 0 });
      seedHolders(12);

      await expect(fns.adminUpdateSlot({
        ...signed('admin@cyberlogitec.com'),
        data: { eventId: EV, slotId: '3S-2206-1100', capacity: 10, location: 'Room B' },
      })).rejects.toMatchObject({ code: 'failed-precondition' });

      // Slot is untouched on rejection.
      expect(db.store.get(`events/${EV}/slots/3S-2206-1100`)).toMatchObject({ capacity: 16, remaining: 0 });
    });

    it('rejects a missing/invalid eventId', async () => {
      seedSkSlot();
      await expect(fns.adminUpdateSlot({
        ...signed('admin@cyberlogitec.com'),
        data: { slotId: '3S-2206-1100', capacity: 16, location: 'Room B' },
      })).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    it('rejects a non-admin caller', async () => {
      seedSkSlot();
      await expect(fns.adminUpdateSlot({
        ...signed('user@cyberlogitec.com'),
        data: { eventId: EV, slotId: '3S-2206-1100', capacity: 16, location: 'Room B' },
      })).rejects.toMatchObject({ code: 'permission-denied' });
    });
  });

  describe('adminUpdateRegistration — move a participant on their behalf (event-scoped)', () => {
    const EV = 'ev1';
    const seedMoveScene = (over: { newSp?: DocData; newSk?: DocData } = {}) => {
      seedOpenConfig(db, { adminEmails: ['admin@cyberlogitec.com'] });
      db.store.set(`events/${EV}`, { name: 'Assessment X', type: 'slotted', allowEnrollment: true, archived: false, requireEligibility: false, maxChanges: 3 });
      db.store.set(`events/${EV}/slots/SP-2206-0900`, {
        type: 'Speaking', date: '2026-06-22', session: 'S1', startMin: 540, endMin: 600, capacity: 10, remaining: 8, location: 'Room A',
      });
      db.store.set(`events/${EV}/slots/3S-2206-1100`, {
        type: '3 Skills', date: '2026-06-22', session: 'S2', startMin: 660, endMin: 720, capacity: 10, remaining: 7, location: 'Room B',
      });
      db.store.set(`events/${EV}/slots/SP-2206-1000`, {
        type: 'Speaking', date: '2026-06-22', session: 'S1', startMin: 600, endMin: 660,
        capacity: 10, remaining: 5, location: 'Room C', ...over.newSp,
      });
      db.store.set(`events/${EV}/slots/3S-2206-1300`, {
        type: '3 Skills', date: '2026-06-22', session: 'S2', startMin: 780, endMin: 930,
        capacity: 10, remaining: 5, location: 'Room D', ...over.newSk,
      });
      db.store.set(`events/${EV}/registrations/p@cyberlogitec.com`, {
        empCode: '262010', fullName: 'P Q', bu: 'BSG',
        speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100', changeCount: 0,
      });
    };
    const move = (data: DocData) => fns.adminUpdateRegistration({ ...signed('admin@cyberlogitec.com'), data: { eventId: EV, ...data } });

    it('returns the old seats, takes the new ones, and updates the registration', async () => {
      seedMoveScene();
      await move({ targetEmail: 'p@cyberlogitec.com', speakingSlotId: 'SP-2206-1000', skillsSlotId: '3S-2206-1300' });

      expect(db.store.get(`events/${EV}/slots/SP-2206-0900`)?.remaining).toBe(9); // old seat returned
      expect(db.store.get(`events/${EV}/slots/3S-2206-1100`)?.remaining).toBe(8);
      expect(db.store.get(`events/${EV}/slots/SP-2206-1000`)?.remaining).toBe(4); // new seat taken
      expect(db.store.get(`events/${EV}/slots/3S-2206-1300`)?.remaining).toBe(4);
      expect(db.store.get(`events/${EV}/registrations/p@cyberlogitec.com`)).toMatchObject({
        speakingSlotId: 'SP-2206-1000', skillsSlotId: '3S-2206-1300', empCode: '262010',
      });
      expect(db.store.has('registrations/p@cyberlogitec.com')).toBe(false); // flat collection never touched
      expect(db.collectionAdds.find((c) => c.path === 'auditLogs')?.data).toMatchObject({ event: 'admin.updateRegistration', detail: { eventId: EV } });
    });

    it('refuses to move into a full slot (no overbooking)', async () => {
      seedMoveScene({ newSk: { remaining: 0 } });
      await expect(move({ targetEmail: 'p@cyberlogitec.com', speakingSlotId: 'SP-2206-1000', skillsSlotId: '3S-2206-1300' }))
        .rejects.toMatchObject({ code: 'failed-precondition' });
      // Untouched: old slot keeps its seat, registration unchanged.
      expect(db.store.get(`events/${EV}/slots/3S-2206-1100`)?.remaining).toBe(7);
      expect(db.store.get(`events/${EV}/registrations/p@cyberlogitec.com`)).toMatchObject({ skillsSlotId: '3S-2206-1100' });
    });

    it('rejects two overlapping slots', async () => {
      // New 3 Skills slot overlaps the new Speaking slot (both start in the 600s).
      seedMoveScene({ newSk: { startMin: 630, endMin: 900 } });
      await expect(move({ targetEmail: 'p@cyberlogitec.com', speakingSlotId: 'SP-2206-1000', skillsSlotId: '3S-2206-1300' }))
        .rejects.toMatchObject({ code: 'failed-precondition' });
    });

    it('is a no-op when the slots are unchanged (no audit, no seat churn)', async () => {
      seedMoveScene();
      await move({ targetEmail: 'p@cyberlogitec.com', speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100' });
      expect(db.store.get(`events/${EV}/slots/SP-2206-0900`)?.remaining).toBe(8);
      expect(db.collectionAdds.find((c) => c.path === 'auditLogs')).toBeUndefined();
    });

    it('rejects a missing/invalid eventId', async () => {
      seedMoveScene();
      await expect(fns.adminUpdateRegistration({
        ...signed('admin@cyberlogitec.com'),
        data: { targetEmail: 'p@cyberlogitec.com', speakingSlotId: 'SP-2206-1000', skillsSlotId: '3S-2206-1300' },
      })).rejects.toMatchObject({ code: 'invalid-argument' });
    });

    it('rejects a non-admin caller', async () => {
      seedMoveScene();
      await expect(fns.adminUpdateRegistration({
        ...signed('user@cyberlogitec.com'),
        data: { eventId: EV, targetEmail: 'p@cyberlogitec.com', speakingSlotId: 'SP-2206-1000', skillsSlotId: '3S-2206-1300' },
      })).rejects.toMatchObject({ code: 'permission-denied' });
    });

    // examParts: a speaking-only event moves ONLY the Speaking seat; the 3 Skills
    // slots are never read or charged, and the reg keeps skillsSlotId null.
    const makeSpeakingOnly = () => {
      seedMoveScene();
      db.store.set(`events/${EV}`, { name: 'Assessment X', type: 'slotted', allowEnrollment: true, archived: false, requireEligibility: false, maxChanges: 3, examParts: 'speaking' });
      db.store.set(`events/${EV}/registrations/p@cyberlogitec.com`, {
        empCode: '262010', fullName: 'P Q', bu: 'BSG', speakingSlotId: 'SP-2206-0900', skillsSlotId: null, changeCount: 0,
      });
    };

    it('examParts speaking-only: moves only the Speaking slot, leaves 3 Skills untouched', async () => {
      makeSpeakingOnly();
      await move({ targetEmail: 'p@cyberlogitec.com', speakingSlotId: 'SP-2206-1000' }); // no skillsSlotId sent
      expect(db.store.get(`events/${EV}/slots/SP-2206-0900`)?.remaining).toBe(9); // old speaking seat returned
      expect(db.store.get(`events/${EV}/slots/SP-2206-1000`)?.remaining).toBe(4); // new speaking seat taken
      // 3 Skills slots never touched.
      expect(db.store.get(`events/${EV}/slots/3S-2206-1100`)?.remaining).toBe(7);
      expect(db.store.get(`events/${EV}/slots/3S-2206-1300`)?.remaining).toBe(5);
      expect(db.store.get(`events/${EV}/registrations/p@cyberlogitec.com`)).toMatchObject({
        speakingSlotId: 'SP-2206-1000', skillsSlotId: null,
      });
    });

    it('examParts speaking-only: rejects when no Speaking slot is supplied', async () => {
      makeSpeakingOnly();
      await expect(move({ targetEmail: 'p@cyberlogitec.com' }))
        .rejects.toMatchObject({ code: 'invalid-argument' });
    });
  });

  it('scheduled cleanup deletes stale function rate-limit docs', async () => {
    const oldTs = ts(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
    const freshTs = ts(new Date().toISOString());
    db.store.set('functionRateLimits/bookRegistration_old@cyberlogitec_com', { lastCallAt: oldTs });
    db.store.set('functionRateLimits/bookRegistration_new@cyberlogitec_com', { lastCallAt: freshTs });

    await fns.scheduledCleanupFunctionRateLimits();

    expect(db.store.has('functionRateLimits/bookRegistration_old@cyberlogitec_com')).toBe(false);
    expect(db.store.has('functionRateLimits/bookRegistration_new@cyberlogitec_com')).toBe(true);
    expect(db.collectionAdds.find((c) => c.path === 'auditLogs')?.data.event)
      .toBe('admin.cleanupFunctionRateLimits');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Event platform — simple (training) + slotted (assessment-style) + admin + migration
// ═══════════════════════════════════════════════════════════════════════════
describe('Cloud Functions event platform', () => {
  let db: FakeDb;
  let fns: Record<string, any>;

  beforeEach(() => {
    db = new FakeDb();
    fns = loadFunctions(db);
  });

  // Simple events now require U1 schedule metadata; inject sane defaults so existing
  // cases that don't care about it still pass (overridable per-call).
  const SIMPLE_META = { eventDate: '2026-06-27', startTime: '09:00', endTime: '12:30', format: 'onsite', location: 'Room A12' };
  const req = (data: DocData, email = 'user@cyberlogitec.com') =>
    ({ auth: { token: { email, email_verified: true } }, data: data.type === 'simple' ? { ...SIMPLE_META, ...data } : data });

  function seedSimpleEvent(over: DocData = {}) {
    db.store.set('events/training-1', {
      name: 'Leadership Training', subtitle: 'T', type: 'simple',
      allowEnrollment: true, archived: false, listed: true,
      requireEligibility: false, emailConfirm: false,
      capacity: 2, remaining: 2, ...over,
    });
  }

  function seedSlottedEvent(over: DocData = {}) {
    db.store.set('events/asm', {
      name: 'Assessment X', type: 'slotted', allowEnrollment: true,
      archived: false, requireEligibility: false, maxChanges: 3, ...over,
    });
    db.store.set('events/asm/slots/SP-2206-0900', { type: 'Speaking', date: '2026-06-22', startMin: 540, endMin: 600, capacity: 10, remaining: 8, location: 'A' });
    db.store.set('events/asm/slots/3S-2206-1100', { type: '3 Skills', date: '2026-06-22', startMin: 660, endMin: 720, capacity: 10, remaining: 7, location: 'B' });
  }

  // ── registerForEvent (simple) ──────────────────────────────────────────────
  it('registerForEvent: claims a seat, writes the reg and holds the empCode', async () => {
    seedSimpleEvent();
    const res = await fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));
    expect(res.ok).toBe(true);
    const reg = db.store.get('events/training-1/registrations/user@cyberlogitec.com') as DocData;
    expect(reg).toMatchObject({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
    // Claims own the seat: the reg points at a claim doc, not a decremented counter.
    expect(typeof reg.capacityClaimId).toBe('string');
    expect(db.store.get(`events/training-1/capacityClaims/${reg.capacityClaimId}`)).toMatchObject({ email: 'user@cyberlogitec.com', empCode: '262010' });
    expect(db.store.get('userProfiles/user@cyberlogitec.com')).toMatchObject({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
    // The latency-critical response no longer rebuilds every event/claim collection.
    expect(res.state).toBeUndefined();
    expect(db.store.get('events/training-1/empCodeClaims/262010')).toEqual({ email: 'user@cyberlogitec.com' });
    expect(db.collectionAdds.find((c) => c.path === 'auditLogs')?.data.event).toBe('event.register');
  });

  it('registerForEvent: rejects changing details for an existing simple registration', async () => {
    seedSimpleEvent();
    db.store.set('events/training-1/registrations/user@cyberlogitec.com', {
      empCode: '262010',
      fullName: 'NGUYEN VAN A',
      bu: 'BSG',
    });
    db.store.set('events/training-1/empCodeClaims/262010', { email: 'user@cyberlogitec.com' });

    await expect(fns.registerForEvent(req({
      eventId: 'training-1',
      empCode: '262011',
      fullName: 'NGUYEN VAN B',
      bu: 'BSG',
    }))).rejects.toThrow(/already registered/i);

    expect(db.store.has('events/training-1/empCodeClaims/262011')).toBe(false);
    expect(db.store.get('events/training-1/registrations/user@cyberlogitec.com')).toMatchObject({
      empCode: '262010',
      fullName: 'NGUYEN VAN A',
    });
  });

  it('registerForEvent: rejects a permanently blocked empCode (global block applies to simple events)', async () => {
    seedSimpleEvent();
    db.store.set('permanentBlock/262010', { reason: 'No longer employed' });
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' })))
      .rejects.toThrow('No longer employed');
    // No seat claimed, no empCode lock, no registration written.
    expect(db.store.has('events/training-1/empCodeClaims/262010')).toBe(false);
    expect(db.store.has('events/training-1/registrations/user@cyberlogitec.com')).toBe(false);
  });

  it('registerForEvent: rejects a per-event blocked empCode', async () => {
    seedSimpleEvent();
    db.store.set('events/training-1/ineligibility/262010', { reason: 'Not eligible this quarter' });
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' })))
      .rejects.toThrow('Not eligible this quarter');
    expect(db.store.has('events/training-1/registrations/user@cyberlogitec.com')).toBe(false);
  });

  it('registerForEvent: a gated simple event rejects an empCode not on the allowlist', async () => {
    seedSimpleEvent({ requireEligibility: true });
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' })))
      .rejects.toThrow(/not on the list/i);
    expect(db.store.has('events/training-1/registrations/user@cyberlogitec.com')).toBe(false);
  });

  it('registerForEvent: a gated simple event allows an empCode on the allowlist', async () => {
    seedSimpleEvent({ requireEligibility: true });
    db.store.set('events/training-1/eligibility/262010', { ok: true });
    const res = await fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));
    expect(res.ok).toBe(true);
  });

  it('initEvents: returns saved user profile even before registering the visible event', async () => {
    seedSimpleEvent();
    db.store.set('userProfiles/user@cyberlogitec.com', {
      empCode: '262010',
      fullName: 'NGUYEN VAN A',
      bu: 'BSG',
      updatedAt: ts('2026-06-01T00:00:00.000Z'),
    });

    const res = await fns.initEvents(req({}));

    expect(res.state.profile).toMatchObject({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
    expect(res.state.myRegistrations).toEqual({});
  });

  it('initEvents: exposes Program eligibility only for an active class PIC', async () => {
    seedSimpleEvent();
    db.store.set('programs/pronunciation/classes/EL040', {
      code: 'EL040', bu: 'CHORUS', picEmail: 'user@cyberlogitec.com', active: true,
    });
    expect((await fns.initEvents(req({}))).state.programEligible).toBe(true);

    db.store.set('programs/pronunciation/classes/EL040', {
      code: 'EL040', bu: 'CHORUS', picEmail: 'user@cyberlogitec.com', active: false,
    });
    expect((await fns.initEvents(req({}))).state.programEligible).toBe(false);
  });

  it('initEvents: exposes the server-computed registration count alongside remaining', async () => {
    seedSimpleEvent({ capacity: 3 });
    await fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));
    // A different viewer still sees the count + seats (display data, server-authoritative).
    const res = await fns.initEvents(req({}, 'other@cyberlogitec.com'));
    const ev = res.state.events.find((e: DocData) => e.eventId === 'training-1');
    expect(ev.registered).toBe(1);
    expect(ev.remaining).toBe(2);
  });

  it('registerForEvent: a second identical submit is idempotent — claims no extra seat', async () => {
    seedSimpleEvent({ capacity: 3 });
    const first = await fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));
    expect(first.ok).toBe(true);
    // Same identity again → idempotent, NOT a second registration (empCodeClaims lock).
    const second = await fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));
    expect(second.ok).toBe(true);
    const claims = [...db.store.keys()].filter((k) => k.startsWith('events/training-1/capacityClaims/'));
    expect(claims).toHaveLength(1);
    expect(db.store.get('events/training-1/empCodeClaims/262010')).toEqual({ email: 'user@cyberlogitec.com' });
  });

  // ── updateMyProfile (account-tied employee profile) ─────────────────────────
  it('updateMyProfile: creates the profile and audits it (created)', async () => {
    const res = await fns.updateMyProfile(req({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));

    expect(res).toEqual({ ok: true, profile: { empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' } });
    expect(db.store.get('userProfiles/user@cyberlogitec.com')).toMatchObject({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
    const audit = db.collectionAdds.find((c) => c.path === 'auditLogs' && c.data.event === 'user.updateProfile');
    expect(audit?.data.detail.created).toBe(true);
  });

  it('updateMyProfile: an empCode change is audited before→after', async () => {
    db.store.set('userProfiles/user@cyberlogitec.com', { empCode: '262010', fullName: 'OLD NAME', bu: 'BSG', updatedAt: ts('2026-06-01T00:00:00.000Z') });

    const res = await fns.updateMyProfile(req({ empCode: '262011', fullName: 'NEW NAME', bu: 'BSG' }));

    expect(res.ok).toBe(true);
    const audit = db.collectionAdds.find((c) => c.path === 'auditLogs' && c.data.event === 'user.updateProfile');
    expect(audit?.data.detail.created).toBe(false);
    expect(audit?.data.detail.empCodeChanged).toBe(true);
    expect(audit?.data.detail.before).toMatchObject({ empCode: '262010' });
    expect(audit?.data.detail.after).toMatchObject({ empCode: '262011' });
  });

  it('updateMyProfile: rejects a non-6-digit empCode', async () => {
    await expect(fns.updateMyProfile(req({ empCode: '123', fullName: 'A B', bu: 'BSG' }))).rejects.toThrow(/6 digits/);
  });

  it('updateMyProfile: rejects an invalid BU', async () => {
    await expect(fns.updateMyProfile(req({ empCode: '262010', fullName: 'A B', bu: 'NOPE' }))).rejects.toThrow(/BU/i);
  });

  it('registerForEvent: rejects when every seat claim is taken', async () => {
    // capacity 1 with its only seat (000000) already claimed → no free claim id.
    seedSimpleEvent({ capacity: 1, remaining: 0 });
    db.store.set('events/training-1/capacityClaims/000000', { email: 'other@cyberlogitec.com', empCode: '999999' });
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'TEST USER', bu: 'BSG' }))).rejects.toThrow(/full/i);
  });

  it('registerForEvent: rejects a digit/garbage full name (audit P0-3, server-side)', async () => {
    seedSimpleEvent({});
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: '321321', bu: 'BSG' }))).rejects.toThrow(/full name/i);
  });

  it('registerForEvent: rejects when enrollment is closed', async () => {
    seedSimpleEvent({ allowEnrollment: false });
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'TEST USER', bu: 'BSG' }))).rejects.toThrow(/closed/i);
  });

  it('registerForEvent: rejects when the event deadline has passed', async () => {
    seedSimpleEvent({ deadline: ts('2000-01-01T00:00:00.000Z') });
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'TEST USER', bu: 'BSG' }))).rejects.toThrow(/deadline/i);
  });

  it('registerForEvent: refuses a NEW seat while a capacity lowering is reconciling (needsReconcile)', async () => {
    seedSimpleEvent({ needsReconcile: true });
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'TEST USER', bu: 'BSG' }))).rejects.toThrow(/try again/i);
    // No seat claimed, no reg written — the pause prevents oversell of a freed low id.
    expect(db.store.has('events/training-1/registrations/user@cyberlogitec.com')).toBe(false);
    expect(Array.from(db.store.keys()).some((p) => p.startsWith('events/training-1/capacityClaims/'))).toBe(false);
  });

  it('registerForEvent: rejects an empCode claimed by another email', async () => {
    seedSimpleEvent();
    db.store.set('events/training-1/empCodeClaims/262010', { email: 'other@cyberlogitec.com' });
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'TEST USER', bu: 'BSG' }))).rejects.toThrow(/different account/i);
  });

  it('registerForEvent: rejects a slotted event (wrong flow)', async () => {
    seedSimpleEvent({ type: 'slotted' });
    await expect(fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'TEST USER', bu: 'BSG' }))).rejects.toThrow();
  });

  it('cancelEventRegistration: deletes the seat claim and releases the empCode', async () => {
    seedSimpleEvent({ remaining: 1 });
    db.store.set('events/training-1/registrations/user@cyberlogitec.com', { empCode: '262010', fullName: 'TEST USER', bu: 'BSG', capacityClaimId: '000000' });
    db.store.set('events/training-1/capacityClaims/000000', { email: 'user@cyberlogitec.com', empCode: '262010' });
    db.store.set('events/training-1/empCodeClaims/262010', { email: 'user@cyberlogitec.com' });
    const res = await fns.cancelEventRegistration(req({ eventId: 'training-1' }));
    expect(res.ok).toBe(true);
    expect(db.store.has('events/training-1/registrations/user@cyberlogitec.com')).toBe(false);
    expect(db.store.has('events/training-1/empCodeClaims/262010')).toBe(false);
    // Seat freed by deleting the claim doc; the stored counter is not bumped
    // (remaining is derived from the live claim count).
    expect(db.store.has('events/training-1/capacityClaims/000000')).toBe(false);
  });

  it('cancelEventRegistration: still allowed after the deadline (a registrant may always withdraw)', async () => {
    seedSimpleEvent({ remaining: 1, deadline: ts('2000-01-01T00:00:00.000Z') });
    db.store.set('events/training-1/registrations/user@cyberlogitec.com', { empCode: '262010', fullName: 'TEST USER', bu: 'BSG', capacityClaimId: '000000' });
    db.store.set('events/training-1/capacityClaims/000000', { email: 'user@cyberlogitec.com', empCode: '262010' });
    db.store.set('events/training-1/empCodeClaims/262010', { email: 'user@cyberlogitec.com' });
    const res = await fns.cancelEventRegistration(req({ eventId: 'training-1' }));
    expect(res.ok).toBe(true);
    expect(db.store.has('events/training-1/registrations/user@cyberlogitec.com')).toBe(false);
    expect(db.store.has('events/training-1/capacityClaims/000000')).toBe(false);
  });

  // ── adminUpsertEvent ───────────────────────────────────────────────────────
  it('adminUpsertEvent: creates a simple event with remaining = capacity', async () => {
    seedOpenConfig(db);
    const res = await fns.adminUpsertEvent(req({ eventId: 't2', name: 'T2', type: 'simple', capacity: 30, allowEnrollment: true }, 'admin@cyberlogitec.com'));
    expect(res.ok).toBe(true);
    expect(db.store.get('events/t2')).toMatchObject({ name: 'T2', type: 'simple', capacity: 30, remaining: 30 });
  });

  it('adminUpsertEvent: unarchives a simple event (archived true → false persists)', async () => {
    seedOpenConfig(db);
    db.store.set('events/t2', { name: 'T2', type: 'simple', capacity: 30, remaining: 30, archived: true });
    const res = await fns.adminUpsertEvent(req({ eventId: 't2', name: 'T2', type: 'simple', capacity: 30, allowEnrollment: true, archived: false }, 'admin@cyberlogitec.com'));
    expect(res.ok).toBe(true);
    expect(db.store.get('events/t2')).toMatchObject({ archived: false });
  });

  it('adminUpsertEvent: unarchives a slotted event (no capacity required)', async () => {
    seedOpenConfig(db);
    db.store.set('events/asm2', { name: 'Asm2', type: 'slotted', archived: true });
    const res = await fns.adminUpsertEvent(req({ eventId: 'asm2', name: 'Asm2', type: 'slotted', allowEnrollment: true, archived: false }, 'admin@cyberlogitec.com'));
    expect(res.ok).toBe(true);
    expect(db.store.get('events/asm2')).toMatchObject({ archived: false });
  });

  it('adminUpsertEvent: rejects lowering capacity below the registered count', async () => {
    seedOpenConfig(db);
    db.store.set('events/t2', { name: 'T2', type: 'simple', capacity: 5, remaining: 3 });
    db.store.set('events/t2/registrations/a@cyberlogitec.com', { empCode: '1' });
    db.store.set('events/t2/registrations/b@cyberlogitec.com', { empCode: '2' });
    await expect(fns.adminUpsertEvent(req({ eventId: 't2', name: 'T2', type: 'simple', capacity: 1, allowEnrollment: true }, 'admin@cyberlogitec.com'))).rejects.toThrow(/already registered/i);
  });

  it('adminUpsertEvent: rejects a non-admin caller', async () => {
    seedOpenConfig(db);
    await expect(fns.adminUpsertEvent(req({ eventId: 't2', name: 'T2', type: 'simple', capacity: 5 }, 'user@cyberlogitec.com'))).rejects.toThrow(/admin/i);
  });

  it('adminReconcileEventCapacity: backfills simple-event seat claims from registrations', async () => {
    seedOpenConfig(db);
    db.store.set('events/t2', { name: 'T2', type: 'simple', capacity: 5, remaining: 5 });
    db.store.set('events/t2/registrations/a@cyberlogitec.com', { empCode: '1' });
    db.store.set('events/t2/registrations/b@cyberlogitec.com', { empCode: '2', capacityClaimId: '000003' });

    const res = await fns.adminReconcileEventCapacity(req({}, 'admin@cyberlogitec.com'));

    expect(res.ok).toBe(true);
    expect(res.checked).toBe(1);
    expect(res.reconciled).toEqual([
      { eventId: 't2', capacity: 5, realUsed: 2, remaining: 3, claimCount: 2 },
    ]);
    expect(db.store.get('events/t2')).toMatchObject({
      name: 'T2',
      type: 'simple',
      capacity: 5,
      remaining: 3,
      capacityClaimCount: 2,
    });
    const claims = Array.from(db.store.entries())
      .filter(([path]) => path.startsWith('events/t2/capacityClaims/'))
      .map(([, data]) => data);
    expect(claims).toHaveLength(2);
    expect(db.collectionAdds.find((c) => c.path === 'auditLogs')?.data.event)
      .toBe('admin.reconcileEventCapacity');
  });

  it('adminReconcileEventCapacity: re-run on consistent data is idempotent (delta-only)', async () => {
    seedOpenConfig(db);
    db.store.set('events/t4', { name: 'T4', type: 'simple', capacity: 5, remaining: 5 });
    db.store.set('events/t4/registrations/a@cyberlogitec.com', { empCode: '1' });
    db.store.set('events/t4/registrations/b@cyberlogitec.com', { empCode: '2' });

    const first = await fns.adminReconcileEventCapacity(req({}, 'admin@cyberlogitec.com'));
    expect(first.reconciled).toEqual([{ eventId: 't4', capacity: 5, realUsed: 2, remaining: 3, claimCount: 2 }]);
    const claimsAfterFirst = Array.from(db.store.entries())
      .filter(([p]) => p.startsWith('events/t4/capacityClaims/'))
      .map(([p, d]) => [p, { ...d }]);
    expect(claimsAfterFirst).toHaveLength(2);

    // Second run touches nothing new — same docs, same counts (delta = 0 writes).
    const second = await fns.adminReconcileEventCapacity(req({}, 'admin@cyberlogitec.com'));
    expect(second.reconciled).toEqual([{ eventId: 't4', capacity: 5, realUsed: 2, remaining: 3, claimCount: 2 }]);
    const claimsAfterSecond = Array.from(db.store.entries())
      .filter(([p]) => p.startsWith('events/t4/capacityClaims/'))
      .map(([p, d]) => [p, { ...d }]);
    expect(claimsAfterSecond).toEqual(claimsAfterFirst);
  });

  it('adminReconcileEventCapacity: oversold legacy data clamps remaining to 0 (no negative)', async () => {
    seedOpenConfig(db);
    db.store.set('events/t5', { name: 'T5', type: 'simple', capacity: 1, remaining: 0 });
    db.store.set('events/t5/registrations/a@cyberlogitec.com', { empCode: '1' });
    db.store.set('events/t5/registrations/b@cyberlogitec.com', { empCode: '2' });

    const res = await fns.adminReconcileEventCapacity(req({}, 'admin@cyberlogitec.com'));
    // realUsed (2) exceeds capacity (1): only one seat id exists, remaining floored at 0.
    expect(res.reconciled).toEqual([{ eventId: 't5', capacity: 1, realUsed: 2, remaining: 0, claimCount: 1 }]);
    const claims = Array.from(db.store.keys()).filter((p) => p.startsWith('events/t5/capacityClaims/'));
    expect(claims).toHaveLength(1);
  });

  it('adminUpsertEvent: a metadata edit does not rewrite existing seat claims (C1)', async () => {
    seedOpenConfig(db);
    db.store.set('events/t3', { name: 'T3', type: 'simple', capacity: 5, remaining: 3, archived: true });
    db.store.set('events/t3/registrations/a@cyberlogitec.com', { empCode: '1', capacityClaimId: '000000' });
    db.store.set('events/t3/registrations/b@cyberlogitec.com', { empCode: '2', capacityClaimId: '000001' });
    db.store.set('events/t3/capacityClaims/000000', { email: 'a@cyberlogitec.com', empCode: '1' });
    db.store.set('events/t3/capacityClaims/000001', { email: 'b@cyberlogitec.com', empCode: '2' });

    // Pure metadata edit (same capacity): unarchive + rename.
    const res = await fns.adminUpsertEvent(req({ eventId: 't3', name: 'T3 renamed', type: 'simple', capacity: 5, allowEnrollment: true, archived: false }, 'admin@cyberlogitec.com'));

    expect(res.ok).toBe(true);
    // Seat claims untouched (no destroy/recreate) and reg seat ids preserved.
    expect(db.store.get('events/t3/capacityClaims/000000')).toEqual({ email: 'a@cyberlogitec.com', empCode: '1' });
    expect(db.store.get('events/t3/capacityClaims/000001')).toEqual({ email: 'b@cyberlogitec.com', empCode: '2' });
    expect(Array.from(db.store.keys()).filter((p) => p.startsWith('events/t3/capacityClaims/'))).toHaveLength(2);
    // remaining derives from the real registration count (2 of 5).
    expect(db.store.get('events/t3')).toMatchObject({ name: 'T3 renamed', archived: false, remaining: 3, capacityClaimCount: 2 });
  });

  it('adminUpsertEvent: lowering capacity compacts orphaned high-id claims + clears the pause (C2)', async () => {
    seedOpenConfig(db);
    // capacity 100; two active regs hold HIGH shuffled ids that fall outside a lowered range.
    db.store.set('events/t6', { name: 'T6', type: 'simple', capacity: 100, remaining: 98 });
    db.store.set('events/t6/registrations/a@cyberlogitec.com', { empCode: '1', capacityClaimId: '000050' });
    db.store.set('events/t6/registrations/b@cyberlogitec.com', { empCode: '2', capacityClaimId: '000080' });
    db.store.set('events/t6/capacityClaims/000050', { email: 'a@cyberlogitec.com', empCode: '1' });
    db.store.set('events/t6/capacityClaims/000080', { email: 'b@cyberlogitec.com', empCode: '2' });

    const res = await fns.adminUpsertEvent(req({ eventId: 't6', name: 'T6', type: 'simple', capacity: 5, allowEnrollment: true }, 'admin@cyberlogitec.com'));

    expect(res.ok).toBe(true);
    expect(res.remaining).toBe(3);
    // Out-of-range orphans deleted; exactly 2 claims remain, both compacted into [0,5).
    const claims = Array.from(db.store.keys()).filter((p) => p.startsWith('events/t6/capacityClaims/'));
    expect(claims).toHaveLength(2);
    expect(db.store.has('events/t6/capacityClaims/000050')).toBe(false);
    expect(db.store.has('events/t6/capacityClaims/000080')).toBe(false);
    for (const p of claims) {
      const id = Number(p.split('/').pop());
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(5);
    }
    // Reg seat id patched into range; pause lifted so signups resume.
    expect(Number((db.store.get('events/t6/registrations/a@cyberlogitec.com') as DocData).capacityClaimId)).toBeLessThan(5);
    expect(db.store.get('events/t6')).toMatchObject({ capacity: 5, remaining: 3, capacityClaimCount: 2, needsReconcile: false });
  });

  it('adminUpsertEvent: raising capacity keeps existing claims and never pauses (C3)', async () => {
    seedOpenConfig(db);
    db.store.set('events/t7', { name: 'T7', type: 'simple', capacity: 5, remaining: 3 });
    db.store.set('events/t7/registrations/a@cyberlogitec.com', { empCode: '1', capacityClaimId: '000000' });
    db.store.set('events/t7/registrations/b@cyberlogitec.com', { empCode: '2', capacityClaimId: '000001' });
    db.store.set('events/t7/capacityClaims/000000', { email: 'a@cyberlogitec.com', empCode: '1' });
    db.store.set('events/t7/capacityClaims/000001', { email: 'b@cyberlogitec.com', empCode: '2' });

    const res = await fns.adminUpsertEvent(req({ eventId: 't7', name: 'T7', type: 'simple', capacity: 20, allowEnrollment: true }, 'admin@cyberlogitec.com'));

    expect(res.ok).toBe(true);
    // Raise appends in the widened range — low ids stay valid, claims untouched, no pause.
    expect(db.store.get('events/t7/capacityClaims/000000')).toEqual({ email: 'a@cyberlogitec.com', empCode: '1' });
    expect(db.store.get('events/t7/capacityClaims/000001')).toEqual({ email: 'b@cyberlogitec.com', empCode: '2' });
    expect(db.store.get('events/t7')).toMatchObject({ capacity: 20, remaining: 18, capacityClaimCount: 2 });
    expect((db.store.get('events/t7') as DocData).needsReconcile).toBeUndefined();
  });

  it('adminDeleteEvent: hard-deletes the event and known child collections', async () => {
    seedOpenConfig(db);
    seedSimpleEvent();
    db.store.set('events/training-1/registrations/user@cyberlogitec.com', { empCode: '262010' });
    db.store.set('events/training-1/empCodeClaims/262010', { email: 'user@cyberlogitec.com' });
    db.store.set('events/training-1/eligibility/262010', { empCode: '262010' });
    db.store.set('events/training-1/ineligibility/262011', { reason: 'blocked' });

    const res = await fns.adminDeleteEvent(req({ eventId: 'training-1' }, 'admin@cyberlogitec.com'));

    expect(res.ok).toBe(true);
    expect(res.deleted).toMatchObject({ events: 1, registrations: 1, empCodeClaims: 1, eligibility: 1, ineligibility: 1 });
    expect(db.store.has('events/training-1')).toBe(false);
    expect(db.store.has('events/training-1/registrations/user@cyberlogitec.com')).toBe(false);
    expect(db.store.has('events/training-1/empCodeClaims/262010')).toBe(false);
    expect(db.collectionAdds.find((c) => c.path === 'auditLogs')?.data.event).toBe('admin.deleteEvent');
  });

  it('adminDeleteEvent: refuses to delete the migrated assessment archive', async () => {
    seedOpenConfig(db);
    db.store.set('events/assessment-q2', { name: 'Assessment Q2', type: 'slotted', archived: true });

    await expect(fns.adminDeleteEvent(req({ eventId: 'assessment-q2' }, 'admin@cyberlogitec.com'))).rejects.toThrow(/archive/i);
  });

  // ── bookEventSlot / cancelEventBooking (slotted) ───────────────────────────
  it('bookEventSlot: rejects a permanently blocked empCode (global block applies to slotted events)', async () => {
    seedSlottedEvent();
    db.store.set('permanentBlock/262010', { reason: 'No longer employed' });
    await expect(fns.bookEventSlot(req({ eventId: 'asm', empCode: '262010', fullName: 'TEST USER', bu: 'BSG', speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100' })))
      .rejects.toThrow('No longer employed');
    // Seats untouched (no decrement) and no registration written.
    expect(db.store.get('events/asm/slots/SP-2206-0900')!.remaining).toBe(8);
    expect(db.store.has('events/asm/registrations/user@cyberlogitec.com')).toBe(false);
  });

  it('bookEventSlot: books two slots and decrements their remaining', async () => {
    seedSlottedEvent();
    const res = await fns.bookEventSlot(req({ eventId: 'asm', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG', speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100' }));
    expect(res.ok).toBe(true);
    expect(db.store.get('events/asm/slots/SP-2206-0900')!.remaining).toBe(7);
    expect(db.store.get('events/asm/slots/3S-2206-1100')!.remaining).toBe(6);
    expect(db.store.get('events/asm/registrations/user@cyberlogitec.com')).toMatchObject({ fullName: 'NGUYEN VAN A', speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100' });
    expect(db.store.get('userProfiles/user@cyberlogitec.com')).toMatchObject({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
    expect(res.state?.profile).toMatchObject({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
    expect(db.store.get('events/asm/empCodeClaims/262010')).toEqual({ email: 'user@cyberlogitec.com' });
  });

  // ── examParts: single-part slotted events (Speaking-only / 3 Skills-only) ───
  it('bookEventSlot: examParts speaking-only — books just Speaking, leaves 3 Skills untouched', async () => {
    seedSlottedEvent({ examParts: 'speaking' });
    const res = await fns.bookEventSlot(req({ eventId: 'asm', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG', speakingSlotId: 'SP-2206-0900' }));
    expect(res.ok).toBe(true);
    expect(db.store.get('events/asm/slots/SP-2206-0900')!.remaining).toBe(7); // charged
    expect(db.store.get('events/asm/slots/3S-2206-1100')!.remaining).toBe(7); // never touched
    expect(db.store.get('events/asm/registrations/user@cyberlogitec.com')).toMatchObject({ speakingSlotId: 'SP-2206-0900', skillsSlotId: null });
  });

  it('bookEventSlot: examParts speaking-only — rejects when no Speaking slot is picked', async () => {
    seedSlottedEvent({ examParts: 'speaking' });
    await expect(fns.bookEventSlot(req({ eventId: 'asm', empCode: '262010', fullName: 'TEST USER', bu: 'BSG' })))
      .rejects.toThrow(/Speaking slot/i);
  });

  it('bookEventSlot: examParts speaking-only — rejects a full Speaking slot (no oversell)', async () => {
    seedSlottedEvent({ examParts: 'speaking' });
    db.store.set('events/asm/slots/SP-2206-0900', { type: 'Speaking', date: '2026-06-22', startMin: 540, endMin: 600, capacity: 10, remaining: 0, location: 'A' });
    await expect(fns.bookEventSlot(req({ eventId: 'asm', empCode: '262010', fullName: 'TEST USER', bu: 'BSG', speakingSlotId: 'SP-2206-0900' })))
      .rejects.toThrow(/full/i);
    expect(db.store.has('events/asm/registrations/user@cyberlogitec.com')).toBe(false);
  });

  it('bookEventSlot: examParts skills-only — books just 3 Skills, leaves Speaking untouched', async () => {
    seedSlottedEvent({ examParts: 'skills' });
    const res = await fns.bookEventSlot(req({ eventId: 'asm', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG', skillsSlotId: '3S-2206-1100' }));
    expect(res.ok).toBe(true);
    expect(db.store.get('events/asm/slots/3S-2206-1100')!.remaining).toBe(6); // charged
    expect(db.store.get('events/asm/slots/SP-2206-0900')!.remaining).toBe(8); // never touched
    expect(db.store.get('events/asm/registrations/user@cyberlogitec.com')).toMatchObject({ speakingSlotId: null, skillsSlotId: '3S-2206-1100' });
  });

  it('initEventBooking: returns saved user profile for an unbooked slotted event', async () => {
    seedSlottedEvent();
    db.store.set('userProfiles/user@cyberlogitec.com', {
      empCode: '262010',
      fullName: 'NGUYEN VAN A',
      bu: 'BSG',
      updatedAt: ts('2026-06-01T00:00:00.000Z'),
    });

    const res = await fns.initEventBooking(req({ eventId: 'asm' }));

    expect(res.state.myBooking).toBeNull();
    expect(res.state.profile).toMatchObject({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
  });

  it('bookEventSlot: rejects a full speaking slot', async () => {
    seedSlottedEvent();
    db.store.set('events/asm/slots/SP-2206-0900', { type: 'Speaking', date: '2026-06-22', startMin: 540, endMin: 600, capacity: 10, remaining: 0, location: 'A' });
    await expect(fns.bookEventSlot(req({ eventId: 'asm', empCode: '262010', fullName: 'TEST USER', bu: 'BSG', speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100' }))).rejects.toThrow(/full/i);
  });

  it('bookEventSlot: rejects when the event deadline has passed', async () => {
    seedSlottedEvent({ deadline: ts('2000-01-01T00:00:00.000Z') });
    await expect(fns.bookEventSlot(req({ eventId: 'asm', empCode: '262010', fullName: 'TEST USER', bu: 'BSG', speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100' }))).rejects.toThrow(/deadline/i);
  });

  it('cancelEventBooking: returns both seats and releases the claim', async () => {
    seedSlottedEvent();
    db.store.set('events/asm/registrations/user@cyberlogitec.com', { empCode: '262010', fullName: 'TEST USER', bu: 'BSG', speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100', changeCount: 0 });
    db.store.set('events/asm/empCodeClaims/262010', { email: 'user@cyberlogitec.com' });
    const res = await fns.cancelEventBooking(req({ eventId: 'asm' }));
    expect(res.ok).toBe(true);
    expect(db.store.get('events/asm/slots/SP-2206-0900')!.remaining).toBe(9);
    expect(db.store.get('events/asm/slots/3S-2206-1100')!.remaining).toBe(8);
    expect(db.store.has('events/asm/registrations/user@cyberlogitec.com')).toBe(false);
    expect(db.store.has('events/asm/empCodeClaims/262010')).toBe(false);
  });

  it('admin can list and remove a slotted registration, restore seats, then delete an unused slot', async () => {
    seedSlottedEvent();
    seedOpenConfig(db);
    await fns.bookEventSlot(req({
      eventId: 'asm', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG',
      speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100',
    }));

    const listed = await fns.adminListEventRegistrations(req({ eventId: 'asm' }, 'admin@cyberlogitec.com'));
    expect(listed.registrations).toEqual([expect.objectContaining({
      email: 'user@cyberlogitec.com', speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100',
    })]);

    await fns.adminDeleteEventRegistration(req({
      eventId: 'asm', targetEmail: 'user@cyberlogitec.com',
    }, 'admin@cyberlogitec.com'));
    expect(db.store.has('events/asm/registrations/user@cyberlogitec.com')).toBe(false);
    expect(db.store.get('events/asm/slots/SP-2206-0900')!.remaining).toBe(8);
    expect(db.store.get('events/asm/slots/3S-2206-1100')!.remaining).toBe(7);

    await fns.adminDeleteEventSlot(req({
      eventId: 'asm', slotId: 'SP-2206-0900',
    }, 'admin@cyberlogitec.com'));
    expect(db.store.has('events/asm/slots/SP-2206-0900')).toBe(false);
  });

});

describe('Cloud Functions Pronunciation Program', () => {
  const PIC = 'pic@cyberlogitec.com';
  const ADMIN = 'admin@cyberlogitec.com';
  const P = 'programs/pronunciation';
  let db: FakeDb;
  let fns: Record<string, any>;

  const req = (data: DocData, email = PIC) => ({ auth: { token: { email, email_verified: true } }, data });
  const seedSession = (date: string, startMin: number, over: DocData = {}) =>
    db.store.set(`${P}/sessions/${date}_${startMin}`, {
      classCode: 'EL040', bu: 'CHORUS', picEmail: PIC, date, month: date.slice(0, 7),
      startMin, endMin: startMin + 60, mode: 'offline', participantCount: 8, ...over,
    });

  // The fake Timestamp.now() is pinned to 2026-05-30 (rate-limit writes use it), so we
  // run the window in JUNE and freeze the clock just after that pin — keeps the rate
  // limiter's (Date.now − lastCallAt) positive while the June window stays open.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T01:00:00.000Z')); // 08:00 VN, Mon 1 Jun, window open
    db = new FakeDb();
    db.store.set('config/main', { adminEmails: [ADMIN] });
    db.store.set(P, {
      trainerName: 'Shirly',
      timeSlots: [{ sh: 10, sm: 0, eh: 11, em: 0 }, { sh: 11, sm: 0, eh: 12, em: 0 }],
      weekdays: [1, 2, 3, 4, 5], openMonth: '2026-06', deadline: '2026-06-30T23:59:59+07:00',
      fillMode: false, monthlyCap: 4, weeklyCap: 1,
    });
    db.store.set(`${P}/classes/EL040`, { code: 'EL040', bu: 'CHORUS', picEmail: PIC, mode: 'offline', active: true });
    fns = loadFunctions(db);
  });
  afterEach(() => vi.useRealTimers());

  const bookMon10 = (email = PIC) =>
    fns.bookProgramSession(req({ classCode: 'EL040', date: '2026-06-01', startMin: 600, endMin: 660, mode: 'offline', participantCount: 8 }, email));

  it('initProgram: allows an active PIC and rejects other users', async () => {
    expect((await fns.initProgram(req({}))).state.myClasses).toHaveLength(1);
    await expect(fns.initProgram(req({}, 'someone@cyberlogitec.com'))).rejects.toThrow(/assigned class PICs/i);
  });

  it('bookProgramSession: a PIC books an empty cell (session doc created at the cell key)', async () => {
    const res = await bookMon10();
    expect(res.ok).toBe(true);
    expect(db.store.has(`${P}/sessions/2026-06-01_600`)).toBe(true);
    expect(res.state.sessions.some((s: any) => s.sessionId === '2026-06-01_600')).toBe(true);
  });

  it('bookProgramSession: double-booking the same cell → 409 already taken (the doc-id lock)', async () => {
    await bookMon10();
    await expect(bookMon10()).rejects.toThrow(/already taken/i);
  });

  it('bookProgramSession: rejects a non-PIC caller', async () => {
    await expect(bookMon10('someone@cyberlogitec.com')).rejects.toThrow(/not the PIC/i);
  });

  it('bookProgramSession: enforces the monthly cap (4)', async () => {
    ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22'].forEach((d) => seedSession(d, 600));
    await expect(
      fns.bookProgramSession(req({ classCode: 'EL040', date: '2026-06-25', startMin: 600, endMin: 660, mode: 'offline', participantCount: 8 })),
    ).rejects.toThrow(/maximum 4 sessions this month/i);
  });

  it('bookProgramSession: enforces 1/week (same ISO week blocked)', async () => {
    seedSession('2026-06-01', 600); // Mon
    await expect(
      fns.bookProgramSession(req({ classCode: 'EL040', date: '2026-06-02', startMin: 600, endMin: 660, mode: 'offline', participantCount: 8 })), // Tue, same week
    ).rejects.toThrow(/this week/i);
  });

  it('moveProgramSession: moves the cell (old freed, new created)', async () => {
    await bookMon10();
    const res = await fns.moveProgramSession(req({ sessionId: '2026-06-01_600', date: '2026-06-03', startMin: 660, endMin: 720, mode: 'offline', participantCount: 8 }));
    expect(res.ok).toBe(true);
    expect(db.store.has(`${P}/sessions/2026-06-01_600`)).toBe(false);
    expect(db.store.has(`${P}/sessions/2026-06-03_660`)).toBe(true);
  });

  it('moveProgramSession: an in-place edit preserves the calendar id + applies the topic', async () => {
    seedSession('2026-06-01', 600, { meetLink: 'https://meet.example/abc', gcalEventId: 'pron20260601t600' });
    const res = await fns.moveProgramSession(req({ sessionId: '2026-06-01_600', date: '2026-06-01', startMin: 600, endMin: 660, topic: 'Foundation – greetings' }));
    expect(res.ok).toBe(true);
    const doc = db.store.get(`${P}/sessions/2026-06-01_600`)!;
    expect(doc.gcalEventId).toBe('pron20260601t600'); // carried over (not wiped)
    expect(doc.meetLink).toBe('https://meet.example/abc');
    expect(doc.topic).toBe('Foundation – greetings'); // the edit applied
  });

  it('cancelProgramSession: blocked after the deadline (window closed)', async () => {
    await bookMon10();
    vi.setSystemTime(new Date('2026-07-05T00:00:00.000Z')); // past the Jun deadline
    await expect(fns.cancelProgramSession(req({ sessionId: '2026-06-01_600' }))).rejects.toThrow(/closed/i);
  });

  it('cancelProgramSession: a PIC cancels within the window (cell freed)', async () => {
    await bookMon10();
    const res = await fns.cancelProgramSession(req({ sessionId: '2026-06-01_600' }));
    expect(res.ok).toBe(true);
    expect(db.store.has(`${P}/sessions/2026-06-01_600`)).toBe(false);
  });

  it('adminSetProgramBlackout: rejected when the slot is booked, allowed when empty', async () => {
    seedSession('2026-06-05', 600);
    await expect(
      fns.adminSetProgramBlackout(req({ date: '2026-06-05', startMin: 600 }, ADMIN)),
    ).rejects.toThrow(/Cancel the booking/i);
    const ok = await fns.adminSetProgramBlackout(req({ date: '2026-06-08', startMin: 600 }, ADMIN));
    expect(ok.ok).toBe(true);
    expect(db.store.has(`${P}/blackouts/2026-06-08_600`)).toBe(true);
  });

  it('adminSetProgramBlackoutDay: blocks every empty slot, skips booked ones', async () => {
    seedSession('2026-06-09', 600); // 10:00 booked → must be skipped
    const res = await fns.adminSetProgramBlackoutDay(req({ date: '2026-06-09' }, ADMIN));
    expect(res).toMatchObject({ ok: true, blocked: 1, skippedSlots: [600] });
    expect(db.store.has(`${P}/blackouts/2026-06-09_660`)).toBe(true); // 11:00 blacked out
    expect(db.store.has(`${P}/blackouts/2026-06-09_600`)).toBe(false); // booked → untouched

    // A fully-empty day blacks out both configured slots.
    const all = await fns.adminSetProgramBlackoutDay(req({ date: '2026-06-10' }, ADMIN));
    expect(all).toMatchObject({ ok: true, blocked: 2, skippedSlots: [] });
  });

  it('adminUnsetProgramBlackoutDay: clears every blackout on the date', async () => {
    await fns.adminSetProgramBlackoutDay(req({ date: '2026-06-10' }, ADMIN));
    const res = await fns.adminUnsetProgramBlackoutDay(req({ date: '2026-06-10' }, ADMIN));
    expect(res).toMatchObject({ ok: true, removed: 2 });
    expect(db.store.has(`${P}/blackouts/2026-06-10_600`)).toBe(false);
    expect(db.store.has(`${P}/blackouts/2026-06-10_660`)).toBe(false);
  });

  it('bookProgramSession: a blackout now blocks an admin too (no bypass)', async () => {
    db.store.set(`${P}/blackouts/2026-06-08_600`, { date: '2026-06-08', startMin: 600 });
    await expect(
      fns.bookProgramSession(req({ classCode: 'EL040', date: '2026-06-08', startMin: 600, endMin: 660 }, ADMIN)),
    ).rejects.toThrow(/trainer unavailable/i);
  });

  it('bookProgramSession: the weekly cap now blocks an admin too (no bypass)', async () => {
    seedSession('2026-06-01', 600); // Mon, fills the 1/week cap for EL040
    await expect(
      fns.bookProgramSession(req({ classCode: 'EL040', date: '2026-06-02', startMin: 600, endMin: 660 }, ADMIN)), // Tue, same week
    ).rejects.toThrow(/this week/i);
  });

  it('adminDeleteProgramClass: blocked while the class has sessions', async () => {
    seedSession('2026-06-01', 600);
    await expect(fns.adminDeleteProgramClass(req({ code: 'EL040' }, ADMIN))).rejects.toThrow(/booked sessions/i);
  });
});

// ── Confirmation emails: Program (PIC), events, and the admin test-send ─────────
const mailDocs = (db: FakeDb) => db.collectionAdds.filter((c) => c.path === 'mail').map((c) => c.data);

describe('Cloud Functions Program — confirmation email', () => {
  const PIC = 'pic@cyberlogitec.com';
  const ADMIN = 'admin@cyberlogitec.com';
  const P = 'programs/pronunciation';
  let db: FakeDb;
  let fns: Record<string, any>;

  const req = (data: DocData, email = PIC) => ({ auth: { token: { email, email_verified: true } }, data });
  const seedSession = (date: string, startMin: number, over: DocData = {}) =>
    db.store.set(`${P}/sessions/${date}_${startMin}`, {
      classCode: 'EL040', courseName: 'Foundation', bu: 'CHORUS', picEmail: PIC, date, month: date.slice(0, 7),
      startMin, endMin: startMin + 60, mode: 'offline', participantCount: 8, topic: 'Vowels', ...over,
    });
  const bookMon10 = (email = PIC) =>
    fns.bookProgramSession(req({ classCode: 'EL040', date: '2026-06-01', startMin: 600, endMin: 660, topic: 'Vowels' }, email));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T01:00:00.000Z'));
    db = new FakeDb();
    db.store.set('config/main', { adminEmails: [ADMIN] });
    db.store.set(P, {
      trainerName: 'Shirly', timeSlots: [{ sh: 10, sm: 0, eh: 11, em: 0 }, { sh: 11, sm: 0, eh: 12, em: 0 }],
      weekdays: [1, 2, 3, 4, 5], openMonth: '2026-06', deadline: '2026-06-30T23:59:59+07:00',
      fillMode: false, monthlyCap: 4, weeklyCap: 1, emailConfirm: true, // ← opted in
    });
    db.store.set(`${P}/classes/EL040`, { code: 'EL040', name: 'Foundation', bu: 'CHORUS', picEmail: PIC, mode: 'offline', active: true });
    fns = loadFunctions(db);
  });
  afterEach(() => vi.useRealTimers());

  it('book → one email to the PIC, branded, "Session booked"', async () => {
    const res = await bookMon10();
    expect(res.ok).toBe(true);
    const mails = mailDocs(db);
    expect(mails.length).toBe(1);
    expect(mails[0].to).toBe(PIC);
    expect(mails[0].message.subject).toMatch(/Session booked/i);
    expect(mails[0].message.html).toContain('EL040');
    expect(mails[0].message.html).toContain('background:#1a73e8'); // branded shell
  });

  it('book by an ADMIN still emails the PIC (the owner), not the admin', async () => {
    await bookMon10(ADMIN);
    expect(mailDocs(db)[0].to).toBe(PIC);
  });

  it('HR acting on a PIC\'s behalf adds an "Updated by" note; a PIC self-action does not', async () => {
    await bookMon10(ADMIN); // admin books for the PIC's class
    expect(mailDocs(db)[0].message.html).toMatch(/Updated by/i);
  });

  it('a PIC booking their own session has no "Updated by" note', async () => {
    await bookMon10(); // PIC self-book
    expect(mailDocs(db)[0].message.html).not.toMatch(/Updated by/i);
  });

  it('move → one email, "rescheduled", showing the old slot', async () => {
    seedSession('2026-06-01', 600);
    const res = await fns.moveProgramSession(req({ sessionId: '2026-06-01_600', date: '2026-06-03', startMin: 660, endMin: 720 }));
    expect(res.ok).toBe(true);
    const mails = mailDocs(db);
    expect(mails.length).toBe(1);
    expect(mails[0].message.subject).toMatch(/rescheduled/i);
    expect(mails[0].message.html).toMatch(/Moved from/i);
  });

  it('cancel → one email, "cancelled"', async () => {
    seedSession('2026-06-01', 600);
    const res = await fns.cancelProgramSession(req({ sessionId: '2026-06-01_600' }));
    expect(res.ok).toBe(true);
    const mails = mailDocs(db);
    expect(mails.length).toBe(1);
    expect(mails[0].message.subject).toMatch(/cancelled/i);
  });

  it('no email when the program has emailConfirm off', async () => {
    db.store.set(P, { ...(db.store.get(P) as DocData), emailConfirm: false });
    await bookMon10();
    expect(mailDocs(db).length).toBe(0);
  });

  it('a mail-queue failure does not fail the committed booking', async () => {
    db.failCollectionAdds.add('mail');
    const res = await bookMon10();
    expect(res.ok).toBe(true);
    expect(db.store.has(`${P}/sessions/2026-06-01_600`)).toBe(true); // still committed
  });

  it('uses the PIC display name from userProfiles when present', async () => {
    db.store.set(`userProfiles/${PIC}`, { fullName: 'Nguyen Van PIC', empCode: '1', bu: 'CHORUS' });
    await bookMon10();
    expect(mailDocs(db)[0].message.html).toContain('Nguyen Van PIC');
  });
});

describe('Cloud Functions — sendTestMail (admin)', () => {
  const ADMIN = 'admin@cyberlogitec.com';
  let db: FakeDb;
  let fns: Record<string, any>;
  const req = (data: DocData, email = ADMIN) => ({ auth: { token: { email, email_verified: true } }, data });

  beforeEach(() => {
    db = new FakeDb();
    db.store.set('config/main', { adminEmails: [ADMIN] });
    fns = loadFunctions(db);
  });

  it('sends a sample of the requested shape to the calling admin', async () => {
    const res = await fns.sendTestMail(req({ shape: 'program.book' }));
    expect(res.ok).toBe(true);
    const mails = mailDocs(db);
    expect(mails.length).toBe(1);
    expect(mails[0].to).toBe(ADMIN);
    expect(mails[0].message.subject).toMatch(/Session booked/i);
  });

  it('renders the slotted sample (Speaking / 3 Skills)', async () => {
    await fns.sendTestMail(req({ shape: 'slottedEvent.register' }));
    const html = mailDocs(db)[0].message.html;
    expect(html).toMatch(/Speaking/);
    expect(html).not.toMatch(/add .*calendar/i);
  });

  it('rejects a non-admin caller', async () => {
    await expect(fns.sendTestMail(req({ shape: 'program.book' }, 'user@cyberlogitec.com'))).rejects.toThrow(/admin/i);
  });

  it('rejects an unknown shape', async () => {
    await expect(fns.sendTestMail(req({ shape: 'nope.unknown' }))).rejects.toThrow(/Unknown email template/i);
  });
});

describe('Cloud Functions — event confirmation email', () => {
  let db: FakeDb;
  let fns: Record<string, any>;
  const SIMPLE_META = { eventDate: '2026-06-27', startTime: '09:00', endTime: '12:30', format: 'onsite', location: 'Room A12' };
  const req = (data: DocData, email = 'user@cyberlogitec.com') => ({ auth: { token: { email, email_verified: true } }, data: { ...SIMPLE_META, ...data } });
  const seedSimpleEvent = (over: DocData = {}) =>
    db.store.set('events/training-1', {
      name: 'Leadership Training', subtitle: 'T', type: 'simple', allowEnrollment: true,
      archived: false, listed: true, requireEligibility: false, emailConfirm: false, capacity: 2, remaining: 2, ...over,
    });

  beforeEach(() => { db = new FakeDb(); fns = loadFunctions(db); });

  it('emails the registrant when the event opts in', async () => {
    seedSimpleEvent({ emailConfirm: true });
    await fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));
    const mails = mailDocs(db);
    expect(mails.length).toBe(1);
    expect(mails[0].to).toBe('user@cyberlogitec.com');
    expect(mails[0].message.html).toContain('Leadership Training');
  });

  it('includes the event date / time / location in the email when set', async () => {
    seedSimpleEvent({ emailConfirm: true, eventDate: '2026-06-27', startMin: 540, endMin: 750, location: 'Room A12', format: 'onsite' });
    await fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));
    const html = mailDocs(db)[0].message.html;
    expect(html).toContain('Room A12');           // location in the {{details}} box
    expect(html).toContain('27/06/2026');          // formatted event date
    expect(html).toContain('09:00');               // 540 min
    expect(html).toContain('12:30');               // 750 min
  });

  it('does NOT email when the event has emailConfirm off', async () => {
    seedSimpleEvent();
    await fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));
    expect(mailDocs(db).length).toBe(0);
  });

  it('does NOT email on cancel (events email on register only)', async () => {
    seedSimpleEvent({ emailConfirm: true });
    await fns.registerForEvent(req({ eventId: 'training-1', empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' }));
    const before = mailDocs(db).length; // 1 from register
    await fns.cancelEventRegistration(req({ eventId: 'training-1' }));
    expect(mailDocs(db).length).toBe(before); // no new mail on cancel
  });
});
