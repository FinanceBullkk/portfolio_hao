import type { EventDoc } from '../lib/types';
import type { EventStat } from '../lib/adminDb';
import { RowMenu, type MenuItem } from './admin-chrome';
import { deadlineInfo, enrollBadge, enrollmentOpen, fillView } from './event-fill';

// Presentational lifecycle card for one event on the admin Events tab. Shows a
// type accent, name + type chip, real fill (single bar for simple, dual
// Speaking / 3 Skills meters for slotted), and an enrollment + deadline status
// rail. All derivation lives in event-fill.ts.

function AccentIcon({ slotted }: { slotted: boolean }) {
  return slotted ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

export function EventLifecycleCard({
  ev, stat, statsReady, now, menu, busy, onManage, onToggleEnrollment,
}: {
  ev: EventDoc; stat: EventStat | undefined; statsReady: boolean; now: number; menu: MenuItem[];
  busy?: boolean; onManage: () => void; onToggleEnrollment: () => void;
}) {
  const slotted = ev.type === 'slotted';
  const tone = ev.archived ? 'muted' : slotted ? 'sp' : 'sk';
  const fill = fillView(ev, stat, statsReady);
  const enroll = enrollBadge(ev);
  const ddl = deadlineInfo(ev, now);
  // Archived events can't change enrollment — their toggle reads a static "Ended".
  // The toggle shows the EFFECTIVE state; clicking when "Closed" reopens (and the
  // handler clears a past deadline so the reopen takes effect).
  const enrollOn = enrollmentOpen(ev);

  return (
    <div className={`ev-card${ev.archived ? ' muted' : ''}`}>
      <span className={`ev-accent ${tone}`}><AccentIcon slotted={slotted} /></span>

      <div className="ev-idwrap">
        <div className="ev-head">
          <span className="ev-name">{ev.name || ev.eventId}</span>
          <span className={`ev-type ${tone}`}>{slotted ? 'Slotted' : 'Simple'}</span>
        </div>
        <div className="ev-eid">{ev.eventId}{ev.subtitle ? ` · ${ev.subtitle}` : ''}</div>
      </div>

      <div className="ev-fill">
        {fill.kind === 'simple' ? (
          <>
            <div className="ev-fill-head">
              <span className="k">Registered</span>
              <span className="v tnum">{fill.label}</span>
            </div>
            <div className="ev-meter"><span style={{ width: `${fill.pct}%`, background: fill.color }} /></div>
          </>
        ) : fill.pending ? (
          <div className="ev-fill-pending">Loading fill…</div>
        ) : (
          <>
            <div className="ev-reglabel">{fill.regLabel}</div>
            <div className="ev-dual">
              <div className="ev-dual-col">
                <div className="ev-dual-hd"><span className="sp">SP</span><span className="tnum">{fill.speaking ? `${fill.speaking.pct}%` : '—'}</span></div>
                <div className="ev-meter sm"><span style={{ width: `${fill.speaking?.pct ?? 0}%`, background: ev.archived ? 'var(--ink-300)' : 'var(--brand-500)' }} /></div>
              </div>
              <div className="ev-dual-col">
                <div className="ev-dual-hd"><span className="sk">3S</span><span className="tnum">{fill.skills ? `${fill.skills.pct}%` : '—'}</span></div>
                <div className="ev-meter sm"><span style={{ width: `${fill.skills?.pct ?? 0}%`, background: ev.archived ? 'var(--ink-300)' : 'var(--accent-500)' }} /></div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="ev-status">
        {ev.archived ? (
          <span className={`ev-enroll ${enroll.tone}`}>{enroll.label}</span>
        ) : (
          <button
            type="button"
            className={`ev-toggle ${enrollOn ? 'on' : 'off'}`}
            disabled={busy}
            aria-pressed={enrollOn}
            onClick={onToggleEnrollment}
            title={enrollOn ? 'Enrollment open — click to close' : 'Enrollment closed — click to open'}
          >
            <span className="knob" aria-hidden="true" />
            <span className="lbl">{enrollOn ? 'Open' : 'Closed'}</span>
          </button>
        )}
        {ddl && (
          <span className={`ev-ddl${ddl.urgent ? ' urgent' : ''}${ddl.passed ? ' passed' : ''}`}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            {ddl.label}
          </span>
        )}
      </div>

      <div className="ev-actions">
        <button type="button" className="btn sm" onClick={onManage}>Manage →</button>
        <RowMenu items={menu} />
      </div>
    </div>
  );
}
