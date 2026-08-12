import { useEffect, useMemo, useState } from 'react';
import type { EventDoc, Slot } from '../lib/types';
import {
  deleteEventRegistration,
  downloadEventRosterCsv,
  listEventRegistrations,
  listEventSlots,
  type EventRegistrationRow,
  type Registration,
} from '../lib/adminDb';
import { useConfirm, useToast } from '../confirm-toast-provider';
import { SearchIcon } from './admin-icons';
import { RowMenu } from './admin-chrome';
import { slotLabel } from './admin-utils';
import { RegEditDrawer } from './reg-edit-drawer';
import { formatDateTime } from '../lib/format-date';

// Inline registrations view for one event: search, BU filter, sortable flat
// table, pagination, per-row remove, CSV export over the filtered set, and
// (slotted events) moving a participant's slots via the event-scoped RegEditDrawer.

const PAGE_SIZE = 25;

type SortKey = 'fullName' | 'empCode' | 'bu' | 'createdAt';
type SortDir = 'asc' | 'desc';

/** Build a RegEditDrawer-compatible Registration from a roster row. */
function toRegistration(r: EventRegistrationRow): Registration {
  return {
    email: r.email, empCode: r.empCode, fullName: r.fullName, bu: r.bu,
    speakingSlotId: r.speakingSlotId, skillsSlotId: r.skillsSlotId,
    createdAt: r.createdAt, updatedAt: r.updatedAt, changeCount: r.changeCount,
  };
}

