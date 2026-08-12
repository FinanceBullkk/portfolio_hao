import { useState } from 'react';
import type { MyRegistrationEntry } from '../lib/types';
import { adminListUserRegistrations } from '../lib/adminDb';
import { captureError } from '../lib/monitoring';
import { RegistrationHistoryList } from '../events/registration-history-list';
import { SearchIcon } from './admin-icons';

// Admin "User lookup": type a user's email → see their FULL registration history
// across every event (including archived/closed), reusing the same read-only card
// list as the user-facing screen. View-only (no Manage action for admins here).

export function UserRegistrationsTab() {
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [queried, setQueried] = useState('');
  const [entries, setEntries] = useState<MyRegistrationEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function search() {
    const target = email.trim().toLowerCase();
    if (!target) return;
    setPhase('loading');
    setQueried(target);
    setErr(null);
    try {
      const res = await adminListUserRegistrations(target);
      setEntries(res.registrations);
      setPhase('ready');
    } catch (e) {
      captureError(e, { operation: 'admin.listUserRegistrations' });
      setErr((e as Error)?.message || 'Lookup failed.');
      setPhase('error');
    }
  }

  return (
    <div className="ur-tab">
      <form
        className="ur-search"
        onSubmit={(e) => { e.preventDefault(); void search(); }}
      >
        <input
          className="input"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="user@cyberlogitec.com"
          aria-label="User email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!email.trim() || phase === 'loading'}>
          <SearchIcon /> {phase === 'loading' ? 'Searching…' : 'Look up'}
        </button>
      </form>

      {phase === 'idle' && (
        <p className="ur-hint">Enter a user’s company email to see everything they’ve registered for.</p>
      )}

      {phase === 'error' && (
        <div className="card"><div className="card-bd"><p className="text-sm text-muted">{err}</p></div></div>
      )}

      {phase === 'ready' && entries.length === 0 && (
        <div className="card"><div className="card-bd">
          <p className="text-sm text-muted">No registrations found for <b>{queried}</b>.</p>
          <p className="text-sm text-muted" style={{ marginTop: 6 }}>
            Check the email is the full company address (e.g. name@cyberlogitec.com) — otherwise this person simply hasn’t registered for anything yet.
          </p>
        </div></div>
      )}

      {phase === 'ready' && entries.length > 0 && (
        <>
          <p className="ur-count"><b>{entries.length}</b> registration{entries.length === 1 ? '' : 's'} for <b>{queried}</b></p>
          <RegistrationHistoryList entries={entries} />
        </>
      )}
    </div>
  );
}
