const EVENT_PATH_PREFIX = '/events/';
const PROGRAM_PATH = '/programs/pronunciation';
const APP_EVENT_STATE = 'corgi-navigation';

export function eventPath(eventId: string): string {
  return `${EVENT_PATH_PREFIX}${encodeURIComponent(eventId)}`;
}

export function eventIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith(EVENT_PATH_PREFIX)) return null;
  const segment = pathname.slice(EVENT_PATH_PREFIX.length);
  if (!segment || segment.includes('/')) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function pushEventPath(eventId: string): void {
  window.history.pushState({ source: APP_EVENT_STATE, eventId }, '', eventPath(eventId));
}

export function isProgramPath(pathname: string): boolean {
  return pathname === PROGRAM_PATH;
}

export function pushProgramPath(): void {
  window.history.pushState({ source: APP_EVENT_STATE, programId: 'pronunciation' }, '', PROGRAM_PATH);
}

export function replaceWithEventList(): void {
  window.history.replaceState({ source: APP_EVENT_STATE }, '', '/');
}

export function returnToEventList(): boolean {
  if (window.history.state?.source !== APP_EVENT_STATE) {
    replaceWithEventList();
    return false;
  }
  window.history.back();
  return true;
}
