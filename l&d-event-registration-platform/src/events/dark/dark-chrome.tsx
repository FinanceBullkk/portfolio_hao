import { useState, useEffect, type ReactNode } from 'react';
import { eventTheme, eventGlyph } from '../../lib/event-theme';
import logoUrl from '../../assets/clt-logo-white.webp';

// Shared primitives for the dark, Luma-style employee app (design_handoff_user_events):
// the top nav, the gradient cover/thumbnail, status pills, and an ANONYMOUS facepile
// (no identities — registrations are admin-only PII; we only ever hint "others are going").

// ── Inline icons (stroke = currentColor) ───────────────────────────────
type IP = { size?: number };
export const IconGrid = ({ size = 15 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
export const IconCal = ({ size = 15 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>);
export const IconCompass = ({ size = 15 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>);
export const IconPin = ({ size = 15 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>);
export const IconClock = ({ size = 15 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IconChevL = ({ size = 16 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>);
export const IconCheck = ({ size = 14 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>);
export const IconLock = ({ size = 13 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
export const IconAlert = ({ size = 16 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>);
export const IconUsers = ({ size = 15 }: IP) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>);

// ── Top nav (every screen except sign-in) ──────────────────────────────
export interface NavMenu {
  canAdmin?: boolean;
  onOpenAdmin?: () => void;
  onEditProfile?: () => void;
  onViewHistory?: () => void;
  onSignOut?: () => void;
}

export function DarkNav({
  email, onHome, menu, current = 'events',
}: { email: string; onHome: () => void; menu?: NavMenu; current?: 'events' | 'other' }) {
  const [open, setOpen] = useState(false);
  const initials = (email.split('@')[0] || '?').slice(0, 2).toUpperCase();
  const close = () => setOpen(false);
  // Keyboard users must be able to dismiss the account menu without a mouse.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const m = menu || {};
  return (
    <nav className="c7d-nav">
      <div className="c7d-nav-in">
        <div className="c7d-nav-l">
          <button type="button" className="c7d-logo-btn" onClick={onHome} aria-label="Go to events">
            <img className="c7d-logo" src={logoUrl} alt="CLT" />
          </button>
          <div className="c7d-navitems">
            <button type="button" className={`c7d-navitem${current === 'events' ? ' active' : ''}`} aria-current={current === 'events' ? 'page' : undefined} onClick={onHome}><IconGrid /> Events</button>
          </div>
        </div>
        <div className="c7d-nav-r">
          <button type="button" className="c7d-avatar" title={email} aria-label="Account menu" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{initials}</button>
          {open && (
            <>
              <div className="c7d-menu-back" onClick={close} />
              <div className="c7d-menu">
                <div className="c7d-menu-head">{email}</div>
                {m.onEditProfile && <button type="button" onClick={() => { close(); m.onEditProfile!(); }}>Edit profile</button>}
                {m.onViewHistory && <button type="button" onClick={() => { close(); m.onViewHistory!(); }}>My registrations</button>}
                {m.canAdmin && m.onOpenAdmin && <button type="button" onClick={() => { close(); m.onOpenAdmin!(); }}>Admin console</button>}
                {m.onSignOut && <button type="button" onClick={() => { close(); m.onSignOut!(); }}>Sign out</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Gradient cover (list thumb, detail hero, mini header, sign-in deco) ──
export function EventCover({
  themeColor, eventId, name, variant, category, coverImageUrl,
}: { themeColor?: string; eventId: string; name: string; variant: 'thumb' | 'hero' | 'mini'; category?: string; coverImageUrl?: string }) {
  const th = eventTheme(themeColor, eventId);
  const glyph = eventGlyph(name);
  // The uploaded photo only fills the detail HERO. At thumbnail (104px) / mini (48px)
  // sizes object-fit:cover crops any baked-in cover text to illegibility, so those small
  // surfaces always use the per-event monogram gradient instead (audit U2-07/U3-09/U4-16).
  const hasImg = !!coverImageUrl && variant === 'hero';
  const img = hasImg ? <img className="c7d-cover-img" src={coverImageUrl} alt="" loading="lazy" /> : null;
  if (variant === 'hero') {
    return (
      <div className="c7d-cover" style={{ background: th.coverBg }}>
        {hasImg ? img : (
          <>
            <span className="blob1" style={{ background: th.glow }} />
            <span className="blob2" style={{ background: th.glow }} />
            <span className="glyph">{glyph}</span>
          </>
        )}
        {category && <span className="chip">{category}</span>}
      </div>
    );
  }
  if (variant === 'mini') {
    return (
      <div className="cov" style={{ background: th.coverBg }}>{hasImg ? img : <span className="glyph">{glyph}</span>}</div>
    );
  }
  return (
    <div className="c7d-thumb" style={{ background: th.coverBg }}>
      {hasImg ? img : (
        <>
          <span className="blob" style={{ background: th.glow }} />
          <span className="glyph">{glyph}</span>
        </>
      )}
    </div>
  );
}

// ── Status pill (registered / open / full / eligibility) ────────────────
export function StatusPill({ kind, label }: { kind: 'reg' | 'open' | 'full' | 'lock' | 'closed'; label: string }) {
  return (
    <span className={`c7d-pill ${kind}`}>
      {kind === 'reg' ? <IconCheck size={12} /> : kind === 'lock' ? <IconLock /> : <span className="dot" />}
      {label}
    </span>
  );
}

// ── Anonymous facepile — colored circles only, never identities ─────────
const FACE_BG = ['#3a4a6b', '#6b4a3a', '#3a6b52', '#5a3a6b', '#54607d', '#7d5a54'];
export function FacePile({ count, surface = 'card' }: { count: number; surface?: 'card' | 'bg' }) {
  const n = Math.min(4, Math.max(0, count));
  if (n === 0) return null;
  const ring = surface === 'bg' ? '#17181d' : '#22232b';
  return (
    <span className="c7d-faces" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        // A generic silhouette, never initials — registrations are admin-only PII and the
        // client only ever knows a count, so we hint "people are going" without identities.
        <span key={i} className="f" style={{ background: FACE_BG[i % FACE_BG.length], borderColor: ring }}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.5" r="3.4" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0Z" /></svg>
        </span>
      ))}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="c7d-eyebrow">{children}</div>;
}
