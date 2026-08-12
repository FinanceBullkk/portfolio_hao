import { formatDateVi } from '../lib/types';
import type { ProgramWeek, GridCell } from '../lib/program-grid';

// Presentational weekly grid for the Pronunciation Program trainer calendar. Read-only by
// default (the visual-QA harness mounts it with just `week`); pass `onCellClick` to make
// non-blackout cells actionable (admin editing). Split out of program-schedules-tab.tsx so
// the tab keeps the data/mutation logic and this file owns the rendering.
export function ProgramScheduleGrid({
  week, onCellClick, selectedKey = null,
}: {
  week: ProgramWeek;
  onCellClick?: (cell: GridCell) => void;
  selectedKey?: string | null;
}) {
  if (week.rows.length === 0) {
    return <div className="empty-state"><div className="es-title">No time slots configured</div><div className="es-sub">Set up the grid in Program settings.</div></div>;
  }
  return (
    <section className="card" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 6, minWidth: 720 }}>
        <thead>
          <tr>
            <th style={{ width: 90, textAlign: 'left', fontSize: 12, opacity: 0.7 }}>Time</th>
            {week.days.map((d) => (
              <th key={d.date} style={{ textAlign: 'center', fontWeight: 600 }}>
                {d.label}<div style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>{formatDateVi(d.date)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {week.rows.map((row) => (
            <tr key={row.startMin}>
              <td style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap' }}>{row.label}</td>
              {row.cells.map((cell) => {
                const s = cell.session;
                // P1-10: same state vocabulary as the user schedule — booked /
                // unavailable (blackout) / closed / open — so the two grids read
                // identically. Empty cells now carry a label instead of being blank.
                const bg = s ? 'rgba(80,120,200,.12)'
                  : cell.state === 'blackout' ? 'rgba(180,80,80,.12)'
                  : cell.state === 'closed' ? 'rgba(120,120,120,.10)'
                  : 'transparent';
                // Blackout cells can't be booked (hard rule) — everything else is
                // clickable for an admin (manage a session / book an empty cell).
                const actionable = Boolean(onCellClick) && cell.state !== 'blackout';
                const isSel = selectedKey != null && cell.key === selectedKey;
                return (
                  <td key={cell.key} style={{ padding: 0, verticalAlign: 'top' }}>
                    <div
                      className={actionable ? 'psg-cell' : undefined}
                      role={actionable ? 'button' : undefined}
                      tabIndex={actionable ? 0 : undefined}
                      onClick={actionable ? () => onCellClick!(cell) : undefined}
                      onKeyDown={actionable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick!(cell); } } : undefined}
                      style={{
                        border: '1px solid var(--border,#333)', borderRadius: 8, padding: '8px 8px', minHeight: 64,
                        background: bg,
                        opacity: cell.state === 'past' && !s ? 0.4 : 1,
                        cursor: actionable ? 'pointer' : undefined,
                        boxShadow: isSel ? '0 0 0 2px var(--accent,#5078c8)' : undefined,
                      }}
                    >
                      {s ? (
                        <>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>
                            {s.classCode}
                            {s.sequence != null && <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}> · #{s.sequence}</span>}
                          </div>
                          {s.courseName && <div style={{ fontSize: 12, color: 'var(--ink-600)' }}>{s.courseName}</div>}
                          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{s.bu} · {s.picEmail.split('@')[0]}</div>
                          {s.participantCount != null && (
                            <div style={{ fontSize: 11, color: 'var(--ink-500)' }} title="Maximum class size">Max size {s.participantCount}</div>
                          )}
                        </>
                      ) : cell.state === 'blackout' ? (
                        <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>Unavailable</span>
                      ) : cell.state === 'closed' ? (
                        <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>Closed</span>
                      ) : cell.state === 'past' ? (
                        <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>—</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>Open</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* P1-10: legend mirrors the user-side schedule so HR and PICs share one
          visual vocabulary for booked / open / unavailable / closed cells. */}
      <div className="pg-legend" style={{ padding: '12px 4px 2px' }}>
        <span className="lg"><span className="sw" style={{ background: 'rgba(80,120,200,.12)', borderColor: 'rgba(80,120,200,.5)' }} />Booked</span>
        <span className="lg"><span className="sw" style={{ background: 'transparent' }} />Open — no session</span>
        <span className="lg"><span className="sw" style={{ background: 'rgba(180,80,80,.12)', borderColor: 'rgba(180,80,80,.5)' }} />Unavailable (blackout)</span>
        <span className="lg"><span className="sw" style={{ background: 'rgba(120,120,120,.10)', borderColor: 'rgba(120,120,120,.45)' }} />Closed / past</span>
      </div>
    </section>
  );
}
