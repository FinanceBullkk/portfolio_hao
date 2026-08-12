import type { EventDoc, EventRegistration } from '../../lib/types';
import { eventTheme } from '../../lib/event-theme';
import { deriveEvent } from './event-display';
import { EventCover, StatusPill, FacePile, IconPin } from './dark-chrome';

// One event in the dark timeline list. Clicking the card opens the detail surface
// (the gateway — never the form directly). Counts come from deriveEvent (server-owned).

export function DarkEventCard({
  event, registration, onOpen,
}: { event: EventDoc; registration?: EventRegistration; onOpen: () => void }) {
  const d = deriveEvent(event, registration);
  const th = eventTheme(event.themeColor, event.eventId);
  const org = event.organizerBu || 'Team L&D';
  const orgInitials = (event.organizerBu ? event.organizerBu.replace(/[^A-Za-z]/g, '').slice(0, 2) : 'LD').toUpperCase() || 'LD';

  return (
    <button type="button" className="c7d-card" onClick={onOpen}>
      <div className="c7d-card-main">
        <div className="c7d-card-row">
          <span className="c7d-time">{d.timeLabel || d.dateLong}</span>
          <span className="c7d-chip" style={{ color: th.accent }}>{d.category}</span>
        </div>
        <h2>{event.name}</h2>
        <div className="c7d-org">
          <span className="c7d-org-av" style={{ background: th.orgBg, color: th.accent }}>{orgInitials}</span>
          <span className="c7d-org-by">By {org}</span>
        </div>
        {d.location && <div className="c7d-loc"><IconPin size={14} />{d.location}</div>}
        <div className="c7d-status">
          {d.eligibilityLocked
            ? <StatusPill kind="lock" label="Not eligible" />
            : <StatusPill kind={d.statusKind} label={d.statusLabel} />}
          {d.registeredCount > 0 && !d.eligibilityLocked && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <FacePile count={d.registeredCount} />
              {/* Plain count, not "+N": the facepile silhouettes are decorative, so a "+N"
                  read as "N more beyond the dots". State the real total unambiguously. */}
              <span className="c7d-plus">{d.registeredCount} going</span>
            </span>
          )}
        </div>
      </div>
      <EventCover variant="thumb" themeColor={event.themeColor} eventId={event.eventId} name={event.name} coverImageUrl={event.coverImageUrl} />
    </button>
  );
}
