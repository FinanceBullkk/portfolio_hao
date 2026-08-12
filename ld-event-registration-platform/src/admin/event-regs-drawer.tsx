import type { EventDoc } from '../lib/types';
import { EventRegistrationsPanel } from './event-registrations-panel';

// Read-only-ish "Registrations" drawer for one event: a thin chrome around
// EventRegistrationsPanel (the BU-grouped roster with export + remove). Kept separate from
// the event EDIT drawer so each file owns one drawer.
export function EventRegsDrawer({
  adminEmail, event, onClose,
}: { adminEmail: string; event: EventDoc; onClose: () => void }) {
  return (
    <div className="drawer-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer" style={{ maxWidth: 640, width: '92vw' }}>
        <div className="drawer-hd">
          <div>
            <div className="dt">Registrations · {event.name}</div>
            <div className="ds">Grouped by BU · export or remove</div>
          </div>
          <button type="button" className="drawer-x" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-bd">
          <EventRegistrationsPanel adminEmail={adminEmail} event={event} />
        </div>
        <div className="drawer-ft"><button type="button" className="btn ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
