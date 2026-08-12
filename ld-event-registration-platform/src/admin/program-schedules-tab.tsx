import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadProgramConfig, listAllProgramSessions, listProgramBlackouts, listProgramClasses,
  type ProgramAdminConfig, type ProgramBlackout,
} from '../lib/adminDb';
import { bookSession, moveSession, cancelSession } from '../lib/programDb';
import {
  minToHHmm, slotConfigToMinutes, formatDateVi,
  type ProgramConfig, type ProgramSession, type ProgramClass, type ProgramActionResult,
} from '../lib/types';
import { buildProgramWeek, mondayOf, addDays, assignSequenceByClass, type GridCell } from '../lib/program-grid';
import { ProgramScheduleGrid } from './program-schedule-grid';
import { ProgramBookDrawer } from '../program/program-book-drawer';
import { useToast, useConfirm } from '../confirm-toast-provider';
import { captureError } from '../lib/monitoring';

// ── Pronunciation Program → Schedules ────────────────────────────────────────
// Editable weekly overview of the single trainer's calendar. HR sees every class's
// booked sessions across the configured weekdays and can act on the shared calendar:
//   - click a booked cell  → move (reschedule) or cancel that PIC's session;
//   - click an empty cell   → book a session on a PIC's behalf (pick any active class).
// All three go through the same callables PICs use (book/move/cancelProgramSession),
// which already grant admins the override; the PIC is always notified by email.

const todayKey = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local (VN)

function toProgramConfig(cfg: ProgramAdminConfig): ProgramConfig {
  return {
    trainerName: cfg.trainerName,
    timeSlots: cfg.timeSlots
      .map((s) => {
        const m = slotConfigToMinutes(s);
        return m ? { ...m, label: `${minToHHmm(m.startMin)}–${minToHHmm(m.endMin)}` } : null;
      })
      .filter((s): s is { startMin: number; endMin: number; label: string } => s != null),
    weekdays: cfg.weekdays, openMonth: cfg.openMonth, deadline: cfg.deadline,
    fillMode: cfg.fillMode, monthlyCap: cfg.monthlyCap, weeklyCap: cfg.weeklyCap,
  };
}

type Drawer = { kind: 'create'; cell: GridCell } | { kind: 'manage'; session: ProgramSession } | null;

