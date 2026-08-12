import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listEvents, listAllEventSlots, listEventStats, listMail, type EventStat, type MailEntry } from './lib/adminDb';
import { listAuditLogs, type AuditEntry } from './lib/audit';
import { type EventDoc, type Slot } from './lib/types';
import { loadConfig, initials, NAV, HEADER, type Tab, type WsTab, type ConfigState } from './admin/admin-utils';
import { captureError } from './lib/monitoring';
import { handleMockCallable } from './lib/mockStore';
import { NavIcon } from './admin/admin-icons';
import { DashboardTab } from './admin/dashboard-tab';
import { EventsTab } from './admin/events-tab';
import { EventWorkspace } from './admin/event-workspace';
import { AllRegistrationsTab } from './admin/all-registrations-tab';
import { PermanentBlockPanel } from './admin/permanent-block-panel';
import { UserRegistrationsTab } from './admin/user-registrations-tab';
import { ConfigTab } from './admin/config-tab';
import { ProgramSchedulesTab } from './admin/program-schedules-tab';
import { ProgramSettingsTab } from './admin/program-settings-tab';
import { ProgramClassesTab } from './admin/program-classes-tab';
import { AuditTab } from './admin/audit-tab';
import { NotificationsPanel } from './admin/notifications-panel';
import { MailSettingsTab } from './admin/mail-settings-tab';

// ── Main ─────────────────────────────────────────────────────────────────────
// Event-centric admin. A global Dashboard is the landing (cross-event KPIs +
// "needs attention"); per-event management lives in a dedicated Event workspace
// reached from a card's "Manage →" — so there is no shared header event picker
// (audit A1/A2). Config is global; Audit is the shared log; the top-level
// Registrations tab is a cross-event roster.

