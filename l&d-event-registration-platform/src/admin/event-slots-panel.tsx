import { useEffect, useId, useState } from 'react';
import type { EventDoc, Slot, SlotType } from '../lib/types';
import { formatDateVi, minToHHmm } from '../lib/types';
import {
  adminCreateEventSlot,
  adminDeleteEventSlot,
  listEventSlots,
  updateEventSlot,
} from '../lib/adminDb';
import { useConfirm, useToast } from '../confirm-toast-provider';
import { addMin, dowVi, parseTime, typClass } from './admin-utils';

// Inline slot management for one slotted event (add / edit capacity+room / delete).
// Reused by the top-level event-scoped Slots tab and the Events-tab drawer.

export function EventSlotsPanel({
  adminEmail, event,
}: { adminEmail: string; event: EventDoc }) {
  // Required exam parts — a single-part event only creates that one slot type, so the
  // type toggle is hidden and the create form is forced to the required type.
  const examParts = event.examParts ?? 'both';
  const needsSpeaking = examParts !== 'skills';
  const needsSkills = examParts !== 'speaking';
  const bothTypes = needsSpeaking && needsSkills;
  const forcedType: SlotType = needsSpeaking ? 'Speaking' : '3 Skills';
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCap, setEditCap] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [type, setType] = useState<SlotType>(forcedType);
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [capacity, setCapacity] = useState(forcedType === 'Speaking' ? '8' : '14');
  const [room, setRoom] = useState('');
  const confirm = useConfirm();
  const toast = useToast();
  const fid = useId();

  const reload = () => {
    setErr(null);
    listEventSlots(event.eventId).then(setSlots).catch((e: Error) => setErr(e.message));
  };
  useEffect(reload, [event.eventId]);

  const onType = (t: SlotType) => { setType(t); setCapacity(t === 'Speaking' ? '8' : '14'); };
  const end = addMin(start, type === 'Speaking' ? 60 : 150);

  const add = async () => {
    const cap = parseInt(capacity, 10);
    if (!date) { toast('error', 'Select a date.'); return; }
    if (Number.isNaN(cap) || cap < 0) { toast('error', 'Invalid capacity.'); return; }
    setBusy(true);
    try {
      await adminCreateEventSlot(adminEmail, event.eventId, {
        type, date, session: '', startMin: parseTime(start), endMin: parseTime(end), capacity: cap, location: room.trim(),
      });
      toast('success', 'Slot added.');
      setDate(''); setRoom('');
      reload();
    } catch (e) { toast('error', (e as Error).message); } finally { setBusy(false); }
  };

  const saveEdit = async (s: Slot) => {
    const cap = parseInt(editCap, 10);
    if (Number.isNaN(cap) || cap < 0) { toast('error', 'Invalid capacity.'); return; }
    setBusy(true);
    try {
      await updateEventSlot(adminEmail, event.eventId, s.slotId, { capacity: cap, location: editRoom.trim() });
      toast('success', 'Slot updated.');
      setEditId(null);
      reload();
    } catch (e) { toast('error', (e as Error).message); } finally { setBusy(false); }
  };

  const del = async (s: Slot) => {
    const ok = await confirm({
      title: 'Delete slot?',
      message: `Delete "${s.slotId}" (${formatDateVi(s.date)} ${minToHHmm(s.startMin)}–${minToHHmm(s.endMin)})?`,
      confirmText: 'Delete', danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try { await adminDeleteEventSlot(adminEmail, event.eventId, s.slotId); toast('success', 'Slot deleted.'); reload(); }
    catch (e) { toast('error', (e as Error).message); } finally { setBusy(false); }
  };

  if (event.type !== 'slotted') {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="es-title">This is a “simple” event</div>
          <div className="es-sub">Simple events have a single capacity (no timed slots). Set capacity in the Events tab.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      {/* Add slot */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-bd">
          {bothTypes ? (
            <div className="filter-chips" style={{ display: 'inline-flex', marginBottom: 8 }}>
              <button type="button" className={type === 'Speaking' ? 'active' : ''} onClick={() => onType('Speaking')}>Speaking · 60′</button>
              <button type="button" className={type === '3 Skills' ? 'active' : ''} onClick={() => onType('3 Skills')}>3 Skills · 150′</button>
            </div>
          ) : (
            <div className="text-sm text-muted" style={{ marginBottom: 8 }}>
              Slot type: <b>{forcedType}</b> · {forcedType === 'Speaking' ? '60′' : '150′'} (this event requires {forcedType} only)
            </div>
          )}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 1, minWidth: 130 }}>
              <label className="label" htmlFor={`${fid}-d`}>Date</label>
              <input id={`${fid}-d`} className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label className="label" htmlFor={`${fid}-t`}>Start</label>
              <input id={`${fid}-t`} className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="field" style={{ width: 90 }}>
              <label className="label" htmlFor={`${fid}-c`}>Capacity</label>
              <input id={`${fid}-c`} className="input" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 110 }}>
              <label className="label" htmlFor={`${fid}-r`}>Room</label>
              <input id={`${fid}-r`} className="input" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room A12" />
            </div>
          </div>
          <div className="help" style={{ marginTop: 4 }}>Ends at {end} · ID auto-generated</div>
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn sm" disabled={busy} onClick={add}>+ Add slot</button>
          </div>
        </div>
      </div>

      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      {!slots && !err && <div className="loading"><span className="spinner" /> Loading…</div>}
      {slots && slots.length === 0 && <div className="empty-state"><div className="es-title">No slots yet</div></div>}
      {slots && slots.length > 0 && (
        <table className="dgrid">
          <thead><tr><th>Type</th><th>Date / Time</th><th>Room</th><th>Capacity</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {slots.map((s) => {
              const used = Math.max(0, s.capacity - s.remaining);
              const editing = editId === s.slotId;
              return (
                <tr key={s.slotId}>
                  <td><span className={`typ ${typClass(s.type)}`}>{s.type}</span></td>
                  <td><span className="strong">{formatDateVi(s.date)}</span> <span className="text-muted">{dowVi(s.date)}</span> · <span className="tnum">{minToHHmm(s.startMin)}–{minToHHmm(s.endMin)}</span></td>
                  <td>
                    {editing
                      ? <input className="input" style={{ width: 110 }} value={editRoom} onChange={(e) => setEditRoom(e.target.value)} />
                      : (s.location || <span className="empty-dash">—</span>)}
                  </td>
                  <td>
                    {editing
                      ? <input className="input" style={{ width: 70 }} type="number" min={used} value={editCap} onChange={(e) => setEditCap(e.target.value)} />
                      : <span className="tnum"><b>{used}</b>/{s.capacity}</span>}
                  </td>
                  <td className="num">
                    {editing ? (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button type="button" className="btn sm" disabled={busy} onClick={() => saveEdit(s)}>Save</button>
                        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => setEditId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => { setEditId(s.slotId); setEditCap(String(s.capacity)); setEditRoom(s.location); }}>Edit</button>
                        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => del(s)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
