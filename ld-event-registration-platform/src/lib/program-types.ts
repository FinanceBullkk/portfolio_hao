/**
 * Types for the Pronunciation Program (single-trainer booking vertical). Mirrors the
 * server shapes in functions/program-shape.js (normalizeProgram / normalizeClass /
 * normalizeSession). TS↔JS can't share a module, so the slot-key format and slot math
 * here are kept byte-identical with program-shape.js. Re-exported via the `types.ts` barrel.
 */

export type ProgramSessionMode = 'offline' | 'online';

/** Raw config slot in VN wall-clock, as HR edits it. */
export interface ProgramTimeSlotConfig {
  sh: number;
  sm: number;
  eh: number;
  em: number;
}

/** Normalized slot the grid renders (server-expanded from config). */
export interface ProgramTimeSlot {
  startMin: number;
  endMin: number;
  label: string;
}

export interface ProgramConfig {
  trainerName: string;
  timeSlots: ProgramTimeSlot[];
  weekdays: number[]; // 1=Mon … 5=Fri
  openMonth: string | null; // 'YYYY-MM'
  deadline: string | null;
  deadlinePassed?: boolean;
  fillMode: boolean;
  monthlyCap: number;
  weeklyCap: number;
}

export interface ProgramClass {
  code: string;
  name: string; // course name / level, e.g. "Foundation"
  bu: string;
  picEmail: string;
  expectedSize: number | null; // capacity, HR-set on the class (not per booking)
  active: boolean;
}

export interface ProgramSession {
  sessionId: string;
  classCode: string;
  courseName: string;
  bu: string;
  picEmail: string;
  date: string; // 'YYYY-MM-DD'
  startMin: number;
  endMin: number;
  mode: ProgramSessionMode; // always 'offline'
  participantCount: number | null; // inherited from the class's expectedSize
  topic: string;
  meetLink: string;
  gcalEventId: string;
  sequence: number | null; // #N within the class (chronological; server-derived)
  display: string;
}

export interface ProgramBlackoutCell {
  date: string; // 'YYYY-MM-DD'
  startMin: number;
}

/** Returned by the initProgram callable to render the grid (Phase 02/04). */
export interface ProgramInitResult {
  email: string;
  program: ProgramConfig;
  myClasses: ProgramClass[]; // classes the signed-in user is PIC of
  sessions: ProgramSession[]; // sessions in the open month (all classes — grid is shared)
  blackouts: ProgramBlackoutCell[]; // HR-blocked cells in the open month
  clientNow: string;
}

/** Result of a book/move/cancel program callable (mirrors EventActionResult). */
export interface ProgramActionResult {
  ok: boolean;
  warning?: string | null;
  error?: string;
  state?: ProgramInitResult;
}

/** The (date, slot) doc-id shared by session / slotClaim / blackout — mirror of slotKey(). */
export function programSlotKey(date: string, startMin: number): string {
  return `${date}_${startMin}`;
}

/** Convert a raw config slot to absolute minutes, or null if malformed — mirror of slotToMinutes(). */
export function slotConfigToMinutes(
  slot: ProgramTimeSlotConfig
): { startMin: number; endMin: number } | null {
  const ints = [slot?.sh, slot?.sm, slot?.eh, slot?.em];
  if (!ints.every((n) => Number.isInteger(n))) return null;
  if (slot.sh < 0 || slot.sh > 23 || slot.eh < 0 || slot.eh > 23) return null;
  if (slot.sm < 0 || slot.sm > 59 || slot.em < 0 || slot.em > 59) return null;
  const startMin = slot.sh * 60 + slot.sm;
  const endMin = slot.eh * 60 + slot.em;
  return endMin > startMin ? { startMin, endMin } : null;
}
