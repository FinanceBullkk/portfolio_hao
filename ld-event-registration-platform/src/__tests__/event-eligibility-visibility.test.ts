import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// buildEventsState is plain CommonJS (functions/). Drive it with a tiny path-keyed
// Firestore double to verify the eligibility gate is VISIBLE-BUT-LOCKED: a
// requireEligibility event is returned for everyone, but carries eligible:false for a
// user whose empCode is NOT on its allowlist (so the client locks the CTA); eligible:true
// for allowlisted users and admins. Ungated events are always eligible:true.
const require = createRequire(import.meta.url);
const { buildEventsState } = require('../../functions/event-client-state');

type DocData = Record<string, unknown>;

function makeDb(store: Record<string, DocData>) {
  return {
    collection(path: string) {
      const docs = (field?: string, value?: unknown) => {
        const prefix = `${path}/`;
        return Object.entries(store)
          .filter(([p, data]) => p.startsWith(prefix)
            && !p.slice(prefix.length).includes('/')
            && (!field || data[field] === value))
          .map(([p, data]) => ({ id: p.slice(prefix.length), data: () => data }));
      };
      return {
        async get() {
          return { docs: docs() };
        },
        where(field: string, _op: string, value: unknown) {
          return { get: async () => ({ docs: docs(field, value) }) };
        },
      };
    },
    doc(path: string) {
      const id = path.split('/').pop() as string;
      return {
        id,
        async get() {
          const data = store[path];
          return { exists: data !== undefined, id, data: () => data || {} };
        },
      };
    },
  };
}

const USER = 'user@cyberlogitec.com';
const ADMIN = 'admin@cyberlogitec.com';

function baseStore(): Record<string, DocData> {
  return {
    'config/main': { adminEmails: [ADMIN], buList: ['BSG', 'CHORUS'] },
    'userProfiles/user@cyberlogitec.com': { empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' },
    'events/open-1': { name: 'Open event', type: 'simple', capacity: 10, listed: true, allowEnrollment: true },
    'events/gated-1': { name: 'Gated event', type: 'simple', capacity: 10, listed: true, allowEnrollment: true, requireEligibility: true },
  };
}

type EventOut = { eventId: string; eligible?: boolean };
const ids = (r: { events: EventOut[] }) => r.events.map((e) => e.eventId).sort();
const byId = (r: { events: EventOut[] }, id: string) => r.events.find((e) => e.eventId === id);

describe('initEvents eligibility gate (visible-but-locked)', () => {
  it('shows a requireEligibility event LOCKED (eligible:false) for a user not on the allowlist', async () => {
    const r = await buildEventsState(makeDb(baseStore()), USER);
    expect(ids(r)).toEqual(['gated-1', 'open-1']); // both visible now — gated is locked, not hidden
    expect(byId(r, 'gated-1')?.eligible).toBe(false);
    expect(byId(r, 'open-1')?.eligible).toBe(true); // ungated → always eligible
  });

  it('marks the gated event eligible:true once the user is on the allowlist', async () => {
    const store = baseStore();
    store['events/gated-1/eligibility/262010'] = { fullName: 'NGUYEN VAN A' };
    const r = await buildEventsState(makeDb(store), USER);
    expect(byId(r, 'gated-1')?.eligible).toBe(true);
  });

  it('admins are eligible for every event (bypass)', async () => {
    const r = await buildEventsState(makeDb(baseStore()), ADMIN);
    expect(ids(r)).toEqual(['gated-1', 'open-1']);
    expect(byId(r, 'gated-1')?.eligible).toBe(true);
  });

  it('a user with no profile (no empCode) sees the gated event locked (eligible:false)', async () => {
    const store = baseStore();
    delete store['userProfiles/user@cyberlogitec.com'];
    const r = await buildEventsState(makeDb(store), USER);
    expect(ids(r)).toEqual(['gated-1', 'open-1']);
    expect(byId(r, 'gated-1')?.eligible).toBe(false);
  });
});
