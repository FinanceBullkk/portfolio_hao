import { useEffect, useMemo, useState } from 'react';
import type { ProgramInitResult, ProgramSession } from '../lib/types';
import { initProgram, bookSession, moveSession, cancelSession, type BookSessionInput, type MoveSessionInput } from '../lib/programDb';
import { buildProgramWeek, mondayOf, addDays, lastDateOfMonth, type GridCell } from '../lib/program-grid';
import { ProgramWeekGrid } from './program-week-grid';
import { ProgramBookDrawer } from './program-book-drawer';
import { DarkNav, IconChevL } from '../events/dark/dark-chrome';
import { useToast } from '../confirm-toast-provider';
import { captureError, friendlyFirestoreError } from '../lib/monitoring';
import { formatMonthYear, formatDate, formatTime } from '../lib/format-date';

// PIC-facing booking screen for the Pronunciation Program: a weekly Mon–Fri grid of
// the shared trainer calendar. The PIC books empty cells for their class, edits/moves
// or cancels their own sessions. The server is the source of truth — every action
// returns fresh state which we render.

type Drawer = { kind: 'create'; cell: GridCell } | { kind: 'manage'; session: ProgramSession } | null;

export function ProgramBookingScreen({
  email, canAdmin, onOpenAdmin, onSignOut, onEditProfile, onViewHistory, onBack,
}: {
  email: string;
  canAdmin: boolean;
  onOpenAdmin: () => void;
  onSignOut: () => void;
  onEditProfile: () => void;
  onViewHistory?: () => void;
  onBack: () => void;
}) {
  const [data, setData] = useState<ProgramInitResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [monday, setMonday] = useState<string | null>(null);
  // The last class the PIC booked for — seeds the in-drawer class picker so a multi-class
  // PIC doesn't re-pick every time. The class is chosen inside the booking drawer now.
  const [lastClass, setLastClass] = useState('');
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = () => {
    setErr(null);
    initProgram()
      .then((d) => {
        setData(d);
        setLastClass((cur) => cur || d.myClasses[0]?.code || '');
        setMonday((cur) => cur || mondayOf(d.program.openMonth ? `${d.program.openMonth}-01` : new Date(d.clientNow).toISOString().slice(0, 10)));
      })
      .catch((e: Error) => { captureError(e, { operation: 'initProgram' }); setErr(friendlyFirestoreError(e) || 'Failed to load the program.'); });
  };
  useEffect(load, []);

  const week = useMemo(() => {
    if (!data || !monday) return null;
    return buildProgramWeek({
      monday,
      program: data.program,
      sessions: data.sessions,
      blackouts: data.blackouts,
      myClassCodes: data.myClasses.map((c) => c.code),
      nowMs: Date.parse(data.clientNow),
      // Lock cells outside the open registration month / past the deadline so the grid
      // matches what the server will accept (windowState in program-booking-rules.js).
      window: {
        bookingMonth: data.program.openMonth,
        open: !!data.program.openMonth && !data.program.deadlinePassed,
      },
    });
  }, [data, monday]);

  const topbar = (
    <DarkNav email={email} onHome={onBack} menu={{ canAdmin, onOpenAdmin, onEditProfile, onViewHistory, onSignOut }} />
  );

  if (err) {
    return <div className="app">{topbar}<main className="container"><div className="error-screen"><h1>Couldn’t load the program</h1><p>{err}</p><div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}><button className="btn" onClick={load}>Try again</button><button className="btn ghost" onClick={onBack}>← Back</button></div></div></main></div>;
  }
  if (!data || !week || !monday) {
    return <div className="app">{topbar}<main className="container"><div className="loading"><span className="spinner" /> Loading…</div></main></div>;
  }

  const isPic = data.myClasses.length > 0;

  async function handleBook(input: BookSessionInput) {
    setBusy(true);
    const res = await bookSession(input);
    if (res.state) setData(res.state);
    setBusy(false);
    if (!res.ok) { toast('error', res.error || 'Booking failed.'); return; }
    setLastClass(input.classCode); // remember for the next booking's drawer default
    toast('success', res.warning ? `Booked. ${res.warning}` : 'Booked.');
    setDrawer(null);
  }

  async function handleMove(input: MoveSessionInput) {
    setBusy(true);
    try {
      const res = await moveSession(input);
      if (res.state) setData(res.state);
      if (!res.ok) { toast('error', res.error || 'Update failed.'); return; }
      toast('success', res.warning ? `Updated. ${res.warning}` : 'Updated.');
      setDrawer(null);
    } finally { setBusy(false); }
  }

  async function handleCancel(session: ProgramSession) {
    setBusy(true);
    try {
      const res = await cancelSession(session.sessionId);
      if (res.state) setData(res.state);
      if (!res.ok) { toast('error', res.error || 'Cancel failed.'); return; }
      setDrawer(null);
      toast('success', 'Cancelled.');
    } finally { setBusy(false); }
  }

  const onCellClick = (cell: GridCell) => {
    if (cell.state === 'bookable') {
      if (!isPic) { toast('error', 'You are not assigned as a PIC for any class.'); return; }
      setDrawer({ kind: 'create', cell });
    } else if (cell.state === 'mine' && cell.session) {
      setDrawer({ kind: 'manage', session: cell.session });
    }
  };

  // P1-7: the PIC's own sessions in the loaded week — the drawer uses these to warn
  // before a move lands two sessions of theirs in the same time slot (the trainer
  // can't run two 1:1s at once). Server stays the final authority on cell uniqueness.
  const myCodes = new Set(data.myClasses.map((c) => c.code));
  const mySessions = data.sessions.filter((s) => myCodes.has(s.classCode));

  // VN calendar date of "now" (server clock) — drives the grid's today-column tint and
  // the Today jump. Shift the instant by +07:00 then read the UTC date portion.
  const todayVN = new Date(Date.parse(data.clientNow) + 7 * 3600 * 1000).toISOString().slice(0, 10);
  // Compact dd/MM from a YYYY-MM-DD key (audit P0-1: consistent dd/MM family).
  const dm = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;
  const first = week.days[0]?.date;
  const last = week.days[week.days.length - 1]?.date;
  const weekLabel = first && last
    ? `${dm(first)} – ${dm(last)}/${last.slice(0, 4)}`
    : `Week of ${monday}`;
  // The cell whose drawer is open — the grid draws a ring around it.
  const selectedKey = drawer?.kind === 'create' ? drawer.cell.key
    : drawer?.kind === 'manage' ? drawer.session.sessionId
    : null;

  // Confine week navigation to the open registration month so the PIC can't page into
  // months the server won't accept. No open month ⇒ nav stays free (grid is all-locked).
  const navMin = data.program.openMonth ? mondayOf(`${data.program.openMonth}-01`) : null;
  const navMax = data.program.openMonth ? mondayOf(lastDateOfMonth(data.program.openMonth)) : null;
  const clampMonday = (m: string) => (navMin && m < navMin ? navMin : navMax && m > navMax ? navMax : m);
  const canPrev = !navMin || monday > navMin;
  const canNext = !navMax || monday < navMax;

  return (
    <div className="app">
      {topbar}
      <main className="container wide">
        <button type="button" className="c7d-back" onClick={onBack}><IconChevL /> Back</button>
        <div className="lc-head">
          <div>
            <h1>Pronunciation Program</h1>
            <p>
              Trainer: <b>{data.program.trainerName || '—'}</b>
              {data.program.openMonth && <> · Booking open for <b>{formatMonthYear(data.program.openMonth)}</b></>}
              {!data.program.deadlinePassed && data.program.deadline && <> · closes <b>{formatDate(data.program.deadline)} · {formatTime(data.program.deadline)}</b></>}
              {data.program.deadlinePassed && <> · <span style={{ color: 'var(--danger,#d66)' }}>registration closed</span></>}
            </p>
          </div>
        </div>

        {!isPic && (
          <div className="card" style={{ marginBottom: 12 }}><div className="card-bd"><p className="text-sm text-muted">You can view the trainer calendar, but only an assigned PIC can book. Contact HR if your class is missing.</p></div></div>
        )}

        <div className="pg-nav">
          <button className="btn ghost sm" type="button" disabled={!canPrev} onClick={() => setMonday(clampMonday(addDays(monday, -7)))} aria-label="Previous week">← Prev</button>
          <div className="pg-nav-mid">
            <span className="pg-week">{weekLabel}</span>
            <button className="btn ghost sm" type="button" onClick={() => setMonday(clampMonday(mondayOf(todayVN)))}>Today</button>
          </div>
          <button className="btn ghost sm" type="button" disabled={!canNext} onClick={() => setMonday(clampMonday(addDays(monday, 7)))} aria-label="Next week">Next →</button>
        </div>

        <ProgramWeekGrid week={week} todayDate={todayVN} selectedKey={selectedKey} onCellClick={onCellClick} readOnly={!isPic} />

        {/* P1-6: every cell state — including the blue "selected" ring — is in the
            legend, so users can decode the grid without guessing. */}
        <div className="pg-legend">
          <span className="lg"><span className="sw mine" />Your session — click to edit/cancel</span>
          <span className="lg"><span className="sw bookable" />Available — click to book</span>
          <span className="lg"><span className="sw taken" />Taken by another class</span>
          <span className="lg"><span className="sw blackout" />Unavailable (blackout)</span>
          <span className="lg"><span className="sw" style={{ background: 'none', color: 'var(--ink-400)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>—</span>Past — no longer bookable</span>
          <span className="lg"><span className="sw sel" />Selected — open in the panel</span>
        </div>
      </main>

      {drawer?.kind === 'create' && (
        <ProgramBookDrawer
          program={data.program}
          create={{ date: drawer.cell.date, startMin: drawer.cell.startMin, endMin: drawer.cell.endMin }}
          classes={data.myClasses}
          defaultClassCode={lastClass}
          mySessions={mySessions}
          busy={busy}
          onBook={handleBook}
          onMove={() => {}}
          onCancel={() => {}}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer?.kind === 'manage' && (() => {
        // Re-derive from fresh state so the drawer reflects the latest move/edit.
        const session = data.sessions.find((s) => s.sessionId === drawer.session.sessionId) ?? drawer.session;
        return (
          <ProgramBookDrawer
            program={data.program}
            manage={session}
            mySessions={mySessions}
            busy={busy}
            onBook={() => {}}
            onMove={handleMove}
            onCancel={() => handleCancel(session)}
            onClose={() => setDrawer(null)}
          />
        );
      })()}
    </div>
  );
}
