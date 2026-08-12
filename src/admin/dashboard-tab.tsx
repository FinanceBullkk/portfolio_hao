import { useMemo } from 'react';
import type { EventDoc } from '../lib/types';
import type { EventStat, MailEntry } from '../lib/adminDb';
import type { AuditEntry } from '../lib/audit';
import { deadlineInfo, lifecycleOf } from './event-fill';

// ── Global Dashboard (admin landing · Admin v2.dc.html screen 01) ─────────────
// Cross-event KPIs + a "Needs attention" strip + two feeds (events filling up /
// recent activity). All data is already loaded by AdminPanel — this component is
// pure derivation + presentation, no new reads or callables (audit A1/A4).

/** Aggregate fill % for one event (simple: seat pool; slotted: all slot seats). */
function eventFillPct(ev: EventDoc, stat: EventStat | undefined): number | null {
  if (ev.type === 'simple') {
    const cap = ev.capacity ?? 0;
    if (cap <= 0) return null;
    return Math.round((Math.max(0, cap - (ev.remaining ?? 0)) / cap) * 100);
  }
  if (!stat) return null;
  const cap = (stat.speaking?.capacity ?? 0) + (stat.skills?.capacity ?? 0);
  if (cap <= 0) return null;
  const booked = (stat.speaking?.booked ?? 0) + (stat.skills?.booked ?? 0);
  return Math.round((booked / cap) * 100);
}

function regCount(ev: EventDoc, stat: EventStat | undefined): number {
  if (ev.type === 'simple') return ev.capacity != null ? Math.max(0, ev.capacity - (ev.remaining ?? 0)) : 0;
  return stat?.registrations ?? 0;
}

const VERB: Record<string, string> = {
  'book.create': 'registered',
  'book.update': 'changed a booking',
  'book.cancel': 'cancelled a registration',
  'book.rejected.blocked': 'was blocked',
  'admin.updateConfig': 'updated configuration',
  'admin.deleteEvent': 'deleted an event',
  'admin.updateSlot': 'updated a slot',
  'admin.createSlot': 'added a slot',
  'admin.deleteSlot': 'removed a slot',
  'admin.updateRegistration': 'edited a registration',
  'admin.deleteRegistration': 'removed a registration',
  'admin.reconcileEventCapacity': 'reconciled capacity',
  'admin.upsertPermanentBlock': 'added a permanent block',
};

/** Pill colour class (reuses .aud-ev tones) by audit event family. */
function activityKind(event: string): { cls: string; label: string } {
  if (/cancel|delete|fail|rejected|block/.test(event)) return { cls: 'cancel', label: event.includes('config') ? 'Config' : 'Update' };
  if (event.includes('config')) return { cls: 'config', label: 'Config' };
  if (event.includes('create')) return { cls: 'create', label: 'Create' };
  return { cls: 'update', label: 'Update' };
}

