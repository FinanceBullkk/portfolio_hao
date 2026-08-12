import { useEffect, useMemo, useState } from 'react';
import { listAuditLogs, type AuditEntry } from '../lib/audit';
import { type Slot } from '../lib/types';
import { slotLabel } from './admin-utils';
import { SearchIcon } from './admin-icons';
import { formatDateTime } from '../lib/format-date';

// ── Audit Log (human-readable) ────────────────────────────────────────────────

type AuditEvClass = 'create' | 'update' | 'cancel' | 'block' | 'config';

interface AuditView {
  evClass: AuditEvClass;
  evLabel: string;
  subject: string;
  meta?: string;
  diffs: { k: string; from?: string | null; to?: string | null }[];
  note?: string;
}

function buildAuditView(l: AuditEntry, slotMap: Map<string, Slot>): AuditView {
  const d = l.detail as Record<string, any>;
  const sl = (id: unknown) => slotLabel(slotMap, typeof id === 'string' ? id : null);
  switch (l.event) {
    case 'book.create':
      return {
        evClass: 'create', evLabel: 'Created registration',
        subject: d.fullName || d.empCode || '',
        diffs: [
          ...(d.speakingSlotId ? [{ k: 'Speaking', to: sl(d.speakingSlotId) }] : []),
          ...(d.skillsSlotId ? [{ k: '3 Skills', to: sl(d.skillsSlotId) }] : []),
        ],
      };
    case 'book.update': {
      const diffs: AuditView['diffs'] = [];
      if (d.prevSpeakingSlotId !== d.speakingSlotId) diffs.push({ k: 'Speaking', from: sl(d.prevSpeakingSlotId), to: sl(d.speakingSlotId) });
      if (d.prevSkillsSlotId !== d.skillsSlotId) diffs.push({ k: '3 Skills', from: sl(d.prevSkillsSlotId), to: sl(d.skillsSlotId) });
      return {
        evClass: 'update', evLabel: 'Updated registration',
        subject: d.fullName || d.empCode || '',
        meta: d.changeCount != null ? `Change #${d.changeCount}` : undefined,
        diffs,
      };
    }
    case 'book.cancel':
      return { evClass: 'cancel', evLabel: 'Cancelled registration', subject: d.fullName || d.empCode || l.email, diffs: [] };
    case 'book.rejected.blocked':
      return { evClass: 'block', evLabel: 'Blocked (not eligible)', subject: d.empCode || l.email, diffs: [], note: d.reason };
    case 'admin.createSlot':
      return { evClass: 'create', evLabel: 'Created slot', subject: d.slotId || '', diffs: [] };
    case 'admin.deleteSlot':
      return { evClass: 'cancel', evLabel: 'Deleted slot', subject: d.slotId || '', diffs: [] };
    case 'admin.reconcileEventCapacity':
      return {
        evClass: 'config',
        evLabel: 'Reconciled event capacity',
        subject: `${Array.isArray(d.reconciled) ? d.reconciled.length : 0}/${d.checked ?? 0} event(s)`,
        diffs: [],
        note: Array.isArray(d.skipped) && d.skipped.length
          ? `${d.skipped.length} skipped: ${d.skipped.map((s: any) => `${s.eventId}:${s.reason}`).join(', ')}`
          : undefined,
      };
    case 'admin.updateSlot':
      return {
        evClass: 'update', evLabel: 'Updated slot', subject: d.slotId || '',
        diffs: d.updates ? Object.entries(d.updates).map(([k, v]) => ({ k, to: String(v) })) : [],
      };
    case 'admin.deleteRegistration':
      return { evClass: 'cancel', evLabel: 'Deleted registration (admin)', subject: d.fullName || d.targetEmail || '', diffs: [] };
    case 'admin.updateRegistration': {
      const diffs: AuditView['diffs'] = [];
      if (d.prevSpeakingSlotId !== d.speakingSlotId) diffs.push({ k: 'Speaking', from: sl(d.prevSpeakingSlotId), to: sl(d.speakingSlotId) });
      if (d.prevSkillsSlotId !== d.skillsSlotId) diffs.push({ k: '3 Skills', from: sl(d.prevSkillsSlotId), to: sl(d.skillsSlotId) });
      return { evClass: 'update', evLabel: 'Moved registration (admin)', subject: d.fullName || d.targetEmail || '', diffs };
    }
    case 'admin.upsertIneligibility':
      return { evClass: 'block', evLabel: d.mode === 'bulk' ? `Added ${d.count} to event blocklist` : 'Added to event blocklist', subject: d.empCode || '', diffs: [], note: d.reason };
    case 'admin.deleteIneligibility':
      return { evClass: 'cancel', evLabel: 'Removed from event blocklist', subject: d.empCode || '', diffs: [] };
    case 'admin.upsertPermanentBlock':
      return { evClass: 'block', evLabel: d.mode === 'bulk' ? `Permanently blocked ${d.count}` : 'Added to permanent block', subject: d.empCode || '', diffs: [], note: d.reason };
    case 'admin.deletePermanentBlock':
      return { evClass: 'cancel', evLabel: 'Removed from permanent block', subject: d.empCode || '', diffs: [] };
    // User profile edits — logged by Cloud Functions (profile-handlers.js). Shows
    // before→after so an Employee ID correction is auditable.
    case 'user.updateProfile': {
      const before = (d.before ?? {}) as Record<string, any>;
      const after = (d.after ?? {}) as Record<string, any>;
      const diffs: AuditView['diffs'] = (['empCode', 'fullName', 'bu'] as const)
        .filter((k) => before[k] !== after[k])
        .map((k) => ({ k: k === 'empCode' ? 'Employee ID' : k === 'fullName' ? 'Name' : 'BU', from: d.created ? undefined : before[k] ?? '—', to: after[k] ?? '—' }));
      return {
        evClass: d.created ? 'create' : 'update',
        evLabel: d.created ? 'Completed profile' : 'Updated profile',
        subject: after.fullName || after.empCode || l.email,
        diffs,
      };
    }
    // Event CRUD — logged by Cloud Functions; detail shape from event-admin.js
    case 'admin.upsertEvent':
      return {
        evClass: d.created ? 'create' : 'update',
        evLabel: d.created ? 'Created event' : 'Updated event',
        subject: typeof d.eventId === 'string' ? d.eventId : '',
        diffs: [
          ...(d.type != null ? [{ k: 'Type', to: String(d.type) }] : []),
          ...(d.capacity != null ? [{ k: 'Capacity', to: String(d.capacity) }] : []),
        ],
      };
    case 'admin.deleteEvent':
      return {
        evClass: 'cancel', evLabel: 'Deleted event',
        subject: typeof d.name === 'string' ? d.name : (typeof d.eventId === 'string' ? d.eventId : ''),
        diffs: [],
        note: typeof d.deleted === 'object' && d.deleted !== null
          ? `Removed: ${Object.entries(d.deleted as Record<string, number>).filter(([, v]) => v > 0).map(([k, v]) => `${k} ×${v}`).join(', ')}`
          : undefined,
      };
    case 'admin.deleteEventRegistration':
      return {
        evClass: 'cancel', evLabel: 'Deleted registration (event)',
        subject: typeof d.fullName === 'string' && d.fullName ? d.fullName : (typeof d.targetEmail === 'string' ? d.targetEmail : ''),
        diffs: typeof d.eventId === 'string' ? [{ k: 'Event', to: d.eventId }] : [],
      };
    case 'admin.updateConfig': {
      // The logged detail holds only the keys that actually changed — render each
      // so the highest-stakes admin action (closing enrollment, moving the
      // deadline, editing admin emails) leaves a readable trail.
      const fmtDate = (v: any): string => {
        if (v == null) return 'Cleared';
        const ms = typeof v === 'object' && v?.seconds != null ? v.seconds * 1000
          : v instanceof Date ? v.getTime()
            : (typeof v === 'string' || typeof v === 'number') ? new Date(v).getTime()
              : NaN;
        return Number.isNaN(ms) ? String(v) : formatDateTime(ms);
      };
      const list = (v: unknown) => (Array.isArray(v) ? `${v.length}: ${v.join(', ')}` : String(v));
      const diffs: AuditView['diffs'] = [];
      if ('allowEnrollment' in d) diffs.push({ k: 'Enrollment', to: d.allowEnrollment ? 'Open' : 'Closed' });
      if ('deadline' in d) diffs.push({ k: 'Deadline', to: fmtDate(d.deadline) });
      if ('maxChanges' in d) diffs.push({ k: 'Max changes', to: String(d.maxChanges) });
      if ('emailConfirm' in d) diffs.push({ k: 'Confirmation email', to: d.emailConfirm ? 'On' : 'Off' });
      if ('requireEligibility' in d) diffs.push({ k: 'Require eligibility', to: d.requireEligibility ? 'On' : 'Off' });
      if ('adminEmails' in d) diffs.push({ k: 'Admin emails', to: list(d.adminEmails) });
      if ('buList' in d) diffs.push({ k: 'BU list', to: list(d.buList) });
      return { evClass: 'config', evLabel: 'Updated configuration', subject: '', diffs };
    }
    default: {
      // For unrecognised events render key=value pairs so each field is legible
      // rather than dumping a wall of JSON into a single diff cell.
      const diffs = Object.entries(d)
        .filter(([, v]) => v != null && typeof v !== 'object')
        .map(([k, v]) => ({ k, to: String(v) }));
      const jsonNote = Object.entries(d).some(([, v]) => v != null && typeof v === 'object')
        ? JSON.stringify(d)
        : undefined;
      return { evClass: 'config', evLabel: l.event, subject: '', diffs, note: jsonNote };
    }
  }
}

