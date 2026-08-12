import { useCallback, useEffect, useState } from 'react';
import type { EventsInitResult } from '../lib/types';
import { initEvents, registerForEventDb, cancelEventRegistrationDb } from '../lib/eventsDb';
import { useToast, useConfirm } from '../confirm-toast-provider';
import { EventBookingScreen } from './event-booking-screen';
import { MyRegistrationsScreen } from './my-registrations-screen';
import { ProfileScreen } from './profile-screen';
import { ProgramBookingScreen } from '../program/program-booking-screen';
import './events-theme.css';
import type { NavMenu } from './dark/dark-chrome';
import { DarkListScreen } from './dark/dark-list-screen';
import { DarkDetailScreen } from './dark/dark-detail-screen';
import { DarkRegisterScreen } from './dark/dark-register-screen';
import { DarkConfirmScreen } from './dark/dark-confirm-screen';
import {
  eventIdFromPath, isProgramPath, pushEventPath, pushProgramPath,
  replaceWithEventList, returnToEventList,
} from '../lib/event-route';

// Employee-facing front-end (dark, Luma-style — design_handoff_user_events). A local
// screen state machine: list → detail → (register | slotted booking) → confirm. The
// detail surface is the gateway; tapping a card never opens the form directly. All
// correctness-critical work (register/cancel) stays in the existing callables (Principle I);
// these screens only present server-authored state from initEvents.

