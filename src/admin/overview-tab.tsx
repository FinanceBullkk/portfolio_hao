import { useEffect, useMemo, useState } from 'react';
import { formatDateVi, type EventDoc, type Slot } from '../lib/types';
import { listEventRegistrations, listEventSlots, type EventRegistrationRow } from '../lib/adminDb';
import { dowVi } from './admin-utils';

// ── Overview dashboard (Corgi7 Redesign.dc.html · screen 06) ──────────────────
// Event-scoped KPI dashboard: fill KPIs, capacity-by-day (slotted), and recent
// registrations. Driven by the same header event picker as Registrations/Slots.

const sum = (arr: Slot[], k: 'capacity' | 'remaining') => arr.reduce((a, s) => a + s[k], 0);

/** A compact day label for a slot id, e.g. "Tue 24/06". '—' when unset/missing. */
function slotDay(map: Map<string, Slot>, id: string | null): string {
  if (!id) return '—';
  const s = map.get(id);
  return s ? `${dowVi(s.date)} ${formatDateVi(s.date)}` : '—';
}

export function OverviewTab({ event }: { event: EventDoc }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [regs, setRegs] = useState<EventRegistrationRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const slotted = event.type === 'slotted';

  useEffect(() => {
    setErr(null); setSlots(null); setRegs(null);
    listEventRegistrations(event.eventId).then(setRegs).catch((e: Error) => setErr(e.message));
    if (slotted) listEventSlots(event.eventId).then(setSlots).catch(() => setSlots([]));
    else setSlots([]);
  }, [event.eventId, slotted]);

  const slotMap = useMemo(() => new Map((slots ?? []).map((s) => [s.slotId, s])), [slots]);

  if (err) return <div className="panel"><p style={{ color: 'var(--danger)', padding: 'var(--s-5)' }}>{err}</p></div>;
  if (!regs || !slots) return <div className="panel"><div className="loading" style={{ padding: 'var(--s-6)' }}><span className="spinner" /> Loading…</div></div>;

  const totalRegs = regs.length;
  const recent = [...regs]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 5);

  // ── Slotted KPIs (Speaking / 3 Skills fill + per-day capacity) ──
  const sp = slots.filter((s) => s.type === 'Speaking');
  const sk = slots.filter((s) => s.type === '3 Skills');
  const spCap = sum(sp, 'capacity'), skCap = sum(sk, 'capacity');
  const spBooked = spCap - sum(sp, 'remaining'), skBooked = skCap - sum(sk, 'remaining');
  const spPct = spCap ? Math.round((spBooked / spCap) * 100) : 0;
  const skPct = skCap ? Math.round((skBooked / skCap) * 100) : 0;
  const freeSp = spCap - spBooked, freeSk = skCap - skBooked;

  const days = [...new Set(slots.map((s) => s.date))].sort();
  const byDay = days.map((d) => {
    const ds = slots.filter((s) => s.date === d);
    const cap = sum(ds, 'capacity');
    const booked = cap - sum(ds, 'remaining');
    return { d, dow: dowVi(d), cap, booked, pct: cap ? Math.round((booked / cap) * 100) : 0 };
  });

  // ── Simple KPIs (single seat pool) ──
  const cap = event.capacity ?? 0;
  const remaining = Math.max(0, event.remaining ?? 0);
  const used = cap > 0 ? Math.max(0, cap - remaining) : totalRegs;
  const simplePct = cap > 0 ? Math.round((used / cap) * 100) : 0;

  return (
    <>
      <div className="statbar">
        {slotted ? (
          <>
            <div className="stat"><div className="k">Total registrations</div><div className="v">{totalRegs}</div><div className="ctx">of {spCap + skCap} available seats</div></div>
            <div className="stat"><div className="k">Speaking fill</div><div className="v">{spPct}<small>%</small></div><div className="ctx"><span className="mini-bar"><span className="mini-fill" style={{ width: `${spPct}%` }} /></span>{spBooked}/{spCap}</div></div>
            <div className="stat accent"><div className="k">3 Skills fill</div><div className="v">{skPct}<small>%</small></div><div className="ctx"><span className="mini-bar"><span className="mini-fill" style={{ width: `${skPct}%` }} /></span>{skBooked}/{skCap}</div></div>
            <div className="stat"><div className="k">Seats remaining</div><div className="v">{freeSp + freeSk}</div><div className="ctx">{freeSp} Speaking · {freeSk} 3 Skills</div></div>
          </>
        ) : (
          <>
            <div className="stat"><div className="k">Total registrations</div><div className="v">{totalRegs}</div><div className="ctx">{cap > 0 ? `of ${cap} seats` : 'no capacity set'}</div></div>
            <div className="stat"><div className="k">Fill</div><div className="v">{simplePct}<small>%</small></div><div className="ctx"><span className="mini-bar"><span className="mini-fill" style={{ width: `${simplePct}%` }} /></span>{used}/{cap || '—'}</div></div>
            <div className="stat"><div className="k">Seats remaining</div><div className="v">{cap > 0 ? remaining : '—'}</div><div className="ctx">{event.allowEnrollment ? 'Enrollment open' : 'Enrollment closed'}</div></div>
          </>
        )}
      </div>

      <div className="ov-grid">
        {slotted && (
          <div className="panel">
            <div className="panel-hd"><span className="pt">Capacity by day</span><span className="text-sm text-muted">booked / total</span></div>
            <div style={{ padding: 'var(--s-2) var(--s-5) var(--s-4)' }}>
              {byDay.length === 0 && <div className="empty-state"><div className="es-title">No slots yet</div></div>}
              {byDay.map((b) => (
                <div key={b.d} className="ov-day">
                  <div className="ov-day-lbl"><span className="strong">{b.dow}</span> <span className="text-sm text-muted">{formatDateVi(b.d)}</span></div>
                  <div className="cap-track" style={{ maxWidth: 'none', flex: 1, height: 9 }}><span className={`cap-fill${b.pct >= 100 ? ' full' : b.pct >= 75 ? ' warn' : ''}`} style={{ width: `${b.pct}%` }} /></div>
                  <div className="cap-num ov-day-num"><b>{b.booked}</b>/{b.cap} <span className="text-muted">· {b.pct}%</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panel-hd"><span className="pt">Recent registrations</span><span className="text-sm text-muted">{totalRegs} total</span></div>
          {recent.length === 0 ? (
            <div className="empty-state"><div className="es-title">Nobody has registered yet</div></div>
          ) : (
            <table className="dgrid">
              <thead><tr><th>Name</th><th>BU</th>{slotted && <th>Slots</th>}<th className="num">Status</th></tr></thead>
              <tbody>
                {recent.map((r) => {
                  const both = !!r.speakingSlotId && !!r.skillsSlotId;
                  const partial = !both && (!!r.speakingSlotId || !!r.skillsSlotId);
                  return (
                    <tr key={r.email}>
                      <td><div className="id-cell"><span className="nm">{r.fullName || '—'}</span><span className="mt">{r.empCode || r.email}</span></div></td>
                      <td>{r.bu ? <span className="pill">{r.bu}</span> : <span className="empty-dash">—</span>}</td>
                      {slotted && <td className="text-sm text-muted tnum">{slotDay(slotMap, r.speakingSlotId)} · {slotDay(slotMap, r.skillsSlotId)}</td>}
                      <td className="num">
                        {slotted
                          ? both ? <span className="pill success">Both</span> : partial ? <span className="pill warn">Partial</span> : <span className="empty-dash">—</span>
                          : <span className="pill success">Registered</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
