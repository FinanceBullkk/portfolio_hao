import { useId, useMemo, useState } from 'react';
import { formatDateVi, minToHHmm, overlaps, type Slot, type ExamParts } from '../lib/types';
import { adminUpdateRegistration, type Registration } from '../lib/adminDb';
import { useToast } from '../confirm-toast-provider';
import { useAdminMutation } from './use-admin-mutation';
import { dowVi } from './admin-utils';
import { Drawer } from './admin-chrome';

// Label for a slot <option>: date · time · room · seats left. Includes full slots
// (the admin may still need to move someone in/out) but flags them as Full.
function slotOptionLabel(s: Slot): string {
  const seats = s.remaining > 0 ? `${s.remaining} left` : 'Full';
  const room = s.location ? ` · ${s.location.split(' · ')[0]}` : '';
  return `${dowVi(s.date)} ${formatDateVi(s.date)} · ${minToHHmm(s.startMin)}–${minToHHmm(s.endMin)}${room} · ${seats}`;
}

/** Admin: move a participant's slots. Server enforces capacity + no-overlap. Only the
 *  event's required exam part(s) are shown/validated (examParts, default 'both'). */
export function RegEditDrawer({
  reg, slots, eventId, examParts = 'both', onClose, onSaved,
}: { reg: Registration; slots: Slot[]; eventId?: string; examParts?: ExamParts; onClose: () => void; onSaved: () => void }) {
  const [speakingId, setSpeakingId] = useState(reg.speakingSlotId ?? '');
  const [skillsId, setSkillsId] = useState(reg.skillsSlotId ?? '');
  const needsSpeaking = examParts !== 'skills';
  const needsSkills = examParts !== 'speaking';
  const toast = useToast();
  const { busy, run } = useAdminMutation();
  const fid = useId();

  const speakingSlots = useMemo(
    () => slots.filter((s) => s.type === 'Speaking').sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.startMin - b.startMin)),
    [slots],
  );
  const skillsSlots = useMemo(
    () => slots.filter((s) => s.type === '3 Skills').sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.startMin - b.startMin)),
    [slots],
  );

  const sp = slots.find((s) => s.slotId === speakingId) ?? null;
  const sk = slots.find((s) => s.slotId === skillsId) ?? null;
  const clash = sp && sk ? overlaps(sp, sk) : false;
  const unchanged = speakingId === (reg.speakingSlotId ?? '') && skillsId === (reg.skillsSlotId ?? '');

  const save = async () => {
    if (needsSpeaking && !speakingId) { toast('error', 'Select a Speaking slot.'); return; }
    if (needsSkills && !skillsId) { toast('error', 'Select a 3 Skills slot.'); return; }
    if (clash) { toast('error', 'The two slots overlap. Pick non-overlapping times.'); return; }
    if (unchanged) { onClose(); return; }
    await run(
      () => adminUpdateRegistration(reg.email, needsSpeaking ? speakingId : '', needsSkills ? skillsId : '', eventId),
      { successMessage: `Moved ${reg.fullName || reg.empCode} to the new slots.`, onSuccess: onSaved },
    );
  };

  return (
    <Drawer
      title="Edit participant slots"
      sub={`${reg.fullName || '—'} · ${reg.empCode} · ${reg.email}`}
      cta="Save changes"
      busy={busy}
      onClose={onClose}
      onSave={save}
    >
      {needsSpeaking && (
        <div className="field">
          <label className="label" htmlFor={`${fid}-sp`}>Speaking slot</label>
          <select id={`${fid}-sp`} className="select" value={speakingId} onChange={(e) => setSpeakingId(e.target.value)}>
            <option value="">— Select Speaking slot —</option>
            {speakingSlots.map((s) => (
              <option key={s.slotId} value={s.slotId}>{slotOptionLabel(s)}{s.slotId === reg.speakingSlotId ? ' · current' : ''}</option>
            ))}
          </select>
        </div>
      )}
      {needsSkills && (
        <div className="field">
          <label className="label" htmlFor={`${fid}-sk`}>3 Skills slot</label>
          <select id={`${fid}-sk`} className="select" value={skillsId} onChange={(e) => setSkillsId(e.target.value)}>
            <option value="">— Select 3 Skills slot —</option>
            {skillsSlots.map((s) => (
              <option key={s.slotId} value={s.slotId}>{slotOptionLabel(s)}{s.slotId === reg.skillsSlotId ? ' · current' : ''}</option>
            ))}
          </select>
        </div>
      )}
      {clash && <div className="banner danger"><div>The selected slots overlap in time. Choose non-overlapping slots.</div></div>}
      <div className="banner info"><div>Capacity and overlap are enforced on the server. Deadline and eligibility checks are skipped for admin edits.</div></div>
    </Drawer>
  );
}
