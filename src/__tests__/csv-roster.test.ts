import { describe, it, expect, vi } from 'vitest';
import type { Slot } from '../lib/types';

// csv-export imports admin-registrations → firebase; stub it so the module loads.
vi.mock('../lib/firestore-db', () => ({ db: {} }));
vi.mock('../lib/firebase', () => ({ db: {}, app: {}, functions: {} }));

import { buildRosterCsv } from '../lib/csv-export';
import type { Registration } from '../lib/admin-registrations';

const slot = (over: Partial<Slot>): Slot => ({
  slotId: 'X', type: 'Speaking', date: '2026-06-24', startMin: 540, endMin: 600,
  capacity: 10, remaining: 9, location: 'Room', display: '', ...over,
});
const reg = (over: Partial<Registration>): Registration => ({
  email: 'a@clt.com', empCode: '262001', fullName: 'NGUYEN A', bu: 'BSG',
  speakingSlotId: 'SP1', skillsSlotId: 'SK1', createdAt: null, updatedAt: null, changeCount: 0, ...over,
});

const SLOTS: Slot[] = [
  slot({ slotId: 'SP1', type: 'Speaking', date: '2026-06-24', startMin: 540, endMin: 600, location: '5F Admin | Booth' }), // 09:00 AM
  slot({ slotId: 'SK1', type: '3 Skills', date: '2026-06-24', startMin: 810, endMin: 960, location: '5F Admin | Training Room' }), // 13:30 PM
];

function parse(csvStr: string) {
  const lines = csvStr.split('\n');
  return { header: lines[0], rows: lines.slice(1) };
}

describe('buildRosterCsv — per-slot exam roster', () => {
  it('uses the proctor template header', () => {
    const { header } = parse(buildRosterCsv([reg({})], SLOTS));
    expect(header).toBe('Emp. Code,Full name,Working Email,AM/PM,Test date,Skill,Phòng thi,Giờ thi');
  });

  it('expands each registration into one row per slot with AM/PM derived from start time', () => {
    const { rows } = parse(buildRosterCsv([reg({})], SLOTS));
    expect(rows).toHaveLength(2);
    // Sorted by start time → Speaking (09:00 AM) before 3 Skills (13:30 PM).
    expect(rows[0]).toBe('262001,NGUYEN A,a@clt.com,AM,24/06/2026,Speaking,5F Admin | Booth,09:00-10:00');
    expect(rows[1]).toBe('262001,NGUYEN A,a@clt.com,PM,24/06/2026,3 Skills,5F Admin | Training Room,13:30-16:00');
  });

  it('derives AM/PM at the noon boundary (12:00 = PM)', () => {
    const slots: Slot[] = [
      slot({ slotId: 'A', type: 'Speaking', startMin: 660, endMin: 720, location: 'R' }), // 11:00 → AM
      slot({ slotId: 'B', type: '3 Skills', startMin: 720, endMin: 870, location: 'R' }), // 12:00 → PM
    ];
    const { rows } = parse(buildRosterCsv([reg({ speakingSlotId: 'A', skillsSlotId: 'B' })], slots));
    expect(rows[0]).toContain(',AM,');
    expect(rows[1]).toContain(',PM,');
  });

  it('sorts globally by test date then start time across registrations', () => {
    const slots: Slot[] = [
      slot({ slotId: 'D2', type: 'Speaking', date: '2026-06-25', startMin: 540, endMin: 600, location: 'R' }),
      slot({ slotId: 'D1', type: '3 Skills', date: '2026-06-24', startMin: 810, endMin: 960, location: 'R' }),
    ];
    const r = reg({ email: 'z@clt.com', empCode: '262002', fullName: 'TRAN B', speakingSlotId: 'D2', skillsSlotId: 'D1' });
    const { rows } = parse(buildRosterCsv([r], slots));
    expect(rows[0]).toContain('24/06/2026'); // earlier date first
    expect(rows[1]).toContain('25/06/2026');
  });

  it('escapes CSV fields containing commas', () => {
    const slots: Slot[] = [slot({ slotId: 'SP1', location: 'Room A, B' })];
    const { rows } = parse(buildRosterCsv([reg({ skillsSlotId: null })], slots));
    expect(rows[0]).toContain('"Room A, B"');
  });

  it('still lists a participant whose slot was deleted', () => {
    const { rows } = parse(buildRosterCsv([reg({ speakingSlotId: 'GONE', skillsSlotId: null })], SLOTS));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('GONE (deleted)');
    expect(rows[0]).toContain('Speaking');
  });
});
