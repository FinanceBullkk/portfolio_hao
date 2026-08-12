import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// buildMyRegistrations is plain CommonJS (functions/), depending only on the pure
// event-shape / slot-shape shapers — so we require it directly and drive it with a
// tiny in-memory Firestore double. Covers the read-only "My registrations" history
// that must surface archived/closed events the landing list hides.
const require = createRequire(import.meta.url);
const { buildMyRegistrations, entryStatus } = require('../../functions/my-registrations');

type DocData = Record<string, unknown>;

/** Firestore Timestamp double — only toDate() is read by the shapers. */
function ts(iso: string) {
  return { toDate: () => new Date(iso) };
}

function makeDb(store: Record<string, DocData>) {
  return {
    collection(path: string) {
      return {
        async get() {
          const prefix = `${path}/`;
          const docs = Object.entries(store)
            .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
            .map(([p, data]) => ({ id: p.slice(prefix.length), data: () => data }));
          return { docs };
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

const EMAIL = 'user@cyberlogitec.com';

describe('entryStatus', () => {
  it('archived event → archived (even if enrollment left open)', () => {
    expect(entryStatus({ archived: true, allowEnrollment: true, deadlinePassed: false })).toBe('archived');
  });
  it('enrollment closed or deadline passed → closed', () => {
    expect(entryStatus({ archived: false, allowEnrollment: false, deadlinePassed: false })).toBe('closed');
    expect(entryStatus({ archived: false, allowEnrollment: true, deadlinePassed: true })).toBe('closed');
  });
  it('open + within deadline → open', () => {
    expect(entryStatus({ archived: false, allowEnrollment: true, deadlinePassed: false })).toBe('open');
  });
});

describe('buildMyRegistrations', () => {
  it('includes archived/closed events and resolves slotted schedules', async () => {
    const db = makeDb({
      // Open simple event — user registered.
      'events/training-1': { name: 'Leadership', subtitle: 'Cohort 1', type: 'simple', allowEnrollment: true, capacity: 10 },
      'events/training-1/registrations/user@cyberlogitec.com': {
        empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG', createdAt: ts('2026-06-01T00:00:00.000Z'),
      },
      // Archived slotted assessment — user registered with two slots.
      'events/assessment-q2': { name: 'Assessment Q2', subtitle: '', type: 'slotted', allowEnrollment: false, archived: true },
      'events/assessment-q2/registrations/user@cyberlogitec.com': {
        empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG',
        speakingSlotId: 'sp1', skillsSlotId: 'sk1', createdAt: ts('2026-04-01T00:00:00.000Z'),
      },
      'events/assessment-q2/slots/sp1': { type: 'Speaking', date: '2026-04-20', startMin: 540, endMin: 600, capacity: 2, location: 'Room A' },
      'events/assessment-q2/slots/sk1': { type: '3 Skills', date: '2026-04-21', startMin: 600, endMin: 720, capacity: 2, location: 'Room B' },
      // An event the user did NOT register in — must be excluded.
      'events/webinar-x': { name: 'Webinar', type: 'simple', allowEnrollment: true, capacity: 5 },
    });

    const { email, registrations } = await buildMyRegistrations(db, EMAIL);
    expect(email).toBe(EMAIL);
    expect(registrations).toHaveLength(2);

    // Active (open) first, archived last.
    expect(registrations[0].eventId).toBe('training-1');
    expect(registrations[0].status).toBe('open');
    expect(registrations[0].slots).toBeNull(); // simple events carry no schedule

    const asm = registrations[1];
    expect(asm.eventId).toBe('assessment-q2');
    expect(asm.status).toBe('archived');
    expect(asm.slots).toHaveLength(2);
    expect(asm.slots.map((s: { type: string }) => s.type)).toEqual(['Speaking', '3 Skills']);
    expect(asm.slots[0]).toMatchObject({ date: '2026-04-20', startMin: 540, endMin: 600, location: 'Room A' });
  });

  it('returns empty when the user has no registrations', async () => {
    const db = makeDb({ 'events/training-1': { name: 'X', type: 'simple', allowEnrollment: true, capacity: 10 } });
    const { registrations } = await buildMyRegistrations(db, EMAIL);
    expect(registrations).toEqual([]);
  });

  it('tolerates a slotted registration whose slot doc was deleted', async () => {
    const db = makeDb({
      'events/asm': { name: 'Asm', type: 'slotted', allowEnrollment: true, archived: false },
      'events/asm/registrations/user@cyberlogitec.com': { empCode: '262010', fullName: 'A', bu: 'BSG', speakingSlotId: 'gone', skillsSlotId: null },
    });
    const { registrations } = await buildMyRegistrations(db, EMAIL);
    expect(registrations).toHaveLength(1);
    expect(registrations[0].slots).toEqual([]); // missing slot doc → no schedule rows, no crash
  });
});
