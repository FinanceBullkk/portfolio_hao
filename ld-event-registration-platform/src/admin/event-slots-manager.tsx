import type { EventDoc } from '../lib/types';
import { EventSlotsPanel } from './event-slots-panel';

// Drawer wrapper around EventSlotsPanel, opened from the Events tab row action.
// The same panel also powers the top-level event-scoped Slots tab.

export function EventSlotsManager({
  adminEmail, event, onClose,
}: { adminEmail: string; event: EventDoc; onClose: () => void }) {
  return (
    <div className="drawer-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer" style={{ maxWidth: 720, width: '92vw' }}>
        <div className="drawer-hd">
          <div>
            <div className="dt">Slots · {event.name}</div>
            <div className="ds">Add / edit / delete timed slots</div>
          </div>
          <button type="button" className="drawer-x" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-bd">
          <EventSlotsPanel adminEmail={adminEmail} event={event} />
        </div>
        <div className="drawer-ft"><button type="button" className="btn ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
