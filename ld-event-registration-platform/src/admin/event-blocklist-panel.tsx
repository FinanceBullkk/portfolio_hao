import { useEffect, useMemo, useState } from 'react';
import type { EventDoc } from '../lib/types';
import { INELIGIBILITY_REASON_PRESETS, makeEventIneligibilityApi, type BlockEntry } from '../lib/adminDb';
import { BlocklistTab } from './blocklist-tab';

// Per-event ineligibility for the selected event: the quarterly "not eligible for
// THIS event" list. Builds an event-scoped BlockListApi and renders the shared
// BlocklistTab; the global "permanent block" tier is permanent-block-panel.tsx.

export function EventBlocklistPanel({ adminEmail, event }: { adminEmail: string; event: EventDoc }) {
  const api = useMemo(() => makeEventIneligibilityApi(adminEmail, event.eventId), [adminEmail, event.eventId]);
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
        reasonPresets: INELIGIBILITY_REASON_PRESETS,
        addTitle: 'Add to event blocklist',
        banner: (
          <>
            Employees on this list <b>cannot register</b> for <b>{event.name || 'this event'}</b>. When they enter their
            Employee Code in Step 1 the system blocks them and shows the reason. This list is specific to this event and
            resets per event — an empty list = nobody is blocked for it. For an across-all-events ban, use Permanent block.
          </>
        ),
      }}
    />
  );
}
