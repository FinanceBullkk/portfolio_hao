const EVENT_PATH_PREFIX = '/events/';
const PROGRAM_PATH = '/programs/pronunciation';
const APP_EVENT_STATE = 'corgi-navigation';

// The public runtime is served as a nested static file, so changing its
// pathname to /events/... would make a refresh request a file that does not
// exist. Keep the real app's clean paths, but use a hash only for that runtime.
function isRuntimeDemo(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.runtimeDemo === 'true';
}

function runtimeHashPath(): string {
  return isRuntimeDemo() && typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
}

function parseEventPath(pathname: string): string | null {
  if (!pathname.startsWith(EVENT_PATH_PREFIX)) return null;
  const segment = pathname.slice(EVENT_PATH_PREFIX.length);
  if (!segment || segment.includes('/')) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function eventPath(eventId: string): string {
  return `${EVENT_PATH_PREFIX}${encodeURIComponent(eventId)}`;
}

export function eventIdFromPath(pathname: string): string | null {
  return parseEventPath(pathname) ?? parseEventPath(runtimeHashPath());
}

export function pushEventPath(eventId: string): void {
  const target = isRuntimeDemo()
    ? `${window.location.pathname}${window.location.search}#${eventPath(eventId)}`
    : eventPath(eventId);
  window.history.pushState({ source: APP_EVENT_STATE, eventId }, '', target);
}

export function isProgramPath(pathname: string): boolean {
  return pathname === PROGRAM_PATH || runtimeHashPath() === PROGRAM_PATH;
}

export function pushProgramPath(): void {
  const target = isRuntimeDemo()
    ? `${window.location.pathname}${window.location.search}#${PROGRAM_PATH}`
    : PROGRAM_PATH;
  window.history.pushState({ source: APP_EVENT_STATE, programId: 'pronunciation' }, '', target);
}

export function replaceWithEventList(): void {
  const target = isRuntimeDemo() ? `${window.location.pathname}${window.location.search}` : '/';
  window.history.replaceState({ source: APP_EVENT_STATE }, '', target);
}

export function returnToEventList(): boolean {
  if (window.history.state?.source !== APP_EVENT_STATE) {
    replaceWithEventList();
    return false;
  }
  window.history.back();
  return true;
}
