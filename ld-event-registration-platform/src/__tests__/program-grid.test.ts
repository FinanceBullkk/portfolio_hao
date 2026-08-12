/**
 * Pure grid-builder tests (src/lib/program-grid.ts): week date math + cell-state
 * classification (mine / taken / bookable / blackout / past) and weekday columns.
 */
import { describe, it, expect } from 'vitest';
import {
  buildProgramWeek, mondayOf, addDays, isoWeekday, lastDateOfMonth, assignSequenceByClass, type CellState,
} from '../lib/program-grid';
import type { ProgramConfig, ProgramSession } from '../lib/types';

const PROGRAM: ProgramConfig = {
  trainerName: 'Shirly',
  timeSlots: [
    { startMin: 600, endMin: 660, label: '10:00–11:00' },
    { startMin: 660, endMin: 720, label: '11:00–12:00' },
  ],
  weekdays: [1, 2, 3, 4, 5],
  openMonth: '2026-02',
  deadline: '2026-02-28T23:59:59+07:00',
  deadlinePassed: false,
  fillMode: false,
  monthlyCap: 4,
  weeklyCap: 1,
};

function session(date: string, startMin: number, classCode: string): ProgramSession {
  return {
    sessionId: `${date}_${startMin}`, classCode, courseName: '', bu: 'CHORUS', picEmail: 'p@cyberlogitec.com',
    date, startMin, endMin: startMin + 60, mode: 'offline', participantCount: 8,
    topic: '', meetLink: '', gcalEventId: '', sequence: null, display: '',
  };
}

const MONDAY = '2026-02-02';
const BEFORE = Date.parse('2026-02-01T08:00:00+07:00');

describe('date helpers', () => {
  it('mondayOf / addDays / isoWeekday', () => {
    expect(mondayOf('2026-02-04')).toBe('2026-02-02'); // Wed → Mon
    expect(mondayOf('2026-02-08')).toBe('2026-02-02'); // Sun → same week's Mon
    expect(addDays('2026-02-02', 3)).toBe('2026-02-05');
    expect(isoWeekday('2026-02-02')).toBe(1);
    expect(isoWeekday('2026-02-08')).toBe(7);
  });
});

describe('buildProgramWeek()', () => {
  const week = buildProgramWeek({
    monday: MONDAY,
    program: PROGRAM,
    sessions: [session('2026-02-02', 600, 'EL040'), session('2026-02-03', 600, 'EL999')],
    blackouts: [{ date: '2026-02-04', startMin: 600 }],
    myClassCodes: ['EL040'],
    nowMs: BEFORE,
  });

  const stateAt = (date: string, startMin: number): CellState | undefined => {
    for (const row of week.rows) {
      const cell = row.cells.find((c) => c.date === date && c.startMin === startMin);
      if (cell) return cell.state;
    }
    return undefined;
  };

  it('columns are the configured weekdays (Mon–Fri)', () => {
    expect(week.days.map((d) => d.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    expect(week.days[0].date).toBe('2026-02-02');
    expect(week.days[4].date).toBe('2026-02-06');
  });

  it('rows are the configured slots', () => {
    expect(week.rows.map((r) => r.startMin)).toEqual([600, 660]);
  });

  it('classifies cell states', () => {
    expect(stateAt('2026-02-02', 600)).toBe('mine'); // my class's session
    expect(stateAt('2026-02-03', 600)).toBe('taken'); // another class
    expect(stateAt('2026-02-04', 600)).toBe('blackout'); // HR blocked
    expect(stateAt('2026-02-05', 600)).toBe('bookable'); // empty future
    expect(stateAt('2026-02-02', 660)).toBe('bookable'); // empty future, second slot
  });

  it('marks empty cells in the past', () => {
    const past = buildProgramWeek({
      monday: MONDAY, program: PROGRAM, sessions: [], blackouts: [], myClassCodes: [],
      nowMs: Date.parse('2026-02-28T00:00:00+07:00'), // after the whole week
    });
    const fri11 = past.rows.find((r) => r.startMin === 660)!.cells.find((c) => c.date === '2026-02-06')!;
    expect(fri11.state).toBe('past');
  });

  it('empty grid config → no rows (fail-closed)', () => {
    const empty = buildProgramWeek({
      monday: MONDAY, program: { ...PROGRAM, timeSlots: [] }, sessions: [], blackouts: [],
      myClassCodes: [], nowMs: BEFORE,
    });
    expect(empty.rows).toEqual([]);
  });
});

describe('registration window (PIC view)', () => {
  it('lastDateOfMonth', () => {
    expect(lastDateOfMonth('2026-02')).toBe('2026-02-28');
    expect(lastDateOfMonth('2026-07')).toBe('2026-07-31');
    expect(lastDateOfMonth('2024-02')).toBe('2024-02-29'); // leap year
  });

  const firstStateAt = (week: ReturnType<typeof buildProgramWeek>, date: string) =>
    week.rows[0].cells.find((c) => c.date === date)!.state;

  it('locks empty cells outside the open month as closed', () => {
    const marchMon = mondayOf('2026-03-18'); // a March week while Feb is the open month
    const w = buildProgramWeek({
      monday: marchMon, program: PROGRAM, sessions: [], blackouts: [], myClassCodes: [],
      nowMs: BEFORE, window: { bookingMonth: '2026-02', open: true },
    });
    expect(firstStateAt(w, marchMon)).toBe('closed');
  });

  it('keeps in-month future cells bookable when the window is open', () => {
    const w = buildProgramWeek({
      monday: MONDAY, program: PROGRAM, sessions: [], blackouts: [], myClassCodes: [],
      nowMs: BEFORE, window: { bookingMonth: '2026-02', open: true },
    });
    expect(firstStateAt(w, '2026-02-05')).toBe('bookable');
  });

  it('closes all empty cells when the window is shut (deadline passed)', () => {
    const w = buildProgramWeek({
      monday: MONDAY, program: PROGRAM, sessions: [], blackouts: [], myClassCodes: [],
      nowMs: BEFORE, window: { bookingMonth: '2026-02', open: false },
    });
    expect(firstStateAt(w, '2026-02-05')).toBe('closed');
  });

  it('without a window param, cells stay bookable (admin Schedule view)', () => {
    const marchMon = mondayOf('2026-03-18');
    const w = buildProgramWeek({
      monday: marchMon, program: PROGRAM, sessions: [], blackouts: [], myClassCodes: [],
      nowMs: BEFORE,
    });
    expect(firstStateAt(w, marchMon)).toBe('bookable');
  });
});

describe('assignSequenceByClass', () => {
  it('numbers each class chronologically (by date, then start) and is per-class', () => {
    const sessions = [
      session('2026-02-10', 660, 'EL001'), // 2nd of EL001 (same day, later slot)
      session('2026-02-10', 600, 'EL001'), // 1st of EL001
      session('2026-02-17', 600, 'EL001'), // 3rd of EL001
      session('2026-02-03', 600, 'EL002'), // 1st of EL002
    ];
    const seq = Object.fromEntries(
      assignSequenceByClass(sessions).map((s) => [s.sessionId, s.sequence]),
    );
    expect(seq['2026-02-10_600']).toBe(1);
    expect(seq['2026-02-10_660']).toBe(2);
    expect(seq['2026-02-17_600']).toBe(3);
    expect(seq['2026-02-03_600']).toBe(1); // EL002 numbered independently
  });
});
