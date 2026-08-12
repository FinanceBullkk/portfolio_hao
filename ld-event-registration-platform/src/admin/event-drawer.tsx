import { useEffect, useId, useState } from 'react';
import { minToHHmm, type EventDoc, type ExamParts } from '../lib/types';
import { upsertEvent, listEventRegistrations } from '../lib/adminDb';
import { uploadEventCover, deleteEventCover } from '../lib/event-cover-upload';
import { loadConfig } from './admin-utils';
import { useToast } from '../confirm-toast-provider';
import { useAdminMutation } from './use-admin-mutation';
import { Drawer } from './admin-chrome';
import { isoToLocalDateTimeInputValue } from './datetime-local';
import { ThemeColorPicker } from './theme-color-picker';

const EVENT_ID_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;

// A single full-width settings row: label + description on the left, toggle on
// the right. Replaces the old detached checkbox layout that overflowed.
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

export function EventDrawer({
  adminEmail, event, template, onClose, onSaved, onRequestDelete,
}: { adminEmail: string; event: EventDoc | null; template?: EventDoc | null; onClose: () => void; onSaved: () => void; onRequestDelete?: () => void }) {
  const isEdit = !!event;
  const isDuplicate = !event && !!template;
  // Initial values come from the event being edited, or a template when duplicating.
  const src = event ?? template ?? null;
  // Type is chosen at creation and fixed afterwards (it changes the whole flow).
  // "simple" = one seat pool (training); "slotted" = pick timed slots (assessment).
  const [type, setType] = useState<'simple' | 'slotted'>(src?.type ?? 'simple');
  const [eventId, setEventId] = useState(''); // blank for create/duplicate; edit locks it (uses event.eventId)
  const [name, setName] = useState(isDuplicate ? `Copy of ${src?.name ?? ''}` : (src?.name ?? ''));
  const [subtitle, setSubtitle] = useState(src?.subtitle ?? '');
  const [category, setCategory] = useState(src?.category ?? '');
  const [capacity, setCapacity] = useState(String(src?.capacity ?? 30));
  // A duplicate starts closed/unarchived with no inherited deadline — admin opts in.
  const [allowEnrollment, setAllowEnrollment] = useState(isDuplicate ? false : (src?.allowEnrollment ?? false));
  const [listed, setListed] = useState(src?.listed ?? true);
  const [archived, setArchived] = useState(isDuplicate ? false : (src?.archived ?? false));
  const [emailConfirm, setEmailConfirm] = useState(src?.emailConfirm ?? false);
  // Required exam parts (slotted events). Locked once the event has registrations —
  // changing it would strand held seats on the dropped part (server rejects too).
  const [examParts, setExamParts] = useState<ExamParts>(src?.examParts ?? 'both');
  const [examPartsLocked, setExamPartsLocked] = useState(false);
  // datetime-local wants local 'YYYY-MM-DDTHH:mm'; event.deadline is a full ISO string.
  const [deadline, setDeadline] = useState(!isDuplicate && src?.deadline ? isoToLocalDateTimeInputValue(src.deadline) : '');
  // U1 schedule metadata (simple events). Times stored as minutes → 'HH:mm' for inputs.
  const [eventDate, setEventDate] = useState(src?.eventDate ?? '');
  const [startTime, setStartTime] = useState(src?.startMin != null ? minToHHmm(src.startMin) : '');
  const [endTime, setEndTime] = useState(src?.endMin != null ? minToHHmm(src.endMin) : '');
  const [format, setFormat] = useState<'onsite' | 'online'>(src?.format ?? 'onsite');
  const [location, setLocation] = useState(src?.location ?? '');
  // Luma-style presentation fields. Cover is uploaded to Storage (doc keeps the URL).
  const [coverImageUrl, setCoverImageUrl] = useState(src?.coverImageUrl ?? '');
  const [organizerBu, setOrganizerBu] = useState(src?.organizerBu ?? '');
  const [description, setDescription] = useState(src?.description ?? '');
  const [locationText, setLocationText] = useState(src?.locationText ?? '');
  // Preset theme-color key ('' = none/neutral). Light accent on the card + detail page.
  const [themeColor, setThemeColor] = useState(src?.themeColor ?? '');
  const [coverBusy, setCoverBusy] = useState(false);
  // BU options for the organizer dropdown — loaded once (reuses the shared loader).
  const [buList, setBuList] = useState<string[]>([]);
  const toast = useToast();
  const { busy, run } = useAdminMutation();
  const fid = useId();

  useEffect(() => {
    let alive = true;
    loadConfig().then((c) => { if (alive) setBuList(c.buList); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Lock examParts once a slotted event already has registrations (best-effort;
  // the server rejects the change authoritatively). Not needed on create/duplicate.
  useEffect(() => {
    if (!(isEdit && event && event.type === 'slotted')) return;
    let alive = true;
    listEventRegistrations(event.eventId)
      .then((regs) => { if (alive && regs.length > 0) setExamPartsLocked(true); })
      .catch(() => {});
    return () => { alive = false; };
  }, [isEdit, event]);

  // Upload a picked cover image, replacing any previous one (best-effort delete).
  const onPickCover = async (file: File | undefined) => {
    if (!file) return;
    const id = isEdit ? event!.eventId : eventId.trim();
    if (!EVENT_ID_RE.test(id)) { toast('error', 'Enter a valid Event ID before uploading a cover.'); return; }
    setCoverBusy(true);
    try {
      const prev = coverImageUrl;
      const url = await uploadEventCover(id, file);
      setCoverImageUrl(url);
      if (prev && prev !== url) void deleteEventCover(prev);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Cover upload failed.');
    } finally {
      setCoverBusy(false);
    }
  };

  const removeCover = () => {
    const prev = coverImageUrl;
    setCoverImageUrl('');
    if (prev) void deleteEventCover(prev);
  };

  // Inline guard: when editing a simple event, capacity can't drop below the
  // number already registered (the server also rejects — this just warns earlier).
  const currentUsed = isEdit && event?.type === 'simple' && event.capacity != null
    ? Math.max(0, event.capacity - (event.remaining ?? 0))
    : 0;
  const capNum = parseInt(capacity, 10);
  const capacityTooLow = isEdit && type === 'simple' && !Number.isNaN(capNum) && capNum < currentUsed;

  // Snapshot the initial form so the footer can show "Unsaved changes".
  const [initial] = useState(() => ({ eventId: '', type: src?.type ?? 'simple', name: isDuplicate ? `Copy of ${src?.name ?? ''}` : (src?.name ?? ''), subtitle: src?.subtitle ?? '', category: src?.category ?? '', capacity: String(src?.capacity ?? 30), examParts: src?.examParts ?? 'both', allowEnrollment: isDuplicate ? false : (src?.allowEnrollment ?? false), listed: src?.listed ?? true, archived: isDuplicate ? false : (src?.archived ?? false), emailConfirm: src?.emailConfirm ?? false, deadline: !isDuplicate && src?.deadline ? isoToLocalDateTimeInputValue(src.deadline) : '', eventDate: src?.eventDate ?? '', startTime: src?.startMin != null ? minToHHmm(src.startMin) : '', endTime: src?.endMin != null ? minToHHmm(src.endMin) : '', format: src?.format ?? 'onsite', location: src?.location ?? '', coverImageUrl: src?.coverImageUrl ?? '', organizerBu: src?.organizerBu ?? '', description: src?.description ?? '', locationText: src?.locationText ?? '', themeColor: src?.themeColor ?? '' }));
  const dirty = JSON.stringify(initial) !== JSON.stringify({ eventId, type, name, subtitle, category, capacity, examParts, allowEnrollment, listed, archived, emailConfirm, deadline, eventDate, startTime, endTime, format, location, coverImageUrl, organizerBu, description, locationText, themeColor });
  const isProtected = isEdit && event!.eventId === 'assessment-q2';
  const typeChip = <span className={`type-chip ${type === 'slotted' ? 'slot' : 'simple'}`}>{type === 'slotted' ? 'Slotted' : 'Simple'}</span>;

  const save = async () => {
    const id = isEdit ? event!.eventId : eventId.trim();
    if (!EVENT_ID_RE.test(id)) {
      toast('error', 'Event ID must be 2-49 chars: lowercase letters, digits, hyphens (e.g. training-2026).');
      return;
    }
    if (!name.trim()) { toast('error', 'Event name is required.'); return; }
    const cap = parseInt(capacity, 10);
    if (type === 'simple' && (Number.isNaN(cap) || cap < 0)) { toast('error', 'Capacity must be a non-negative integer.'); return; }
    if (capacityTooLow) { toast('error', `Capacity can’t be below the ${currentUsed} already registered. Remove registrations first.`); return; }
    // U1: simple events require date/time/location (server enforces too).
    if (type === 'simple') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) { toast('error', 'Event date is required.'); return; }
      if (!/^\d{1,2}:\d{2}$/.test(startTime) || !/^\d{1,2}:\d{2}$/.test(endTime)) { toast('error', 'Start and end time are required.'); return; }
      if (endTime <= startTime) { toast('error', 'End time must be after the start time.'); return; }
      if (!location.trim()) { toast('error', format === 'online' ? 'Add a meeting link (or “Online”).' : 'Location / room is required.'); return; }
    }

    await run(
      () => upsertEvent(adminEmail, {
        eventId: id,
        name: name.trim(),
        subtitle: subtitle.trim(),
        category: category.trim(),
        type,
        examParts: type === 'slotted' ? examParts : undefined,
        capacity: type === 'simple' ? cap : undefined,
        allowEnrollment,
        listed,
        archived,
        emailConfirm,
        requireEligibility: src?.requireEligibility ?? false,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        coverImageUrl,
        organizerBu,
        description,
        locationText: locationText.trim(),
        themeColor,
        ...(type === 'simple'
          ? { eventDate, startTime, endTime, format, location: location.trim() }
          : {}),
      }),
      { successMessage: isEdit ? 'Event saved.' : 'Event created.', onSuccess: onSaved },
    );
  };

  return (
    <Drawer
      title={isEdit ? 'Edit event' : 'Add event'}
      sub={isEdit ? event!.eventId : 'New event'}
      chip={typeChip}
      cta={isEdit ? 'Save changes' : 'Create event'}
      busy={busy}
      dirty={dirty}
      closeLabel="Cancel"
      onClose={onClose}
      onSave={save}
    >
      {/* ── Details ── */}
      <div className="drawer-sec">Details</div>

      <div className="field">
        <label className="label" htmlFor={`${fid}-id`}>Event ID</label>
        {isEdit ? (
          <div className="id-locked">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            <span className="id">{event!.eventId}</span>
            <span className="note">Cannot be changed</span>
          </div>
        ) : (
          <>
            <input id={`${fid}-id`} className="input" value={eventId} placeholder="e.g. training-leadership-2026"
              onChange={(e) => setEventId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
            <span className="help">Lowercase letters, digits, hyphens. Used in the URL/path.</span>
          </>
        )}
      </div>
      <div className="field">
        <label className="label" htmlFor={`${fid}-name`}>Event name</label>
        <input id={`${fid}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Leadership Training" />
      </div>
      {!isEdit && (
        <div className="field">
          <label className="label">Type</label>
          <div className="filter-chips" style={{ display: 'inline-flex' }}>
            <button type="button" className={type === 'simple' ? 'active' : ''} onClick={() => setType('simple')}>Simple · one seat</button>
            <button type="button" className={type === 'slotted' ? 'active' : ''} onClick={() => setType('slotted')}>Slotted · timed slots</button>
          </div>
          <span className="help">{type === 'simple' ? 'Single capacity, one-click register (training).' : 'Pick timed exam slots (assessment). Add slots after creating.'}</span>
        </div>
      )}
      {type === 'slotted' && (
        <div className="field">
          <label className="label" htmlFor={`${fid}-parts`}>Exam parts</label>
          <select id={`${fid}-parts`} className="input" value={examParts} disabled={examPartsLocked}
            onChange={(e) => setExamParts(e.target.value as ExamParts)}>
            <option value="both">Speaking + 3 Skills</option>
            <option value="speaking">Speaking only</option>
            <option value="skills">3 Skills only</option>
          </select>
          <span className={`help ${examPartsLocked ? 'error' : ''}`}>
            {examPartsLocked
              ? '🔒 Locked — event already has registrations. Create a new event to change parts.'
              : 'Which slots registrants must book. Only the chosen part(s) are shown and required.'}
          </span>
        </div>
      )}
      <div className="field">
        <label className="label" htmlFor={`${fid}-sub`}>Subtitle <span className="opt">(optional)</span></label>
        <input id={`${fid}-sub`} className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="One line shown under the event name" />
      </div>
      <div className="field">
        <label className="label" htmlFor={`${fid}-cat`}>Category <span className="opt">(optional)</span></label>
        <input id={`${fid}-cat`} className="input" value={category} maxLength={40} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Training, Assessment, Workshop" />
        <span className="help">Eyebrow chip on the landing card. Defaults to the event type when empty.</span>
      </div>
      <div className="drawer-row2">
        {type === 'simple' && (
          <div className="field cap-field">
            <label className="label" htmlFor={`${fid}-cap`}>Capacity</label>
            <input id={`${fid}-cap`} className={`input ${capacityTooLow ? 'error' : ''}`} type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} aria-invalid={capacityTooLow} />
            {capacityTooLow
              ? <span className="help error" role="alert">⚠ {currentUsed} registered — can’t be lower.</span>
              : <span className="help">Total seats.</span>}
          </div>
        )}
        <div className="field grow">
          <label className="label" htmlFor={`${fid}-deadline`}>Deadline <span className="opt">(optional)</span></label>
          <input id={`${fid}-deadline`} className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <span className="help">Empty = rely on the Enrollment toggle.</span>
        </div>
      </div>

      {type === 'simple' && (
        <>
          <div className="drawer-div" />
          <div className="drawer-sec">Schedule &amp; location</div>
          <div className="drawer-row2">
            <div className="field cap-field">
              <label className="label" htmlFor={`${fid}-date`}>Date</label>
              <input id={`${fid}-date`} className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="field grow">
              <label className="label" htmlFor={`${fid}-start`}>Time</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input id={`${fid}-start`} className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="Start time" />
                <span className="text-muted">–</span>
                <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="End time" />
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label">Format</label>
            <div className="filter-chips" style={{ display: 'inline-flex' }}>
              <button type="button" className={format === 'onsite' ? 'active' : ''} onClick={() => setFormat('onsite')}>Onsite</button>
              <button type="button" className={format === 'online' ? 'active' : ''} onClick={() => setFormat('online')}>Online</button>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor={`${fid}-loc`}>{format === 'online' ? 'Meeting link / note' : 'Location / room'}</label>
            <input id={`${fid}-loc`} className="input" value={location} maxLength={120} onChange={(e) => setLocation(e.target.value)} placeholder={format === 'online' ? 'e.g. Google Meet link' : 'e.g. Room A12'} />
          </div>
        </>
      )}

      <div className="drawer-div" />

      {/* ── Cover & presentation (Luma-style landing fields) ── */}
      <div className="drawer-sec">Cover &amp; presentation</div>
      <div className="field">
        <label className="label">Cover image <span className="opt">(optional · max 2 MB)</span></label>
        {coverImageUrl ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <img src={coverImageUrl} alt="" style={{ width: 96, height: 60, objectFit: 'cover', borderRadius: 8 }} />
            <label className="btn ghost sm" style={{ cursor: coverBusy ? 'default' : 'pointer' }}>
              {coverBusy ? 'Uploading…' : 'Replace'}
              <input type="file" accept="image/*" hidden disabled={coverBusy}
                onChange={(e) => { void onPickCover(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <button type="button" className="btn ghost sm" disabled={coverBusy} onClick={removeCover}>Remove</button>
          </div>
        ) : (
          <label className="btn ghost sm" style={{ cursor: coverBusy ? 'default' : 'pointer', width: 'fit-content' }}>
            {coverBusy ? 'Uploading…' : 'Upload image'}
            <input type="file" accept="image/*" hidden disabled={coverBusy}
              onChange={(e) => { void onPickCover(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        )}
        <span className="help">Shown on the event card and registration page. PNG/JPG, under 2 MB.</span>
      </div>
      <ThemeColorPicker value={themeColor} onChange={setThemeColor} />
      <div className="field">
        <label className="label" htmlFor={`${fid}-org`}>Organizer (BU) <span className="opt">(optional)</span></label>
        <select id={`${fid}-org`} className="input" value={organizerBu} onChange={(e) => setOrganizerBu(e.target.value)}>
          <option value="">— None —</option>
          {organizerBu && !buList.includes(organizerBu) && <option value={organizerBu}>{organizerBu}</option>}
          {buList.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="help">The business unit organizing this event (a BU, not a person).</span>
      </div>
      <div className="field">
        <label className="label" htmlFor={`${fid}-desc`}>Description <span className="opt">(optional · Markdown)</span></label>
        <textarea id={`${fid}-desc`} className="input textarea" rows={5} value={description} maxLength={4000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Full details — agenda, what to bring… Markdown supported (## heading, **bold**, lists, tables)." />
        <span className="help">Markdown is rendered on the registration page.</span>
      </div>
      <div className="field">
        <label className="label" htmlFor={`${fid}-loctext`}>Location text <span className="opt">(optional)</span></label>
        <input id={`${fid}-loctext`} className="input" value={locationText} maxLength={200}
          onChange={(e) => setLocationText(e.target.value)}
          placeholder="e.g. 5F CLT Tower, 123 Nguyễn Văn Linh (or a Maps link)" />
        <span className="help">A friendly address shown on the landing page (separate from the schedule “Location / room”).</span>
      </div>

      <div className="drawer-div" />

      {/* ── Visibility & enrollment ── */}
      <div className="drawer-sec">Visibility &amp; enrollment</div>
      <ToggleRow label="Enrollment open" desc="Users can register and edit their booking." checked={allowEnrollment} onChange={setAllowEnrollment} />
      <ToggleRow label="Listed on the user landing" desc="Shows as a card on the registrations page." checked={listed} onChange={setListed} />

      <div className="drawer-div" />

      {/* ── Notifications ── */}
      <div className="drawer-sec">Notifications</div>
      <ToggleRow label="Send confirmation email on register" desc="Via the Trigger Email extension." checked={emailConfirm} onChange={setEmailConfirm} />

      {/* ── Danger zone (edit only) ── Archive is reversible, so it shows for
          every event (an archived event must stay reopenable). Only Delete is
          hidden for the protected assessment-q2 archive. */}
      {isEdit && (
        <>
          <div className="drawer-div" />
          <div className="drawer-sec danger">Danger zone</div>
          <div className="danger-zone">
            <div className="dz-row archive">
              <div><div className="t">{archived ? 'Unarchive event' : 'Archive event'}</div><div className="d">Hide from users · keep all data.</div></div>
              <button type="button" className="dz-btn" onClick={() => setArchived(!archived)}>{archived ? 'Unarchive' : 'Archive'}</button>
            </div>
            {!isProtected && onRequestDelete && (
              <div className="dz-row delete">
                <div><div className="t">Delete event</div><div className="d">Permanent · removes all registrations.</div></div>
                <button type="button" className="dz-btn danger" onClick={() => { onClose(); onRequestDelete(); }}>Delete</button>
              </div>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}
