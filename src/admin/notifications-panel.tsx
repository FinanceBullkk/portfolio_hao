import { useEffect, useState } from 'react';
import { listMail, type MailEntry } from '../lib/adminDb';
import { formatDateTime } from '../lib/format-date';

// ── Notifications Panel ───────────────────────────────────────────────────────
// Read-only table of recent confirmation emails queued to /mail by Cloud
// Functions. The Firestore "Trigger Email" extension writes back a `delivery`
// field with state (SUCCESS | ERROR | PROCESSING) and error details.

// Pill colours — uses existing CSS class naming conventions (like aud-ev).
const STATE_CLASS: Record<MailEntry['state'], string> = {
  SUCCESS: 'create',    // green
  ERROR: 'cancel',      // red
  PROCESSING: 'update', // blue/neutral
  PENDING: 'block',     // grey/neutral — not yet picked up by extension
};

const STATE_LABEL: Record<MailEntry['state'], string> = {
  SUCCESS: 'Sent',
  ERROR: 'Failed',
  PROCESSING: 'Processing',
  PENDING: 'Queued',
};

function SummaryBar({ entries }: { entries: MailEntry[] }) {
  const sent = entries.filter((e) => e.state === 'SUCCESS').length;
  const failed = entries.filter((e) => e.state === 'ERROR').length;
  const pending = entries.filter((e) => e.state === 'PROCESSING' || e.state === 'PENDING').length;
  return (
    <div className="toolbar" style={{ borderBottom: '1px solid var(--ink-100)', marginBottom: 0 }}>
      <span className="text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s-3)' }}>
        <span style={{ color: 'var(--success-700)', fontWeight: 600 }}>{sent} sent</span>
        <span style={{ color: 'var(--ink-200)' }}>·</span>
        <span style={{ color: failed > 0 ? 'var(--danger-700)' : 'var(--ink-500)', fontWeight: failed > 0 ? 600 : undefined }}>{failed} failed</span>
        <span style={{ color: 'var(--ink-200)' }}>·</span>
        <span style={{ color: 'var(--ink-500)' }}>{pending} pending</span>
      </span>
      <div className="spacer" />
      <span className="text-sm text-muted">showing last {entries.length}</span>
    </div>
  );
}

export function NotificationsPanel() {
  const [entries, setEntries] = useState<MailEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listMail(100)
      .then(setEntries)
      .catch((e: Error) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div className="panel">
        <p style={{ color: 'var(--danger)', padding: 'var(--s-5)' }}>{err}</p>
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="panel">
        <div className="loading" style={{ padding: 'var(--s-6)' }}>
          <span className="spinner" /> Loading…
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="es-title">No emails queued</div>
          <div className="es-sub">Confirmation emails appear here once enrollment is open and emailConfirm is enabled.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <SummaryBar entries={entries} />
      <div className="aud-list">
        {entries.map((entry) => (
          <div className="aud-row" key={entry.id}>
            {/* Timestamp column — use deliveredAt if available, else show state */}
            <div className="aud-when">
              {entry.deliveredAt
                ? formatDateTime(entry.deliveredAt)
                : <span className="text-muted">—</span>}
              {entry.attempts > 0 && (
                <span className="ago">{entry.attempts} attempt{entry.attempts !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="aud-main">
              <div className="aud-head">
                {/* Status pill reuses aud-ev colour classes */}
                <span className={`aud-ev ${STATE_CLASS[entry.state]}`}>
                  {STATE_LABEL[entry.state]}
                </span>
                <span className="aud-subject">{entry.to}</span>
              </div>
              {entry.subject && (
                <div className="text-sm" style={{ color: 'var(--ink-500)', marginTop: 5 }}>{entry.subject}</div>
              )}
              {/* Error detail — only rendered on failures */}
              {entry.state === 'ERROR' && entry.error && (
                <div className="aud-note" style={{ color: 'var(--danger)' }}>
                  {entry.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
