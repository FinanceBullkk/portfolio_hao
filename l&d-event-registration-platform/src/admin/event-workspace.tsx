import { useEffect, useMemo, useState } from 'react';
import { formatDateVi, minToHHmm, type EventDoc, type Slot } from '../lib/types';
import {
  deleteEvent,
  downloadEventRosterCsv,
  eventToUpsertInput,
  listEventRegistrations,
  listEventSlots,
  upsertEvent,
  type EventRegistrationRow,
} from '../lib/adminDb';
import { useConfirm, useToast } from '../confirm-toast-provider';
import { enrollBadge, enrollmentOpen, enrollmentTogglePatch } from './event-fill';
import type { WsTab } from './admin-utils';
import { EventRegistrationsPanel } from './event-registrations-panel';
import { EventSlotsPanel } from './event-slots-panel';
import { EventBlocklistPanel } from './event-blocklist-panel';
import { EventEligibilityPanel } from './event-eligibility-panel';
import { EventSettingsPanel } from './event-settings-panel';
import { EventDrawer } from './event-drawer';

// ── Event workspace (audit A2) ────────────────────────────────────────────────
// One event managed in one place: breadcrumb-locked header card (identity +
// enrollment toggle + Export + Edit + a 4-stat strip) over sub-tabs. Replaces the
// shared header event picker — every per-event view is reached from here.

function HeaderIcon({ slotted }: { slotted: boolean }) {
  return slotted ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>
  );
}

interface Stat { k: string; v: string; tone?: 'accent' | 'warn' }

