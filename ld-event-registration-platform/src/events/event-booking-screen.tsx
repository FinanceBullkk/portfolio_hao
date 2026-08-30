import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EventDoc, InitResult, UserProfile } from '../lib/types';
import { initEventBooking, makeEventBookingApi } from '../lib/eventBookingDb';
import { createDemoEventBooking } from '../lib/demo-event-booking';
import { friendlyFirestoreError } from '../lib/monitoring';
import { BookingFlow } from '../booking/booking-flow';

// Slotted-event registration: loads the event's booking state, then reuses the
// assessment BookingFlow bound to this event via an event-scoped BookingApi.

export function EventBookingScreen({
  event, email, fallbackProfile, canAdmin, onOpenAdmin, onSignOut, onBack, onEditProfile, onViewHistory, demoMode = false,
}: {
  event: EventDoc;
  email: string;
  fallbackProfile?: UserProfile | null;
  canAdmin: boolean;
  onOpenAdmin: () => void;
  onSignOut: () => void;
  onBack: () => void;
  onEditProfile?: () => void;
  onViewHistory?: () => void;
  demoMode?: boolean;
}) {
  const [data, setData] = useState<InitResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const demo = useMemo(
    () => demoMode ? createDemoEventBooking(event, fallbackProfile ?? null, email) : null,
    [demoMode, email, event, fallbackProfile],
  );
  const api = useMemo(
    () => demo?.api ?? makeEventBookingApi(event.eventId),
    [demo, event.eventId],
  );

  // Keep the user's chosen profile when the server hasn't persisted one yet.
  const applyData = useCallback((d: InitResult) => {
    setData(d.profile || !fallbackProfile ? d : { ...d, profile: fallbackProfile });
  }, [fallbackProfile]);

  // In-app refetch for the calendar's "Reload" button. A full page reload would
  // discard the chosen event (held in React state, not the URL) and bounce the
  // user back to the events list, so we re-fetch slots and update in place.
  const reload = useCallback(() => {
    if (demo) {
      applyData(demo.snapshot());
      return;
    }
    initEventBooking(event.eventId)
      .then(applyData)
      .catch((e: Error) => setErr(friendlyFirestoreError(e) || 'Failed to load.'));
  }, [demo, event.eventId, applyData]);

  useEffect(() => {
    if (demo) {
      applyData(demo.initial);
      return;
    }
    let cancelled = false;
    initEventBooking(event.eventId)
      .then((d) => { if (!cancelled) applyData(d); })
      .catch((e: Error) => { if (!cancelled) setErr(friendlyFirestoreError(e) || 'Failed to load.'); });
    return () => { cancelled = true; };
  }, [demo, event.eventId, applyData]);

  if (err) {
    return (
      <div className="app c7d">
        <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <h1>Failed to load</h1>
          <p className="text-sm text-muted">{err}</p>
          <button className="btn" onClick={onBack}>← Back to events</button>
        </main>
      </div>
    );
  }
  if (!data) {
    return <div className="app c7d"><div className="loading-screen"><div className="spinner" /> Loading…</div></div>;
  }

  return (
    <BookingFlow
      data={data}
      setData={setData}
      canAdmin={canAdmin}
      skew={0}
      api={api}
      title={event.name}
      subtitle={event.subtitle || 'Slot registration'}
      onBack={onBack}
      onReload={reload}
      onOpenAdmin={onOpenAdmin}
      onSignOut={onSignOut}
      onEditProfile={onEditProfile}
      onViewHistory={onViewHistory}
    />
  );
}