// Locale-driven relative time (en) instead of hardcoded " min/hour/day ago".
const RELATIVE_TIME = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return RELATIVE_TIME.format(-m, 'minute');
  const h = Math.floor(m / 60);
  if (h < 24) return RELATIVE_TIME.format(-h, 'hour');
  const dd = Math.floor(h / 24);
  return RELATIVE_TIME.format(-dd, 'day');
}

export function AuditTab({ slots }: { slots: Slot[] }) {
  const [logs, setLogs] = useState<AuditEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | AuditEvClass>('all');

  const slotMap = useMemo(() => new Map(slots.map((s) => [s.slotId, s])), [slots]);

  useEffect(() => {
    listAuditLogs(500).then(setLogs).catch((e: Error) => setErr(e.message));
  }, []);

  const rows = useMemo(() => {
    if (!logs) return [];
    const needle = q.trim().toLowerCase();
    return logs
      .map((l) => ({ l, v: buildAuditView(l, slotMap) }))
      .filter(({ l, v }) => {
        if (filter !== 'all' && v.evClass !== filter) return false;
        if (!needle) return true;
        return (`${l.email} ${v.subject} ${v.evLabel} ${v.note ?? ''}`).toLowerCase().includes(needle);
      });
  }, [logs, slotMap, q, filter]);

  if (err) return <div className="panel"><p style={{ color: 'var(--danger)', padding: 'var(--s-5)' }}>{err}</p></div>;
  if (!logs) return <div className="panel"><div className="loading" style={{ padding: 'var(--s-6)' }}><span className="spinner" /> Loading…</div></div>;

  const FILTERS: [('all' | AuditEvClass), string][] = [['all', 'All'], ['create', 'Create'], ['update', 'Update'], ['cancel', 'Cancel'], ['block', 'Block']];

  return (
    <div className="panel">
      <div className="toolbar">
        <div className="filter-chips">
          {FILTERS.map(([v, l]) => <button key={v} type="button" aria-pressed={filter === v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{l}</button>)}
        </div>
        <div className="search"><SearchIcon /><input type="text" aria-label="Search actions" placeholder="Search email, Employee Code, name…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="spacer" />
        <span className="text-sm text-muted">{rows.length} actions</span>
      </div>
      <div className="aud-list">
        {rows.map(({ l, v }) => (
          <div className="aud-row" key={l.id}>
            <div className="aud-when">
              {formatDateTime(l.timestamp) || '—'}
              <span className="ago">{timeAgo(l.timestamp)}</span>
            </div>
            <div className="aud-main">
              <div className="aud-head">
                <span className={`aud-ev ${v.evClass}`}>{v.evLabel}</span>
                {v.subject && <span className="aud-subject">{v.subject}</span>}
                <span className="aud-actor">· by {l.email}</span>
                {v.meta && <span className="aud-actor">· {v.meta}</span>}
              </div>
              {v.diffs.length > 0 && (
                <div className="aud-diffs">
                  {v.diffs.map((diff, i) => (
                    <div className="aud-diff" key={i}>
                      <span className="dk">{diff.k}</span>
                      {diff.from && <><span className="from tnum">{diff.from}</span><span className="arrow">→</span></>}
                      <span className="to tnum">{diff.to}</span>
                    </div>
                  ))}
                </div>
              )}
              {v.note && <div className="aud-note">{v.note}</div>}
            </div>
          </div>
        ))}
      </div>
      {rows.length === 0 && <div className="empty-state"><div className="es-title">No actions yet</div></div>}
    </div>
  );
}
