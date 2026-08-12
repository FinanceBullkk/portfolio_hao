import type { EventDoc } from '../../lib/types';

// Pure logic for the dark list's Luma-style timeline: bucket events into Upcoming / Past
// and group each into calendar-day sections (the left "Jun 30 / Tuesday" rail). `now` is
// passed in (never Date.now() here) so the output is deterministic and unit-testable.

export interface DayGroup {
  key: string; // 'YYYY-MM-DD' or 'tbd'
  day: string; // 'Jun 30'
  weekday: string; // 'Tuesday' ('' for undated)
  events: EventDoc[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Local epoch (ms) of an event's primary instant, or null when undated.
function eventEpoch(ev: EventDoc): number | null {
  if (ev.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(ev.eventDate)) {
    const [y, m, d] = ev.eventDate.split('-').map(Number);
    return new Date(y, m - 1, d, Math.floor((ev.startMin ?? 0) / 60), (ev.startMin ?? 0) % 60).getTime();
  }
  if (ev.deadline) { const t = Date.parse(ev.deadline); if (!Number.isNaN(t)) return t; }
  return null;
}

function dayKey(epoch: number): string {
  const d = new Date(epoch);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildGroups(items: { ev: EventDoc; epoch: number | null }[], dir: 1 | -1): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const { ev, epoch } of items) {
    if (epoch == null) {
      const g = map.get('tbd') || { key: 'tbd', day: 'Scheduling soon', weekday: '', events: [] };
      g.events.push(ev); map.set('tbd', g);
      continue;
    }
    const key = dayKey(epoch);
    let g = map.get(key);
    if (!g) {
      const d = new Date(epoch);
      g = { key, day: `${MONTHS[d.getMonth()]} ${d.getDate()}`, weekday: WEEKDAYS[d.getDay()], events: [] };
      map.set(key, g);
    }
    g.events.push(ev);
  }
  // Sort events within a day by their instant (asc).
  for (const g of map.values()) {
    g.events.sort((a, b) => (eventEpoch(a) ?? Infinity) - (eventEpoch(b) ?? Infinity) || a.name.localeCompare(b.name));
  }
  // Day order: upcoming ascending, past descending; 'tbd' always last.
  return Array.from(map.values()).sort((a, b) => {
    if (a.key === 'tbd') return 1;
    if (b.key === 'tbd') return -1;
    return a.key < b.key ? -dir : a.key > b.key ? dir : 0;
  });
}

export interface UpcomingSummary { open: number; closingSoon: number; }

// "Closing soon" = an open event whose registration deadline falls within this window.
const CLOSING_SOON_MS = 72 * 60 * 60 * 1000;

// Count how many upcoming events are still open for registration, and of those how many
// close within CLOSING_SOON_MS — so the hero can flag what needs action soon (F6). Mirrors
// deriveEvent's "closed" rule (no enrollment OR deadline passed); `now` is passed in.
export function summarizeUpcoming(events: EventDoc[], now: number): UpcomingSummary {
  let open = 0;
  let closingSoon = 0;
  for (const ev of events) {
    const dlMs = ev.deadline ? Date.parse(ev.deadline) : NaN;
    const passed = ev.deadlinePassed || (!Number.isNaN(dlMs) && dlMs <= now);
    if (!ev.allowEnrollment || passed) continue;
    // A gated event this user isn't allowlisted for is locked → not actionable for them.
    if (ev.requireEligibility && ev.eligible === false) continue;
    open += 1;
    if (!Number.isNaN(dlMs) && dlMs - now <= CLOSING_SOON_MS) closingSoon += 1;
  }
  return { open, closingSoon };
}

export function groupEventsByDay(events: EventDoc[], now: number): { upcoming: DayGroup[]; past: DayGroup[] } {
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const start = todayStart.getTime();
  const up: { ev: EventDoc; epoch: number | null }[] = [];
  const past: { ev: EventDoc; epoch: number | null }[] = [];
  for (const ev of events) {
    const epoch = eventEpoch(ev);
    if (epoch != null && epoch < start) past.push({ ev, epoch });
    else up.push({ ev, epoch });
  }
  return { upcoming: buildGroups(up, 1), past: buildGroups(past, -1) };
}
