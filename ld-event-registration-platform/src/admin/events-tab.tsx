import { useMemo, useState } from 'react';
import type { EventDoc } from '../lib/types';
import {
  deleteEvent,
  eventToUpsertInput,
  listEventRegistrations,
  reconcileEventCapacity,
  upsertEvent,
  type EventStat,
} from '../lib/adminDb';
import { useConfirm, useToast } from '../confirm-toast-provider';
import { MoreMenu, type MenuItem } from './admin-chrome';
import { EventDrawer } from './event-drawer';
import { EventRegsDrawer } from './event-regs-drawer';
import { EventSlotsManager } from './event-slots-manager';
import { EventLifecycleCard } from './event-lifecycle-card';
import { LIFECYCLE_LABEL, lifecycleOf, enrollmentTogglePatch, type Lifecycle } from './event-fill';

// Admin Events tab: events grouped by lifecycle (Active / Closed / Archived)
// with a segmented filter and rich cards showing real fill for both event types
// — a single bar for simple events, dual Speaking / 3 Skills meters for slotted.
// Each card carries an inline enrollment toggle + a "Manage →" into the event
// workspace; rare/destructive actions stay in the row menu. Create/edit via the
// drawer; maintenance (migrate/reconcile) lives in a "More ▾" overflow menu.

const LIFECYCLES: Lifecycle[] = ['active', 'closed', 'archived'];
type FilterKey = 'all' | Lifecycle;

