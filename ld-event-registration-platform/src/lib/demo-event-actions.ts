import type { EventRegistration, EventsInitResult, UserProfile } from './types';

/** Immutable state transitions used only by the public, no-backend demo mode. */
export function registerDemoEvent(data: EventsInitResult, eventId: string, profile: UserProfile): EventsInitResult {
  const event = data.events.find((item) => item.eventId === eventId);
  if (!event || data.myRegistrations[eventId]) return data;
  const now = new Date().toISOString();
  const registration: EventRegistration = {
    eventId,
    empCode: profile.empCode,
    fullName: profile.fullName,
    bu: profile.bu,
    createdAt: now,
  };
  return {
    ...data,
    events: data.events.map((item) => item.eventId !== eventId ? item : {
      ...item,
      remaining: typeof item.remaining === 'number' ? Math.max(0, item.remaining - 1) : item.remaining,
      registered: typeof item.registered === 'number' ? item.registered + 1 : item.registered,
    }),
    myRegistrations: { ...data.myRegistrations, [eventId]: registration },
    clientNow: now,
  };
}

export function cancelDemoEvent(data: EventsInitResult, eventId: string): EventsInitResult {
  if (!data.myRegistrations[eventId]) return data;
  const { [eventId]: _removed, ...remainingRegistrations } = data.myRegistrations;
  return {
    ...data,
    events: data.events.map((item) => item.eventId !== eventId ? item : {
      ...item,
      remaining: typeof item.remaining === 'number' ? item.remaining + 1 : item.remaining,
      registered: typeof item.registered === 'number' ? Math.max(0, item.registered - 1) : item.registered,
    }),
    myRegistrations: remainingRegistrations,
    clientNow: new Date().toISOString(),
  };
}
