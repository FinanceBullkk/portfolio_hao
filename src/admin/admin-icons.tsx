import { type Tab } from './admin-utils';

// ── Icons ─────────────────────────────────────────────────────────────────────

export function NavIcon({ tab }: { tab: Tab }) {
  const c = 'currentColor';
  switch (tab) {
    case 'dashboard':
      // 2×2 KPI grid — the global landing dashboard.
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="8" rx="1" stroke={c} strokeWidth="1.5" /><rect x="11" y="3" width="6" height="4" rx="1" stroke={c} strokeWidth="1.5" /><rect x="11" y="10" width="6" height="7" rx="1" stroke={c} strokeWidth="1.5" /><rect x="3" y="14" width="6" height="3" rx="1" stroke={c} strokeWidth="1.5" /></svg>;
    case 'registrations':
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><path d="M3 5.5h14M3 10h14M3 14.5h9" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case 'users':
      // Person + magnifier — look up one user's registrations.
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6.5" r="2.5" stroke={c} strokeWidth="1.5" /><path d="M3.5 16c0-2.5 2-4 4.5-4 .9 0 1.7.2 2.4.55" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><circle cx="14" cy="13" r="2.6" stroke={c} strokeWidth="1.5" /><path d="m16 15 1.8 1.8" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case 'config':
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.5" stroke={c} strokeWidth="1.5" /><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case 'events':
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><path d="M4 4h8l4 4v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /><path d="M11 4v4h4M6.5 11.5h7M6.5 14h4" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case 'audit':
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><path d="M10 5v5l3 2" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.5" /></svg>;
    case 'mail':
      // Envelope — confirmation-email templates.
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="10" rx="2" stroke={c} strokeWidth="1.5" /><path d="m3.5 6 6.5 5 6.5-5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'notifications':
      // Bell icon
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><path d="M10 3a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 0 0-5-5Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /><path d="M8.5 16.5a1.5 1.5 0 0 0 3 0" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case 'permanent-block':
      // No-entry circle — global permanent block.
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.5" /><path d="m5.5 5.5 9 9" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case 'program-schedules':
      // Calendar with a check — the weekly schedules overview.
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke={c} strokeWidth="1.5" /><path d="M3 8h14M7 2.5v3M13 2.5v3" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><path d="m8 12 1.5 1.5L13 11" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'program':
      // Weekly grid + clock — the program time grid.
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke={c} strokeWidth="1.5" /><path d="M3 8h14M8 4v13M13 4v13" stroke={c} strokeWidth="1.5" /></svg>;
    case 'program-classes':
      // Group of people — cohorts.
      return <svg className="ni-ic" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="2.5" stroke={c} strokeWidth="1.5" /><circle cx="14" cy="8" r="2" stroke={c} strokeWidth="1.5" /><path d="M2.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M13 12c2 0 4 1.2 4.5 3.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>;
  }
}

export function SearchIcon() {
  return <svg viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
export function DotsIcon() {
  return <svg viewBox="0 0 18 18" fill="currentColor" width="18" height="18"><circle cx="9" cy="4" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="9" cy="14" r="1.5" /></svg>;
}
