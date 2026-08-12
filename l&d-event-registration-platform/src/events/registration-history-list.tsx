import type { MyRegistrationEntry, MyRegistrationStatus, Slot } from '../lib/types';
import { formatDateVi, minToHHmm } from '../lib/types';
import { formatDate } from '../lib/format-date';

// Presentational, read-only list of registration history entries. Shared by the
// user-facing "My registrations" screen and the admin "User lookup" tab so the
// card layout / status badges / slot schedule render identically in both.
//
// `onManage` is optional: the user screen passes it for still-open events (jump
// straight into the edit/booking flow); the admin view omits it (view-only).

const STATUS_LABEL: Record<MyRegistrationStatus, string> = {
  open: 'Open',
  closed: 'Closed',
  archived: 'Archived',
};

function StatusBadge({ status }: { status: MyRegistrationStatus }) {
  return <span className={`mr-badge ${status}`}>{STATUS_LABEL[status]}</span>;
}

function SlotLine({ slot }: { slot: Slot }) {
  return (
    <li className="mr-slot">
      <span className="mr-slot-type">{slot.type}</span>
      <span className="mr-slot-when">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        {formatDateVi(slot.date)} · {minToHHmm(slot.startMin)}–{minToHHmm(slot.endMin)}
      </span>
      {slot.location && <span className="mr-slot-loc">{slot.location}</span>}
    </li>
  );
}

function RegistrationCard({ entry, onManage, showIdentity }: { entry: MyRegistrationEntry; onManage?: () => void; showIdentity: boolean }) {
  const registeredOn = entry.createdAt
    ? formatDate(entry.createdAt)
    : null;
  return (
    <div className={`mr-card status-${entry.status}`}>
      <div className="mr-card-hd">
        <div className="mr-card-ttl">
          <span className="mr-cat">{entry.category?.trim() || (entry.type === 'slotted' ? 'Slot-based' : 'Registration')}</span>
          <h2>{entry.eventName}</h2>
          {entry.eventSubtitle && <p>{entry.eventSubtitle}</p>}
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {(showIdentity || entry.type === 'slotted') && (
        <div className="mr-card-bd">
          {/* Identity is hidden on the user's own history (it's always them — F18); the
              admin User-lookup view keeps it (showIdentity defaults true). */}
          {showIdentity && (
            <div className="mr-identity">
              <span className="av">{(entry.fullName || entry.empCode || '?').slice(0, 2).toUpperCase()}</span>
              <div className="t">
                <b>{entry.fullName || '—'}</b>
                <span className="s">{entry.empCode}{entry.bu ? ` · ${entry.bu}` : ''}</span>
              </div>
            </div>
          )}

          {entry.type === 'slotted' && (
            entry.slots && entry.slots.length > 0 ? (
              <ul className="mr-slots">
                {entry.slots.map((s) => <SlotLine key={s.slotId} slot={s} />)}
              </ul>
            ) : (
              <p className="mr-noslot">No slots booked for this registration.</p>
            )
          )}
        </div>
      )}

      <div className="mr-foot">
        {registeredOn && <span>Registered on {registeredOn}</span>}
        {onManage && (
          <button type="button" className="btn sm" onClick={onManage}>Manage →</button>
        )}
      </div>
    </div>
  );
}

export function RegistrationHistoryList({
  entries,
  manageableIds,
  onManage,
  showIdentity = true,
}: {
  entries: MyRegistrationEntry[];
  // Only entries whose eventId is in this set get a Manage action (events still
  // actionable from the current landing data). Omit for a pure view (admin).
  manageableIds?: Set<string>;
  onManage?: (eventId: string) => void;
  // F18: the user's own "My registrations" hides identity (always them); the admin
  // User-lookup tab leaves it on (default). Shared component — drive it by this prop.
  showIdentity?: boolean;
}) {
  return (
    <div className="mr-grid">
      {entries.map((e) => (
        <RegistrationCard
          key={e.eventId}
          entry={e}
          showIdentity={showIdentity}
          onManage={onManage && e.status === 'open' && manageableIds?.has(e.eventId)
            ? () => onManage(e.eventId)
            : undefined}
        />
      ))}
    </div>
  );
}
