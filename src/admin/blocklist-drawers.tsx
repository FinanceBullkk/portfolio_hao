import { useId, useMemo, useState } from 'react';
import type { BlockEntry, BulkBlockInput, BlockListApi } from '../lib/adminDb';
import { useToast } from '../confirm-toast-provider';
import { useAdminMutation } from './use-admin-mutation';
import { isValidEmpCode } from '../lib/emp-code';
import { Drawer } from './admin-chrome';

// The add/edit + bulk-import drawers for the generic blocklist, plus the reason
// helpers they share with BlocklistTab. Split out of blocklist-tab.tsx so the tab
// keeps just the table; these drawers are self-contained (driven only by props +
// the injected BlockListApi).

/** A reason like "Pending review (chờ duyệt)" → { primary, secondary } so the table can
 *  show the main reason with the parenthetical on a second line. */
export function splitReason(reason: string): { primary: string; secondary: string } {
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(reason.trim());
  if (m && m[2]) return { primary: m[1].trim(), secondary: m[2].trim() };
  return { primary: reason, secondary: '' };
}

function parseBulkRows(raw: string, fallbackReason: string): { entries: BulkBlockInput[]; errors: string[]; duplicates: string[] } {
  const entries: BulkBlockInput[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];

  raw.split(/\r?\n/).forEach((line, idx) => {
    const value = line.trim();
    if (!value) return;

    const tabParts = value.split('\t').map((part) => part.trim());
    const parts = tabParts.length > 1 ? tabParts : value.split(',').map((part) => part.trim());
    const empCode = parts[0] ?? '';
    const reason = parts[1] || fallbackReason;
    const email = parts[2] || undefined;
    const fullName = parts.slice(3).join(' ').trim() || undefined;

    if (!isValidEmpCode(empCode)) {
      errors.push(`Line ${idx + 1}: Employee Code must be 6 digits.`);
      return;
    }
    if (!reason.trim()) {
      errors.push(`Line ${idx + 1}: missing reason.`);
      return;
    }
    if (seen.has(empCode)) {
      duplicates.push(empCode);
      return;
    }
    seen.add(empCode);
    entries.push({ empCode, reason, email, fullName });
  });

  return { entries, errors, duplicates };
}

export function BulkBlockDrawer({
  api, reasonPresets, onClose, onSaved,
}: { api: BlockListApi; reasonPresets: string[]; onClose: () => void; onSaved: () => void }) {
  const [reasonPreset, setReasonPreset] = useState<string>(reasonPresets[0]);
  const [reasonCustom, setReasonCustom] = useState('');
  const [raw, setRaw] = useState('');
  const toast = useToast();
  const { busy, run } = useAdminMutation();
  const fid = useId();

  const fallbackReason = reasonPreset === '__custom__' ? reasonCustom.trim() : reasonPreset;
  const parsed = useMemo(() => parseBulkRows(raw, fallbackReason), [raw, fallbackReason]);

  const save = async () => {
    if (parsed.errors.length > 0) { toast('error', parsed.errors[0]); return; }
    if (parsed.entries.length === 0) { toast('error', 'Paste at least 1 valid Employee Code.'); return; }
    if (!fallbackReason && parsed.entries.some((entry) => !entry.reason.trim())) {
      toast('error', 'Please select or enter a reason.');
      return;
    }
    await run(
      () => api.bulkUpsert(parsed.entries),
      {
        successMessage: (result) => {
          const skipped = parsed.duplicates.length ? ` Skipped ${parsed.duplicates.length} duplicate code(s) in the list.` : '';
          return `Blocked ${result.count} Employee Code(s).${skipped}`;
        },
        onSuccess: onSaved,
      },
    );
  };

  return (
    <Drawer
      title="Bulk import"
      sub="Block multiple Employee Codes at once"
      cta="Import list"
      busy={busy}
      onClose={onClose}
      onSave={save}
    >
      <div className="field">
        <label className="label" htmlFor={`${fid}-reason`}>Default reason</label>
        <select id={`${fid}-reason`} className="input" value={reasonPreset} onChange={(e) => setReasonPreset(e.target.value)}>
          {reasonPresets.map((r) => <option key={r} value={r}>{splitReason(r).primary}</option>)}
          <option value="__custom__">Other (free text)…</option>
        </select>
        {reasonPreset === '__custom__' && (
          <textarea className="input textarea" value={reasonCustom} onChange={(e) => setReasonCustom(e.target.value)} placeholder="Enter a default reason…" rows={3} style={{ marginTop: 'var(--s-2)' }} />
        )}
      </div>
      <div className="field">
        <label className="label" htmlFor={`${fid}-raw`}>Employee Code list</label>
        <textarea
          id={`${fid}-raw`}
          className="input textarea"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'262010\n262011\n262012\tCustom reason\n262013, Custom reason'}
          rows={12}
        />
        <div className="help">
          One code per line. You can add a custom reason after a tab or comma.
        </div>
      </div>
      <div className={`banner ${parsed.errors.length ? 'error' : 'info'}`}>
        <div>
          Valid: <b>{parsed.entries.length}</b>
          {parsed.duplicates.length > 0 && <> · Duplicates in file: <b>{parsed.duplicates.length}</b></>}
          {parsed.errors.length > 0 && <> · Error: <b>{parsed.errors[0]}</b></>}
        </div>
      </div>
    </Drawer>
  );
}

