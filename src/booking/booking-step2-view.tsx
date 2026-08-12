import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { formatDateVi, minToHHmm, type InitResult } from '../lib/types';
import type { Selection, Step1Data } from './booking-utils';
import { CalendarStep } from './calendar-step';
import { ConfirmModal } from './confirm-modal';

export function BookingStep2View({
  data,
  step1,
  selection,
  setSelection,
  curSpId,
  curSkId,
  isConfirm,
  isEditing,
  onBack,
  onConfirmOpen,
  onConfirmCancel,
  onConfirmSubmit,
  onReload,
  topbar,
}: {
  data: InitResult;
  step1: Step1Data;
  selection: Selection;
  setSelection: Dispatch<SetStateAction<Selection>>;
  curSpId: string | null;
  curSkId: string | null;
  isConfirm: boolean;
  isEditing: boolean;
  onBack: () => void;
  onConfirmOpen: () => void;
  onConfirmCancel: () => void;
  onConfirmSubmit: () => Promise<void>;
  onReload?: () => void;
  topbar: ReactNode;
}) {
  const spSel = data.slots.find((s) => s.slotId === selection.speakingId) ?? null;
  const skSel = data.slots.find((s) => s.slotId === selection.skillsId) ?? null;
  // Required exam parts (per-event). Only the required part(s) gate submit + show.
  const examParts = data.examParts ?? 'both';
  const needsSpeaking = examParts !== 'skills';
  const needsSkills = examParts !== 'speaking';
  const canSubmit = (!needsSpeaking || !!selection.speakingId) && (!needsSkills || !!selection.skillsId);
  // When editing an existing booking, show the remaining change quota up front
  // (not only at the final confirm modal) so the cost of changing is clear.
  const changesLeft = Math.max(0, data.maxChanges - (data.myBooking?.changeCount ?? 0));

  return (
    <div className="app c7d">
      {topbar}
      <main className="container wide" style={{ paddingBottom: 24 }}>
        {isEditing && (
          <div className={`banner ${changesLeft > 0 ? 'info' : 'danger'}`} style={{ marginBottom: 'var(--s-4)' }}>
            <div>
              {changesLeft > 0
                ? <>You have <b>{changesLeft}/{data.maxChanges}</b> change(s) left — saving different slots uses one.</>
                : <>You have <b>no changes left</b>. You can review your slots but won’t be able to save a different choice.</>}
            </div>
          </div>
        )}
        <CalendarStep
          step1={step1}
          slots={data.slots}
          selection={selection}
          setSelection={setSelection}
          curSpId={curSpId}
          curSkId={curSkId}
          examParts={examParts}
          deadlinePassed={data.deadlinePassed}
          onBack={onBack}
          onReload={onReload}
        />
      </main>

      {isConfirm && (
        <ConfirmModal
          step1={step1}
          slots={data.slots}
          selection={selection}
          examParts={examParts}
          isEditing={isEditing}
          maxChanges={data.maxChanges}
          changeCount={data.myBooking?.changeCount ?? 0}
          onCancel={onConfirmCancel}
          onConfirm={onConfirmSubmit}
        />
      )}

      <div className="sticky-summary">
        <div className="sticky-summary-inner">
          <div className="summary-items">
            {needsSpeaking && (
              <div className={`summary-item ${spSel ? 'filled' : ''}`}>
                <div className="badge">①</div>
                <div>
                  <div className="lbl">Speaking</div>
                  <div className={`val ${spSel ? '' : 'empty'}`}>
                    {spSel
                      ? `${formatDateVi(spSel.date)} · ${minToHHmm(spSel.startMin)}–${minToHHmm(spSel.endMin)}`
                      : 'No slot selected'}
                  </div>
                </div>
              </div>
            )}
            {needsSkills && (
              <div className={`summary-item ${skSel ? 'filled' : ''}`}>
                <div className="badge">{needsSpeaking ? '②' : '①'}</div>
                <div>
                  <div className="lbl">3 Skills</div>
                  <div className={`val ${skSel ? '' : 'empty'}`}>
                    {skSel
                      ? `${formatDateVi(skSel.date)} · ${minToHHmm(skSel.startMin)}–${minToHHmm(skSel.endMin)}`
                      : 'No slot selected'}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn ghost" onClick={onBack}>← Back</button>
            <button
              className={`btn ${canSubmit ? '' : 'disabled'}`}
              disabled={!canSubmit}
              onClick={onConfirmOpen}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