export function ProgramSchedulesTab() {
  const [cfg, setCfg] = useState<ProgramAdminConfig | null>(null);
  const [sessions, setSessions] = useState<ProgramSession[]>([]);
  const [blackouts, setBlackouts] = useState<ProgramBlackout[]>([]);
  const [classes, setClasses] = useState<ProgramClass[]>([]);
  const [monday, setMonday] = useState(() => mondayOf(todayKey()));
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0); // bump to refetch the visible week after a mutation
  const [err, setErr] = useState<string | null>(null);
  const didJumpToOpenMonth = useRef(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    loadProgramConfig().then(setCfg).catch((e) => { setErr((e as Error).message); captureError(e, { operation: 'admin.loadProgramConfig' }); });
    listProgramBlackouts().then(setBlackouts).catch((e) => captureError(e, { operation: 'admin.listProgramBlackouts' }));
    listProgramClasses().then(setClasses).catch((e) => captureError(e, { operation: 'admin.listProgramClasses' }));
  }, []);

  // Land on the open booking month once config loads — Sessions can only exist in
  // `openMonth` (the window enforces it), which is usually NOT the current real-world
  // week, so defaulting to "today" shows an empty grid. Mirrors the PIC booking screen.
  // One-shot (ref guard) so HR's manual ←/→ navigation afterwards is never overridden.
  useEffect(() => {
    if (cfg && !didJumpToOpenMonth.current && cfg.openMonth) {
      didJumpToOpenMonth.current = true;
      setMonday(mondayOf(`${cfg.openMonth}-01`));
    }
  }, [cfg]);

  // Load EVERY session (not just the visible week's month) so the #N order per class is
  // global — matching what each PIC sees. Week nav just re-slices the loaded set; `tick`
  // forces a refetch after an HR book/move/cancel.
  useEffect(() => {
    listAllProgramSessions()
      .then(setSessions)
      .catch((e) => captureError(e, { operation: 'admin.listProgramSessions' }));
  }, [tick]);

  const program = useMemo(() => (cfg ? toProgramConfig(cfg) : null), [cfg]);
  // Stamp each session with its #N order within its class (chronological) so the grid
  // shows the same sequence a PIC sees on their booking screen.
  const sessionsSeq = useMemo(() => assignSequenceByClass(sessions), [sessions]);
  // myClassCodes: [] → every booked cell is 'taken' (the admin owns none); window omitted
  // → empty cells stay 'bookable'/'past' (HR may book any of them on a PIC's behalf).
  const week = useMemo(() => (program
    ? buildProgramWeek({ monday, program, sessions: sessionsSeq, blackouts, myClassCodes: [], nowMs: Date.now() })
    : null), [program, monday, sessionsSeq, blackouts]);

  const reload = () => setTick((t) => t + 1);
  async function runMutation(fn: () => Promise<ProgramActionResult>, okMsg: string): Promise<void> {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) { toast('error', res.error || 'Action failed.'); return; }
      toast('success', okMsg);
      setDrawer(null);
      reload();
    } finally { setBusy(false); }
  }
  const handleBook = (input: Parameters<typeof bookSession>[0]) => runMutation(() => bookSession(input), 'Session booked. The PIC has been notified.');
  const handleMove = (input: Parameters<typeof moveSession>[0]) => runMutation(() => moveSession(input), 'Session updated. The PIC has been notified.');
  const handleCancel = async (session: ProgramSession) => {
    const ok = await confirm({
      title: 'Cancel this session?',
      message: `Cancel ${session.classCode} on ${formatDateVi(session.date)} at ${minToHHmm(session.startMin)}? The PIC will be notified.`,
      confirmText: 'Cancel session',
    });
    if (!ok) return;
    await runMutation(() => cancelSession(session.sessionId), 'Session cancelled. The PIC has been notified.');
  };

  const onCellClick = (cell: GridCell) => {
    if (cell.session) setDrawer({ kind: 'manage', session: cell.session });
    else if (cell.state !== 'blackout') setDrawer({ kind: 'create', cell }); // empty, bookable/past
  };

  if (err) return <div className="error-screen"><h2>Failed to load schedules</h2><p>{err}</p></div>;
  if (!cfg || !program || !week) return <div className="loading"><span className="spinner" /> Loading…</div>;

  const range = week.days.length
    ? `${formatDateVi(week.days[0].date)} — ${formatDateVi(week.days[week.days.length - 1].date)}`
    : '';
  const selectedKey = drawer?.kind === 'create' ? drawer.cell.key : drawer?.kind === 'manage' ? drawer.session.sessionId : null;
  const activeClasses = classes.filter((c) => c.active);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 6px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn ghost sm" type="button" aria-label="Previous week" title="Previous week" onClick={() => setMonday(addDays(monday, -7))}>←</button>
          <b>{range}</b>
          <button className="btn ghost sm" type="button" aria-label="Next week" title="Next week" onClick={() => setMonday(addDays(monday, 7))}>→</button>
          <button className="btn ghost sm" type="button" onClick={() => setMonday(mondayOf(todayKey()))}>Today</button>
        </div>
        <span className="text-muted" style={{ fontSize: 13 }}>Trainer: <b>{program.trainerName || '—'}</b></span>
      </div>
      <p className="text-muted" style={{ fontSize: 12, margin: '0 0 12px' }}>
        Click a session to reschedule or cancel it, or an empty cell to book on a PIC's behalf. The PIC is emailed about any change.
      </p>

      <ProgramScheduleGrid week={week} onCellClick={onCellClick} selectedKey={selectedKey} />

      {drawer?.kind === 'create' && (
        <ProgramBookDrawer
          program={program}
          create={{ date: drawer.cell.date, startMin: drawer.cell.startMin, endMin: drawer.cell.endMin }}
          classes={activeClasses}
          defaultClassCode=""
          busy={busy}
          onBook={handleBook}
          onMove={() => {}}
          onCancel={() => {}}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer?.kind === 'manage' && (() => {
        const session = sessionsSeq.find((s) => s.sessionId === drawer.session.sessionId) ?? drawer.session;
        return (
          <ProgramBookDrawer
            program={program}
            manage={session}
            showOwner
            busy={busy}
            onBook={() => {}}
            onMove={handleMove}
            onCancel={() => handleCancel(session)}
            onClose={() => setDrawer(null)}
          />
        );
      })()}
    </>
  );
}
