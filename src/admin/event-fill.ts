import type { EventDoc } from '../lib/types';
import type { EventStat } from '../lib/adminDb';

// Pure derivation helpers for the admin Events lifecycle cards. Keeping the math
// out of the component makes the card presentational and the rules testable.

export type Lifecycle = 'active' | 'closed' | 'archived';

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

/** Bucket an event by its lifecycle for grouped display. */
export function lifecycleOf(ev: EventDoc): Lifecycle {
  if (ev.archived) return 'archived';
  const simpleFull = ev.type === 'simple' && ev.capacity != null && (ev.remaining ?? 0) <= 0;
  if (!ev.allowEnrollment || ev.deadlinePassed || simpleFull) return 'closed';
  return 'active';
}

/** Capacity fill colour ramp — mirrors the mockup (≥100 danger, ≥80 warn, else brand). */
export function fillColor(pct: number): string {
  if (pct >= 100) return 'var(--danger-500)';
  if (pct >= 80) return 'var(--warn-600)';
  return 'var(--brand-500)';
}

export function pct(booked: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((booked / capacity) * 100));
}

export interface EnrollBadge {
  label: string;
  tone: 'open' | 'closed' | 'ended';
}

export function enrollBadge(ev: EventDoc): EnrollBadge {
  if (ev.archived) return { label: 'Ended', tone: 'ended' };
  if (!ev.allowEnrollment || ev.deadlinePassed) return { label: 'Closed', tone: 'closed' };
  return { label: 'Open', tone: 'open' };
}

/** Is enrollment EFFECTIVELY open? (flag on, deadline not passed, not archived).
 *  This is the state the inline toggle shows — not the raw `allowEnrollment` flag. */
export function enrollmentOpen(ev: EventDoc): boolean {
  return !ev.archived && ev.allowEnrollment && !ev.deadlinePassed;
}

export interface EnrollmentToggle {
  /** Fields to merge into the upsert payload to flip enrollment. */
  patch: { allowEnrollment: boolean; deadline?: string | null };
  /** The click opens enrollment (drives the success toast wording). */
  opening: boolean;
  /** A past deadline was cleared so the reopen actually takes effect. */
  clearedDeadline: boolean;
}

/** Build the upsert patch when the toggle is clicked. The toggle reflects the
 *  EFFECTIVE state (`enrollmentOpen`), so a click targets the opposite. Reopening
 *  a deadline-passed event also clears that (already-elapsed) deadline — otherwise
 *  the server re-derives `deadlinePassed` and the reopen is a silent no-op.
 *  Closing just lowers the flag and leaves any future deadline intact. */
export function enrollmentTogglePatch(ev: EventDoc): EnrollmentToggle {
  if (enrollmentOpen(ev)) return { patch: { allowEnrollment: false }, opening: false, clearedDeadline: false };
  const clearedDeadline = ev.deadlinePassed === true;
  return {
    patch: { allowEnrollment: true, ...(clearedDeadline ? { deadline: null } : {}) },
    opening: true,
    clearedDeadline,
  };
}

export interface DeadlineInfo {
  label: string;
  /** ≤ 2 days remaining — render in danger colour. */
  urgent: boolean;
  passed: boolean;
}

/** Build the deadline pill text + urgency. Archived events hide their deadline. */
export function deadlineInfo(ev: EventDoc, now: number): DeadlineInfo | null {
  if (ev.archived || !ev.deadline) return null;
  const t = new Date(ev.deadline).getTime();
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const dm = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (ev.deadlinePassed || t <= now) return { label: `Closed ${dm}`, urgent: false, passed: true };
  const days = Math.ceil((t - now) / 86_400_000);
  const tail = days <= 0 ? 'today' : days === 1 ? '1 day' : `${days} days`;
  return { label: `Closes ${dm} · ${tail}`, urgent: days <= 2, passed: false };
}

export interface SimpleFill {
  kind: 'simple';
  label: string;
  pct: number;
  color: string;
  full: boolean;
}

export interface SlottedFill {
  kind: 'slotted';
  regLabel: string;
  speaking: { pct: number; label: string } | null;
  skills: { pct: number; label: string } | null;
  /** stat not loaded yet — render a placeholder. */
  pending: boolean;
}

export type FillView = SimpleFill | SlottedFill;

/** Derive the fill view a card renders. Simple uses the event doc; slotted uses
 *  the fetched stat. `statsReady` distinguishes "still loading" (show a spinner
 *  label) from "stats settled but this event has none" (fetch failed for it) so
 *  a slotted card never gets stuck on "Loading…". */
export function fillView(ev: EventDoc, stat: EventStat | undefined, statsReady = false): FillView {
  if (ev.type === 'simple') {
    const cap = ev.capacity ?? 0;
    const used = cap > 0 ? Math.max(0, cap - (ev.remaining ?? 0)) : 0;
    const p = pct(used, cap);
    const full = cap > 0 && used >= cap;
    return {
      kind: 'simple',
      label: cap > 0 ? `${used} / ${cap}${full ? ' · full' : ''}` : '— / —',
      pct: p,
      color: ev.archived ? 'var(--ink-300)' : fillColor(p),
      full,
    };
  }
  if (!stat) {
    return {
      kind: 'slotted',
      regLabel: statsReady ? 'Fill unavailable' : 'Loading fill…',
      speaking: null, skills: null,
      pending: !statsReady,
    };
  }
  const part = (f?: { capacity: number; booked: number }) =>
    f && f.capacity > 0 ? { pct: pct(f.booked, f.capacity), label: `${f.booked}/${f.capacity}` } : null;
  const n = stat.registrations;
  return {
    kind: 'slotted',
    regLabel: `${n} registration${n === 1 ? '' : 's'}`,
    speaking: part(stat.speaking),
    skills: part(stat.skills),
    pending: false,
  };
}
