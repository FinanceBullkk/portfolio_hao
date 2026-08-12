import { useEffect, useMemo, useState } from 'react';
import type { EventDoc } from '../lib/types';
import { listEventRegistrations, type EventRegistrationRow } from '../lib/adminDb';
import { SearchIcon } from './admin-icons';
import { formatDate } from '../lib/format-date';

// ── Cross-event Registrations roster (top-level nav) ──────────────────────────
// With the per-event picker gone, the top-level "Registrations" tab shows ALL
// registrations across every event in one searchable / sortable table. Each row
// deep-links into that event's workspace. Fans out one read per event (like
// listEventStats), failure-tolerant per event.

const PAGE_SIZE = 25;

type Row = EventRegistrationRow & { eventId: string; eventName: string; type: EventDoc['type'] };
type SortKey = 'fullName' | 'bu' | 'eventName' | 'createdAt';
type SortDir = 'asc' | 'desc';

export function AllRegistrationsTab({
  adminEmail, events, onOpenEvent,
}: { adminEmail: string; events: EventDoc[]; onOpenEvent: (eventId: string) => void }) {
  void adminEmail; // reads are admin-guarded by rules; kept for signature symmetry
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [buFilter, setBuFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let live = true;
    setRows(null); setErr(null);
    Promise.allSettled(
      events.map((ev) =>
        listEventRegistrations(ev.eventId).then((rs) =>
          rs.map((r): Row => ({ ...r, eventId: ev.eventId, eventName: ev.name || ev.eventId, type: ev.type })),
        ),
      ),
    )
      .then((results) => {
        if (!live) return;
        const all: Row[] = [];
        let anyFail = false;
        for (const r of results) {
          if (r.status === 'fulfilled') all.push(...r.value);
          else anyFail = true;
        }
        setRows(all);
        if (anyFail && all.length === 0) setErr('Failed to load registrations.');
      });
    return () => { live = false; };
  }, [events]);

  const buOptions = useMemo(
    () => ['all', ...Array.from(new Set((rows ?? []).map((r) => r.bu).filter(Boolean))).sort()],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (eventFilter !== 'all' && r.eventId !== eventFilter) return false;
      if (buFilter !== 'all' && r.bu !== buFilter) return false;
      if (!needle) return true;
      return (
        r.fullName.toLowerCase().includes(needle) ||
        r.empCode.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        r.bu.toLowerCase().includes(needle) ||
        r.eventName.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, eventFilter, buFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [q, eventFilter, buFilter]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'createdAt' ? 'desc' : 'asc'); }
    setPage(1);
  };
  const ind = (key: SortKey) => (sortKey !== key ? <span style={{ opacity: 0.3 }}> ↕</span> : <span>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>);
  const HEADERS: [SortKey, string][] = [['fullName', 'Employee'], ['bu', 'BU'], ['eventName', 'Event'], ['createdAt', 'Registered']];

  return (
    <div className="panel">
      <div className="toolbar">
        <div className="search">
          <SearchIcon />
          <input type="text" aria-label="Search registrations" placeholder="Search name, code, email, BU, event…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" aria-label="Filter by event" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="all">All events</option>
          {events.map((ev) => <option key={ev.eventId} value={ev.eventId}>{ev.name || ev.eventId}</option>)}
        </select>
        <select className="select" aria-label="Filter by BU" value={buFilter} onChange={(e) => setBuFilter(e.target.value)}>
          {buOptions.map((b) => <option key={b} value={b}>{b === 'all' ? 'All BUs' : b}</option>)}
        </select>
        <div className="spacer" />
        <span className="text-sm text-muted">
          {rows ? (filtered.length < rows.length ? `${filtered.length} / ${rows.length}` : `${rows.length} registrations`) : 'Loading…'}
        </span>
      </div>

      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      {!rows && !err && <div className="loading"><span className="spinner" /> Loading…</div>}
      {rows && filtered.length === 0 && (
        <div className="empty-state"><div className="es-title">{rows.length === 0 ? 'No registrations yet' : 'No registrations match the filter'}</div></div>
      )}

      {rows && filtered.length > 0 && (
        <>
          <table className="dgrid">
            <thead>
              <tr>
                {HEADERS.map(([key, label]) => (
                  <th key={key}><button type="button" className="sort-hd" onClick={() => handleSort(key)}>{label}{ind(key)}</button></th>
                ))}
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr key={`${r.eventId}:${r.email}`} className="row-click" onClick={() => onOpenEvent(r.eventId)}>
                  <td><div className="id-cell"><span className="nm">{r.fullName || '—'}</span><span className="mt">{r.empCode || r.email}</span></div></td>
                  <td>{r.bu ? <span className="pill">{r.bu}</span> : <span className="empty-dash">—</span>}</td>
                  <td><span className={`pill ${r.type === 'slotted' ? 'sp' : 'sk'}`}>{r.eventName}</span></td>
                  <td className="text-muted tnum">{formatDate(r.createdAt) || '—'}</td>
                  <td className="num"><span className="row-open">Open →</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="toolbar" style={{ justifyContent: 'center', gap: 'var(--s-2)' }}>
              <button type="button" className="btn ghost sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="text-sm text-muted">Page {safePage} / {totalPages} · {sorted.length} results</span>
              <button type="button" className="btn ghost sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
