import { describe, it, expect } from 'vitest';
import { groupEventsByDay } from '../events/dark/event-day-grouping';
import type { EventDoc } from '../lib/types';

function ev(p: Partial<EventDoc> & { eventId: string }): EventDoc {
  return {
    name: p.eventId, subtitle: '', category: '', type: 'simple',
    allowEnrollment: true, deadline: null, deadlinePassed: false,
    capacity: 10, remaining: 10, requireEligibility: false, emailConfirm: false,
    listed: true, archived: false, ...p,
  };
}

// Thursday 2026-06-18, local noon.
const NOW = new Date(2026, 5, 18, 12, 0, 0).getTime();

describe('groupEventsByDay', () => {
  it('buckets into upcoming/past and groups by calendar day', () => {
    const events = [
      ev({ eventId: 'a', eventDate: '2026-07-08', startMin: 540 }), // upcoming
      ev({ eventId: 'b', eventDate: '2026-07-08', startMin: 600 }), // same day, later
      ev({ eventId: 'c', eventDate: '2026-06-10' }),                // past
      ev({ eventId: 'd', type: 'slotted' }),                        // undated → upcoming, last
    ];
    const { upcoming, past } = groupEventsByDay(events, NOW);

    // Past holds the 2026-06-10 event.
    expect(past.map((g) => g.key)).toEqual(['2026-06-10']);
    expect(past[0].events.map((e) => e.eventId)).toEqual(['c']);

    // Upcoming: the Jul 8 day group (a before b by start time) then the 'tbd' group.
    const jul8 = upcoming.find((g) => g.key === '2026-07-08')!;
    expect(jul8.day).toBe('Jul 8');
    expect(jul8.weekday).toBe('Wednesday');
    expect(jul8.events.map((e) => e.eventId)).toEqual(['a', 'b']);
    expect(upcoming[upcoming.length - 1].key).toBe('tbd'); // undated always last
  });

  it('orders upcoming days ascending, past days descending', () => {
    const events = [
      ev({ eventId: 'soon', eventDate: '2026-07-01' }),
      ev({ eventId: 'later', eventDate: '2026-08-01' }),
      ev({ eventId: 'recent', eventDate: '2026-06-15' }),
      ev({ eventId: 'old', eventDate: '2026-05-01' }),
    ];
    const { upcoming, past } = groupEventsByDay(events, NOW);
    expect(upcoming.map((g) => g.key)).toEqual(['2026-07-01', '2026-08-01']);
    expect(past.map((g) => g.key)).toEqual(['2026-06-15', '2026-05-01']); // most recent first
  });

  it('is deterministic and handles empty input', () => {
    expect(groupEventsByDay([], NOW)).toEqual({ upcoming: [], past: [] });
  });
});
