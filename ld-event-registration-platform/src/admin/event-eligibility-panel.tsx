import { useEffect, useMemo, useState } from 'react';
import type { EventDoc } from '../lib/types';
import { ELIGIBILITY_NOTE_PRESETS, makeEventEligibilityApi, type BlockEntry } from '../lib/adminDb';
import { BlocklistTab } from './blocklist-tab';

// Per-event eligibility ALLOWLIST for the selected event: when the event has
// "Restrict to an eligibility list" on, only the Employee Codes on this list can SEE
// and register for it (initEvents hides it from everyone else). Reuses the shared
// BlocklistTab UI with allow-semantics copy; the underlying store is the same generic
// list plumbing as the blocklist (events/{id}/eligibility/{empCode}).

export function EventEligibilityPanel({ adminEmail, event }: { adminEmail: string; event: EventDoc }) {
  const api = useMemo(() => makeEventEligibilityApi(adminEmail, event.eventId), [adminEmail, event.eventId]);
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
        reasonPresets: ELIGIBILITY_NOTE_PRESETS,
        addTitle: 'Add to eligibility list',
        banner: (
          <>
            {event.requireEligibility ? (
              <>Only employees on this list can <b>see and register</b> for <b>{event.name || 'this event'}</b> —
              everyone else won’t see it at all. An empty list = nobody can see it (except admins).</>
            ) : (
              <>This event is <b>open to everyone</b> right now. Turn on <b>“Restrict to an eligibility list”</b> in
              Settings to limit it to the Employee Codes below. The note is optional (admin-only).</>
            )}
          </>
        ),
      }}
    />
  );
}
