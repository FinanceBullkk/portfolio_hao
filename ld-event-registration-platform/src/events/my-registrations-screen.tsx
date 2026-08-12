import { useEffect, useMemo, useState } from 'react';
import type { MyRegistrationEntry } from '../lib/types';
import { listMyRegistrationsDb } from '../lib/eventsDb';
import { DarkNav } from './dark/dark-chrome';
import { captureError, friendlyFirestoreError } from '../lib/monitoring';
import { RegistrationHistoryList } from './registration-history-list';

// Read-only "My registrations" history. Lists EVERY event the signed-in user
// registered in — including closed and archived ones the landing list hides — so
// a finished booking (e.g. an archived assessment) stays viewable. Still-open
// events get a "Manage →" shortcut back into the edit/booking flow.

export function MyRegistrationsScreen({
  email,
  canAdmin,
  onOpenAdmin,
  onSignOut,
  onBack,
  onEditProfile,
  manageableEventIds,
  onManage,
}: {
  email: string;
  canAdmin: boolean;
  onOpenAdmin: () => void;
  onSignOut: () => void;
  onBack: () => void;
  onEditProfile?: () => void;
  manageableEventIds: string[];
  onManage: (eventId: string) => void;
}) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [entries, setEntries] = useState<MyRegistrationEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const manageableIds = useMemo(() => new Set(manageableEventIds), [manageableEventIds]);

  useEffect(() => {
    let alive = true;
    setPhase('loading');
    listMyRegistrationsDb()
      .then((r) => {
        if (!alive) return;
        setEntries(r.registrations);
        setPhase('ready');
      })
      .catch((e: Error) => {
        if (!alive) return;
        captureError(e, { operation: 'listMyRegistrations' });
        setErr(friendlyFirestoreError(e) || 'Failed to load your registrations.');
        setPhase('error');
      });
    return () => { alive = false; };
  }, [email]);

  const topbar = (
    <DarkNav
      email={email}
      onHome={onBack}
      current="other"
      menu={{ canAdmin, onOpenAdmin, onEditProfile, onSignOut }}
    />
  );

  return (
    // .c7d scopes the dark theme to this user screen; the .mr-*/.lc-* cards are shared
    // with the light admin User-lookup tab, so the dark overrides live under .c7d only.
    <div className="app c7d">
      {topbar}
      <main className="container lc-main">
        <div className="lc-head">
          <div>
            <h1>My registrations</h1>
            <p>Everything you’ve registered for — including closed and archived programs. View only.</p>
          </div>
          {phase === 'ready' && (
            <span className={`lc-active${entries.length === 0 ? ' empty' : ''}`}>
              <span className="dot" /><b>{entries.length}</b> registration{entries.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* P2-13: skeleton cards instead of a bare spinner — the page keeps its
            shape while loading, so the layout doesn't jump when data arrives. */}
        {phase === 'loading' && (
          <div className="mr-grid" aria-busy="true" aria-label="Loading your registrations">
            {[0, 1, 2].map((i) => (
              <div className="mr-card sk-card" key={i} aria-hidden="true">
                <div className="mr-card-hd">
                  <div className="mr-card-ttl" style={{ width: '100%' }}>
                    <span className="sk-line sk-chip" />
                    <span className="sk-line sk-title" />
                    <span className="sk-line sk-sub" />
                  </div>
                </div>
                <div className="mr-card-bd">
                  <span className="sk-line sk-row" />
                  <span className="sk-line sk-row short" />
                </div>
                <div className="mr-foot"><span className="sk-line sk-foot" /></div>
              </div>
            ))}
          </div>
        )}

        {phase === 'error' && (
          <div className="card"><div className="card-bd">
            <p className="text-sm text-muted">{err}</p>
            <button className="btn" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>Reload</button>
          </div></div>
        )}

        {phase === 'ready' && entries.length === 0 && (
          <div className="card"><div className="card-bd">
            <p className="text-sm text-muted">You haven’t registered for anything yet.</p>
            <button className="btn" style={{ marginTop: 12 }} onClick={onBack}>← Browse events</button>
          </div></div>
        )}

        {phase === 'ready' && entries.length > 0 && (
          <RegistrationHistoryList entries={entries} manageableIds={manageableIds} onManage={onManage} showIdentity={false} />
        )}
      </main>
    </div>
  );
}
