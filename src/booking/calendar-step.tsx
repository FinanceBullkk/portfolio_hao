import { useMemo, useRef, useState } from 'react';
import { Stepper } from './booking-chrome';
import { CalendarGrid } from './calendar-grid';
import { TypeTab } from './type-tab';
import { minToHHmm, type Slot, type ExamParts } from '../lib/types';
import {
  uniqueSortedDates,
  slotSt,
  dayHeader,
  type Step1Data,
  type Selection,
} from './booking-utils';

// ─── Step 2 · Calendar ────────────────────────────────────────────────────

export function CalendarStep({
  step1,
  slots,
  selection,
  setSelection,
  curSpId,
  curSkId,
  examParts,
  deadlinePassed,
  onBack,
  onReload,
}: {
  step1: Step1Data;
  slots: Slot[];
  selection: Selection;
  setSelection: React.Dispatch<React.SetStateAction<Selection>>;
  curSpId: string | null;
  curSkId: string | null;
  examParts: ExamParts;
  deadlinePassed: boolean;
  onBack: () => void;
  onReload?: () => void;
}) {
  const dates = useMemo(() => uniqueSortedDates(slots), [slots]);
  const spSel = slots.find((s) => s.slotId === selection.speakingId) ?? null;
  const skSel = slots.find((s) => s.slotId === selection.skillsId) ?? null;

  // Required exam parts (per-event). `both` shows the 2-tab picker; a single-part
  // event forces one type and hides the tabs / auto-switch.
  const needsSpeaking = examParts !== 'skills';
  const needsSkills = examParts !== 'speaking';
  const both = needsSpeaking && needsSkills;
  const forcedType: Slot['type'] = needsSpeaking ? 'Speaking' : '3 Skills';

  // Which type is the user currently picking? Default to whichever is still unfilled.
  const [activeType, setActiveType] = useState<Slot['type']>(() =>
    both ? (selection.speakingId && !selection.skillsId ? '3 Skills' : 'Speaking') : forcedType,
  );
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const [flashPulse, setFlashPulse] = useState<'sp' | 'sk' | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tone = activeType === 'Speaking' ? 'sp' : 'sk';

  const byDate = useMemo(() => {
    const m: Record<string, Slot[]> = {};
    dates.forEach((d) => { m[d] = slots.filter((s) => s.date === d && s.type === activeType); });
    return m;
  }, [slots, dates, activeType]);

  function onClickSlot(slot: Slot) {
    const st = slotSt(slot, spSel, skSel, curSpId, curSkId);
    if (st === 'full' || st === 'conflict' || deadlinePassed) return;
    const isPicking =
      (slot.type === 'Speaking' ? selection.speakingId : selection.skillsId) !== slot.slotId;
    if (slot.type === 'Speaking') {
      setSelection((sel) => ({ ...sel, speakingId: sel.speakingId === slot.slotId ? null : slot.slotId }));
    } else {
      setSelection((sel) => ({ ...sel, skillsId: sel.skillsId === slot.slotId ? null : slot.slotId }));
    }
    // After picking a type, auto-switch to the other tab if it is still empty.
    // Only meaningful when both parts are required (single-part hides the tabs).
    if (isPicking && both) {
      const otherPicked = slot.type === 'Speaking' ? !!selection.skillsId : !!selection.speakingId;
      if (!otherPicked) {
        const doneLabel = slot.type === 'Speaking' ? 'Speaking' : '3 Skills';
        const nextLabel = slot.type === 'Speaking' ? '3 Skills' : 'Speaking';
        const pulseSide: 'sp' | 'sk' = slot.type === 'Speaking' ? 'sp' : 'sk';
        // Show flash message and pulse on completed tab
        setFlashMsg(`Selected ${doneLabel} ✓ — now choose ${nextLabel}`);
        setFlashPulse(pulseSide);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => { setFlashMsg(null); setFlashPulse(null); }, 2500);
        setTimeout(() => setActiveType(slot.type === 'Speaking' ? '3 Skills' : 'Speaking'), 300);
      }
    }
  }

  const initials = step1.fullName.trim().slice(0, 2).toUpperCase() || '??';
  const activeSlots = slots.filter((s) => s.type === activeType);
  const activeAvail = activeSlots.filter((s) => s.remaining > 0).length;

  return (
    <>
      <Stepper current={2} />

      <div className="profile-row">
        <div className="info">
          <span className="avatar">{initials}</span>
          <b>{step1.fullName}</b>
          <span className="info-sep" />
          <span>Emp ID: <b>{step1.empCode}</b></span>
        </div>
        <button className="btn-link" onClick={onBack}>← Edit details</button>
      </div>

      <div className="mb-3">
        <h1 style={{ fontSize: 'var(--fs-xl)', letterSpacing: '-.02em' }}>
          {both ? 'Choose your 2 exam slots' : 'Choose your exam slot'}
        </h1>
        <p className="text-sm text-muted mt-1">
          {both ? (
            <>
              Pick <b style={{ color: 'var(--brand-700)' }}>one Speaking slot</b> and{' '}
              <b style={{ color: 'var(--accent-700)' }}>one 3 Skills slot</b>. The system auto-locks slots that clash with your choice.
            </>
          ) : (
            <>Pick <b style={{ color: needsSpeaking ? 'var(--brand-700)' : 'var(--accent-700)' }}>one {forcedType} slot</b>.</>
          )}
        </p>
      </div>

      {flashMsg && (
        <div className="flash-msg" role="status" aria-live="polite">
          {flashMsg}
        </div>
      )}
      {both && (
        <div className="type-tabs">
          <TypeTab
            tone="sp"
            num="1"
            active={activeType === 'Speaking'}
            picked={!!spSel}
            label="Speaking"
            duration="60 min"
            statusText={spSel ? `${dayHeader(spSel.date).label} · ${minToHHmm(spSel.startMin)}–${minToHHmm(spSel.endMin)}` : 'Click to choose'}
            onClick={() => setActiveType('Speaking')}
            pulse={flashPulse === 'sp'}
          />
          <TypeTab
            tone="sk"
            num="2"
            active={activeType === '3 Skills'}
            picked={!!skSel}
            label="3 Skills"
            duration="150 min"
            statusText={skSel ? `${dayHeader(skSel.date).label} · ${minToHHmm(skSel.startMin)}–${minToHHmm(skSel.endMin)}` : 'Click to choose'}
            onClick={() => setActiveType('3 Skills')}
            pulse={flashPulse === 'sk'}
          />
        </div>
      )}

      <CalendarGrid
        activeType={activeType}
        setActiveType={setActiveType}
        tone={tone}
        dates={dates}
        activeSlots={activeSlots}
        activeAvail={activeAvail}
        byDate={byDate}
        spSel={spSel}
        skSel={skSel}
        curSpId={curSpId}
        curSkId={curSkId}
        both={both}
        deadlinePassed={deadlinePassed}
        onClickSlot={onClickSlot}
        onReload={onReload}
      />
    </>
  );
}