export function EventRegistrationsPanel({
  adminEmail, event,
}: { adminEmail: string; event: EventDoc }) {
  const [list, setList] = useState<EventRegistrationRow[] | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [editRow, setEditRow] = useState<EventRegistrationRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false); // guards concurrent remove calls

  const isSlotted = event.type === 'slotted';
  // Required exam parts (per-event) — hide the unused slot column + skip it in the
  // "incomplete" flag and the move-slot drawer.
  const examParts = event.examParts ?? 'both';
  const needsSpeaking = examParts !== 'skills';
  const needsSkills = examParts !== 'speaking';

  const [q, setQ] = useState('');
  const [buFilter, setBuFilter] = useState('all');
  // Quick-filter chips (audit A6): incomplete = missing a slot (slotted only);
  // changed = the participant has edited their booking at least once.
  const [quick, setQuick] = useState<'all' | 'incomplete' | 'changed'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  // Bulk selection — keyed by email. Reveals the bulk-action bar (export / cancel).
  const [sel, setSel] = useState<Set<string>>(new Set());

  const confirm = useConfirm();
  const toast = useToast();

  const reload = () => {
    setErr(null);
    setPage(1);
    setSel(new Set());
    listEventRegistrations(event.eventId)
      .then(setList)
      .catch((e: Error) => setErr(e.message));
    // Slotted events need their slot list to power the move-slot drawer.
    if (isSlotted) listEventSlots(event.eventId).then(setSlots).catch(() => setSlots([]));
  };

  useEffect(reload, [event.eventId]);

  const buOptions = useMemo(
    () => ['all', ...Array.from(new Set((list ?? []).map((r) => r.bu).filter(Boolean))).sort()],
    [list],
  );

  const slotMap = useMemo(() => new Map(slots.map((s) => [s.slotId, s])), [slots]);
  const isIncomplete = (r: EventRegistrationRow) =>
    isSlotted && ((needsSpeaking && !r.speakingSlotId) || (needsSkills && !r.skillsSlotId));

  // Quick-filter chip counts (over the full list, not the search-narrowed set).
  const incompleteCount = useMemo(() => (list ?? []).filter(isIncomplete).length, [list, isSlotted]);
  const changedCount = useMemo(() => (list ?? []).filter((r) => r.changeCount > 0).length, [list]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (list ?? []).filter((r) => {
      if (buFilter !== 'all' && r.bu !== buFilter) return false;
      if (quick === 'incomplete' && !isIncomplete(r)) return false;
      if (quick === 'changed' && r.changeCount <= 0) return false;
      if (!needle) return true;
      return (
        r.fullName.toLowerCase().includes(needle) ||
        r.empCode.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        r.bu.toLowerCase().includes(needle)
      );
    });
  }, [list, q, buFilter, quick, isSlotted]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const cmp = (a[sortKey] ?? '').localeCompare(b[sortKey] ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  // Reset pagination and selection when filter/search changes — acting on rows
  // hidden by the current filter would be surprising.
  useEffect(() => { setPage(1); setSel(new Set()); }, [q, buFilter, quick]);

  // Selection derived state — operate over the filtered set (all pages).
  const selectedRows = useMemo(() => filtered.filter((r) => sel.has(r.email)), [filtered, sel]);
  const allSelected = filtered.length > 0 && selectedRows.length === filtered.length;
  const someSelected = selectedRows.length > 0 && !allSelected;

  const toggleOne = (email: string) =>
    setSel((prev) => { const next = new Set(prev); next.has(email) ? next.delete(email) : next.add(email); return next; });
  const toggleAll = () =>
    setSel(allSelected ? new Set() : new Set(filtered.map((r) => r.email)));
  const clearSel = () => setSel(new Set());

  const exportSelected = () => downloadEventRosterCsv(event.name, selectedRows);

  const bulkCancel = async () => {
    const n = selectedRows.length;
    const ok = await confirm({
      title: `Cancel ${n} registration${n === 1 ? '' : 's'}?`,
      message: `Remove ${n} selected registration${n === 1 ? '' : 's'} from ${event.name}? This returns their seats and cannot be undone.`,
      confirmText: `Cancel ${n}`,
      cancelText: 'Keep',
      danger: true,
    });
    if (!ok) return;
    setRemoving(true);
    let failed = 0;
    for (const r of selectedRows) {
      try { await deleteEventRegistration(adminEmail, event.eventId, r.email); }
      catch { failed += 1; }
    }
    setRemoving(false);
    if (failed) toast('error', `Cancelled ${n - failed}/${n} — ${failed} failed.`);
    else toast('success', `Cancelled ${n} registration${n === 1 ? '' : 's'}.`);
    reload();
  };

  const removeOne = async (r: EventRegistrationRow) => {
    const ok = await confirm({
      title: 'Remove registration?',
      message: `Remove ${r.fullName || r.email} from ${event.name}? This returns their seat.`,
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;
    setRemoving(true);
    try {
      await deleteEventRegistration(adminEmail, event.eventId, r.email);
      toast('success', 'Registration removed.');
      reload();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setRemoving(false);
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <span style={{ opacity: 0.3 }}> ↕</span>;
    return <span>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>;
  };
  const sortTh = (key: SortKey, label: string) => (
    <th><button type="button" className="sort-hd" onClick={() => handleSort(key)}>{label}{sortIndicator(key)}</button></th>
  );
  // Slotted slot cell: resolved time, or an amber "Chưa chọn" pill when unpicked.
  const slotCell = (id: string | null) =>
    id ? <span className="tnum">{slotLabel(slotMap, id)}</span> : <span className="pill warn">Not picked</span>;

  return (
    <div className="panel">
      {selectedRows.length > 0 ? (
        <div className="reg-bulk">
          <span className="bcount">{selectedRows.length} selected</span>
          <button type="button" className="blink" onClick={clearSel}>Clear selection</button>
          <div className="spacer" />
          <button type="button" className="btn sm ghost" disabled={removing} onClick={exportSelected}>Export CSV</button>
          <button type="button" className="btn sm danger" disabled={removing} onClick={bulkCancel}>Cancel registration</button>
        </div>
      ) : (
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              type="text"
              aria-label="Search registrations"
              placeholder="Search name, Employee Code, email, BU…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="select" aria-label="Filter by BU" value={buFilter} onChange={(e) => setBuFilter(e.target.value)}>
            {buOptions.map((b) => <option key={b} value={b}>{b === 'all' ? 'All BUs' : b}</option>)}
          </select>
          <div className="spacer" />
          <span className="text-sm text-muted">
            {list
              ? filtered.length < list.length ? `${filtered.length} / ${list.length} registered` : `${list.length} registered`
              : 'Loading…'}
          </span>
          <button
            type="button"
            className="btn sm ghost"
            disabled={!list || filtered.length === 0 || removing}
            onClick={() => list && downloadEventRosterCsv(event.name, filtered)}
          >
            Export CSV{list && filtered.length > 0 ? ` (${filtered.length})` : ''}
          </button>
        </div>
      )}

      {list && list.length > 0 && (
        <div className="reg-chips">
          <button type="button" className={quick === 'all' ? 'active' : ''} onClick={() => setQuick('all')}>All <span className="n tnum">{list.length}</span></button>
          {isSlotted && (
            <button type="button" className={quick === 'incomplete' ? 'active' : ''} onClick={() => setQuick('incomplete')}>Incomplete <span className="n tnum">{incompleteCount}</span></button>
          )}
          <button type="button" className={quick === 'changed' ? 'active' : ''} onClick={() => setQuick('changed')}>Changed <span className="n tnum">{changedCount}</span></button>
        </div>
      )}

      {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
      {!list && !err && <div className="loading"><span className="spinner" /> Loading…</div>}
      {list && filtered.length === 0 && (
        <div className="empty-state">
          <div className="es-title">
            {list.length === 0 ? 'Nobody has registered yet' : 'No registrations match the filter'}
          </div>
        </div>
      )}

      {list && filtered.length > 0 && (
        <>
          <div className="table-scroll">
          <table className="dgrid">
            <thead>
              <tr>
                <th className="cbx-cell">
                  <input type="checkbox" className="cbx" aria-label="Select all registrations"
                    checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll} />
                </th>
                {sortTh('fullName', 'Employee')}
                {isSlotted ? (
                  <>
                    {sortTh('bu', 'BU')}
                    {needsSpeaking && <th>Speaking</th>}
                    {needsSkills && <th>3 Skills</th>}
                  </>
                ) : (
                  <>
                    {sortTh('empCode', 'Code')}
                    {sortTh('bu', 'BU')}
                    {sortTh('createdAt', 'Registered')}
                  </>
                )}
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <tr key={r.email} className={`${sel.has(r.email) ? 'selected' : ''}${isIncomplete(r) ? ' incomplete' : ''}`}>
                  <td className="cbx-cell">
                    <input type="checkbox" className="cbx" aria-label={`Select ${r.fullName || r.email}`}
                      checked={sel.has(r.email)} onChange={() => toggleOne(r.email)} />
                  </td>
                  <td>
                    <div className="id-cell">
                      <span className="nm">{r.fullName || '—'}</span>
                      <span className="mt">{r.email}</span>
                    </div>
                  </td>
                  {isSlotted ? (
                    <>
                      <td>{r.bu ? <span className="pill">{r.bu}</span> : <span className="empty-dash">—</span>}</td>
                      {needsSpeaking && <td>{slotCell(r.speakingSlotId)}</td>}
                      {needsSkills && <td>{slotCell(r.skillsSlotId)}</td>}
                    </>
                  ) : (
                    <>
                      <td>{r.empCode || <span className="empty-dash">—</span>}</td>
                      <td>{r.bu ? <span className="pill">{r.bu}</span> : <span className="empty-dash">—</span>}</td>
                      <td className="text-muted tnum">{formatDateTime(r.createdAt) || '—'}</td>
                    </>
                  )}
                  <td className="num">
                    <div className="row-acts">
                      <RowMenu
                        items={isSlotted
                          ? [
                              { label: 'Edit slots', onClick: () => setEditRow(r) },
                              'div' as const,
                              { label: 'Remove', danger: true, onClick: () => removeOne(r) },
                            ]
                          : [{ label: 'Remove', danger: true, onClick: () => removeOne(r) }]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="toolbar" style={{ justifyContent: 'center', gap: 'var(--s-2)' }}>
              <button type="button" className="btn ghost sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="text-sm text-muted">Page {safePage} / {totalPages} · {sorted.length} results</span>
              <button type="button" className="btn ghost sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Move a slotted participant's slots — server enforces capacity + overlap. */}
      {editRow && (
        <RegEditDrawer
          reg={toRegistration(editRow)}
          slots={slots}
          eventId={event.eventId}
          examParts={examParts}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); reload(); }}
        />
      )}
    </div>
  );
}
