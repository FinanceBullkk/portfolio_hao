import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EventDoc, InitResult, UserProfile } from '../lib/types';
import { initEventBooking, makeEventBookingApi } from '../lib/eventBookingDb';
import { friendlyFirestoreError } from '../lib/monitoring';
import { BookingFlow } from '../booking/booking-flow';

// Slotted-event registration: loads the event's booking state, then reuses the
// assessment BookingFlow bound to this event via an event-scoped BookingApi.

export function EventBookingScreen({
  event, fallbackProfile, canAdmin, onOpenAdmin, onSignOut, onBack, onEditProfile, onViewHistory,
}: {
  event: EventDoc;
  fallbackProfile?: UserProfile | null;
  canAdmin: boolean;
  onOpenAdmin: () => void;
  onSignOut: () => void;
  onBack: () => void;
  onEditProfile?: () => void;
  onViewHistory?: () => void;
}) {
  const [data, setData] = useState<InitResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const api = useMemo(() => makeEventBookingApi(event.eventId), [event.eventId]);

  // Keep the user's chosen profile when the server hasn't persisted one yet.
  const applyData = useCallback((d: InitResult) => {
    setData(d.profile || !fallbackProfile ? d : { ...d, profile: fallbackProfile });
  }, [fallbackProfile]);

  // In-app refetch for the calendar's "Reload" button. A full page reload would
  // discard the chosen event (held in React state, not the URL) and bounce the
  // user back to the events list, so we re-fetch slots and update in place.
  const reload = useCallback(() => {
    initEventBooking(event.eventId)
      .then(applyData)
      .catch((e: Error) => setErr(friendlyFirestoreError(e) || 'Failed to load.'));
  }, [event.eventId, applyData]);

  useEffect(() => {
    let cancelled = false;
    initEventBooking(event.eventId)
      .then((d) => { if (!cancelled) applyData(d); })
      .catch((e: Error) => { if (!cancelled) setErr(friendlyFirestoreError(e) || 'Failed to load.'); });
    return () => { cancelled = true; };
  }, [event.eventId, applyData]);

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
