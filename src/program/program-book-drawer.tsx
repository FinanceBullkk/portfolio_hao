import { useState, useRef } from 'react';
import { minToHHmm, formatDateVi, overlaps, type ProgramConfig, type ProgramSession } from '../lib/types';
import type { BookSessionInput, MoveSessionInput } from '../lib/programDb';
import { useFocusTrap } from '../lib/use-focus-trap';

// Booking / manage drawer for one grid cell. Sessions are offline-only, capacity is set
// by HR on the class, and Topic was removed — so booking is just "which class + which
// cell". The class is chosen IN the drawer:
//   - PIC with one class  → class is fixed (no picker).
//   - PIC with many / HR  → a class dropdown (so each booking states its class at the
//     moment of booking; HR sees all active classes when booking on a PIC's behalf).
//   - manage: the class is fixed (the session's class); move it to another (date, slot)
//     or cancel it. Move is one server action (moveProgramSession).
//
// Chrome reuses the app's native `.drawer` (right-side panel on desktop); the `.sheet`
// modifier turns it into a bottom sheet on phones (concho2 reference).

interface CreateCtx { date: string; startMin: number; endMin: number }
interface ClassOption { code: string; name: string }

function weekdayShort(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' });
}

export function ProgramBookDrawer({
  program, create, manage, classes = [], defaultClassCode = '', showOwner = false,
  mySessions = [], busy, onBook, onMove, onCancel, onClose,
}: {
  program: ProgramConfig;
  create?: CreateCtx;
  manage?: ProgramSession;
  classes?: ClassOption[]; // choosable classes (create mode only)
  defaultClassCode?: string; // pre-selected class (create mode, multi-class)
  showOwner?: boolean; // manage mode: show the PIC owner row (admin acting on a PIC's behalf)
  mySessions?: ProgramSession[];
  busy: boolean;
  onBook: (input: BookSessionInput) => void;
  onMove: (input: MoveSessionInput) => void;
  onCancel: (sessionId: string) => void;
  onClose: () => void;
}) {
  const seed = manage ?? create!;
  // Class is fixed in manage mode, or in create mode when there is exactly one choosable
  // class; otherwise the PIC/HR picks it here (default to the last-used one if provided).
  const classFixed = Boolean(manage) || classes.length === 1;
  const [classCode, setClassCode] = useState(
    manage ? manage.classCode : (classes.length === 1 ? classes[0].code : defaultClassCode),
  );
  const courseName = manage ? manage.courseName : (classes.find((c) => c.code === classCode)?.name ?? '');

  // Manage-only: the cell can be moved.
  const [date, setDate] = useState(seed.date);
  const [startMin, setStartMin] = useState(seed.startMin);

  const slotFor = (sm: number) => program.timeSlots.find((s) => s.startMin === sm) ?? null;
  const endMin = manage ? (slotFor(startMin)?.endMin ?? seed.endMin) : create!.endMin;

  // Live header subtitle — reflects the move fields as the editor changes them.
  const whenLabel = `${weekdayShort(date)} · ${formatDateVi(date)} · ${minToHHmm(startMin)}–${minToHHmm(endMin)}`;

  // P1-7: warn before the chosen (date, slot) collides with another of the PIC's own
  // sessions — a trainer can't run two 1:1s at once. Create cells are always empty, so
  // this matters mostly when moving; either way we block + show why.
  const target = manage
    ? { date, startMin, endMin }
    : { date: create!.date, startMin: create!.startMin, endMin: create!.endMin };
  const conflict = mySessions.find(
    (s) => s.sessionId !== manage?.sessionId && overlaps(target, s),
  );

  // A11y: trap focus inside the dialog, close on Escape, restore focus on unmount.
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose);

  const needsClass = !manage && !classCode; // create with no class chosen yet
  const submit = () => {
    if (conflict || busy || needsClass) return;
    if (manage) {
      onMove({ sessionId: manage.sessionId, date, startMin, endMin });
    } else {
      onBook({ classCode, date: create!.date, startMin: create!.startMin, endMin: create!.endMin });
    }
  };

  return (
    <div className="drawer-back sheet" onClick={onClose}>
      <div className="drawer sheet" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="pbd-title" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-grip" aria-hidden="true" />

        <div className="drawer-hd">
          <div className="drawer-hd-main">
            <p className="dt" id="pbd-title">{manage ? 'Manage session' : 'Book a session'}</p>
            <div className="ds-row"><span className="ds">{whenLabel}</span></div>
          </div>
          <button className="drawer-x" type="button" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drawer-bd">
          {/* Class: fixed (read-only info row) when there's only one choice, or a picker
              when a multi-class PIC / HR must say which class this booking is for. */}
          <div className="pg-info">
            <div className="row">
              <span className="k">Class{classFixed && <span className="text-muted" style={{ fontWeight: 400 }}> · fixed</span>}</span>
              {classFixed ? (
                <span className="v strong">{classCode}{manage?.sequence ? ` · #${manage.sequence}` : ''}</span>
              ) : (
                <select className="select" aria-label="Class" value={classCode} onChange={(e) => setClassCode(e.target.value)}>
                  <option value="">Select class…</option>
                  {classes.map((c) => <option key={c.code} value={c.code}>{c.code}{c.name ? ` · ${c.name}` : ''}</option>)}
                </select>
              )}
            </div>
            {courseName && (
              <div className="row"><span className="k">Course</span><span className="v">{courseName}</span></div>
            )}
            {showOwner && manage && (
              <div className="row"><span className="k">PIC</span><span className="v">{manage.picEmail}</span></div>
            )}
          </div>

          {manage ? (
            <>
              <div className="field">
                <div className="label">Date</div>
                <input className="input" type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field">
                <div className="label">Time slot</div>
                <select className="select" aria-label="Time slot" style={{ width: '100%' }} value={startMin} onChange={(e) => setStartMin(Number(e.target.value))}>
                  {program.timeSlots.map((s) => <option key={s.startMin} value={s.startMin}>{s.label}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div className="field">
              <div className="label">When</div>
              <div>{formatDateVi(create!.date)} · {minToHHmm(create!.startMin)}–{minToHHmm(create!.endMin)}</div>
            </div>
          )}

          {conflict && (
            <div className="pg-conflict" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
              <span>You already have <b>{conflict.classCode}</b> at {minToHHmm(conflict.startMin)}–{minToHHmm(conflict.endMin)} on {formatDateVi(conflict.date)}. Pick another time.</span>
            </div>
          )}

          {manage && (
            <>
              <div className="drawer-div" />
              <button className="btn ghost full" type="button" style={{ color: 'var(--danger-600)' }}
                disabled={busy} onClick={() => onCancel(manage.sessionId)}>
                Cancel this session
              </button>
            </>
          )}
        </div>

        <div className="drawer-ft">
          <div className="drawer-ft-sp" />
          <button className="btn ghost" type="button" onClick={onClose}>Close</button>
          <button className="btn" type="button" onClick={submit} disabled={busy || Boolean(conflict) || needsClass}
            title={conflict ? 'This time clashes with another of your sessions' : needsClass ? 'Pick a class first' : undefined}>
            {busy ? <><span className="spinner" /> Saving…</> : manage ? 'Save changes' : 'Book session'}
          </button>
        </div>
      </div>
    </div>
  );
}