export function EventsTab({
  adminEmail, events, stats, statsReady, onReload, onManage,
}: { adminEmail: string; events: EventDoc[]; stats: Record<string, EventStat>; statsReady: boolean; onReload: () => void; onManage: (ev: EventDoc) => void }) {
  // `event` set = edit; `template` set = duplicate (prefill values, create new).
  const [drawer, setDrawer] = useState<{ event: EventDoc | null; template?: EventDoc } | null>(null);
  const [regsDrawer, setRegsDrawer] = useState<EventDoc | null>(null);
  const [slotsManager, setSlotsManager] = useState<EventDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const confirm = useConfirm();
  const toast = useToast();

  // Bucket events by lifecycle once; drives both the filter counts and the groups.
  const byLifecycle = useMemo(() => {
    const m: Record<Lifecycle, EventDoc[]> = { active: [], closed: [], archived: [] };
    for (const ev of events) m[lifecycleOf(ev)].push(ev);
    return m;
  }, [events]);
  const counts: Record<FilterKey, number> = {
    all: events.length, active: byLifecycle.active.length, closed: byLifecycle.closed.length, archived: byLifecycle.archived.length,
  };
  const visibleGroups = LIFECYCLES
    .filter((k) => filter === 'all' || filter === k)
    .map((k) => ({ key: k, items: byLifecycle[k] }))
    .filter((g) => g.items.length > 0);
  const now = Date.now();

  const reconcileCapacities = async () => {
    const ok = await confirm({
      title: 'Reconcile event capacity?',
      message: 'Recompute simple-event capacity (seat claims) from actual registrations. Safe to run after deploy or any manual Firestore fix.',
      confirmText: 'Reconcile capacity',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await reconcileEventCapacity(adminEmail);
      toast(
        r.skipped.length ? 'error' : 'success',
        `Capacity reconciled — ${r.reconciled.length}/${r.checked} event(s).${r.skipped.length ? ` Skipped ${r.skipped.length}.` : ''}`,
      );
      onReload();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Resolve registration count before showing the delete confirm.
   *  - simple: derive from capacity/remaining (already cached on the row)
   *  - slotted: fetch live count; fall back to null on error so we still allow delete */
  const deleteSelectedEvent = async (ev: EventDoc) => {
    let regCount: number | null = null;
    if (ev.type === 'simple' && ev.capacity != null) {
      regCount = Math.max(0, ev.capacity - (ev.remaining ?? 0));
    } else if (ev.type === 'slotted') {
      try {
        const regs = await listEventRegistrations(ev.eventId);
        regCount = regs.length;
      } catch {
        // Non-fatal: we show a generic warning below
        regCount = null;
      }
    }

    // Build a clear, count-aware confirmation message
    const countPhrase =
      regCount === null
        ? 'an unknown number of registrations (fetch failed)'
        : regCount === 1
          ? '1 registration'
          : `${regCount} registration(s)`;
    const message =
      `This permanently deletes "${ev.name || ev.eventId}" and its ${countPhrase}, slots and related data. This cannot be undone.`;

    const ok = await confirm({
      title: `Delete ${ev.name || ev.eventId}?`,
      message,
      confirmText: 'Delete event',
      cancelText: 'Keep event',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await deleteEvent(adminEmail, ev.eventId);
      const deleted = Object.entries(r.deleted)
        .filter(([, count]) => count > 0)
        .map(([k, count]) => `${k}:${count}`)
        .join(', ');
      toast('success', `Event deleted${deleted ? ` — ${deleted}` : '.'}`);
      onReload();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Flip enrollment from the inline card toggle. The toggle shows the EFFECTIVE
   *  state, so reopening a deadline-passed event also clears that past deadline. */
  const toggleEnrollment = async (ev: EventDoc) => {
    const { patch, opening, clearedDeadline } = enrollmentTogglePatch(ev);
    // P1-8: a single inline click used to flip enrollment for the whole event with
    // no guard — confirm first so a stray click can't silently close registrations.
    const ok = await confirm({
      title: opening ? `Open enrollment for "${ev.name}"?` : `Close enrollment for "${ev.name}"?`,
      message: opening
        ? (clearedDeadline
            ? 'Registrations will reopen and the past deadline will be cleared.'
            : 'Registrations will reopen for this event.')
        : 'New registrations will be blocked immediately. Existing registrations are kept.',
      confirmText: opening ? 'Open enrollment' : 'Close enrollment',
      danger: !opening,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await upsertEvent(adminEmail, { ...eventToUpsertInput(ev), ...patch });
      toast('success', !opening
        ? `Enrollment closed for "${ev.name}".`
        : clearedDeadline
          ? `Enrollment reopened for "${ev.name}" — past deadline cleared.`
          : `Enrollment opened for "${ev.name}".`);
      onReload();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Toggle archived for an event (one-click from row menu). assessment-q2 is protected. */
  const toggleArchived = async (ev: EventDoc) => {
    setBusy(true);
    try {
      await upsertEvent(adminEmail, { ...eventToUpsertInput(ev), archived: !ev.archived });
      toast('success', ev.archived ? `"${ev.name}" unarchived.` : `"${ev.name}" archived.`);
      onReload();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Row menu — rare / destructive actions only. The frequent enrollment toggle and
  // "Manage →" now live inline on the card (audit A3), so the menu keeps Edit /
  // Duplicate / Manage slots / View regs / Archive / Delete. assessment-q2 is only
  // delete-protected: archive/unarchive is reversible + non-destructive, so it
  // stays available (an archived event must always be reopenable from the UI).
  const menuFor = (ev: EventDoc): MenuItem[] => {
    const isProtected = ev.eventId === 'assessment-q2';
    return [
      { label: 'Edit event', onClick: () => setDrawer({ event: ev }) },
      { label: 'Duplicate', onClick: () => setDrawer({ event: null, template: ev }) },
      ...(ev.type === 'slotted' ? [{ label: 'Manage slots', onClick: () => setSlotsManager(ev) }] as MenuItem[] : []),
      { label: 'View registrations', onClick: () => setRegsDrawer(ev) },
      'div',
      { label: ev.archived ? 'Unarchive' : 'Archive', onClick: () => { void toggleArchived(ev); } },
      ...(!isProtected
        ? ['div', { label: 'Delete event', danger: true, onClick: () => { void deleteSelectedEvent(ev); } }] as MenuItem[]
        : []),
    ];
  };

  const FILTERS: FilterKey[] = ['all', 'active', 'closed', 'archived'];
  const filterLabel: Record<FilterKey, string> = { all: 'All', active: 'Active', closed: 'Closed', archived: 'Archived' };

  return (
    <div className="ev-tab">
      {/* toolbar: lifecycle filter + actions */}
      <div className="ev-toolbar">
        <div className="seg" role="tablist" aria-label="Filter events by lifecycle">
          {FILTERS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
              {filterLabel[k]} <span className="n tnum">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="spacer" />
        <MoreMenu
          label="More"
          items={[
            { label: 'Reconcile capacity', onClick: () => { void reconcileCapacities(); } },
          ]}
        />
        <button type="button" className="btn sm" onClick={() => setDrawer({ event: null })}>+ Add event</button>
      </div>

      {events.length === 0 && <div className="panel"><div className="empty-state"><div className="es-title">No events yet — add one to start.</div></div></div>}
      {events.length > 0 && visibleGroups.length === 0 && (
        <div className="panel"><div className="empty-state"><div className="es-title">No {filterLabel[filter].toLowerCase()} events</div></div></div>
      )}

      {visibleGroups.map((g) => (
        <section className="ev-group" key={g.key}>
          <div className="ev-group-hd">
            <span className="lbl">{LIFECYCLE_LABEL[g.key]}</span>
            <span className="cnt tnum">{g.items.length}</span>
            <span className="rule" />
          </div>
          <div className="ev-cards">
            {g.items.map((ev) => (
              <EventLifecycleCard
                key={ev.eventId}
                ev={ev}
                stat={stats[ev.eventId]}
                statsReady={statsReady}
                now={now}
                menu={menuFor(ev)}
                busy={busy}
                onManage={() => onManage(ev)}
                onToggleEnrollment={() => { void toggleEnrollment(ev); }}
              />
            ))}
          </div>
        </section>
      ))}

      <p className="ev-foot">Filter by lifecycle · each card shows live fill, an inline enrollment toggle and “Manage →” · row menu (⋯): Edit · Duplicate · Manage slots · View registrations · Archive · Delete.</p>

      {drawer && (
        <EventDrawer
          adminEmail={adminEmail}
          event={drawer.event}
          template={drawer.template}
          onClose={() => setDrawer(null)}
          onSaved={() => { setDrawer(null); onReload(); }}
          onRequestDelete={drawer.event ? () => { void deleteSelectedEvent(drawer.event!); } : undefined}
        />
      )}
      {regsDrawer && <EventRegsDrawer adminEmail={adminEmail} event={regsDrawer} onClose={() => setRegsDrawer(null)} />}
      {slotsManager && <EventSlotsManager adminEmail={adminEmail} event={slotsManager} onClose={() => { setSlotsManager(null); onReload(); }} />}
    </div>
  );
}
