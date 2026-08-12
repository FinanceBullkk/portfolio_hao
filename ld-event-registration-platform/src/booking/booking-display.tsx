import { useEffect, useRef, useState } from 'react';
import { daysUntil } from './booking-utils';
import { type Slot, type MyBooking, type InitResult, type CancelResult } from '../lib/types';
import { useConfirm } from '../confirm-toast-provider';
import { downloadBookingIcs } from '../lib/ics';
import { formatDateTime } from '../lib/format-date';
import { DeletedSlotRow, SessionRow } from './session-row';
import { TrashIcon } from './booking-icons';

export function BookingDisplay({
  email,
  booking,
  slots,
  deadlinePassed,
  allowEnrollment,
  maxChanges,
  scheduleName = 'Assessment',
  cancel,
  flash,
  onFlashDismiss,
  onEdit,
  onCancelled,
  onError,
}: {
  email: string;
  booking: MyBooking;
  slots: Slot[];
  deadlinePassed: boolean;
  allowEnrollment: boolean;
  maxChanges: number;
  // Name used for the calendar event summary (assessment name / event name).
  scheduleName?: string;
  // Supplied by the booking flow's BookingApi (event-scoped cancel callable).
  cancel: (email: string) => Promise<CancelResult>;
  flash?: string | null;
  onFlashDismiss?: () => void;
  onEdit: () => void;
  onCancelled: (state: InitResult) => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();

  const sp = slots.find((s) => s.slotId === booking.speakingSlotId);
  const sk = slots.find((s) => s.slotId === booking.skillsSlotId);
  const ordered = ([sp, sk].filter(Boolean) as Slot[]).sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.startMin - b.startMin,
  );
  const first = ordered[0];
  const countdown = first ? daysUntil(first.date) : 0;
  const changesLeft = Math.max(0, maxChanges - booking.changeCount);
  const canManage = !deadlinePassed && allowEnrollment;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Auto-dismiss the one-time success banner after a few seconds.
  useEffect(() => {
    if (!flash || !onFlashDismiss) return;
    const t = window.setTimeout(onFlashDismiss, 6000);
    return () => window.clearTimeout(t);
  }, [flash, onFlashDismiss]);

  async function handleCancel() {
    const bookedCount = (booking.speakingSlotId ? 1 : 0) + (booking.skillsSlotId ? 1 : 0);
    const ok = await confirm({
      title: 'Cancel registration?',
      message: `Cancel your ${bookedCount === 1 ? 'exam slot' : `${bookedCount} exam slots`}? You can register again before the deadline.`,
      confirmText: 'Cancel registration',
      cancelText: 'Keep',
      danger: true,
    });
    if (!ok) return;
    setMenuOpen(false);
    setBusy(true);
    try {
      const res = await cancel(email);
      if (!res.ok) onError(res.error || 'Cancellation failed.');
      else if (res.state) onCancelled(res.state);
      else onError('Cancelled but no updated state received. Please reload.');
    } catch (e) {
      onError((e as Error).message || 'Cancellation failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {flash && (
        <div className="flash-banner" role="status" aria-live="polite">
          <span className="flash-ic" aria-hidden="true">✓</span>
          <div className="flash-text">{flash}</div>
          <button type="button" className="flash-x" aria-label="Dismiss notification" onClick={onFlashDismiss}>×</button>
        </div>
      )}
      <div className="r-head">
        <div>
          <h1>Your exam schedule</h1>
          <p>View your registration, change slots, or cancel before the deadline.</p>
        </div>
        <span className="pill success">✓ Registered</span>
      </div>

      <div className="r-id">
        <span className="r-av">{email.split('@')[0].slice(0, 2).toUpperCase()}</span>
        <div className="r-id-main">
          <div className="r-id-name">
            {booking.fullName} <span className="muted">· {booking.empCode}</span>
          </div>
          <div className="r-id-sub">
            {email}
            {booking.createdAt && (
              <>&nbsp;&nbsp;·&nbsp;&nbsp;Registered {formatDateTime(booking.createdAt)}</>
            )}
          </div>
        </div>
      </div>

      <div className="r-sessions">
        <div className="r-sess-head">
          <span className="t">Registered slots</span>
          <span className="c">· {ordered.length} slots</span>
        </div>
        <div className="r-list">
          {ordered.map((slot) => (
            <SessionRow
              key={slot.slotId}
              slot={slot}
              isNext={slot.slotId === first?.slotId}
              countdown={countdown}
            />
          ))}
          {!sp && booking.speakingSlotId && <DeletedSlotRow label="Speaking" slotId={booking.speakingSlotId} />}
          {!sk && booking.skillsSlotId && <DeletedSlotRow label="3 Skills" slotId={booking.skillsSlotId} />}
        </div>
      </div>

      <div className="r-actions">
        <span className="r-note">
          {canManage
            ? changesLeft > 0
              ? <>You have <b>{changesLeft}/{maxChanges}</b> changes left</>
              : 'No changes left'
            : deadlinePassed
              ? 'Registration closed'
              : ''}
        </span>
        <div className="r-act-btns">
          {sp && sk && (
            // Add-to-calendar works regardless of deadline — useful right up to exam day.
            <button
              className="btn ghost"
              onClick={() => downloadBookingIcs({ empCode: booking.empCode, sp, sk, sequence: booking.changeCount, assessmentName: scheduleName })}
              disabled={busy}
              title="Download a .ics file for Google / Outlook / Apple Calendar"
            >
              📅 Add to calendar
            </button>
          )}
          {canManage && (
            <>
              <button
                className={`btn ${changesLeft <= 0 ? 'disabled' : ''}`}
                onClick={onEdit}
                disabled={busy || changesLeft <= 0}
                title={changesLeft <= 0 ? 'No changes left' : undefined}
              >
                ↻ Change slots
              </button>
              <div className="menu-wrap" ref={menuRef}>
                <button
                  className="btn ghost icon"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  aria-label="Options"
                  disabled={busy}
                >
                  ⋮
                </button>
                {menuOpen && (
                  <div className="menu" role="menu">
                    <button
                      className="menu-item danger"
                      role="menuitem"
                      onClick={handleCancel}
                      disabled={busy}
                    >
                      <TrashIcon size={15} /> Cancel registration
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
