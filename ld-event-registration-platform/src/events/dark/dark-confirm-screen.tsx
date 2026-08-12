import type { EventDoc } from '../../lib/types';
import { deriveEvent } from './event-display';
import { DarkNav, EventCover, IconCheck, type NavMenu } from './dark-chrome';

// Dark confirmation: an earned success state + View event / Back to events. We don't ship
// an "add to calendar" feature yet, so we don't show buttons for one (no fake controls).

export function DarkConfirmScreen({
  data, event, emailConfirm, onViewEvent, onDone, menu,
}: {
  data: { email: string };
  event: EventDoc;
  emailConfirm: boolean;
  onViewEvent: () => void;
  onDone: () => void;
  menu?: NavMenu;
}) {
  const d = deriveEvent(event);
  return (
    <div className="c7d">
      <DarkNav email={data.email} onHome={onDone} menu={menu} />
      <div className="c7d-wrap confirm" role="main">
        <div className="c7d-confirm">
          <span className="ring"><span className="disc"><IconCheck size={22} /></span></span>
          <h1>You’re registered</h1>
          <p className="sub">
            {emailConfirm
              ? <>A confirmation email is on the way to {data.email}. See you there.</>
              : <>You’re on the list — we’ll see you there.</>}
          </p>

          <div className="c7d-mini recap">
            <EventCover variant="mini" themeColor={event.themeColor} eventId={event.eventId} name={event.name} coverImageUrl={event.coverImageUrl} />
            <div><div className="t">{event.name}</div><div className="s">{d.dateLong}{d.location ? ` · ${d.location}` : ''}</div></div>
          </div>

          <div className="c7d-confirm-foot">
            <button type="button" className="c7d-btn ghost" onClick={onViewEvent}>View event</button>
            <button type="button" className="c7d-btn" onClick={onDone}>Back to events</button>
          </div>
        </div>
      </div>
    </div>
  );
}
