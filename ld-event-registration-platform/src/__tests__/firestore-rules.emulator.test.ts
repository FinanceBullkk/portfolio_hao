// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-corgi7-rules';

let testEnv: RulesTestEnvironment;

function authedDb(email: string) {
  return testEnv.authenticatedContext(email, { email, email_verified: true }).firestore();
}

// A signed-in Google account whose email is NOT verified — must be treated as
// a non-company user by the rules (defense-in-depth on isCompanyEmail()).
function unverifiedDb(email: string) {
  return testEnv.authenticatedContext(email, { email, email_verified: false }).firestore();
}

function unauthDb() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

async function seedAdminConfig(adminEmails = ['admin@cyberlogitec.com']) {
  await seed('config/main', { adminEmails });
}

const validSlot = {
  type: 'Speaking',
  date: '2026-06-22',
  session: 'AM',
  startMin: 540,
  endMin: 600,
  capacity: 8,
  remaining: 8,
  location: 'Room A',
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('firestore.rules admin authorization', () => {
  // Exercised via an event slot (events/{id}/slots) — same isAdmin()/validNewSlot()
  // rule as the retired flat /slots collection.
  it('does not grant admin access without /config/main.adminEmails', async () => {
    const db = authedDb('admin@cyberlogitec.com');
    await assertFails(setDoc(doc(db, 'events/ev1/slots/SP-2206-0900'), validSlot));
  });

  it('grants admin access from /config/main.adminEmails only', async () => {
    await seedAdminConfig();

    const admin = authedDb('admin@cyberlogitec.com');
    const user = authedDb('user@cyberlogitec.com');

    await assertSucceeds(setDoc(doc(admin, 'events/ev1/slots/SP-2206-0900'), validSlot));
    await assertFails(setDoc(doc(user, 'events/ev1/slots/SP-2206-1000'), { ...validSlot, startMin: 600, endMin: 660 }));
  });

  it('does not grant admin access to non-company email even if configured', async () => {
    await seedAdminConfig(['admin@gmail.com']);

    const admin = authedDb('admin@gmail.com');
    await assertFails(setDoc(doc(admin, 'events/ev1/slots/SP-2206-0900'), validSlot));
  });
});

describe('firestore.rules company email gate', () => {
  // Booking data now lives under events/{id}/… — same isCompanyEmail()/admin rules
  // as the retired flat collections; config/main stays top-level (shared).
  it('allows company users to read booking data but blocks other signed-in Google accounts', async () => {
    await seedAdminConfig();
    await seed('events/ev1/slots/SP-2206-0900', validSlot);
    await seed('events/ev1/registrations/user@cyberlogitec.com', { empCode: '262010' });
    await seed('events/ev1/empCodeClaims/262010', { email: 'user@cyberlogitec.com' });
    await seed('events/ev1/eligibility/262010', { empCode: '262010' });
    await seed('events/ev1/ineligibility/262011', { reason: 'blocked' });

    const companyUser = authedDb('user@cyberlogitec.com');
    const admin = authedDb('admin@cyberlogitec.com');
    const outsider = authedDb('user@gmail.com');

    // Company users read the public booking data they need.
    await assertSucceeds(getDoc(doc(companyUser, 'config/main')));
    await assertSucceeds(getDoc(doc(companyUser, 'events/ev1/slots/SP-2206-0900')));
    await assertSucceeds(getDoc(doc(companyUser, 'events/ev1/registrations/user@cyberlogitec.com')));

    // PII-bearing collections are admin-only (no client read; checks run server-side
    // via callables). Prevents empCode → email / blocklist enumeration.
    await assertFails(getDoc(doc(companyUser, 'events/ev1/empCodeClaims/262010')));
    await assertFails(getDoc(doc(companyUser, 'events/ev1/eligibility/262010')));
    await assertFails(getDoc(doc(companyUser, 'events/ev1/ineligibility/262011')));
    await assertSucceeds(getDoc(doc(admin, 'events/ev1/empCodeClaims/262010')));
    await assertSucceeds(getDoc(doc(admin, 'events/ev1/eligibility/262010')));
    await assertSucceeds(getDoc(doc(admin, 'events/ev1/ineligibility/262011')));

    await assertFails(getDoc(doc(outsider, 'config/main')));
    await assertFails(getDoc(doc(outsider, 'events/ev1/slots/SP-2206-0900')));
    await assertFails(getDoc(doc(outsider, 'events/ev1/registrations/user@gmail.com')));
    await assertFails(getDoc(doc(outsider, 'events/ev1/empCodeClaims/262010')));
    await assertFails(getDoc(doc(outsider, 'events/ev1/eligibility/262010')));
    await assertFails(getDoc(doc(outsider, 'events/ev1/ineligibility/262011')));
  });

  it('treats an unverified company email as a non-company user', async () => {
    await seedAdminConfig();
    await seed('events/ev1/slots/SP-2206-0900', validSlot);

    // email_verified: false → isCompanyEmail() must be false, so even a
    // @cyberlogitec.com address cannot read booking data.
    const unverified = unverifiedDb('user@cyberlogitec.com');
    await assertFails(getDoc(doc(unverified, 'config/main')));
    await assertFails(getDoc(doc(unverified, 'events/ev1/slots/SP-2206-0900')));
  });
});

describe('firestore.rules auditLogs', () => {
  it('allows admin client to append own admin audit events', async () => {
    await seedAdminConfig();
    const admin = authedDb('admin@cyberlogitec.com');

    await assertSucceeds(addDoc(collection(admin, 'auditLogs'), {
      timestamp: serverTimestamp(),
      email: 'admin@cyberlogitec.com',
      event: 'admin.updateConfig',
      detail: { field: 'allowEnrollment' },
    }));
  });

  it('blocks forged user booking audit logs from raw SDK', async () => {
    await seedAdminConfig();
    const user = authedDb('user@cyberlogitec.com');

    await assertFails(addDoc(collection(user, 'auditLogs'), {
      timestamp: serverTimestamp(),
      email: 'user@cyberlogitec.com',
      event: 'book.create',
      detail: { empCode: '262010' },
    }));
  });

  it('blocks admin audit logs when email does not match auth token', async () => {
    await seedAdminConfig();
    const admin = authedDb('admin@cyberlogitec.com');

    await assertFails(addDoc(collection(admin, 'auditLogs'), {
      timestamp: serverTimestamp(),
      email: 'other@cyberlogitec.com',
      event: 'admin.updateConfig',
      detail: {},
    }));
  });

  it('blocks unauthenticated audit log reads and writes', async () => {
    await seedAdminConfig();
    const db = unauthDb();

    await assertFails(getDoc(doc(db, 'auditLogs/log-1')));
    await assertFails(addDoc(collection(db, 'auditLogs'), {
      timestamp: serverTimestamp(),
      email: 'admin@cyberlogitec.com',
      event: 'admin.updateConfig',
      detail: {},
    }));
  });
});

describe('firestore.rules slot delete safety (event slots)', () => {
  it('allows admin to delete an unused slot', async () => {
    await seedAdminConfig();
    await seed('events/ev1/slots/SP-2206-0900', validSlot);

    const admin = authedDb('admin@cyberlogitec.com');
    await assertSucceeds(deleteDoc(doc(admin, 'events/ev1/slots/SP-2206-0900')));
  });

  it('blocks admin from deleting a slot with active usage', async () => {
    await seedAdminConfig();
    await seed('events/ev1/slots/SP-2206-0900', { ...validSlot, remaining: 7 });

    const admin = authedDb('admin@cyberlogitec.com');
    await assertFails(deleteDoc(doc(admin, 'events/ev1/slots/SP-2206-0900')));
  });

  it('blocks non-admin slot delete even when the slot is unused', async () => {
    await seedAdminConfig();
    await seed('events/ev1/slots/SP-2206-0900', validSlot);

    const user = authedDb('user@cyberlogitec.com');
    await assertFails(deleteDoc(doc(user, 'events/ev1/slots/SP-2206-0900')));
  });
});

describe('firestore.rules events', () => {
  it('event metadata is readable by company users; writes are admin-only', async () => {
    await seedAdminConfig();
    await seed('events/training-1', { name: 'T', type: 'simple', allowEnrollment: true, capacity: 5, remaining: 5, listed: true, archived: false });

    const user = authedDb('user@cyberlogitec.com');
    const admin = authedDb('admin@cyberlogitec.com');
    const outsider = authedDb('user@gmail.com');

    await assertSucceeds(getDoc(doc(user, 'events/training-1')));
    await assertFails(getDoc(doc(outsider, 'events/training-1')));
    await assertFails(setDoc(doc(user, 'events/hack'), { name: 'x', type: 'simple' }));
    await assertSucceeds(setDoc(doc(admin, 'events/t2'), { name: 'x', type: 'simple', allowEnrollment: false }));
  });

  it('event registrations: read own only; client self-write blocked (server-owned)', async () => {
    await seedAdminConfig();
    await seed('events/training-1', { name: 'T', type: 'simple' });
    await seed('events/training-1/registrations/user@cyberlogitec.com', { empCode: '262010', bu: 'BSG' });
    await seed('events/training-1/registrations/other@cyberlogitec.com', { empCode: '262011', bu: 'BSG' });

    const user = authedDb('user@cyberlogitec.com');
    const admin = authedDb('admin@cyberlogitec.com');

    await assertSucceeds(getDoc(doc(user, 'events/training-1/registrations/user@cyberlogitec.com')));
    await assertFails(getDoc(doc(user, 'events/training-1/registrations/other@cyberlogitec.com')));
    // Self-write must go through the callable (Admin SDK), not the raw client SDK.
    await assertFails(setDoc(doc(user, 'events/training-1/registrations/user@cyberlogitec.com'), { empCode: '262010', bu: 'BSG' }));
    // Admin reads any registration (per-event rule + collection-group rule).
    await assertSucceeds(getDoc(doc(admin, 'events/training-1/registrations/other@cyberlogitec.com')));
  });

  it('event empCodeClaims / eligibility / ineligibility are admin-only (no enumeration)', async () => {
    await seedAdminConfig();
    await seed('events/asm/empCodeClaims/262010', { email: 'user@cyberlogitec.com' });
    await seed('events/asm/eligibility/262010', { empCode: '262010' });
    await seed('events/asm/ineligibility/262011', { reason: 'blocked' });

    const user = authedDb('user@cyberlogitec.com');
    const admin = authedDb('admin@cyberlogitec.com');

    await assertFails(getDoc(doc(user, 'events/asm/empCodeClaims/262010')));
    await assertFails(getDoc(doc(user, 'events/asm/eligibility/262010')));
    await assertFails(getDoc(doc(user, 'events/asm/ineligibility/262011')));
    await assertSucceeds(getDoc(doc(admin, 'events/asm/empCodeClaims/262010')));
  });

  it('permanentBlock (global) is admin-only — read + write', async () => {
    await seedAdminConfig();
    await seed('permanentBlock/262010', { reason: 'No longer employed' });

    const user = authedDb('user@cyberlogitec.com');
    const admin = authedDb('admin@cyberlogitec.com');

    await assertFails(getDoc(doc(user, 'permanentBlock/262010')));
    await assertFails(setDoc(doc(user, 'permanentBlock/262011'), { reason: 'x' }));
    await assertSucceeds(getDoc(doc(admin, 'permanentBlock/262010')));
    await assertSucceeds(setDoc(doc(admin, 'permanentBlock/262011'), { reason: 'y' }));
    await assertSucceeds(deleteDoc(doc(admin, 'permanentBlock/262011')));
  });

  it('event slots: readable by company users; writes admin-only with shape validation', async () => {
    await seedAdminConfig();
    await seed('events/asm/slots/SP-1', validSlot);

    const user = authedDb('user@cyberlogitec.com');
    const admin = authedDb('admin@cyberlogitec.com');

    await assertSucceeds(getDoc(doc(user, 'events/asm/slots/SP-1')));
    await assertFails(setDoc(doc(user, 'events/asm/slots/SP-2'), validSlot));
    await assertSucceeds(setDoc(doc(admin, 'events/asm/slots/SP-2'), validSlot));
    await assertSucceeds(deleteDoc(doc(admin, 'events/asm/slots/SP-2')));
    // Malformed slot rejected by validNewSlot (negative capacity).
    await assertFails(setDoc(doc(admin, 'events/asm/slots/SP-BAD'), { ...validSlot, capacity: -1, remaining: -1 }));
  });

  it('event slot delete is blocked while the slot has active usage (no orphan)', async () => {
    await seedAdminConfig();
    // remaining < capacity → someone holds the slot → validAdminSlotDelete fails.
    await seed('events/asm/slots/SP-9', { ...validSlot, remaining: 7 });

    const admin = authedDb('admin@cyberlogitec.com');
    await assertFails(deleteDoc(doc(admin, 'events/asm/slots/SP-9')));
  });

  it('event cancelledQuota is server-owned (no client read)', async () => {
    await seedAdminConfig();
    await seed('events/asm/cancelledQuota/user@cyberlogitec.com', { changeCount: 1 });

    const user = authedDb('user@cyberlogitec.com');
    // No client rule for event cancelledQuota → only Cloud Functions (Admin SDK) touch it.
    await assertFails(getDoc(doc(user, 'events/asm/cancelledQuota/user@cyberlogitec.com')));
  });
});
