import { useEffect, useState } from 'react';
import {
  loadProgramConfig, upsertProgramConfig, listProgramBlackouts,
  setProgramBlackout, unsetProgramBlackout, setProgramBlackoutDay, unsetProgramBlackoutDay,
  type ProgramAdminConfig, type ProgramSlotConfig, type ProgramBlackout,
} from '../lib/adminDb';
import { minToHHmm, formatDateVi } from '../lib/types';
import { useAdminMutation } from './use-admin-mutation';
import { useConfirm } from '../confirm-toast-provider';
import { captureError } from '../lib/monitoring';

// ── Pronunciation Program → Settings ─────────────────────────────────────────
// HR edits the trainer, the weekly time grid, the registration window (open month +
// deadline), the caps + "fill mode" flag, and per-(date,slot) blackouts. All saved
// through admin callables (shape validated server-side; blackouts honour the
// "slot must be empty" guard).

const WEEKDAYS: [string, number][] = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 7]];
const pad = (n: number) => String(n).padStart(2, '0');

function slotsToText(slots: ProgramSlotConfig[]): string {
  return slots.map((s) => `${pad(s.sh)}:${pad(s.sm)}-${pad(s.eh)}:${pad(s.em)}`).join('\n');
}
function parseSlots(text: string): { slots: ProgramSlotConfig[]; error: string | null } {
  const slots: ProgramSlotConfig[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(line);
    if (!m) return { slots: [], error: `Invalid slot "${line}" — use HH:MM-HH:MM (e.g. 10:00-11:00).` };
    slots.push({ sh: +m[1], sm: +m[2], eh: +m[3], em: +m[4] });
  }
  return { slots, error: null };
}
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProgramSettingsTab() {
  const [cfg, setCfg] = useState<ProgramAdminConfig | null>(null);
  const [blackouts, setBlackouts] = useState<ProgramBlackout[]>([]);
  const [slotsText, setSlotsText] = useState('');
  const [deadlineLocal, setDeadlineLocal] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [blackDate, setBlackDate] = useState('');
  const [blackStart, setBlackStart] = useState<number | ''>('');
  const { busy, run } = useAdminMutation();
  const confirm = useConfirm();

  const reloadBlackouts = () => listProgramBlackouts().then(setBlackouts).catch((e) => captureError(e, { operation: 'admin.listProgramBlackouts' }));
  useEffect(() => {
    loadProgramConfig()
      .then((c) => { setCfg(c); setSlotsText(slotsToText(c.timeSlots)); setDeadlineLocal(isoToLocalInput(c.deadline)); })
      .catch((e) => { setErr((e as Error).message); captureError(e, { operation: 'admin.loadProgramConfig' }); });
    reloadBlackouts();
  }, []);

  if (err) return <div className="error-screen"><h2>Failed to load settings</h2><p>{err}</p></div>;
  if (!cfg) return <div className="loading"><span className="spinner" /> Loading…</div>;

  const set = (patch: Partial<ProgramAdminConfig>) => { setCfg({ ...cfg, ...patch }); setDirty(true); };
  const toggleWeekday = (d: number) => {
    const has = cfg.weekdays.includes(d);
    set({ weekdays: (has ? cfg.weekdays.filter((x) => x !== d) : [...cfg.weekdays, d]).sort((a, b) => a - b) });
  };

  const save = async () => {
    const { slots, error } = parseSlots(slotsText);
    if (error) { setErr(null); return run(() => Promise.reject(new Error(error)), { fallbackError: error }); }
    const input: ProgramAdminConfig = {
      ...cfg,
      timeSlots: slots,
      deadline: deadlineLocal ? `${deadlineLocal}:00+07:00` : null,
    };
    await run(() => upsertProgramConfig(input), {
      successMessage: 'Program settings saved.', fallbackError: 'Could not save settings.',
      onSuccess: () => { setCfg(input); setDirty(false); },
    });
  };

  const addBlackout = async () => {
    if (!blackDate || blackStart === '') return;
    await run(() => setProgramBlackout(blackDate, Number(blackStart)), {
      successMessage: 'Blackout added.', fallbackError: 'Could not add blackout.',
      onSuccess: () => { setBlackDate(''); setBlackStart(''); reloadBlackouts(); },
    });
  };
  const removeBlackout = async (b: ProgramBlackout) => {
    const ok = await confirm({ title: 'Remove blackout?', message: `Re-open ${b.date} ${minToHHmm(b.startMin)} for booking?`, confirmText: 'Remove' });
    if (!ok) return;
    await run(() => unsetProgramBlackout(b.date, b.startMin), { successMessage: 'Blackout removed.', onSuccess: reloadBlackouts });
  };
  const addBlackoutDay = async () => {
    if (!blackDate) return;
    await run(() => setProgramBlackoutDay(blackDate), {
      successMessage: (r) => (r.skippedSlots.length
        ? `Blocked ${r.blocked} slot${r.blocked === 1 ? '' : 's'}. ${r.skippedSlots.length} already booked — cancel ${r.skippedSlots.length === 1 ? 'it' : 'them'} to block the whole day.`
        : `Blocked the whole day (${r.blocked} slot${r.blocked === 1 ? '' : 's'}).`),
      fallbackError: 'Could not block the day.',
      onSuccess: () => { setBlackStart(''); reloadBlackouts(); },
    });
  };
  const removeBlackoutDay = async (date: string, count: number) => {
    const ok = await confirm({ title: 'Re-open this day?', message: `Remove all ${count} blackout${count === 1 ? '' : 's'} on ${formatDateVi(date)}?`, confirmText: 'Re-open day' });
    if (!ok) return;
    await run(() => unsetProgramBlackoutDay(date), { successMessage: 'Day re-opened.', onSuccess: reloadBlackouts });
  };

  const slotOptions = cfg.timeSlots.map((s) => ({ startMin: s.sh * 60 + s.sm, label: `${pad(s.sh)}:${pad(s.sm)}–${pad(s.eh)}:${pad(s.em)}` }));

  // Group the flat blackout cells by date so HR sees "one day, N slots" with a
  // single re-open action — and an out-of-open-month hint that explains the exact
  // pitfall of blacking out a date PICs can't reach (booking is openMonth-only).
  const blackoutDays = Array.from(
    blackouts.reduce((m, b) => m.set(b.date, [...(m.get(b.date) ?? []), b.startMin]), new Map<string, number[]>()).entries(),
  )
    .map(([date, starts]) => ({ date, starts: starts.sort((a, b) => a - b) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const blackOutsideOpenMonth = !!blackDate && !!cfg.openMonth && blackDate.slice(0, 7) !== cfg.openMonth;

  return (
    <>
      <section className="card set-group">
        <div className="set-group-hd"><div><div className="gt">Trainer & time grid</div><div className="gs">One trainer; the grid is fail-closed (empty = nothing bookable).</div></div></div>
        <div className="cfg-grid">
          <label className="set-row stacked"><span className="set-label">Trainer name</span>
            <input className="input" value={cfg.trainerName} onChange={(e) => set({ trainerName: e.target.value })} placeholder="Shirly San Juan" /></label>
          <label className="set-row stacked"><span className="set-label">Time slots <span className="text-muted" style={{ fontWeight: 400 }}>· one per line, HH:MM-HH:MM</span></span>
            <textarea className="input textarea" value={slotsText} spellCheck={false}
              onChange={(e) => { setSlotsText(e.target.value); setDirty(true); }} placeholder={'10:00-11:00\n11:00-12:00\n13:00-14:00'} /></label>
        </div>
        <div className="set-row stacked"><span className="set-label">Open weekdays</span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {WEEKDAYS.map(([label, d]) => (
              <label key={d} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input type="checkbox" checked={cfg.weekdays.includes(d)} onChange={() => toggleWeekday(d)} />{label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="card set-group" style={{ marginTop: 16 }}>
        <div className="set-group-hd"><div><div className="gt">Registration window & caps</div><div className="gs">PICs self-serve only inside the open month, before the deadline.</div></div></div>
        <div className="cfg-grid">
          <label className="set-row stacked"><span className="set-label">Open month</span>
            <input className="input" type="month" value={cfg.openMonth ?? ''} onChange={(e) => set({ openMonth: e.target.value || null })} /></label>
          <label className="set-row stacked"><span className="set-label">Registration deadline</span>
            <input className="input" type="datetime-local" value={deadlineLocal} onChange={(e) => { setDeadlineLocal(e.target.value); setDirty(true); }} /></label>
          <label className="set-row stacked"><span className="set-label">Monthly cap / class</span>
            <input className="input" type="number" min={1} value={cfg.monthlyCap} onChange={(e) => set({ monthlyCap: Number(e.target.value) })} /></label>
          <label className="set-row stacked"><span className="set-label">Weekly cap / class</span>
            <input className="input" type="number" min={1} value={cfg.weeklyCap} onChange={(e) => set({ weeklyCap: Number(e.target.value) })} /></label>
          <label className="set-row stacked"><span className="set-label">Fill mode <span className="text-muted" style={{ fontWeight: 400 }}>· relaxes the weekly cap (Phase 2)</span></span>
            <input type="checkbox" checked={cfg.fillMode} onChange={(e) => set({ fillMode: e.target.checked })} /></label>
          <label className="set-row stacked"><span className="set-label">Confirmation email <span className="text-muted" style={{ fontWeight: 400 }}>· email the PIC on book / move / cancel</span></span>
            <input type="checkbox" checked={cfg.emailConfirm} onChange={(e) => set({ emailConfirm: e.target.checked })} /></label>
        </div>
      </section>

      <section className="card set-group" style={{ marginTop: 16 }}>
        <div className="set-group-hd"><div><div className="gt">Blackouts</div><div className="gs">Block a single slot or a whole day — holiday or trainer leave. Booked slots must be cancelled first.</div></div></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label className="set-row stacked" style={{ margin: 0 }}><span className="set-label">Date</span>
            <input className="input" type="date" value={blackDate} onChange={(e) => setBlackDate(e.target.value)} /></label>
          <label className="set-row stacked" style={{ margin: 0 }}><span className="set-label">Slot</span>
            <select className="select" value={blackStart} onChange={(e) => setBlackStart(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Whole day…</option>
              {slotOptions.map((s) => <option key={s.startMin} value={s.startMin}>{s.label}</option>)}
            </select></label>
          {blackStart === ''
            ? <button className="btn" type="button" onClick={addBlackoutDay} disabled={busy || !blackDate}>Block whole day</button>
            : <button className="btn" type="button" onClick={addBlackout} disabled={busy || !blackDate}>Add blackout</button>}
        </div>
        {blackOutsideOpenMonth && (
          <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
            Heads up: {formatDateVi(blackDate)} is outside the open booking month ({cfg.openMonth}). PICs book inside the open month only, so a blackout here has no visible effect until that month is open.
          </p>
        )}
        {blackoutDays.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {blackoutDays.map(({ date, starts }) => (
              <li key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 10px', border: '1px solid var(--border,#2a2a2a)', borderRadius: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {formatDateVi(date)}
                    {slotOptions.length > 0 && starts.length === slotOptions.length && <span className="text-muted" style={{ fontWeight: 400 }}> · whole day</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {starts.map((sm) => (
                      <button key={sm} type="button" title="Remove this slot" disabled={busy}
                        onClick={() => removeBlackout({ date, startMin: sm })}
                        style={{ fontSize: 12, padding: '2px 8px', border: '1px solid var(--border,#2a2a2a)', borderRadius: 999, background: 'transparent', cursor: 'pointer' }}>
                        {minToHHmm(sm)} ✕
                      </button>
                    ))}
                  </div>
                </div>
                {starts.length > 1 && (
                  <button className="btn ghost sm" type="button" onClick={() => removeBlackoutDay(date, starts.length)} disabled={busy}>Re-open day</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="save-bar">
        <div className="save-bar-inner">
          <div className={`save-status${dirty ? ' dirty' : ''}`}><span className="sdot"></span><span>{dirty ? 'Unsaved changes' : 'No changes'}</span></div>
          <button className="btn" type="button" onClick={save} disabled={busy || !dirty}>{busy ? <><span className="spinner" /> Saving…</> : 'Save settings'}</button>
        </div>
      </div>
    </>
  );
}
