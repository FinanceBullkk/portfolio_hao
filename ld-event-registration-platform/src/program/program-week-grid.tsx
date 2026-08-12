import type { CSSProperties } from 'react';
import type { GridCell, ProgramWeek } from '../lib/program-grid';

// Renders one week of the shared trainer calendar. Full transparency (S8): a cell
// booked by another class shows the PIC's name + its class/BU, colour-coded per class
// so overlapping classes are visually distinct. Only 'mine' and 'bookable' cells are
// actionable; 'taken' / 'blackout' / 'past' are read-only. Styling lives in styles.css
// (.pg-*); per-class 'taken' colours are computed here and applied inline.

// Per-class accent for other classes' booked ("taken") cells. Dark-theme muted tints
// (handoff "Known divergences" #1): a low-alpha wash of the class accent over the dark
// canvas — never a bright pastel fill. Assigned deterministically by class code so a
// given class keeps one colour. The cell bg/border are derived from this accent inline.
const TAKEN_ACCENTS: readonly string[] = [
  '#5b9bff', // blue
  '#9b8bf2', // violet
  '#e0a45c', // amber
  '#e5645f', // rose
  '#46c0a8', // teal
];

function classColor(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i += 1) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return TAKEN_ACCENTS[h % TAKEN_ACCENTS.length];
}

// Company emails are firstname.lastname@cyberlogitec.com — turn the local part into a
// display name ("anh.vu" → "Anh Vu") since sessions only carry the PIC's email.
function prettyName(email: string): string {
  const local = (email.split('@')[0] || '').trim();
  const name = local.split(/[._-]+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return name || local;
}

// Parse 'YYYY-MM-DD' as UTC so the day number never shifts across timezones.
function asUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function CellBody({ cell, state, accent }: { cell: GridCell; state: GridCell['state']; accent: string }) {
  const s = cell.session;
  switch (state) {
    case 'mine':
      return (
        <>
          {/* P1-6: a ✓ icon (not just the green tint) marks "your session". */}
          <span className="tag">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            {s?.sequence ? `Session #${s.sequence}` : 'Your session'} · edit
          </span>
          <span className="code">{s?.classCode}</span>
          {(s?.topic || s?.courseName) ? <span className="sub">{s?.topic || s?.courseName}</span> : null}
        </>
      );
    case 'taken':
      return (
        <>
          <span className="pic">{s ? prettyName(s.picEmail) : ''}</span>
          <span className="tk-meta">
            <span className="tk-dot" style={{ background: accent }} />
            <span className="tk-code" style={{ color: accent }}>{s?.classCode} · {s?.bu}</span>
          </span>
        </>
      );
    case 'bookable':
      return <span className="add">+ Book</span>;
    case 'blackout':
      return (
        <span className="unavail">
          {/* P1-6: a 🔒 icon so "blackout" doesn't rely on the pink tint alone. */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          Unavailable
        </span>
      );
    case 'past':
      return <span className="unavail" style={{ color: 'var(--ink-400)' }}>—</span>;
    case 'closed':
      return <span className="unavail" style={{ color: 'var(--ink-400)' }}>Closed</span>;
    default:
      return null;
  }
}

export function ProgramWeekGrid({
  week, todayDate, selectedKey, onCellClick, readOnly = false,
}: {
  week: ProgramWeek;
  todayDate: string;
  selectedKey: string | null;
  onCellClick: (cell: GridCell) => void;
  // Non-PIC viewers (handoff "Known divergences" #2): bookable cells render as a
  // non-interactive "Closed" so only an assigned PIC can book.
  readOnly?: boolean;
}) {
  if (week.rows.length === 0) {
    return <div className="empty-state"><div className="es-title">No time slots configured</div><div className="es-sub">Ask HR to set up the program grid.</div></div>;
  }
  return (
    <div className="pg-grid-wrap">
      <div className="pg-scroll">
        <table className="pg-grid">
          <thead>
            <tr>
              <th className="pg-corner" aria-hidden="true" />
              {week.days.map((d) => {
                const isToday = d.date === todayDate;
                return (
                  <th key={d.date} className={isToday ? 'pg-th today' : 'pg-th'} aria-current={isToday ? 'date' : undefined}>
                    <div className="dow">{d.label}</div>
                    <div className="num">{asUtc(d.date).getUTCDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {week.rows.map((row) => (
              <tr key={row.startMin}>
                <td className="pg-time">{row.label}</td>
                {row.cells.map((cell) => {
                  // Non-PIC viewers see bookable cells as "Closed" (read-only calendar).
                  const state = readOnly && cell.state === 'bookable' ? 'closed' : cell.state;
                  const actionable = state === 'mine' || state === 'bookable';
                  const isSel = cell.key === selectedKey;
                  const accent = state === 'taken' && cell.session ? classColor(cell.session.classCode) : '';
                  // Dark muted "taken" tint: a low-alpha wash of the class accent, an accent
                  // left-bar, and a faint accent border — never a bright pastel fill.
                  const style: CSSProperties | undefined = accent
                    ? { background: `${accent}1f`, borderColor: `${accent}33`, borderLeft: `3px solid ${accent}` }
                    : undefined;
                  return (
                    <td key={cell.key} className="pg-td">
                      <div
                        className={`pg-cell ${state}${isSel ? ' sel' : ''}`}
                        style={style}
                        role={actionable ? 'button' : undefined}
                        tabIndex={actionable ? 0 : undefined}
                        onClick={actionable ? () => onCellClick(cell) : undefined}
                        onKeyDown={actionable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(cell); } } : undefined}
                      >
                        <CellBody cell={cell} state={state} accent={accent} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
