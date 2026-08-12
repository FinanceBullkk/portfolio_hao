import { useEffect, useMemo, useState } from 'react';
import { PERMANENT_BLOCK_REASON_PRESETS, makePermanentBlockApi, type BlockEntry } from '../lib/adminDb';
import { BlocklistTab } from './blocklist-tab';

// Global permanent block: the "never allowed to register for ANY event" list (e.g.
// former employees). Builds the global BlockListApi and renders the shared
// BlocklistTab. Not event-scoped — for "not eligible this quarter" use the
// per-event Blocklist tab instead.

export function PermanentBlockPanel({ adminEmail }: { adminEmail: string }) {
  const api = useMemo(() => makePermanentBlockApi(adminEmail), [adminEmail]);
  const [entries, setEntries] = useState<BlockEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = () => {
    setErr(null);
    api.list().then(setEntries).catch((e: Error) => setErr(e.message));
  };
  useEffect(reload, [api]);

  if (err) return <p style={{ color: 'var(--danger)' }}>{err}</p>;
  if (!entries) return <div className="loading"><span className="spinner" /> Loading…</div>;

  return (
    <BlocklistTab
      api={api}
      entries={entries}
      onReload={reload}
      copy={{
        reasonPresets: PERMANENT_BLOCK_REASON_PRESETS,
        addTitle: 'Add to permanent block',
        banner: (
          <>
            Employees on this list are <b>permanently blocked</b> from registering for <b>any event</b> (e.g. former
            employees). This applies across every event and does <b>not</b> reset each quarter. For a "not eligible this
            quarter" block, use the per-event Blocklist instead.
          </>
        ),
      }}
    />
  );
}
