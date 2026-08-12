import type { EventDoc, EventType, ExamParts } from './types';

// Client-side mirror of functions/event-shape.js normalizeEvent — the TS copy
// across the JS/TS runtime seam (same pattern as slot-helpers.ts ↔ slot-shape.js).
// Keep the field rules identical so admin reads match what the callables return.

const EVENT_TYPES: readonly EventType[] = ['simple', 'slotted'];
const EXAM_PARTS: readonly ExamParts[] = ['both', 'speaking', 'skills'];

/** Mirror of event-shape.js normalizeExamParts; unknown/absent → 'both'. */
export function normalizeExamParts(v: unknown): ExamParts {
  return typeof v === 'string' && (EXAM_PARTS as readonly string[]).includes(v) ? (v as ExamParts) : 'both';
}

function toIso(v: unknown): string | null {
  if (v && typeof v === 'object' && typeof (v as { toDate?: unknown }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof v === 'string' ? v : null;
}

export function eventFromDoc(id: string, data: Record<string, unknown>): EventDoc {
  const rawType = data.type;
  const type: EventType = typeof rawType === 'string' && (EVENT_TYPES as readonly string[]).includes(rawType)
    ? (rawType as EventType)
    : 'simple';
  const deadline = toIso(data.deadline);
  const capacity = typeof data.capacity === 'number' && Number.isFinite(data.capacity) ? data.capacity : null;
  const remaining = typeof data.remaining === 'number' && Number.isFinite(data.remaining) ? data.remaining : capacity;
  return {
    eventId: id,
    name: typeof data.name === 'string' ? data.name : '',
    subtitle: typeof data.subtitle === 'string' ? data.subtitle : '',
    category: typeof data.category === 'string' ? data.category : '',
    type,
    examParts: normalizeExamParts(data.examParts),
    allowEnrollment: data.allowEnrollment === true,
    deadline,
    deadlinePassed: deadline ? new Date() > new Date(deadline) : false,
    capacity,
    remaining,
    requireEligibility: data.requireEligibility === true,
    emailConfirm: data.emailConfirm === true,
    listed: data.listed !== false,
    archived: data.archived === true,
    // U1 schedule metadata — mirror functions/event-shape.js normalizeEvent.
    eventDate: typeof data.eventDate === 'string' ? data.eventDate : null,
    startMin: typeof data.startMin === 'number' && Number.isFinite(data.startMin) ? data.startMin : null,
    endMin: typeof data.endMin === 'number' && Number.isFinite(data.endMin) ? data.endMin : null,
    format: data.format === 'online' || data.format === 'onsite' ? data.format : null,
    location: typeof data.location === 'string' ? data.location : '',
  };
}
