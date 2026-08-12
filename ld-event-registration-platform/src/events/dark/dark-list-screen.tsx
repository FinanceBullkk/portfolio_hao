import { useState, type ReactNode } from 'react';
import type { EventsInitResult } from '../../lib/types';
import { eventTheme } from '../../lib/event-theme';
import { DarkNav, EventCover, StatusPill, IconPin, IconClock, type NavMenu } from './dark-chrome';
import { DarkEventCard } from './dark-event-card';
import { groupEventsByDay, summarizeUpcoming, type DayGroup } from './event-day-grouping';

// The dark "Events" list — a Luma-style day-grouped timeline. Tapping a card opens the
// detail surface. The recurring Pronunciation Program stays a distinct vertical, shown as
// its own card at the top (it has no single date), opening the program grid.

function TimelineRow({ day, weekday, children }: { day: string; weekday: string; children: ReactNode }) {
  return (
    <div className="c7d-day">
      <div><div className="c7d-day-d">{day}</div>{weekday && <div className="c7d-day-w">{weekday}</div>}</div>
      <div className="c7d-rail"><span className="node" /></div>
      <div className="c7d-cards">{children}</div>
    </div>
  );
}

function ProgramCard({ onOpen }: { onOpen: () => void }) {
  const th = eventTheme('blue', 'program');
  return (
    <button type="button" className="c7d-card" onClick={onOpen}>
      <div className="c7d-card-main">
        <div className="c7d-card-row">
          <span className="c7d-time">Recurring</span>
          <span className="c7d-chip" style={{ color: th.accent }}>PROGRAM</span>
        </div>
        <h2>English Pronunciation Program</h2>
        <div className="c7d-org">
          <span className="c7d-org-av" style={{ background: th.orgBg, color: th.accent }}>LD</span>
          <span className="c7d-org-by">By Team L&amp;D</span>
        </div>
        <div className="c7d-loc"><IconPin size={14} />Onsite · 1:1 with the trainer</div>
        <div className="c7d-status"><StatusPill kind="open" label="Booking open" /></div>
      </div>
      <EventCover variant="thumb" themeColor="blue" eventId="program" name="Aa" />
    </button>
  );
}

export function DarkListScreen({
  data, now, onOpenEvent, onOpenProgram, menu,
}: {
  data: EventsInitResult;
  now: number;
  onOpenEvent: (id: string) => void;
  onOpenProgram?: () => void;
  menu?: NavMenu;
}) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const { upcoming, past } = groupEventsByDay(data.events, now);
  const groups: DayGroup[] = tab === 'upcoming' ? upcoming : past;
  const upcomingCount = upcoming.reduce((n, g) => n + g.events.length, 0);
  // F6: surface what needs action soon (open count + how many close within 72h).
  const urgency = summarizeUpcoming(data.events, now);
  // F17: a real, visible path to history — count the user's own registrations.
  const myCount = Object.keys(data.myRegistrations).length;

  return (
    <div className="c7d">
      <DarkNav email={data.email} onHome={() => setTab('upcoming')} menu={menu} />
      <div className="c7d-wrap">
        {/* Brand hero — a Luma-style banner (mesh-gradient glow) so the first screen lands
            with identity, not just a heading. The Upcoming/Past toggle lives inside it. */}
        <header className="c7d-hero">
          <span className="c7d-hero-glow" aria-hidden="true" />
          <div className="c7d-hero-in">
            <div className="c7d-hero-eyebrow">CyberLogitec · Learning &amp; Development</div>
            <h1>Events</h1>
            <div className="sub">Internal programs, assessments &amp; workshops — register in a tap.</div>
            <div className="c7d-hero-foot">
              <div className="c7d-seg">
                <button type="button" className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Upcoming</button>
                <button type="button" className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>Past</button>
              </div>
              <div className="c7d-hero-actions">
                {tab === 'upcoming' && upcomingCount > 0 && (
                  <span className="c7d-hero-count">
                    <span className="dot" />
                    {urgency.open > 0 ? <>{urgency.open} open</> : <>{upcomingCount} upcoming</>}
                    {urgency.closingSoon > 0 && <> · <b className="soon">{urgency.closingSoon} closing soon</b></>}
                  </span>
                )}
                {menu?.onViewHistory && (
                  <button type="button" className="c7d-hero-mine" onClick={menu.onViewHistory}>
                    My registrations{myCount > 0 ? ` · ${myCount}` : ''}
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {tab === 'upcoming' && onOpenProgram && (
          <TimelineRow day="Program" weekday="Ongoing"><ProgramCard onOpen={onOpenProgram} /></TimelineRow>
        )}

        {groups.length === 0 && tab === 'past' ? (
          <div className="c7d-empty">
            <span className="ic"><IconClock size={20} /></span>
            <h2>No past events yet</h2>
            <p>Events you’ve attended will show up here.</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="c7d-empty">
            <span className="ic"><IconClock size={20} /></span>
            <h2>No upcoming events</h2>
            <p>Please check back later — new programs are added regularly.</p>
          </div>
        ) : (
          groups.map((g) => (
            <TimelineRow key={g.key} day={g.day} weekday={g.weekday}>
              {g.events.map((ev) => (
                <DarkEventCard key={ev.eventId} event={ev} registration={data.myRegistrations[ev.eventId]} onOpen={() => onOpenEvent(ev.eventId)} />
              ))}
            </TimelineRow>
          ))
        )}
      </div>
    </div>
  );
}
