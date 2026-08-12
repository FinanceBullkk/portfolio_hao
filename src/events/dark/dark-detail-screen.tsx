import { useEffect } from 'react';
import type { EventDoc, EventRegistration } from '../../lib/types';
import { eventTheme } from '../../lib/event-theme';
import { deriveEvent } from './event-display';
import { EventDescriptionMarkdown } from '../event-description-markdown';
import {
  DarkNav, EventCover, StatusPill, FacePile, Eyebrow,
  IconChevL, IconClock, IconPin, IconCheck, IconLock, type NavMenu,
} from './dark-chrome';

// Surface B of the flow, dark: a read-only event page built from one EventDoc already in
// initEvents (no fetch, no transaction — Principle I/III). The register CTA repeats top +
// bottom (Luma). Slotted events route to the slot flow; simple events to the form.

export function DarkDetailScreen({
  data, event, registration, busy, onBack, onPrimary, onCancel, menu,
}: {
  data: { email: string };
  event: EventDoc;
  registration?: EventRegistration;
  busy?: boolean;
  onBack: () => void;
  onPrimary: () => void;
  onCancel: () => void;
  menu?: NavMenu;
}) {
  const d = deriveEvent(event, registration);
  const th = eventTheme(event.themeColor, event.eventId);
  const org = event.organizerBu || 'Team L&D';
  const orgInitials = (event.organizerBu ? event.organizerBu.replace(/[^A-Za-z]/g, '').slice(0, 2) : 'LD').toUpperCase() || 'LD';
  // Location quick-info: line 1 is the specific place, line 2 the format — so we never
  // render "Onsite" twice (d.location already prefixes the format, so don't reuse it here).
  const placeName = event.locationText || event.location || '';
  const fmtLabel = event.format === 'online' ? 'Online' : 'Onsite';
  // The seats card (below) is the single owner of the spots-left count. So a registered
  // user's top meta line must NOT repeat it: when the seats card is shown we drop the line
  // entirely; otherwise (slotted / no capacity) we surface only the non-duplicated deadline.
  // "Registered" status is asserted once by the pill above; the cancel control lives once in
  // the bottom CTA card.
  const seatsCardShown = !d.slotted && d.capacity > 0;
  const registeredInfo = !seatsCardShown && d.deadlineText
    ? <>Registration closes <b>in {d.deadlineText}</b></>
    : null;

  useEffect(() => { const prev = document.title; document.title = event.name; return () => { document.title = prev; }; }, [event.name]);

  // One CTA control, reused top + bottom.
  const cta = () => {
    if (d.registered) {
      // The success confirmation lives in the bottom card's green headline; this control is
      // just the single action. Cancel is destructive, so it reads NEUTRAL (never the success
      // tone), underlining only on hover. Slotted events get a "Manage slots" action instead.
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {!d.slotted && <button type="button" className="c7d-btn danger" onClick={onCancel} disabled={busy}>{busy ? <><span className="c7d-spin" /> Cancelling…</> : 'Cancel registration'}</button>}
          {d.slotted && <button type="button" className="c7d-btn ghost" onClick={onPrimary} disabled={busy}>Manage slots →</button>}
        </div>
      );
    }
    // Gated event this user isn't allowlisted for: shown, but register is locked. The
    // register transaction is the real gate; this is the matching client affordance.
    if (d.eligibilityLocked) {
      return <span className="c7d-btn disabled" aria-disabled="true"><IconLock /> Not eligible to register</span>;
    }
    if (d.closed || d.full) {
      const label = d.full ? 'Event full' : 'Registration closed';
      return <span className="c7d-btn disabled" aria-disabled="true">{label}</span>;
    }
    return <button type="button" className="c7d-btn" onClick={onPrimary} disabled={busy}>{d.primaryLabel}</button>;
  };

  return (
    <div className="c7d">
      <DarkNav email={data.email} onHome={onBack} menu={menu} />
      <div className="c7d-wrap detail">
        <button type="button" className="c7d-back" onClick={onBack}><IconChevL /> Events</button>

        <EventCover variant="hero" themeColor={event.themeColor} eventId={event.eventId} name={event.name} category={d.category} coverImageUrl={event.coverImageUrl} />

        <div className="c7d-chips">
          {d.registered && <StatusPill kind="reg" label="Registered" />}
          {!d.registered && d.eligibilityLocked && <StatusPill kind="lock" label="Not eligible" />}
          {!d.registered && !d.eligibilityLocked && d.full && <StatusPill kind="full" label="Full" />}
          {!d.registered && !d.eligibilityLocked && !d.full && <StatusPill kind={d.statusKind} label={!d.closed && d.slotted ? 'Booking open' : d.statusLabel} />}
          {event.requireEligibility && !d.eligibilityLocked && <StatusPill kind="lock" label="Selected BUs" />}
        </div>

        <div className="c7d-detail">
          <h1>{event.name}</h1>
          <div className="org">
            <span className="org-av" style={{ background: th.orgBg, color: th.accent }}>{orgInitials}</span>
            <span className="org-by">Organized by <b>{org}</b></span>
          </div>

          <div className="c7d-cta-top">
            {!d.registered && cta()}
            {d.registered
              ? registeredInfo && <div className="c7d-cta-note">{registeredInfo}</div>
              : d.eligibilityLocked
                ? <div className="c7d-cta-note">This event is limited to a set list of candidates.</div>
                : !d.closed && !d.full && (
                  <div className="c7d-cta-note">{event.subtitle && <>{event.subtitle}<br /></>}{d.deadlineText && <>Registration closes <b>in {d.deadlineText}</b></>}</div>
                )}
          </div>

          <div className="c7d-qinfo">
            <div className="c7d-qcard">
              <span className="tile"><IconClock /></span>
              <div><div className="t1">{d.dateLong}</div>{d.timeRange && <div className="t2">{d.timeRange}</div>}</div>
            </div>
            <div className="c7d-qcard">
              <span className="tile"><IconPin /></span>
              <div><div className="t1">{placeName || fmtLabel}</div>{placeName && <div className="t2">{fmtLabel}</div>}</div>
            </div>
          </div>

          {seatsCardShown && (
            <div className="c7d-seats">
              {/* The caption below is the SINGLE numeric statement. The head is a plain
                  label and the old "+N" plus-count was dropped (both duplicated the count). */}
              <div className="hd"><span className="head">Going</span><FacePile count={d.registeredCount} /></div>
              <div className="c7d-track"><span className="fill" style={{ width: `${d.fillPct}%`, background: th.accent }} /></div>
              <div className="cap">{d.registeredCount} of {d.capacity} spots filled</div>
            </div>
          )}
          {d.slotted && event.slotTypes && event.slotTypes.length > 0 && (
            <div className="c7d-stats">
              {event.slotTypes.map((s) => (
                <div className="c7d-stat" key={s.type}><div className="k">{s.type}</div><div className="v">{s.openCount} times open</div></div>
              ))}
            </div>
          )}

          {event.description && (
            <div className="c7d-about">
              <Eyebrow>About this event</Eyebrow>
              <div style={{ color: 'var(--txSec)', fontSize: 15, lineHeight: 1.7, marginTop: 12 }}>
                <EventDescriptionMarkdown text={event.description} />
              </div>
            </div>
          )}

          {/* Location renders once, in the quick-info card above — the old bottom
              "Location + Open in Maps" section was dropped (duplicated the card, and a
              Maps search is useless for short internal room names like "5F"). */}

          {/* The closing CTA card earns its place on long pages (a description pushes it
              well below the top CTA) and in every non-default state — registered (cancel/
              manage lives ONLY here), full/closed/not-eligible (the explanation copy).
              In the plain "open + not registered + no description" case the page is one
              viewport tall, so the card would just duplicate the top button — skip it. */}
          {(d.registered || d.eligibilityLocked || d.closed || d.full || !!event.description) && (
          <div className="c7d-cta-bottom">
            <div>
              {/* One voice: the registered confirmation is the green headline here; the
                  bottom card no longer repeats a separate "You're registered" badge. */}
              <div className="h">
                {d.registered
                  ? <span className="c7d-reg-badge"><IconCheck size={15} /> You’re on the list</span>
                  : d.eligibilityLocked ? 'Not eligible to register'
                  : d.closed || d.full ? (d.full ? 'Event full' : 'Registration closed') : 'Ready to join?'}
              </div>
              <div className="s">{d.registered ? 'We’ll see you there.'
                : d.eligibilityLocked ? 'You’re not on the list of eligible candidates for this event. Contact the organizers if you think this is a mistake.'
                : d.slotted ? 'Pick a time that works for you.' : d.social}</div>
            </div>
            {cta()}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