export function EventWorkspace({
  adminEmail, event, wsTab, onWsTab, onBack, onReload,
}: {
  adminEmail: string;
  event: EventDoc;
  wsTab: WsTab;
  onWsTab: (t: WsTab) => void;
  onBack: () => void;
  onReload: () => void;
}) {
  const slotted = event.type === 'slotted';
  const [regs, setRegs] = useState<EventRegistrationRow[] | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  // Load the registrations (+ slotted slots) once for the header stat strip. The
  // Registrations / Slots sub-tabs fetch their own data independently.
  useEffect(() => {
    let live = true;
    setRegs(null);
    listEventRegistrations(event.eventId).then((r) => { if (live) setRegs(r); }).catch(() => { if (live) setRegs([]); });
    if (slotted) listEventSlots(event.eventId).then((s) => { if (live) setSlots(s); }).catch(() => { if (live) setSlots([]); });
    return () => { live = false; };
  }, [event.eventId, slotted]);

  const stats = useMemo<Stat[]>(() => {
    const total = regs?.length ?? 0;
    if (slotted) {
      const sp = slots.filter((s) => s.type === 'Speaking');
      const sk = slots.filter((s) => s.type === '3 Skills');
      const sum = (a: Slot[], k: 'capacity' | 'remaining') => a.reduce((n, s) => n + s[k], 0);
      const spCap = sum(sp, 'capacity'), skCap = sum(sk, 'capacity');
      const spPct = spCap ? Math.round(((spCap - sum(sp, 'remaining')) / spCap) * 100) : 0;
      const skPct = skCap ? Math.round(((skCap - sum(sk, 'remaining')) / skCap) * 100) : 0;
      const incomplete = (regs ?? []).filter((r) => !r.speakingSlotId || !r.skillsSlotId).length;
      return [
        { k: 'Registrations', v: String(total) },
        { k: 'Speaking fill', v: `${spPct}%`, tone: 'accent' },
        { k: '3 Skills fill', v: `${skPct}%`, tone: 'accent' },
        { k: 'Incomplete', v: String(incomplete), tone: incomplete > 0 ? 'warn' : undefined },
      ];
    }
    const cap = event.capacity ?? 0;
    const used = cap > 0 ? Math.max(0, cap - (event.remaining ?? 0)) : total;
    const pct = cap > 0 ? Math.round((used / cap) * 100) : 0;
    const waitlist = Math.max(0, used - cap);
    return [
      { k: 'Registrations', v: String(used) },
      { k: 'Capacity', v: cap > 0 ? String(cap) : '—' },
      { k: 'Fill', v: cap > 0 ? `${pct}%` : '—', tone: 'accent' },
      { k: 'Waitlist', v: String(waitlist), tone: waitlist > 0 ? 'warn' : undefined },
    ];
  }, [regs, slots, slotted, event.capacity, event.remaining]);

  const enroll = enrollBadge(event);
  const canToggle = !event.archived;

  const toggleEnrollment = async () => {
    const { patch, opening, clearedDeadline } = enrollmentTogglePatch(event);
    setBusy(true);
    try {
      await upsertEvent(adminEmail, { ...eventToUpsertInput(event), ...patch });
      toast('success', !opening
        ? `Enrollment closed for “${event.name}”.`
        : clearedDeadline
          ? `Enrollment reopened for “${event.name}” — past deadline cleared.`
          : `Enrollment opened for “${event.name}”.`);
      onReload();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const requestDelete = async () => {
    const ok = await confirm({
      title: `Delete ${event.name || event.eventId}?`,
      message: `This permanently deletes “${event.name || event.eventId}”, its registrations, slots and related data. This cannot be undone.`,
      confirmText: 'Delete event',
      cancelText: 'Keep event',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteEvent(adminEmail, event.eventId);
      toast('success', 'Event deleted.');
      onReload();
      onBack();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const metaLine = slotted
    ? `${event.eventId} · Speaking + 3 Skills`
    : event.eventDate
      ? `${event.eventId} · ${formatDateVi(event.eventDate)}${event.startMin != null ? ` · ${minToHHmm(event.startMin)}` : ''}`
      : event.eventId;

  // Slots sub-tab only applies to slotted events.
  const TABS: { id: WsTab; label: string }[] = [
    { id: 'registrations', label: 'Registrations' },
    ...(slotted ? [{ id: 'slots' as WsTab, label: 'Slots' }] : []),
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'blocklist', label: 'Blocklist' },
    { id: 'settings', label: 'Settings' },
  ];
  // If we land on Slots for a simple event (shouldn't happen), fall back.
  const activeTab: WsTab = TABS.some((t) => t.id === wsTab) ? wsTab : 'registrations';

  return (
    <div className="ws">
      <nav className="ws-crumb" aria-label="Breadcrumb">
        <button type="button" className="crumb-link" onClick={onBack}>Events</button>
        <span className="crumb-sep" aria-hidden="true">›</span>
        <span className="crumb-cur">{event.name || event.eventId}</span>
      </nav>

      <div className="ws-head">
        <div className="ws-head-top">
          <span className={`ws-icon ${slotted ? 'sp' : 'sk'}`}><HeaderIcon slotted={slotted} /></span>
          <div className="ws-id">
            <div className="ws-name-row">
              <h2 className="ws-name">{event.name || event.eventId}</h2>
              <span className={`ev-type ${slotted ? 'sp' : 'sk'}`}>{slotted ? 'Slotted' : 'Simple'}</span>
              <span className={`ev-enroll ${enroll.tone}`}>{enroll.label}</span>
            </div>
            <div className="ws-meta">{metaLine}</div>
          </div>
        </div>

        <div className="ws-acts">
          <button
            type="button"
            className={`ev-toggle lg ${enrollmentOpen(event) ? 'on' : 'off'}`}
            disabled={!canToggle || busy}
            aria-pressed={enrollmentOpen(event)}
            onClick={toggleEnrollment}
          >
            <span className="knob" aria-hidden="true" />
            <span className="lbl">Enrollment</span>
          </button>
          <button type="button" className="btn sm ghost" disabled={!regs || regs.length === 0} onClick={() => regs && downloadEventRosterCsv(event.name, regs)}>
            Export CSV
          </button>
          <button type="button" className="btn sm ghost" onClick={() => setEditing(true)}>Edit</button>
        </div>

        <div className="ws-stats">
          {stats.map((s) => (
            <div className={`ws-stat${s.tone ? ` ${s.tone}` : ''}`} key={s.k}>
              <div className="k">{s.k}</div>
              <div className="v tnum">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="ws-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} className={activeTab === t.id ? 'active' : ''} onClick={() => onWsTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ws-body">
        {activeTab === 'registrations' && <EventRegistrationsPanel adminEmail={adminEmail} event={event} />}
        {activeTab === 'slots' && slotted && <EventSlotsPanel adminEmail={adminEmail} event={event} />}
        {activeTab === 'eligibility' && <EventEligibilityPanel adminEmail={adminEmail} event={event} />}
        {activeTab === 'blocklist' && <EventBlocklistPanel adminEmail={adminEmail} event={event} />}
        {activeTab === 'settings' && (
          <EventSettingsPanel adminEmail={adminEmail} event={event} busy={busy} onSaved={onReload} onRequestDelete={requestDelete} />
        )}
      </div>

      {editing && (
        <EventDrawer
          adminEmail={adminEmail}
          event={event}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onReload(); }}
          onRequestDelete={() => { setEditing(false); void requestDelete(); }}
        />
      )}
    </div>
  );
}
