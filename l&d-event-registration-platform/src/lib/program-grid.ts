// Pure week-grid builder for the Pronunciation Program booking screen.
//
// Turns the program config + the month's sessions + blackouts into a Mon–Fri × slots
// grid of typed cells, with no React or Firestore. Mirrors the server's cell key
// (`${date}_${startMin}`) and VN wall-clock past check (program-booking-rules.js).

import type { ProgramConfig, ProgramSession, ProgramBlackoutCell } from './types';

// 'closed' = an otherwise-bookable cell that falls outside the registration window
// (a different month than the open one, or after the deadline). It is locked in the UI
// so the PIC never clicks a cell the server would only reject on submit.
export type CellState = 'mine' | 'taken' | 'bookable' | 'blackout' | 'past' | 'closed';

export interface GridCell {
  key: string; // `${date}_${startMin}`
  date: string;
  startMin: number;
  endMin: number;
  state: CellState;
  session: ProgramSession | null;
}

export interface GridDay {
  date: string; // 'YYYY-MM-DD'
  weekday: number; // 1=Mon … 7=Sun
  label: string; // 'Mon'
}

export interface ProgramWeek {
  monday: string;
  days: GridDay[];
  rows: { startMin: number; endMin: number; label: string; cells: GridCell[] }[];
}

const DOW = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n: number) => String(n).padStart(2, '0');

function dateMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export function addDays(dateStr: string, n: number): string {
  return fmtDate(dateMs(dateStr) + n * 86400000);
}
export function isoWeekday(dateStr: string): number {
  return new Date(dateMs(dateStr)).getUTCDay() || 7; // Mon=1 … Sun=7
}
/** Monday (ISO) of the week containing dateStr. */
export function mondayOf(dateStr: string): string {
  return addDays(dateStr, -(isoWeekday(dateStr) - 1));
}
/** Last calendar date 'YYYY-MM-DD' of a 'YYYY-MM' month (for clamping week nav). */
export function lastDateOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return fmtDate(Date.UTC(y, m, 0)); // day 0 of the next month = last day of this one
}
/** Epoch ms of a slot start in VN wall-clock (fixed +07:00) — mirror of the server. */
export function slotStartMs(dateStr: string, startMin: number): number {
  return Date.parse(`${dateStr}T${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}:00+07:00`);
}

/**
 * Assign each session its #N order within its class — chronological by (date, start),
 * contiguous 1..N per class. Mirror of buildProgramState's seqMap (program-state.js) so
 * the admin Schedule shows the same #N a PIC sees. Pass ALL of the loaded sessions; the
 * ranking is per classCode, so unrelated classes don't interfere.
 */
export function assignSequenceByClass(sessions: ProgramSession[]): ProgramSession[] {
  const byClass = new Map<string, ProgramSession[]>();
  for (const s of sessions) {
    const arr = byClass.get(s.classCode);
    if (arr) arr.push(s); else byClass.set(s.classCode, [s]);
  }
  const seq = new Map<string, number>();
  for (const arr of byClass.values()) {
    [...arr]
      .sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date.localeCompare(b.date)))
      .forEach((s, i) => seq.set(s.sessionId, i + 1));
  }
  return sessions.map((s) => ({ ...s, sequence: seq.get(s.sessionId) ?? null }));
}

export function buildProgramWeek(params: {
  monday: string;
  program: ProgramConfig;
  sessions: ProgramSession[];
  blackouts: ProgramBlackoutCell[];
  myClassCodes: string[];
  nowMs: number;
  // Registration window (PIC view). When provided, empty cells outside the window are
  // 'closed' instead of 'bookable'. Omit (admin Schedule) to keep every empty cell open.
  window?: { bookingMonth: string | null; open: boolean };
}): ProgramWeek {
  const { monday, program, sessions, blackouts, myClassCodes, nowMs, window: win } = params;
  const mine = new Set(myClassCodes);
  const sessionByKey = new Map(sessions.map((s) => [s.sessionId, s]));
  const blackoutKeys = new Set(blackouts.map((b) => `${b.date}_${b.startMin}`));

  // Columns: the configured weekdays, in Mon→Sun order, mapped to this week's dates.
  const days: GridDay[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const weekday = offset + 1;
    if (!program.weekdays.includes(weekday)) continue;
    days.push({ date: addDays(monday, offset), weekday, label: DOW[weekday] });
  }

  const rows = program.timeSlots.map((slot) => ({
    startMin: slot.startMin,
    endMin: slot.endMin,
    label: slot.label,
    cells: days.map((day): GridCell => {
      const key = `${day.date}_${slot.startMin}`;
      const session = sessionByKey.get(key) ?? null;
      let state: CellState;
      if (session) state = mine.has(session.classCode) ? 'mine' : 'taken';
      else if (blackoutKeys.has(key)) state = 'blackout';
      else if (slotStartMs(day.date, slot.startMin) <= nowMs) state = 'past';
      else if (win && (!win.open || day.date.slice(0, 7) !== win.bookingMonth)) state = 'closed';
      else state = 'bookable';
      return { key, date: day.date, startMin: slot.startMin, endMin: slot.endMin, state, session };
    }),
  }));

  return { monday, days, rows };
}