function ago(iso: string | null, now: number): string {
  if (!iso) return '';
  const m = Math.floor((now - Date.parse(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function DashboardTab({
  events, stats, statsReady, mail, audit, onOpenEvent, onGotoNotifications,
}: {
  events: EventDoc[];
  stats: Record<string, EventStat>;
  statsReady: boolean;
  mail: MailEntry[];
  audit: AuditEntry[];
  onOpenEvent: (eventId: string) => void;
  onGotoNotifications: () => void;
}) {
  const now = Date.now();

  const kpis = useMemo(() => {
    let totalRegs = 0;
    const fills: number[] = [];
    for (const ev of events) {
      totalRegs += regCount(ev, stats[ev.eventId]);
      if (!ev.archived) {
        const p = eventFillPct(ev, stats[ev.eventId]);
        if (p != null) fills.push(p);
      }
    }
    const active = events.filter((e) => lifecycleOf(e) === 'active').length;
    const closed = events.filter((e) => lifecycleOf(e) === 'closed').length;
    const archived = events.filter((e) => e.archived).length;
    const avgFill = fills.length ? Math.round(fills.reduce((a, b) => a + b, 0) / fills.length) : 0;
    const weekAgo = now - 7 * 86_400_000;
    const weekNew = audit.filter((a) => a.event === 'book.create' && a.timestamp && Date.parse(a.timestamp) >= weekAgo).length;
    return { totalRegs, active, closed, archived, avgFill, weekNew, total: events.length };
  }, [events, stats, audit, now]);

  const failures = useMemo(() => mail.filter((m) => m.state === 'ERROR'), [mail]);

  // Needs attention (audit P1-9): surface every actionable edge — a full event
  // (≥100%), one filling up (≥90%), a deadline closing soon, or email failures —
  // each with a CTA. Only archived events are skipped (intentionally done); a
  // full-but-closed event still shows, since "full" was previously invisible.
  const attention = useMemo(() => {
    const rows: { id: string; tone: 'warn' | 'danger'; text: string; action: 'event' | 'notify'; eventId?: string }[] = [];
    for (const ev of events) {
      if (ev.archived) continue;
      const active = lifecycleOf(ev) === 'active';
      const dl = deadlineInfo(ev, now);
      const pct = eventFillPct(ev, stats[ev.eventId]);
      const closingSoon = active && dl?.urgent === true;
      const full = pct != null && pct >= 100;
      const nearFull = pct != null && pct >= 90 && pct < 100;
      if (!closingSoon && !nearFull && !full) continue;
      const bits: string[] = [];
      if (full) bits.push('full — review capacity/waitlist');
      else if (pct != null) bits.push(`${pct}% full`);
      if (closingSoon && dl) bits.push(dl.label.replace(/^Closes\s/, 'closes ').replace(' · ', ' in '));
      rows.push({
        id: ev.eventId,
        tone: full || nearFull ? 'danger' : 'warn',
        text: `${ev.name} — ${bits.join(' · ')}`,
        action: 'event',
        eventId: ev.eventId,
      });
    }
    rows.sort((a) => (a.tone === 'warn' ? -1 : 1));
    if (failures.length) {
      rows.push({
        id: 'mail-fail', tone: 'danger', action: 'notify',
        text: `${failures.length} confirmation email${failures.length === 1 ? '' : 's'} failed`,
      });
    }
    return rows.slice(0, 5);
  }, [events, stats, failures, now]);

  // Events filling up: active events by fill %, highest first.
  const fillingUp = useMemo(() => {
    return events
      .filter((e) => !e.archived)
      .map((e) => ({ ev: e, pct: eventFillPct(e, stats[e.eventId]), reg: regCount(e, stats[e.eventId]) }))
      .filter((x): x is { ev: EventDoc; pct: number; reg: number } => x.pct != null)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [events, stats]);

  const recent = audit.slice(0, 6);

  return (
    <div className="dash">
      {/* ── KPI row ── */}
      <div className="dash-kpis">
        <div className="kpi">
          <div className="k">Total registrations</div>
          <div className="v tnum">{kpis.totalRegs}</div>
          {kpis.weekNew > 0 && <div className="kpi-trend up">↑ {kpis.weekNew} this week</div>}
        </div>
        <div className="kpi">
          <div className="k">Active events</div>
          <div className="v tnum">{kpis.active}<small> / {kpis.total}</small></div>
          <div className="kpi-sub">{kpis.closed} closed · {kpis.archived} archived</div>
        </div>
        <div className="kpi">
          <div className="k">Avg seats filled</div>
          <div className="v tnum">{statsReady ? `${kpis.avgFill}%` : '…'}</div>
          <div className="kpi-bar"><span style={{ width: `${kpis.avgFill}%` }} /></div>
        </div>
        <button type="button" className={`kpi as-btn${failures.length ? ' danger' : ''}`} onClick={onGotoNotifications}>
          <div className="k">Email failures</div>
          <div className="v tnum">{failures.length}</div>
          <div className="kpi-link">{failures.length ? 'Needs retry →' : 'All delivered'}</div>
        </button>
      </div>

      {/* ── Needs attention ── */}
      <div className="dash-attn-hd">Needs attention</div>
      {attention.length === 0 ? (
        <div className="dash-attn-empty">Nothing needs attention right now.</div>
      ) : (
        <div className="dash-attn">
          {attention.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`attn-row ${a.tone}`}
              onClick={() => (a.action === 'notify' ? onGotoNotifications() : a.eventId && onOpenEvent(a.eventId))}
            >
              <span className="attn-ic" aria-hidden="true">
                {a.tone === 'warn'
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 0 0-5-5Z" /><path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" /></svg>}
              </span>
              <span className="attn-tx">{a.text}</span>
              <span className="attn-go">{a.action === 'notify' ? 'Review →' : 'Open →'}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Two feeds ── */}
      <div className="dash-cols">
        <div className="dash-card">
          <div className="dash-card-hd">Events filling up</div>
          {fillingUp.length === 0 ? (
            <div className="dash-feed-empty">No fill data yet.</div>
          ) : fillingUp.map(({ ev, pct, reg }) => (
            <button key={ev.eventId} type="button" className="fill-row" onClick={() => onOpenEvent(ev.eventId)}>
              <div className="fill-top"><span className="nm">{ev.name}</span><span className="pc tnum">{ev.type === 'simple' ? `${reg}/${ev.capacity}` : `${pct}%`}</span></div>
              <div className="fill-track"><span className={pct >= 100 ? 'full' : pct >= 80 ? 'warn' : ''} style={{ width: `${pct}%` }} /></div>
            </button>
          ))}
        </div>

        <div className="dash-card">
          <div className="dash-card-hd">Recent activity</div>
          {recent.length === 0 ? (
            <div className="dash-feed-empty">No activity yet.</div>
          ) : recent.map((a) => {
            const k = activityKind(a.event);
            const who = a.email ? a.email.split('@')[0] : 'someone';
            return (
              <div key={a.id} className="act-row">
                <span className={`aud-ev ${k.cls}`}>{k.label}</span>
                <span className="act-tx"><b>{who}</b> {VERB[a.event] ?? a.event.split('.').pop()}</span>
                <span className="act-ago tnum">{ago(a.timestamp, now)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
