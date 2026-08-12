import { useMemo, useState, type ReactNode } from 'react';
import type { BlockEntry, BlockListApi } from '../lib/adminDb';
import { useConfirm, useToast } from '../confirm-toast-provider';
import { SearchIcon } from './admin-icons';
import { RowMenu } from './admin-chrome';
import { splitReason, BlockDrawer, BulkBlockDrawer } from './blocklist-drawers';

// Generic blocklist TABLE. Presentation only — the data source is a BlockListApi
// (admin-block-list.ts) bound by the parent panel to either the per-event ineligibility
// list or the global permanent block. Copy that differs between the two tiers (banner,
// add-drawer title) is passed via `copy`. The add/edit + bulk drawers live in
// ./blocklist-drawers.

export interface BlocklistCopy {
  banner: ReactNode;
  addTitle: string;
  reasonPresets: string[];
}

export function BlocklistTab({
  api, entries, onReload, copy,
}: { api: BlockListApi; entries: BlockEntry[]; onReload: () => void; copy: BlocklistCopy }) {
  const [q, setQ] = useState('');
  const [drawer, setDrawer] = useState<{ mode: 'single'; editing: BlockEntry | null } | { mode: 'bulk' } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) =>
      e.empCode.toLowerCase().includes(needle) ||
      e.reason.toLowerCase().includes(needle) ||
      (e.email ?? '').toLowerCase().includes(needle) ||
      (e.fullName ?? '').toLowerCase().includes(needle)
    );
  }, [entries, q]);

  const unblock = async (empCode: string) => {
    const ok = await confirm({
      title: 'Remove from blocklist?',
      message: `Remove Employee Code "${empCode}" from the blocklist?\n(This person will be allowed to register again.)`,
      confirmText: 'Unblock',
    });
    if (!ok) return;
    setBusy(empCode);
    try { await api.remove(empCode); toast('success', `Unblocked ${empCode}.`); onReload(); }
    catch (e) { toast('error', (e as Error).message); } finally { setBusy(null); }
  };

  return (
    <>
      <div className="banner info" style={{ marginBottom: 'var(--s-5)' }}>
        <div>{copy.banner}</div>
      </div>
      <div className="panel">
        <div className="toolbar">
          <div className="search"><SearchIcon /><input type="text" aria-label="Search blocked Employee Code" placeholder="Search Employee Code, reason, email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="spacer" />
          <span className="text-sm text-muted">{filtered.length} blocked</span>
          <button type="button" className="btn sm ghost" onClick={() => setDrawer({ mode: 'bulk' })}>Bulk import</button>
          <button type="button" className="btn sm" onClick={() => setDrawer({ mode: 'single', editing: null })}>+ Add empCode</button>
        </div>
        <div className="table-scroll">
        <table className="dgrid">
          <thead><tr><th>Employee Code</th><th>Reason</th><th>Email</th><th>Full name</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {filtered.map((e) => {
              const r = splitReason(e.reason);
              return (
                <tr key={e.empCode}>
                  <td><span className="strong tnum" style={{ fontSize: 'var(--fs-md)' }}>{e.empCode}</span></td>
                  <td><div className="reason"><div className="vn">{r.primary}</div>{r.secondary && <div className="en">{r.secondary}</div>}</div></td>
                  <td>{e.email ?? <span className="empty-dash">—</span>}</td>
                  <td>{e.fullName ?? <span className="empty-dash">—</span>}</td>
                  <td className="num"><div className="row-acts"><RowMenu items={[
                    { label: 'Edit reason', onClick: () => setDrawer({ mode: 'single', editing: e }) },
                    'div',
                    { label: busy === e.empCode ? 'Removing…' : 'Unblock', danger: true, onClick: () => unblock(e.empCode) },
                  ]} /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && <div className="empty-state"><div className="es-title">No Employee Code is blocked</div></div>}
      </div>

      {drawer?.mode === 'single' && (
        <BlockDrawer
          api={api}
          title={copy.addTitle}
          reasonPresets={copy.reasonPresets}
          editing={drawer.editing}
          onClose={() => setDrawer(null)}
          onSaved={() => { setDrawer(null); onReload(); }}
        />
      )}
      {drawer?.mode === 'bulk' && (
        <BulkBlockDrawer
          api={api}
          reasonPresets={copy.reasonPresets}
          onClose={() => setDrawer(null)}
          onSaved={() => { setDrawer(null); onReload(); }}
        />
      )}
    </>
  );
}