export function BlockDrawer({
  api, title, reasonPresets, editing, onClose, onSaved,
}: { api: BlockListApi; title: string; reasonPresets: string[]; editing: BlockEntry | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!editing;
  const [empCode, setEmpCode] = useState(editing?.empCode ?? '');
  const [reasonPreset, setReasonPreset] = useState<string>(() => {
    if (!editing) return reasonPresets[0];
    return reasonPresets.includes(editing.reason) ? editing.reason : '__custom__';
  });
  const [reasonCustom, setReasonCustom] = useState(editing && !reasonPresets.includes(editing.reason) ? editing.reason : '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [fullName, setFullName] = useState(editing?.fullName ?? '');
  const toast = useToast();
  const { busy, run } = useAdminMutation();
  const fid = useId();

  const empCodeValid = isValidEmpCode(empCode);
  const effectiveReason = reasonPreset === '__custom__' ? reasonCustom.trim() : reasonPreset;

  const save = async () => {
    if (!empCodeValid) { toast('error', 'Employee Code must be 6 digits.'); return; }
    if (!effectiveReason) { toast('error', 'Please select or enter a reason.'); return; }
    await run(
      () => api.upsert(empCode.trim(), {
        reason: effectiveReason,
        email: email.trim() || undefined,
        fullName: fullName.trim() || undefined,
      }),
      { successMessage: isEdit ? `Updated ${empCode.trim()}.` : `Blocked ${empCode.trim()}.`, onSuccess: onSaved },
    );
  };

  return (
    <Drawer
      title={isEdit ? `Edit ${editing!.empCode}` : title}
      sub="Block by Employee Code"
      cta={isEdit ? 'Update' : 'Add block'}
      busy={busy}
      onClose={onClose}
      onSave={save}
    >
      <div className="field">
        <label className="label" htmlFor={`${fid}-emp`}>Employee Code (6 digits)</label>
        <input
          id={`${fid}-emp`}
          className="input"
          value={empCode}
          onChange={(e) => setEmpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="e.g. 262010"
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          spellCheck={false}
          disabled={isEdit}
        />
        {empCode.length > 0 && !empCodeValid && <div className="help error">Employee Code must be 6 digits.</div>}
      </div>
      <div className="field">
        <label className="label" htmlFor={`${fid}-reason`}>Reason (shown to the employee)</label>
        <select id={`${fid}-reason`} className="input" value={reasonPreset} onChange={(e) => setReasonPreset(e.target.value)}>
          {reasonPresets.map((r) => <option key={r} value={r}>{splitReason(r).primary}</option>)}
          <option value="__custom__">Other (free text)…</option>
        </select>
        {reasonPreset === '__custom__' && (
          <textarea className="input textarea" value={reasonCustom} onChange={(e) => setReasonCustom(e.target.value)} placeholder="Enter a reason…" rows={3} style={{ marginTop: 'var(--s-2)' }} />
        )}
      </div>
      <div className="field">
        <label className="label" htmlFor={`${fid}-email`}>Email <span className="opt">(optional)</span></label>
        <input id={`${fid}-email`} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@cyberlogitec.com" autoComplete="off" spellCheck={false} />
      </div>
      <div className="field">
        <label className="label" htmlFor={`${fid}-name`}>Full name <span className="opt">(optional)</span></label>
        <input id={`${fid}-name`} className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
    </Drawer>
  );
}
