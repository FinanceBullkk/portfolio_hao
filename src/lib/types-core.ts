/**
 * Shared primitives used across every booking domain (assessment, event, program):
 * the Slot/SlotType shape, the employee UserProfile, and the small time helpers. Domain
 * type files (assessment-types / event-types / program-types) build on these; the
 * `types.ts` barrel re-exports everything so callers keep importing from '../lib/types'.
 */

export type SlotType = 'Speaking' | '3 Skills';

export interface Slot {
  slotId: string;
  type: SlotType;
  date: string;
  session?: string;
  startMin: number;
  endMin: number;
  capacity: number;
  remaining: number;
  location: string;
  display: string;
}

export interface UserProfile {
  empCode: string;
  fullName: string;
  bu: string;
}

/** Minimal shape the overlap test needs — any Slot satisfies it. */
export type TimeRange = Pick<Slot, 'date' | 'startMin' | 'endMin'>;

/** Two ranges clash when they share a day and their [start,end) intervals intersect. */
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.date === b.date && a.startMin < b.endMin && a.endMin > b.startMin;
}

// Date-only key (YYYY-MM-DD) → dd/MM/yyyy. Thin alias over the canonical
// formatter so the whole app shares one implementation (audit P0-1).
export { formatDate as formatDateVi } from './format-date';

export function minToHHmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
