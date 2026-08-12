/**
 * Types for the multi-purpose EVENT platform (simple + slotted registration) and the
 * read-only "My registrations" history. Mirrors the server shapes in
 * functions/event-shape.js / my-registrations.js. Re-exported via the `types.ts` barrel.
 */

import type { Slot, UserProfile } from './types-core';

export type EventType = 'simple' | 'slotted';

// Required exam parts for a SLOTTED event (mirror functions/event-shape.js EXAM_PARTS).
// 'both' = Speaking + 3 Skills (default → legacy events unchanged), 'speaking' = Speaking
// only, 'skills' = 3 Skills only. Derive per-part flags: needsSpeaking = examParts !==
// 'skills'; needsSkills = examParts !== 'speaking'.
export type ExamParts = 'both' | 'speaking' | 'skills';

export interface EventDoc {
  eventId: string;
  name: string;
  subtitle: string;
  /** Short program label shown as the card eyebrow chip (e.g. "Training", "Assessment"). */
  category: string;
  type: EventType;
  // Required exam parts for slotted events (default 'both'). Optional on the type so
  // fixtures/partials needn't set it — normalizeEvent / eventFromDoc populate it at runtime.
  examParts?: ExamParts;
  allowEnrollment: boolean;
  deadline: string | null;
  deadlinePassed: boolean;
  capacity: number | null;
  remaining: number | null;
  requireEligibility: boolean;
  emailConfirm: boolean;
  listed: boolean;
  archived: boolean;
  // U1 schedule metadata (simple events; null until an admin fills them in).
  // Optional on the type so fixtures/partials needn't set them — the server's
  // normalizeEvent and the client's eventFromDoc always populate them at runtime.
  eventDate?: string | null; // 'YYYY-MM-DD'
  startMin?: number | null; // minutes-of-day
  endMin?: number | null;
  format?: 'onsite' | 'online' | null;
  location?: string;
  // Luma-style presentation metadata (optional; '' when unset). The cover binary
  // lives in Firebase Storage — only the download URL is stored. organizerBu is a BU
  // name from config/main.buList (never a personal host). description is markdown.
  coverImageUrl?: string;
  organizerBu?: string;
  description?: string;
  locationText?: string;
  // Preset theme-color KEY (event-shape.js EVENT_THEME_COLORS / event-theme.ts), not raw
  // CSS. '' / unset → neutral default. Used as a light accent on the card + detail.
  themeColor?: string;
  // Server-computed registration count (simple events) = capacity − remaining; null
  // for slotted / capacity-less. Display only — counts stay server-authoritative.
  registered?: number | null;
  // Per-user eligibility for THIS event (server-computed at init). Only meaningful when
  // requireEligibility is true: `false` = the signed-in user's empCode is NOT on the
  // allowlist → the event is shown but LOCKED (register disabled, "contact organizers").
  // `true`/absent = open to this user (or the event isn't gated). Never reveals who else
  // is on the allowlist — the user only learns their own status.
  eligible?: boolean;
  // Per-type slot availability summary (slotted events; server-computed at init).
  slotTypes?: SlotTypeSummary[];
}

export interface SlotTypeSummary {
  type: string; // 'Speaking' | '3 Skills' | …
  durationMin: number;
  openCount: number; // slots with remaining > 0
  total: number;
}

export interface EventRegistration {
  eventId: string;
  empCode: string;
  fullName: string;
  bu: string;
  slotId?: string | null;
  createdAt: string | null;
}

export interface EventsInitResult {
  email: string;
  events: EventDoc[];
  programEligible: boolean;
  myRegistrations: Record<string, EventRegistration>; // keyed by eventId
  profile?: UserProfile | null;
  buList: string[];
  clientNow: string;
}

// ── My registrations (read-only history) ──────────────────────────────────
// Mirrors functions/my-registrations.js buildMyRegistrations. Unlike
// EventsInitResult.myRegistrations (visible events only), this spans EVERY event
// the user registered in — including archived/closed — so a finished booking
// stays viewable. `slots` carries the resolved schedule for slotted events.

export type MyRegistrationStatus = 'open' | 'closed' | 'archived';

export interface MyRegistrationEntry {
  eventId: string;
  eventName: string;
  eventSubtitle: string;
  category: string;
  type: EventType;
  status: MyRegistrationStatus;
  archived: boolean;
  deadline: string | null;
  empCode: string;
  fullName: string;
  bu: string;
  createdAt: string | null;
  slots: Slot[] | null; // null for simple events; Speaking + 3 Skills for slotted
}

export interface MyRegistrationsResult {
  email: string;
  registrations: MyRegistrationEntry[];
}

export interface EventRegisterPayload {
  eventId: string;
  empCode: string;
  fullName: string;
  bu: string;
}

export interface EventActionResult {
  ok: boolean;
  error?: string;
  state?: EventsInitResult;
}