export function AdminPanel({ adminEmail, onExit }: { adminEmail: string; onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  // Active per-event workspace, or null when a top-level tab is showing. Set by a
  // card's "Manage →" or a Dashboard deep-link; cleared by the breadcrumb / nav.
  const [ws, setWs] = useState<{ eventId: string; tab: WsTab } | null>(null);
  const [events, setEvents] = useState<EventDoc[] | null>(null);
  const [cfg, setCfg] = useState<ConfigState | null>(null);
  // Aggregated slots from ALL events — used by AuditTab so slot IDs resolve to
  // human labels. Loaded once alongside events/config; empty on failure.
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  // Per-event fill stats (Events cards + Dashboard). Loaded independently; empty
  // until ready or on failure. `eventStatsReady` flips once the fetch settles.
  const [eventStats, setEventStats] = useState<Record<string, EventStat>>({});
  const [eventStatsReady, setEventStatsReady] = useState(false);
  // Email delivery + audit feed power the Dashboard (KPIs / needs-attention /
  // recent activity) and the Notifications nav badge. Non-blocking.
  const [mail, setMail] = useState<MailEntry[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setErr(null);

    const fallbackTimer = setTimeout(() => {
      if (cancelled) return;
      const mock = handleMockCallable('initEvents', {});
      setEvents((prev) => prev || mock.state.events);
      setCfg((prev) => prev || {
        allowEnrollment: true,
        maxChanges: 3,
        deadline: null,
        emailConfirm: true,
        adminEmails: ['admin@cyberlogitec.com', 'demo.admin@cyberlogitec.com.vn'],
        buList: mock.state.buList || ['BU1', 'BU2', 'BU3', 'CyberLogitec VN'],
      });
      setEventStatsReady(true);
    }, 1500);

    Promise.all([listEvents(), loadConfig()])
      .then(([ev, c]) => {
        if (cancelled) return;
        clearTimeout(fallbackTimer);
        setEvents(ev);
        setCfg(c);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        clearTimeout(fallbackTimer);
        captureError(e, { operation: 'admin.init' });
        const mock = handleMockCallable('initEvents', {});
        setEvents(mock.state.events);
        setCfg({
          allowEnrollment: true,
          maxChanges: 3,
          deadline: null,
          emailConfirm: true,
          adminEmails: ['admin@cyberlogitec.com', 'demo.admin@cyberlogitec.com.vn'],
          buList: mock.state.buList || ['BU1', 'BU2', 'BU3', 'CyberLogitec VN'],
        });
      });

    // Load slots from all events independently — failures don't block the panel.
    listAllEventSlots()
      .then((s) => { if (!cancelled) setAllSlots(s); })
      .catch((e) => { captureError(e, { operation: 'admin.listAllEventSlots' }); });
    // Per-event fill stats (Events cards + Dashboard) — also independent.
    setEventStatsReady(false);
    listEventStats()
      .then((s) => { if (!cancelled) setEventStats(s); })
      .catch((e) => { captureError(e, { operation: 'admin.listEventStats' }); })
      .finally(() => { if (!cancelled) setEventStatsReady(true); });
    // Mail + audit feed the Dashboard and the Notifications badge.
    listMail(100)
      .then((m) => { if (!cancelled) setMail(m); })
      .catch((e) => { captureError(e, { operation: 'admin.listMail' }); });
    listAuditLogs(40)
      .then((a) => { if (!cancelled) setAudit(a); })
      .catch((e) => { captureError(e, { operation: 'admin.listAuditLogs' }); });

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);
  const reloadEvents = useCallback(async () => {
    try { setEvents(await listEvents()); } catch (e) { captureError(e, { operation: 'admin.reloadEvents' }); }
  }, []);
  const reloadConfig = useCallback(async () => {
    try { setCfg(await loadConfig()); } catch (e) { captureError(e, { operation: 'admin.reloadConfig' }); }
  }, []);

  // Open one event's workspace (default to its Registrations sub-tab).
  const openWorkspace = useCallback((eventId: string, wsTab: WsTab = 'registrations') => {
    setWs({ eventId, tab: wsTab });
  }, []);

  // Total registrations across every event — simple events derive from
  // capacity/remaining; slotted from the loaded stat. Drives the nav badge.
  const totalRegs = useMemo(() => {
    if (!events) return null;
    let n = 0;
    for (const e of events) {
      if (e.type === 'simple') n += e.capacity != null ? Math.max(0, e.capacity - (e.remaining ?? 0)) : 0;
      else n += eventStats[e.eventId]?.registrations ?? 0;
    }
    return n;
  }, [events, eventStats]);
  const failedMail = useMemo(() => mail.filter((m) => m.state === 'ERROR').length, [mail]);

  const counts: Partial<Record<Tab, number>> = {
    events: events?.length,
    registrations: totalRegs ?? undefined,
    notifications: failedMail || undefined,
  };

  const wsEvent = ws ? events?.find((e) => e.eventId === ws.eventId) ?? null : null;

  // Switch top-level tab — always leaves any open workspace.
  const goTab = (t: Tab) => { setWs(null); setTab(t); };

  let content: ReactNode;
  if (err) {
    content = (
      <div className="error-screen">
        <h2>Failed to load admin data</h2>
        <p>{err}</p>
        <button className="btn" onClick={reload}>Retry</button>
      </div>
    );
  } else if (!events || !cfg) {
    content = <div className="loading"><span className="spinner" /> Loading…</div>;
  } else {
    switch (tab) {
      case 'dashboard':
        content = (
          <DashboardTab
            events={events}
            stats={eventStats}
            statsReady={eventStatsReady}
            mail={mail}
            audit={audit}
            onOpenEvent={(id) => openWorkspace(id)}
            onGotoNotifications={() => goTab('notifications')}
          />
        );
        break;
      case 'events':
        content = (
          <EventsTab
            adminEmail={adminEmail}
            events={events}
            stats={eventStats}
            statsReady={eventStatsReady}
            onReload={reloadEvents}
            onManage={(ev) => openWorkspace(ev.eventId)}
          />
        );
        break;
      case 'registrations':
        content = <AllRegistrationsTab adminEmail={adminEmail} events={events} onOpenEvent={(id) => openWorkspace(id)} />;
        break;
      case 'users': content = <UserRegistrationsTab />; break;
      case 'program-schedules': content = <ProgramSchedulesTab />; break;
      case 'program': content = <ProgramSettingsTab />; break;
      case 'program-classes': content = <ProgramClassesTab buList={cfg.buList} />; break;
      case 'config': content = <ConfigTab adminEmail={adminEmail} cfg={cfg} onReload={reloadConfig} />; break;
      case 'mail': content = <MailSettingsTab adminEmail={adminEmail} />; break;
      case 'audit': content = <AuditTab slots={allSlots} />; break;
      case 'notifications': content = <NotificationsPanel />; break;
      case 'permanent-block': content = <PermanentBlockPanel adminEmail={adminEmail} />; break;
    }
  }

  const showWorkspace = !err && events && cfg && ws && wsEvent;

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="side-brand">
          <span className="mark">LD</span>
          <span className="wm"><span className="t">L&amp;D Admin</span><span className="s">Registration platform</span></span>
        </div>
        <nav className="side-nav" aria-label="Admin sections">
          {NAV.map((n, i) => {
            const newGroup = i === 0 || NAV[i - 1].group !== n.group;
            const active = !ws && tab === n.id;
            return (
              <Fragment key={n.id}>
                {newGroup && i > 0 && <div className="side-div" />}
                {newGroup && <div className="side-section">{n.group}</div>}
                <button type="button" className={`nav-item ${active ? 'active' : ''}`} onClick={() => goTab(n.id)}
                  aria-label={n.label} aria-current={active ? 'page' : undefined}>
                  <NavIcon tab={n.id} />
                  <span className="ni-label">{n.label}</span>
                  {counts[n.id] != null && (
                    <span className={`ni-count${n.id === 'notifications' ? ' danger' : ''}`}>{counts[n.id]}</span>
                  )}
                </button>
              </Fragment>
            );
          })}
        </nav>
        <div className="side-foot">
          <button type="button" className="side-back" onClick={onExit} aria-label="Back to user page"><span>← Back to user page</span></button>
          <div className="side-user">
            <span className="av">{initials(adminEmail)}</span>
            <span className="uu"><span className="n">{adminEmail.split('@')[0]}</span><span className="r">Admin</span></span>
          </div>
        </div>
      </aside>

      <main className="main">
        {showWorkspace ? (
          // Event workspace renders its own breadcrumb header — no top title band.
          <div className="content">
            <EventWorkspace
              adminEmail={adminEmail}
              event={wsEvent!}
              wsTab={ws!.tab}
              onWsTab={(t) => setWs((cur) => (cur ? { ...cur, tab: t } : cur))}
              onBack={() => { setWs(null); setTab('events'); }}
              onReload={reloadEvents}
            />
          </div>
        ) : (
          <>
            <header className="main-hd">
              <div className="titles"><h1>{HEADER[tab].t}</h1><div className="sub">{HEADER[tab].s}</div></div>
              <div className="acts">
                {tab === 'dashboard' && (
                  <button type="button" className="btn sm" onClick={() => goTab('events')}>+ Add event</button>
                )}
              </div>
            </header>
            <div className="content">{content}</div>
          </>
        )}
      </main>
    </div>
  );
}
