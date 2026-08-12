import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firestore-db';
import { formatDateVi, minToHHmm, type Slot, type SlotType } from '../lib/types';

// Top-level admin nav tabs. Per-event management (Overview/Registrations/Slots/
// Blocklist/Settings) no longer lives here — it moved into the Event workspace
// (reached via a card's "Manage →"), so the shared header event picker is gone.
// `dashboard` is the global landing; `registrations` is now a CROSS-EVENT roster.
export type Tab = 'dashboard' | 'events' | 'registrations' | 'users' | 'program-schedules' | 'program' | 'program-classes' | 'config' | 'mail' | 'audit' | 'notifications' | 'permanent-block';

// Sub-tabs inside the per-event Event workspace (A2). Slots + Blocklist folded in
// here from the old top-level nav; Settings is a per-event panel.
export type WsTab = 'registrations' | 'slots' | 'eligibility' | 'blocklist' | 'settings';

// Sidebar nav, grouped per the handoff (Admin v2.dc.html): Administration vs
// System, plus the Pronunciation Program vertical.
export const NAV: { id: Tab; label: string; group: 'Administration' | 'Pronunciation Program' | 'System' }[] = [
  // Administration
  { id: 'dashboard', label: 'Dashboard', group: 'Administration' },
  { id: 'events', label: 'Events', group: 'Administration' },
  { id: 'registrations', label: 'Registrations', group: 'Administration' },
  { id: 'users', label: 'User lookup', group: 'Administration' },
  // System
  { id: 'config', label: 'Configuration', group: 'System' },
  { id: 'mail', label: 'Email templates', group: 'System' },
  { id: 'audit', label: 'Audit', group: 'System' },
  { id: 'notifications', label: 'Notifications', group: 'System' },
  { id: 'permanent-block', label: 'Permanent block', group: 'System' },
  // Pronunciation Program
  { id: 'program-schedules', label: 'Schedule', group: 'Pronunciation Program' },
  { id: 'program-classes', label: 'Classes', group: 'Pronunciation Program' },
  { id: 'program', label: 'Program settings', group: 'Pronunciation Program' },
];

export const HEADER: Record<Tab, { t: string; s: string }> = {
  dashboard: { t: 'Dashboard', s: 'Cross-event KPIs, what needs attention, and recent activity' },
  events: { t: 'Events', s: 'Create and manage registration events' },
  registrations: { t: 'Registrations', s: 'All registrations across every event · search, filter, export' },
  users: { t: 'User lookup', s: 'A user’s full registration history across all events · including archived' },
  'program-schedules': { t: 'Schedule', s: 'Pronunciation Program · weekly trainer calendar across all classes' },
  program: { t: 'Program settings', s: 'Pronunciation Program · trainer, time grid, registration window, blackouts' },
  'program-classes': { t: 'Classes', s: 'Pronunciation Program cohorts · HR-assigned code, BU, and PIC' },
  config: { t: 'Configuration', s: 'Platform-wide settings · BU list · permissions · new-event defaults' },
  mail: { t: 'Email templates', s: 'Sender identity, brand, and confirmation-email templates · send a test to yourself' },
  audit: { t: 'Audit log', s: 'Action history · immutable' },
  notifications: { t: 'Notifications', s: 'Confirmation email delivery status · sent via Trigger Email extension' },
  'permanent-block': { t: 'Permanent block', s: 'Employees barred from ALL events · global, does not reset' },
};

// Mirrors DEFAULT_BU_LIST in functions/defaults.js (TS/JS runtime seam). Shown in
// the admin BU editor when config/main.buList is unset; the server applies the
// same fallback, so an empty saved list means "use this default".
export const DEFAULT_BU_LIST = ['BSG', 'CHORUS', 'LBU', 'MOC', 'ONC', 'POC', 'TBU'];

export interface ConfigState {
  allowEnrollment: boolean;
  maxChanges: number;
  deadline: Date | null;
  emailConfirm: boolean;
  adminEmails: string[];
  buList: string[];
}

function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
    promise.then((res) => { clearTimeout(timer); resolve(res); }).catch((err) => { clearTimeout(timer); reject(err); });
  });
}

export async function loadConfig(): Promise<ConfigState> {
  try {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) throw new Error('Firestore not available');
    const snap = await withTimeout(getDoc(doc(db, 'config', 'main')));
    const d = snap.exists() ? snap.data() : {};
    return {
      allowEnrollment: d.allowEnrollment !== false,
      maxChanges: typeof d.maxChanges === 'number' ? d.maxChanges : 3,
      deadline: d.deadline ? (d.deadline as Timestamp).toDate() : null,
      emailConfirm: d.emailConfirm === true,
      adminEmails: Array.isArray(d.adminEmails) ? d.adminEmails : ['admin@cyberlogitec.com', 'demo.admin@cyberlogitec.com.vn'],
      buList: Array.isArray(d.buList) && d.buList.length > 0 ? d.buList.map(String) : DEFAULT_BU_LIST,
    };
  } catch (err) {
    console.warn('[loadConfig fallback]', err);
    return {
      allowEnrollment: true,
      maxChanges: 3,
      deadline: null,
      emailConfirm: true,
      adminEmails: ['admin@cyberlogitec.com', 'demo.admin@cyberlogitec.com.vn'],
      buList: DEFAULT_BU_LIST,
    };
  }
}

// ── Shared helpers ──────────────────────────────────────────────────────────

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function dowVi(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return isNaN(d.getTime()) ? '' : DOW[d.getDay()];
}

export function typClass(type: SlotType): 'sp' | 'sk' {
  return type === 'Speaking' ? 'sp' : 'sk';
}

type SlotStatus = 'ok' | 'warn' | 'full' | 'closed';
export function slotStatus(s: Slot, allowEnrollment: boolean): SlotStatus {
  if (!allowEnrollment) return 'closed';
  if (s.remaining <= 0) return 'full';
  if (s.capacity > 0 && s.remaining / s.capacity <= 0.25) return 'warn';
  return 'ok';
}
export const STATUS_LABEL: Record<SlotStatus, string> = { ok: 'Available', warn: 'Almost full', full: 'Full', closed: 'Closed' };

export function slotLabel(slotMap: Map<string, Slot>, id: string | null): string {
  if (!id) return '—';
  const s = slotMap.get(id);
  if (s) return `${formatDateVi(s.date)} · ${minToHHmm(s.startMin)}–${minToHHmm(s.endMin)}`;
  const m = /^(?:SP|3S)-(\d{2})(\d{2})-(\d{2})(\d{2})$/.exec(id);
  if (m) return `${m[1]}/${m[2]} · ${m[3]}:${m[4]}`;
  return id;
}

export function addMin(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function initials(email: string): string {
  const name = email.split('@')[0] ?? '';
  const parts = name.split(/[._-]/).filter(Boolean);
  const s = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (s || name.slice(0, 2)).toUpperCase();
}
