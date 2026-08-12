import { useEffect } from 'react';
import type { EventDoc, UserProfile } from '../../lib/types';
import { deriveEvent } from './event-display';
import { eventTheme } from '../../lib/event-theme';
import { DarkNav, EventCover, IconChevL, IconLock, type NavMenu } from './dark-chrome';

// Simple-event registration, dark. Identity is captured once in the account profile
// (the Complete-profile gate), so this CONFIRMS the saved profile rather than re-asking
// for it per event (data-minimalism). Redesign (Vòng 1, 2026-07): the four read-only
// fields used to render as near-invisible dark input boxes ("khó nhìn"); they are now a
// single confirmation card with bright values + explicit lock semantics + the event's
// accent, and an "After you register" block fills the empty lower half of the page.

function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length === 0) return '?';
  return ((w[0][0] || '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
}

export function DarkRegisterScreen({
  data, event, profile, busy, onBack, onSubmit, onEditProfile, menu,
}: {
  data: { email: string };
  event: EventDoc;
  profile: UserProfile;
  busy?: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onEditProfile: () => void;
  menu?: NavMenu;
}) {
  const d = deriveEvent(event);
  const accent = eventTheme(event.themeColor, event.eventId).accent;
  useEffect(() => { const prev = document.title; document.title = `Register · ${event.name}`; return () => { document.title = prev; }; }, [event.name]);

  return (
    <div className="c7d">
      <DarkNav email={data.email} onHome={onBack} menu={menu} />
      <main className="c7d-wrap form">
        <button type="button" className="c7d-back" onClick={onBack}><IconChevL /> Back</button>
        <h1 style={{ fontSize: 26, letterSpacing: '-0.02em' }}>Complete your registration</h1>

        <div className="c7d-mini" style={{ marginTop: 20 }}>
          <EventCover variant="mini" themeColor={event.themeColor} eventId={event.eventId} name={event.name} coverImageUrl={event.coverImageUrl} />
          <div><div className="t">{event.name}</div><div className="s">{d.dateLong}{d.location ? ` · ${d.location}` : ''}</div></div>
        </div>

        {/* Confirmation card — who is registering. Values are bright + a lock chip makes the
            read-only nature explicit (was ambiguous dark-on-dark input boxes). */}
        <div className="c7d-cc" style={{ borderTopColor: accent }}>
          <div className="c7d-cc-head">
            <span className="c7d-cc-av" style={{ background: accent }}>{initials(profile.fullName)}</span>
            <div className="c7d-cc-id">
              <div className="c7d-cc-name">{profile.fullName}</div>
              <div className="c7d-cc-sub">Registering as yourself</div>
            </div>
            <button type="button" className="c7d-link c7d-cc-edit" onClick={onEditProfile} disabled={busy}>Edit</button>
          </div>
          <div className="c7d-cc-rows">
            <div className="c7d-cc-row"><span className="c7d-cc-k">Employee ID</span><span className="c7d-cc-v">{profile.empCode}<IconLock /></span></div>
            <div className="c7d-cc-row"><span className="c7d-cc-k">Business unit</span><span className="c7d-cc-v">{profile.bu || '—'}</span></div>
            <div className="c7d-cc-row"><span className="c7d-cc-k">Work email</span><span className="c7d-cc-v">{data.email}<IconLock /></span></div>
          </div>
          <div className="c7d-cc-note"><IconLock /> Locked — pulled from your profile. Use <b>Edit</b> to change.</div>
        </div>

        <button type="button" className="c7d-btn full" style={{ marginTop: 22 }} onClick={onSubmit} disabled={busy}>
          {busy ? <><span className="c7d-spin" /> Registering…</> : 'Confirm registration'}
        </button>
        <p className="c7d-fine">
          {d.deadlineText ? `Registration closes in ${d.deadlineText} · ` : ''}
          {event.emailConfirm ? `a confirmation email will be sent to ${data.email}.` : 'keep this page for your records.'}
        </p>

        {/* "After you register" — fills the previously-empty lower half + sets expectations. */}
        <div className="c7d-next">
          <div className="c7d-eyebrow">After you register</div>
          <ul className="c7d-next-list">
            <li><span className="c7d-next-ic ok"><IconCheck /></span>Your seat is held immediately — no approval needed.</li>
            {event.emailConfirm && (
              <li><span className="c7d-next-ic" style={{ color: accent }}><IconMail /></span>A confirmation email lands in your inbox.</li>
            )}
            <li><span className="c7d-next-ic" style={{ color: accent }}><IconCal /></span>View or cancel it any time under <b>My registrations</b>.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function IconCheck() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>;
}
function IconMail() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}
function IconCal() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