export function EventsFlow({
  data, setData, canAdmin, onOpenAdmin, onSignOut,
}: {
  data: EventsInitResult;
  setData: (d: EventsInitResult) => void;
  canAdmin: boolean;
  onOpenAdmin: () => void;
  onSignOut: () => void;
}) {
  const [detailId, setDetailId] = useState<string | null>(() => eventIdFromPath(window.location.pathname));
  const [registerId, setRegisterId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showProgram, setShowProgram] = useState(() => isProgramPath(window.location.pathname) && data.programEligible);
  const [editingProfile, setEditingProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pushToast = useToast();
  const confirm = useConfirm();
  const visibleEventIds = data.events.map((event) => event.eventId).join('\n');

  // Warm the Functions SDK chunk so the first submit doesn't pay the import cost.
  useEffect(() => { import('firebase/functions').catch(() => {}); }, []);
  const routeEventId = useCallback(() => {
    const id = eventIdFromPath(window.location.pathname);
    return id && visibleEventIds.split('\n').includes(id) ? id : null;
  }, [visibleEventIds]);

  const openEvent = useCallback((eventId: string) => {
    setRegisterId(null); setConfirmedId(null); setDetailId(eventId);
    if (eventIdFromPath(window.location.pathname) !== eventId) pushEventPath(eventId);
  }, []);

  const closeEvent = useCallback(() => {
    setRegisterId(null); setConfirmedId(null); setDetailId(null);
    if (eventIdFromPath(window.location.pathname)) returnToEventList();
  }, []);

  const openProgram = useCallback(() => {
    if (!data.programEligible) return;
    setDetailId(null); setRegisterId(null); setConfirmedId(null); setShowProgram(true);
    if (!isProgramPath(window.location.pathname)) pushProgramPath();
  }, [data.programEligible]);

  const closeProgram = useCallback(() => {
    setShowProgram(false);
    if (isProgramPath(window.location.pathname)) returnToEventList();
  }, []);

  // Reset navigation when the signed-in user changes, preserving a valid deep link.
  useEffect(() => {
    const id = routeEventId();
    const programRequested = isProgramPath(window.location.pathname);
    if ((eventIdFromPath(window.location.pathname) && !id) || (programRequested && !data.programEligible)) {
      replaceWithEventList();
    }
    setDetailId(id); setRegisterId(null); setConfirmedId(null);
    setShowHistory(false); setShowProgram(programRequested && data.programEligible); setEditingProfile(false);
  }, [data.email, data.programEligible, routeEventId]);

  useEffect(() => {
    const onPopState = () => {
      const id = routeEventId();
      const programRequested = isProgramPath(window.location.pathname);
      if ((eventIdFromPath(window.location.pathname) && !id) || (programRequested && !data.programEligible)) {
        replaceWithEventList();
      }
      setDetailId(id); setRegisterId(null); setConfirmedId(null);
      setShowHistory(false); setShowProgram(programRequested && data.programEligible); setEditingProfile(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [data.programEligible, routeEventId]);

  // Refresh landing counts when the user returns to the tab — only while on the list.
  useEffect(() => {
    if (detailId || registerId || confirmedId || showProgram) return undefined;
    const refresh = () => { if (document.visibilityState === 'visible') initEvents().then(setData).catch(() => {}); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [detailId, registerId, confirmedId, showProgram, setData]);

  const now = Date.parse(data.clientNow) || Date.now();
  const byId = (id: string | null) => (id ? data.events.find((e) => e.eventId === id) ?? null : null);
  const registerEvent = byId(registerId);
  const detailEvent = byId(detailId);
  const confirmedEvent = byId(confirmedId);

  // Shared avatar menu (Edit profile / My registrations / Admin / Sign out).
  const menu: NavMenu = {
    canAdmin, onOpenAdmin,
    onEditProfile: () => setEditingProfile(true),
    onViewHistory: () => setShowHistory(true),
    onSignOut,
  };

  async function handleSubmit() {
    if (!registerEvent || !data.profile) return;
    setBusy(true);
    try {
      const res = await registerForEventDb({ eventId: registerEvent.eventId, ...data.profile });
      if (res.state) setData(res.state);
      if (!res.ok) { pushToast('error', res.error || 'Registration failed.'); return; }
      pushToast('success', `Registered for ${registerEvent.name}.`);
      setConfirmedId(registerEvent.eventId);
      setRegisterId(null);
      setDetailId(null);
      // The booking callable returns after durable writes instead of rebuilding the
      // entire landing state on the latency-critical path. Refresh counts/history
      // after showing confirmation; failure is non-critical and focus retries it.
      if (!res.state) void initEvents().then(setData).catch(() => {});
    } finally { setBusy(false); }
  }

  async function handleCancel(eventId: string, name: string) {
    const ok = await confirm({
      title: 'Cancel registration?',
      message: `Cancel your registration for ${name}?`,
      confirmText: 'Cancel registration',
      cancelText: 'Keep',
    });
    if (!ok) return;
    setBusyId(eventId);
    try {
      const res = await cancelEventRegistrationDb(eventId);
      if (res.state) setData(res.state);
      if (!res.ok) { pushToast('error', res.error || 'Cancel failed.'); return; }
      pushToast('success', 'Registration cancelled.');
    } finally { setBusyId(null); }
  }

  // ── Sub-screens kept as their own components but dark-re-skinned via .c7d-skin
  //    (token override) so the slotted booking + program + profile + history match the
  //    dark theme without touching their real (money-path) logic. ──
  if (showHistory) {
    return (
      <div className="c7d-skin">
        <MyRegistrationsScreen
          email={data.email}
          canAdmin={canAdmin}
          onOpenAdmin={onOpenAdmin}
          onSignOut={onSignOut}
          onBack={() => setShowHistory(false)}
          onEditProfile={() => { setShowHistory(false); setEditingProfile(true); }}
          manageableEventIds={data.events.map((e) => e.eventId)}
          onManage={(id) => { setShowHistory(false); openEvent(id); }}
        />
      </div>
    );
  }
  if (showProgram) {
    return (
      <div className="c7d-skin">
        <ProgramBookingScreen
          email={data.email}
          canAdmin={canAdmin}
          onOpenAdmin={onOpenAdmin}
          onSignOut={onSignOut}
          onEditProfile={() => { replaceWithEventList(); setShowProgram(false); setEditingProfile(true); }}
          onViewHistory={() => { replaceWithEventList(); setShowProgram(false); setShowHistory(true); }}
          onBack={closeProgram}
        />
      </div>
    );
  }
  if (editingProfile) {
    return (
      <div className="c7d-skin">
        <ProfileScreen
          email={data.email}
          buList={data.buList}
          initial={data.profile}
          canAdmin={canAdmin}
          onOpenAdmin={onOpenAdmin}
          onSignOut={onSignOut}
          title="Edit profile"
          subtitle="Update your employee details. Changes apply to your future registrations."
          submitLabel="Save changes"
          onViewHistory={() => { setEditingProfile(false); setShowHistory(true); }}
          onSaved={(profile) => { setData({ ...data, profile }); setEditingProfile(false); }}
          onCancel={() => setEditingProfile(false)}
        />
      </div>
    );
  }

  // Slotted events run the existing slot-booking flow (real 2-slot capacity/overlap logic).
  if (registerEvent && registerEvent.type === 'slotted') {
    return (
      <div className="c7d-skin">
        <EventBookingScreen
          event={registerEvent}
          fallbackProfile={data.profile ?? null}
          canAdmin={canAdmin}
          onOpenAdmin={onOpenAdmin}
          onSignOut={onSignOut}
          onEditProfile={() => setEditingProfile(true)}
          onViewHistory={() => { setRegisterId(null); setShowHistory(true); }}
          onBack={() => { setRegisterId(null); initEvents().then(setData).catch(() => {}); }}
        />
      </div>
    );
  }

  // ── Dark flow ──
  if (confirmedEvent) {
    return (
      <DarkConfirmScreen
        data={data}
        event={confirmedEvent}
        emailConfirm={confirmedEvent.emailConfirm === true}
        onViewEvent={() => { setDetailId(confirmedEvent.eventId); setConfirmedId(null); }}
        onDone={closeEvent}
        menu={menu}
      />
    );
  }
  if (registerEvent && data.profile) {
    return (
      <DarkRegisterScreen
        data={data}
        event={registerEvent}
        profile={data.profile}
        busy={busy}
        onBack={() => setRegisterId(null)}
        onSubmit={handleSubmit}
        onEditProfile={() => setEditingProfile(true)}
        menu={menu}
      />
    );
  }
  if (detailEvent) {
    return (
      <DarkDetailScreen
        data={data}
        event={detailEvent}
        registration={data.myRegistrations[detailEvent.eventId]}
        busy={busyId === detailEvent.eventId}
        onBack={closeEvent}
        onPrimary={() => setRegisterId(detailEvent.eventId)}
        onCancel={() => handleCancel(detailEvent.eventId, detailEvent.name)}
        menu={menu}
      />
    );
  }
  return (
    <DarkListScreen
      data={data}
      now={now}
      onOpenEvent={openEvent}
      onOpenProgram={data.programEligible ? openProgram : undefined}
      menu={menu}
    />
  );
}
