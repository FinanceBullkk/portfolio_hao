import type { Dispatch, SetStateAction } from 'react';
import { minToHHmm, type Slot } from '../lib/types';
import { dayHeader, slotAriaLabel, slotSt, weekRangeLabel } from './booking-utils';

// Week view as day-column chips (Corgi7 Redesign.dc.html · screen 04): each day
// is a column of legible time chips instead of an absolute-positioned pixel grid.
// The selection / clash logic is unchanged — only the rendering. Clashing slots
// (overlap the user's other-type pick) and full slots render disabled.

interface CalendarGridProps {
  activeType: Slot['type'];
  setActiveType: Dispatch<SetStateAction<Slot['type']>>;
  tone: 'sp' | 'sk';
  dates: string[];
  activeSlots: Slot[];
  activeAvail: number;
  byDate: Record<string, Slot[]>;
  spSel: Slot | null;
  skSel: Slot | null;
  curSpId: string | null;
  curSkId: string | null;
  deadlinePassed: boolean;
  onClickSlot: (slot: Slot) => void;
  // False when the event requires only one exam part — hides the "switch tab"
  // affordance and the auto-jump tip (there is no other tab). Defaults to true.
  both?: boolean;
  // Re-fetch this event's slots in place. Falls back to a full page reload, but
  // the SPA keeps the chosen event in memory (not the URL), so a hard reload
  // drops the user back to the events list — prefer the in-app refetch.
  onReload?: () => void;
}

export function CalendarGrid({
  activeType,
  setActiveType,
  tone,
  dates,
  activeSlots,
  activeAvail,
  byDate,
  spSel,
  skSel,
  curSpId,
  curSkId,
  deadlinePassed,
  onClickSlot,
  both = true,
  onReload,
}: CalendarGridProps) {
  return (
    <>
      <div className={`cal-wrap tone-${tone}`} role="region" aria-label={`${activeType} calendar`}>
        <div className="cal-toolbar">
          {/* All slot dates render as columns at once, so there is nothing to page —
              the week label stands alone (the dead ‹ › arrows were removed). */}
          <div className="week-nav">
            <span className="week-label">{weekRangeLabel(dates)}</span>
          </div>
          <div className="cal-legend" aria-hidden="true">
            <span className="lg"><span className="sw avail" /> Available</span>
            <span className="lg"><span className="sw sel" /> Selected</span>
            <span className="lg"><span className="sw full" /> Full</span>
          </div>
        </div>

        {dates.length === 0 ? (
          <div className="cal-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="ces-title">No exam slots yet</p>
            <p className="ces-body">The schedule isn't open yet. Please contact the organizers or try reloading.</p>
            <button className="btn ghost" style={{ marginTop: 'var(--s-4)' }} onClick={() => (onReload ? onReload() : window.location.reload())}>
              ↺ Reload
            </button>
          </div>
        ) : activeSlots.length === 0 ? (
          <div className="cal-type-empty">
            <p>No <b>{activeType}</b> slots in the schedule.</p>
            {both && (
              <button
                className="btn-link"
                onClick={() => setActiveType(activeType === 'Speaking' ? '3 Skills' : 'Speaking')}
              >
                Switch to <b>{activeType === 'Speaking' ? '3 Skills' : 'Speaking'}</b> tab →
              </button>
            )}
          </div>
        ) : (
          <div className="cal-cols" style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))` }}>
            {dates.map((date) => {
              const { abbr, label } = dayHeader(date);
              const slots = byDate[date] ?? [];
              return (
                <div className="cal-daycol" key={date}>
                  <div className="cal-dayhd"><span className="d">{abbr}</span><span className="n">{label}</span></div>
                  <div className="cal-chips">
                    {slots.length === 0
                      ? <span className="cal-none">—</span>
                      : slots.map((slot) => (
                        <SlotChip
                          key={slot.slotId}
                          slot={slot}
                          spSel={spSel}
                          skSel={skSel}
                          curSpId={curSpId}
                          curSkId={curSkId}
                          deadlinePassed={deadlinePassed}
                          onClickSlot={onClickSlot}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted mt-3">
        <b>Tip:</b> {both ? <>Picking one slot auto-jumps to the other tab · </> : null}{activeAvail} {activeType} slots available.{both ? ' Times that clash with your other pick are disabled.' : ''}
      </p>
    </>
  );
}

function SlotChip({
  slot,
  spSel,
  skSel,
  curSpId,
  curSkId,
  deadlinePassed,
  onClickSlot,
}: {
  slot: Slot;
  spSel: Slot | null;
  skSel: Slot | null;
  curSpId: string | null;
  curSkId: string | null;
  deadlinePassed: boolean;
  onClickSlot: (slot: Slot) => void;
}) {
  const st = slotSt(slot, spSel, skSel, curSpId, curSkId);
  const isSp = slot.type === 'Speaking';
  const low = st === 'ok' && slot.capacity > 0 && slot.remaining / slot.capacity <= 0.3;
  const room = slot.location ? slot.location.split(' · ')[0] : '';

  // Explain WHY a slot can't be picked — a clash overlaps the other-type pick.
  const conflictWith = isSp ? skSel : spSel;
  const blockedReason = deadlinePassed
    ? 'The registration deadline has passed'
    : st === 'full'
      ? 'This slot is full'
      : st === 'conflict' && conflictWith
        ? `Overlaps your ${conflictWith.type} slot (${minToHHmm(conflictWith.startMin)}–${minToHHmm(conflictWith.endMin)})`
        : undefined;

  const cls = ['cal-chip', isSp ? 'sp' : 'sk', st === 'sel' ? 'sel' : '', st === 'full' ? 'full' : '', st === 'conflict' ? 'conflict' : '', low ? 'low' : '']
    .filter(Boolean).join(' ');

  return (
    <button
      className={cls}
      onClick={() => onClickSlot(slot)}
      disabled={st === 'full' || st === 'conflict' || deadlinePassed}
      aria-label={slotAriaLabel(slot, st, deadlinePassed)}
      title={blockedReason}
    >
      <span className="t">{minToHHmm(slot.startMin)}–{minToHHmm(slot.endMin)}</span>
      <span className="m">
        {st === 'sel'
          ? <>{room && `${room} · `}Selected</>
          : st === 'full'
            ? 'Full'
            : st === 'conflict'
              ? 'Overlaps'
              : <>{room && `${room} · `}{slot.remaining} left</>}
      </span>
      {st === 'sel' && (
        <span className="chk"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5" /></svg></span>
      )}
    </button>
  );
}
