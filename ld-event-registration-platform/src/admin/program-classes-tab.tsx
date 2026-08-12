import { useEffect, useState } from 'react';
import {
  listProgramClasses, upsertProgramClass, deleteProgramClass, type UpsertClassInput,
} from '../lib/adminDb';
import type { ProgramClass } from '../lib/types';
import { useAdminMutation } from './use-admin-mutation';
import { useConfirm } from '../confirm-toast-provider';
import { captureError } from '../lib/monitoring';

// ── Pronunciation Program → Classes ──────────────────────────────────────────
// HR-managed cohorts (code + BU + PIC + mode). A PIC books sessions only for their
// own class(es). Writes go through admin callables; reads are direct (rules allow).

interface FormState {
  isNew: boolean;
  code: string;
  name: string;
  bu: string;
  picEmail: string;
  expectedSize: string;
  active: boolean;
}

const emptyForm = (bu: string): FormState => ({
  isNew: true, code: '', name: '', bu, picEmail: '', expectedSize: '', active: true,
});

export function ProgramClassesTab({ buList }: { buList: string[] }) {
  const [classes, setClasses] = useState<ProgramClass[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { busy, run } = useAdminMutation();
  const confirm = useConfirm();

  const reload = () => {
    listProgramClasses()
      .then(setClasses)
      .catch((e) => { setErr((e as Error).message); captureError(e, { operation: 'admin.listProgramClasses' }); });
  };
  useEffect(reload, []);

  const startCreate = () => setForm(emptyForm(buList[0] ?? ''));
  const startEdit = (c: ProgramClass) => setForm({
    isNew: false, code: c.code, name: c.name, bu: c.bu, picEmail: c.picEmail,
    expectedSize: c.expectedSize != null ? String(c.expectedSize) : '', active: c.active,
  });

  const save = async () => {
    if (!form) return;
    const input: UpsertClassInput = {
      code: form.code.trim(),
      name: form.name.trim(),
      bu: form.bu.trim(),
      picEmail: form.picEmail.trim().toLowerCase(),
      expectedSize: form.expectedSize.trim() ? Number(form.expectedSize) : null,
      active: form.active,
    };
    await run(() => upsertProgramClass(input), {
      successMessage: `Class "${input.code}" saved.`,
      fallbackError: 'Could not save the class.',
      onSuccess: () => { setForm(null); reload(); },
    });
  };

  const remove = async (c: ProgramClass) => {
    const ok = await confirm({
      title: `Delete class ${c.code}?`,
      message: 'This removes the cohort. If it has booked sessions, deletion is blocked — deactivate it instead.',
      confirmText: 'Delete class', cancelText: 'Keep', danger: true,
    });
    if (!ok) return;
    await run(() => deleteProgramClass(c.code), {
      successMessage: `Class "${c.code}" deleted.`, fallbackError: 'Could not delete the class.',
      onSuccess: reload,
    });
  };

  const toggleActive = (c: ProgramClass) => run(
    () => upsertProgramClass({ code: c.code, name: c.name, bu: c.bu, picEmail: c.picEmail, expectedSize: c.expectedSize, active: !c.active }),
    { successMessage: c.active ? `"${c.code}" deactivated.` : `"${c.code}" activated.`, onSuccess: reload },
  );

  if (err) return <div className="error-screen"><h2>Failed to load classes</h2><p>{err}</p><button className="btn" onClick={() => { setErr(null); reload(); }}>Retry</button></div>;
  if (!classes) return <div className="loading"><span className="spinner" /> Loading…</div>;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn" type="button" onClick={startCreate} disabled={!!form}>+ New class</button>
      </div>

      {form && (
        <section className="card set-group" style={{ marginBottom: 16 }}>
          <div className="set-group-hd"><div><div className="gt">{form.isNew ? 'New class' : `Edit ${form.code}`}</div><div className="gs">HR-assigned cohort for the Pronunciation Program.</div></div></div>
          <div className="cfg-grid">
            <label className="set-row stacked"><span className="set-label">Class code</span>
              <input className="input" value={form.code} disabled={!form.isNew} placeholder="EL001"
                onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
            <label className="set-row stacked"><span className="set-label">Class name <span className="text-muted" style={{ fontWeight: 400 }}>· optional</span></span>
              <input className="input" value={form.name} placeholder="Foundation"
                onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="set-row stacked"><span className="set-label">BU</span>
              <select className="select" value={form.bu} onChange={(e) => setForm({ ...form, bu: e.target.value })}>
                {!buList.includes(form.bu) && form.bu && <option value={form.bu}>{form.bu}</option>}
                {buList.map((b) => <option key={b} value={b}>{b}</option>)}
              </select></label>
            <label className="set-row stacked"><span className="set-label">PIC email</span>
              <input className="input" value={form.picEmail} placeholder="name@cyberlogitec.com"
                onChange={(e) => setForm({ ...form, picEmail: e.target.value })} /></label>
            <label className="set-row stacked"><span className="set-label">Capacity <span className="text-muted" style={{ fontWeight: 400 }}>· optional</span></span>
              <input className="input" type="number" min={1} value={form.expectedSize} placeholder="e.g. 8"
                onChange={(e) => setForm({ ...form, expectedSize: e.target.value })} /></label>
            <label className="set-row stacked"><span className="set-label">Active</span>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /></label>
          </div>
          <div className="row" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn ghost" type="button" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn" type="button" onClick={save} disabled={busy || !form.code.trim() || !form.bu.trim() || !form.picEmail.trim()}>
              {busy ? <><span className="spinner" /> Saving…</> : 'Save class'}
            </button>
          </div>
        </section>
      )}

      {classes.length === 0 ? (
        <div className="empty-state"><div className="es-title">No classes yet</div><div className="es-sub">Create a class so its PIC can start booking sessions.</div></div>
      ) : (
        <section className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left', opacity: 0.7 }}>
              <th style={{ padding: '8px 10px' }}>Code</th><th>Name</th><th>BU</th><th>PIC</th><th>Capacity</th><th>Status</th><th><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.code} style={{ borderTop: '1px solid var(--border,#2a2a2a)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{c.code}</td>
                  <td>{c.name || '—'}</td>
                  <td>{c.bu}</td>
                  <td>{c.picEmail}</td>
                  <td>{c.expectedSize ?? '—'}</td>
                  <td>{c.active ? 'Active' : 'Inactive'}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn ghost sm" type="button" onClick={() => startEdit(c)}>Edit</button>{' '}
                    <button className="btn ghost sm" type="button" onClick={() => toggleActive(c)} disabled={busy}>{c.active ? 'Deactivate' : 'Activate'}</button>{' '}
                    <button className="btn ghost sm" type="button" onClick={() => remove(c)} disabled={busy}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
