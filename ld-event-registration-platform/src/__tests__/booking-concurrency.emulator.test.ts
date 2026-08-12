import { createRequire } from 'node:module';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

// Runs the REAL simple-event registerForEvent handler (functions/event-handlers.js)
// against the Firestore emulator via the Admin SDK, firing many parallel
// registrations at limited seats. Proves the seat-claim model never over-books
// under a registration spike — the in-memory FakeDb in functions-booking.test.ts
// cannot exercise real optimistic-concurrency retries, so this fills that gap.
//
// Excluded from `npm test` (vitest.config.ts excludes *.emulator.test.*) and run
// via `npm run test:rules` (firebase emulators:exec sets FIRESTORE_EMULATOR_HOST).
const fnRequire = createRequire(join(process.cwd(), 'functions/index.js'));
const { initializeApp, getApps, deleteApp } = fnRequire('firebase-admin/app');
const { getFirestore, Timestamp } = fnRequire('firebase-admin/firestore');
const { createRegisterForEventHandler } = fnRequire(join(process.cwd(), 'functions/event-handlers.js'));

class HttpsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const firebaseConfig = JSON.parse((globalThis as any).process?.env?.FIREBASE_CONFIG || '{}');
const emulatorProjectId = (globalThis as any).process?.env?.GCLOUD_PROJECT
  || firebaseConfig.projectId
  || 'demo-corgi7-concurrency';
const app = getApps().length ? getApps()[0] : initializeApp({ projectId: emulatorProjectId });
const db = getFirestore(app);

const registerForEvent = createRegisterForEventHandler({
  db,
  Timestamp,
  HttpsError,
  assertSignedIn: (req: any) => String(req.auth.token.email).trim().toLowerCase(),
  addAudit: async () => {},
  defaultBuList: ['BSG'],
  userRateLimitMs: 0,
});

async function clearCollection(path: string) {
  const snap = await db.collection(path).get();
  await Promise.all(snap.docs.map((d: any) => d.ref.delete()));
}

async function clearAll() {
  for (const c of [
    'events/load-1/registrations',
    'events/load-1/empCodeClaims',
    'events/load-1/capacityShards',
    'events/load-1/capacityClaims',
    'events/load-1/cancelledQuota',
    'functionRateLimits',
    'config',
    'events',
    'userProfiles',
  ]) await clearCollection(c);
}

async function seedSimpleEvent(capacity: number) {
  await db.doc('config/main').set({ allowEnrollment: true, emailConfirm: false, requireEligibility: false, buList: ['BSG'] });
  // Seat-claim docs are created lazily on registration (one doc per seat).
  // Firestore rejects duplicate claim ids, so `capacity` is a hard ceiling with
  // no pre-seeding and no hot counter doc.
  await db.doc('events/load-1').set({
    name: 'Load Test Event',
    type: 'simple',
    allowEnrollment: true,
    archived: false,
    listed: true,
    requireEligibility: false,
    emailConfirm: false,
    capacity,
    remaining: capacity,
  });
}

async function eventRace(capacity: number, users: number) {
  await clearAll();
  await seedSimpleEvent(capacity);
  const startedAt = performance.now();
  const calls = Array.from({ length: users }, (_, i) => {
    const email = `event-user${i}@cyberlogitec.com`;
    // fullName must be letters-only (isValidFullName / FULL_NAME_RE) — map the index
    // digits to letters so the per-user name stays distinct AND valid (a bare
    // `EVENT USER ${i}` carries a digit and is rejected by the registration handler).
    const nameSuffix = String(i).replace(/[0-9]/g, (d) => 'ABCDEFGHIJ'[Number(d)]);
    return registerForEvent({
      auth: { token: { email } },
      data: { eventId: 'load-1', empCode: String(200000 + i), fullName: `EVENT USER ${nameSuffix}`, bu: 'BSG' },
    }).then(() => true).catch(() => false);
  });
  const successes = (await Promise.all(calls)).filter(Boolean).length;
  const elapsedMs = Math.round(performance.now() - startedAt);
  const event = (await db.doc('events/load-1').get()).data() as any;
  const capacityClaims = (await db.collection('events/load-1/capacityClaims').get()).size;
  const registrations = (await db.collection('events/load-1/registrations').get()).size;
  const claims = (await db.collection('events/load-1/empCodeClaims').get()).size;
  const profiles = (await db.collection('userProfiles').get()).size;
  return { successes, docRemaining: event.remaining, capacityClaims, registrations, claims, profiles, elapsedMs };
}

describe('booking concurrency (Firestore emulator)', () => {
  afterAll(async () => {
    await deleteApp(app).catch(() => {});
  });

  it('simple event accepts 100 concurrent registrations without oversell', async () => {
    const r = await eventRace(100, 100);
    expect(r.successes).toBe(100);
    expect(r.capacityClaims).toBe(100);
    expect(r.registrations).toBe(100);
    expect(r.claims).toBe(100);
    expect(r.profiles).toBe(100);
  }, 60000);

  it('caps simple-event seats under oversubscription — 30 racers for 5 seats', async () => {
    const r = await eventRace(5, 30);
    expect(r.successes).toBe(5);
    expect(r.capacityClaims).toBe(5);
    expect(r.registrations).toBe(5);
    expect(r.claims).toBe(5);
  }, 60000);
});
