import { minToHHmm, type EventDoc, type EventRegistration } from '../../lib/types';
import { computeDeadline } from '../../booking/booking-utils';
import { formatDateWeekdayShort } from '../../lib/format-date';

// Single owner of the dark app's per-event DISPLAY derivation (mirrors the prototype's
// build()). The list card and the detail page both read this — neither re-derives counts
// (constitution Principle III). Server-authoritative numbers (remaining / registered) are
// passed straight through; this only formats them (Principle I).

export interface EventDisplay {
  slotted: boolean;
  registered: boolean;
  full: boolean;
  closed: boolean;
  /** Gated event the signed-in user is NOT allowlisted for → shown but register-locked. */
  eligibilityLocked: boolean;
  capacity: number;
  remaining: number;
  registeredCount: number;
  fillPct: number;
  category: string;
  timeLabel: string;   // 'HH:mm' (card row)
  dateLong: string;    // 'Fri 10/07' (weekday + dd/MM; year only when not the current year)
  timeRange: string;   // 'HH:mm – HH:mm'
  location: string;    // 'Onsite · Room A12'
  statusKind: 'reg' | 'open' | 'full' | 'closed';
  statusLabel: string;
  social: string;      // 'N registered · M spots left'
  primaryLabel: string;
  deadlineText: string;     // frame-agnostic duration, coarsened far out: '6 months' / '3 weeks' / '5 days' / '45m' / ''
  deadlinePassed: boolean;
}

// Coarsen a far-off deadline so we don't render false precision like "172d 2h" — nobody
// tracks the 2 hours 6 months out. Same-day (days === 0) returns '' so the caller keeps
// the hour/minute text where that urgency actually matters.
function coarseDuration(days: number): string {
  if (days >= 60) { const m = Math.round(days / 30); return `${m} month${m === 1 ? '' : 's'}`; }
  if (days >= 14) { const w = Math.round(days / 7); return `${w} week${w === 1 ? '' : 's'}`; }
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`;
  return '';
}

export function deriveEvent(ev: EventDoc, registration?: EventRegistration): EventDisplay {
  const slotted = ev.type === 'slotted';
  const registered = Boolean(registration);
  const capacity = ev.capacity ?? 0;
  const remaining = Math.max(0, ev.remaining ?? 0);
  const registeredCount = ev.registered ?? Math.max(0, capacity - remaining);
  const dl = computeDeadline(ev.deadline, '', ev.deadlinePassed, 0);
  const deadlinePassed = ev.deadlinePassed || dl?.passed === true;
  const full = !slotted && remaining <= 0;
  const closed = !ev.allowEnrollment || deadlinePassed;
  // Gated event this user isn't on the allowlist for: visible but register-locked.
  const eligibilityLocked = ev.requireEligibility === true && ev.eligible === false;

  // Pill must agree with the CTA: a past/closed event's CTA reads "Registration closed", so
  // the pill can't still say "open". `closed` (deadline passed / enrollment off) outranks the
  // open label; `full` outranks it too (a full seat count is the more useful reason).
  const statusKind: 'reg' | 'open' | 'full' | 'closed' = registered ? 'reg' : full ? 'full' : closed ? 'closed' : 'open';
  const statusLabel = registered ? 'Registered'
    : full ? 'Full'
      : closed ? 'Registration closed'
        : slotted ? 'Slots open'
          : `${remaining} ${remaining === 1 ? 'spot' : 'spots'} left`;

  const social = slotted
    ? `${registeredCount} registered`
    : `${registeredCount} registered · ${full ? 'full' : `${remaining} spots left`}`;

  return {
    slotted, registered, full, closed, eligibilityLocked, capacity, remaining, registeredCount,
    fillPct: capacity > 0 ? Math.min(100, Math.round((registeredCount / capacity) * 100)) : 0,
    category: (ev.category || '').trim() || (slotted ? 'Assessment' : 'Event'),
    timeLabel: ev.startMin != null ? minToHHmm(ev.startMin) : '',
    dateLong: ev.eventDate ? formatDateWeekdayShort(ev.eventDate) : (slotted ? 'Multiple times' : 'Date to be confirmed'),
    timeRange: ev.startMin != null && ev.endMin != null ? `${minToHHmm(ev.startMin)} – ${minToHHmm(ev.endMin)}` : '',
    location: ev.location
      ? `${ev.format === 'online' ? 'Online' : 'Onsite'} · ${ev.location}`
      : (ev.locationText || (slotted ? 'Onsite' : '')),
    statusKind, statusLabel, social,
    primaryLabel: slotted ? 'Choose a time' : 'Register to attend',
    deadlineText: dl && !dl.passed ? (coarseDuration(dl.daysLeft) || dl.text) : '',
    deadlinePassed,
  };
}
