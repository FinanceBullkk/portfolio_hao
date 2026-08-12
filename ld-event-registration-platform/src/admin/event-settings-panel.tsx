import { useEffect, useState } from 'react';
import type { EventDoc } from '../lib/types';
import { eventToUpsertInput, upsertEvent } from '../lib/adminDb';
import { useAdminMutation } from './use-admin-mutation';
import { isoToLocalDateTimeInputValue } from './datetime-local';

// ── Event workspace · Settings sub-tab ────────────────────────────────────────
// A per-event settings panel (decision: separate from the full Edit drawer). Owns
// the frequently-touched event rules — enrollment / listing / confirmation email /
// deadline / capacity — plus the Danger zone. Saves through the shared
// `eventToUpsertInput` so the U1 schedule metadata is never dropped on save. The
// header "Edit" button still opens the full EventDrawer for less-frequent fields.

/** Full-width settings row: label + description on the left, toggle on the right. */
function ToggleRow({
  label, desc, checked, onChange,
}: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="tgl-row">
      <span className="tgl-txt"><span className="tt">{label}</span><span className="td">{desc}</span></span>
      <input type="checkbox" className="tgl-in" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tgl" aria-hidden="true" />
    </label>
  );
}

export function EventSettingsPanel({
  adminEmail, event, busy: parentBusy, onSaved, onRequestDelete,
}: {
  adminEmail: string;
  event: EventDoc;
  busy?: boolean;
  onSaved: () => void;
  onRequestDelete: () => void;
}) {
  const isSimple = event.type === 'simple';
  const [allowEnrollment, setAllowEnrollment] = useState(event.allowEnrollment);
  const [listed, setListed] = useState(event.listed);
  const [requireEligibility, setRequireEligibility] = useState(event.requireEligibility);
  const [emailConfirm, setEmailConfirm] = useState(event.emailConfirm);
  const [deadline, setDeadline] = useState(event.deadline ? isoToLocalDateTimeInputValue(event.deadline) : '');
  const [capacity, setCapacity] = useState(String(event.capacity ?? 0));
  const { busy, run } = useAdminMutation();

  // Re-sync local state when the event reloads (after a save elsewhere).
  useEffect(() => {
    setAllowEnrollment(event.allowEnrollment);
    setListed(event.listed);
    setRequireEligibility(event.requireEligibility);
    setEmailConfirm(event.emailConfirm);
    setDeadline(event.deadline ? isoToLocalDateTimeInputValue(event.deadline) : '');
    setCapacity(String(event.capacity ?? 0));
  }, [event]);

  const initialDeadline = event.deadline ? isoToLocalDateTimeInputValue(event.deadline) : '';
  const dirty =
    allowEnrollment !== event.allowEnrollment ||
    listed !== event.listed ||
    requireEligibility !== event.requireEligibility ||
    emailConfirm !== event.emailConfirm ||
    deadline !== initialDeadline ||
    (isSimple && capacity !== String(event.capacity ?? 0));

  const save = async () => {
    const cap = parseInt(capacity, 10);
    if (isSimple && (Number.isNaN(cap) || cap < 0)) return;
    await run(
      () => upsertEvent(adminEmail, {
        ...eventToUpsertInput(event),
        allowEnrollment,
        listed,
        requireEligibility,
        emailConfirm,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        ...(isSimple ? { capacity: cap } : {}),
      }),
      { successMessage: 'Settings saved.', onSuccess: onSaved },
    );
  };

  const undo = () => {
    setAllowEnrollment(event.allowEnrollment);
    setListed(event.listed);
    setRequireEligibility(event.requireEligibility);
    setEmailConfirm(event.emailConfirm);
    setDeadline(initialDeadline);
    setCapacity(String(event.capacity ?? 0));
  };

  const isProtected = event.eventId === 'assessment-q2';

  return (
    <div className="panel ws-settings">
      <div className="set-sec">Enrollment &amp; visibility</div>
      <ToggleRow label="Enrollment open" desc="Users can register and edit their booking." checked={allowEnrollment} onChange={setAllowEnrollment} />
      <ToggleRow label="Listed on the user landing" desc="Shows as a card on the registrations page." checked={listed} onChange={setListed} />
      <ToggleRow label="Restrict to an eligibility list" desc="Only employees on this event's allowlist can see and register. Manage the list in the Eligibility tab." checked={requireEligibility} onChange={setRequireEligibility} />
      <ToggleRow label="Send confirmation email on register" desc="Via the Trigger Email extension." checked={emailConfirm} onChange={setEmailConfirm} />

      <div className="set-sec">Deadline{isSimple ? ' & capacity' : ''}</div>
      <div className="ws-set-grid">
        <div className="field grow">
          <label className="label" htmlFor="ws-deadline">Registration deadline <span className="opt">(optional)</span></label>
          <input id="ws-deadline" className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <span className="help">Empty = rely on the Enrollment toggle.</span>
        </div>
        {isSimple && (
          <div className="field cap-field">
            <label className="label" htmlFor="ws-cap">Capacity</label>
            <input id="ws-cap" className="input" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            <span className="help">Can’t drop below those already registered.</span>
          </div>
        )}
      </div>

      <div className="set-sec danger">Danger zone</div>
      <div className="danger-zone">
        {!isProtected ? (
          <div className="dz-row delete">
            <div><div className="t">Delete event</div><div className="d">Permanent · removes all registrations, slots and data.</div></div>
            <button type="button" className="dz-btn danger" disabled={parentBusy || busy} onClick={onRequestDelete}>Delete</button>
          </div>
        ) : (
          <div className="dz-row"><div><div className="t">Protected archive</div><div className="d">The migrated assessment archive can’t be deleted.</div></div></div>
        )}
      </div>

      <div className="save-bar">
        <div className="save-bar-inner">
          <div className={`save-status${dirty ? ' dirty' : ''}`}>
            <span className="sdot" />
            <span>{dirty ? 'Unsaved changes' : 'No changes'}</span>
          </div>
          <div className="row" style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" type="button" disabled={!dirty || busy} onClick={undo}>Undo</button>
            <button className="btn" type="button" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
