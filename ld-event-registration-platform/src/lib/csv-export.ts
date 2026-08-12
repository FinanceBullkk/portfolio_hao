import { minToHHmm, type Slot } from './types';
import { formatDateTime } from './format-date';
import {
  REGISTRATIONS_PAGE_SIZE,
  listRegistrationsPage,
  type Registration,
  type RegistrationPageCursor,
} from './admin-registrations';

export type CsvExportProgress = {
  loaded: number;
  total: number;
};

const CSV_HEADER = ['Email', 'Employee Code', 'Full Name', 'BU', 'Speaking', 'Speaking ID', '3 Skills', '3 Skills ID', 'Changes', 'Registered At', 'Updated At'];

function makeSlotFormatter(slots: Slot[]) {
  const slotMap = new Map(slots.map((s) => [s.slotId, s]));
  return (id: string | null) => {
    if (!id) return '';
    const s = slotMap.get(id);
    if (!s) return id;
    const [y, mo, d] = s.date.split('-');
    return `${d}/${mo}/${y} ${minToHHmm(s.startMin)}-${minToHHmm(s.endMin)}`;
  };
}

function csv(v: unknown) {
  if (v == null) return '';
  let s = String(v);
  // Prevent CSV formula injection (CWE-1236): escape prefixes that Excel/Sheets evaluate as formulas.
  if (/^[=+\-@\t|]/.test(s)) s = "'" + s;
  s = s.replace(/\r?\n/g, ' ');
  return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function rowForRegistration(r: Registration, fmtSlot: (id: string | null) => string) {
  return [
    r.email,
    r.empCode,
    r.fullName,
    r.bu,
    fmtSlot(r.speakingSlotId),
    r.speakingSlotId ?? '',
    fmtSlot(r.skillsSlotId),
    r.skillsSlotId ?? '',
    r.changeCount,
    formatDateTime(r.createdAt),
    formatDateTime(r.updatedAt),
  ];
}

function downloadCsvChunks(chunks: BlobPart[], filenamePrefix: string) {
  const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadRegistrationsCsv(regs: Registration[], slots: Slot[]) {
  const fmtSlot = makeSlotFormatter(slots);
  const rows = [
    CSV_HEADER,
    ...regs.map((r) => rowForRegistration(r, fmtSlot)),
  ];
  downloadCsvChunks(['﻿', rows.map((row) => row.map(csv).join(',')).join('\n')], 'registrations');
}

export async function downloadAllRegistrationsCsv(
  slots: Slot[],
  onProgress?: (progress: CsvExportProgress) => void,
) {
  const fmtSlot = makeSlotFormatter(slots);
  const chunks: BlobPart[] = ['﻿', CSV_HEADER.map(csv).join(',')];
  let cursor: RegistrationPageCursor | null = null;
  let loaded = 0;
  let total = 0;

  do {
    const page = await listRegistrationsPage(cursor, REGISTRATIONS_PAGE_SIZE);
    total = page.total;
    loaded += page.items.length;
    if (page.items.length > 0) {
      chunks.push('\n', page.items.map((r) => rowForRegistration(r, fmtSlot).map(csv).join(',')).join('\n'));
    }
    onProgress?.({ loaded, total });
    cursor = page.nextCursor;
  } while (cursor);

  downloadCsvChunks(chunks, 'registrations');
}

// ── Exam roster export ──────────────────────────────────────────────────────
// One row per (participant × slot): each registration's Speaking and 3 Skills
// slots become separate rows, matching the proctor roster template
// (Emp. Code · Full name · Working Email · AM/PM · Test date · Skill · Phòng thi · Giờ thi).

const ROSTER_HEADER = ['Emp. Code', 'Full name', 'Working Email', 'AM/PM', 'Test date', 'Skill', 'Phòng thi', 'Giờ thi'];

interface RosterRow {
  cells: string[];   // values in ROSTER_HEADER column order
  date: string;      // ISO date for sorting ('' when the slot was deleted → sorts last)
  startMin: number;
  type: string;
  name: string;
}

function fmtRosterDate(iso: string): string {
  const [y, mo, d] = iso.split('-');
  return `${d}/${mo}/${y}`;
}

/** Expand a registration into one roster row per slot it holds (Speaking + 3 Skills). */
function rosterRowsForRegistration(r: Registration, slotMap: Map<string, Slot>): RosterRow[] {
  const out: RosterRow[] = [];
  for (const slotId of [r.speakingSlotId, r.skillsSlotId]) {
    if (!slotId) continue;
    const s = slotMap.get(slotId);
    if (s) {
      // session is half-unset in the data, so derive AM/PM from the start time.
      const ampm = s.startMin < 12 * 60 ? 'AM' : 'PM';
      out.push({
        cells: [r.empCode, r.fullName, r.email, ampm, fmtRosterDate(s.date), s.type, s.location, `${minToHHmm(s.startMin)}-${minToHHmm(s.endMin)}`],
        date: s.date, startMin: s.startMin, type: s.type, name: r.fullName ?? '',
      });
    } else {
      // Slot deleted but still referenced — surface the participant rather than drop them.
      const skill = slotId === r.speakingSlotId ? 'Speaking' : '3 Skills';
      out.push({
        cells: [r.empCode, r.fullName, r.email, '', '', skill, `${slotId} (deleted)`, ''],
        date: '', startMin: 0, type: skill, name: r.fullName ?? '',
      });
    }
  }
  return out;
}

/** Roster order: by test date → start time → skill → name (so proctors read it per session/room). */
function compareRoster(a: RosterRow, b: RosterRow): number {
  if (a.date !== b.date) {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? -1 : 1;
  }
  if (a.startMin !== b.startMin) return a.startMin - b.startMin;
  if (a.type !== b.type) return a.type < b.type ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function rosterCsvBody(rows: RosterRow[]): string {
  rows.sort(compareRoster);
  return [ROSTER_HEADER, ...rows.map((r) => r.cells)].map((row) => row.map(csv).join(',')).join('\n');
}

/** Pure CSV string (header + sorted rows) for a set of registrations. Exposed for tests. */
export function buildRosterCsv(regs: Registration[], slots: Slot[]): string {
  const slotMap = new Map(slots.map((s) => [s.slotId, s]));
  const rows = regs.flatMap((r) => rosterRowsForRegistration(r, slotMap));
  return rosterCsvBody(rows);
}

/** Roster for a given (filtered/selected) set of registrations already in memory. */
export function downloadRosterCsv(regs: Registration[], slots: Slot[]) {
  downloadCsvChunks(['﻿', buildRosterCsv(regs, slots)], 'exam-roster');
}

// ── Event roster export ──────────────────────────────────────────────────────
// Simple events have no slots/time — one row per registrant, sorted by BU (team)
// then name so organizers can read the roster per team.

const EVENT_ROSTER_HEADER = ['Emp. Code', 'Full name', 'Working Email', 'BU', 'Registered At'];

export interface EventRosterRow {
  email: string;
  empCode: string;
  fullName: string;
  bu: string;
  createdAt: string | null;
}

export function downloadEventRosterCsv(eventName: string, rows: EventRosterRow[]) {
  const sorted = rows.slice().sort(
    (a, b) => (a.bu || '').localeCompare(b.bu || '') || (a.fullName || '').localeCompare(b.fullName || ''),
  );
  const body = [
    EVENT_ROSTER_HEADER,
    ...sorted.map((r) => [
      r.empCode,
      r.fullName,
      r.email,
      r.bu,
      formatDateTime(r.createdAt),
    ]),
  ].map((row) => row.map(csv).join(',')).join('\n');
  const safeName = eventName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'event';
  downloadCsvChunks(['﻿', body], `roster-${safeName}`);
}

/** Roster for every registration (paged through, then sorted globally). */
export async function downloadAllRosterCsv(
  slots: Slot[],
  onProgress?: (progress: CsvExportProgress) => void,
) {
  const slotMap = new Map(slots.map((s) => [s.slotId, s]));
  const rows: RosterRow[] = [];
  let cursor: RegistrationPageCursor | null = null;
  let loaded = 0;
  let total = 0;

  do {
    const page = await listRegistrationsPage(cursor, REGISTRATIONS_PAGE_SIZE);
    total = page.total;
    loaded += page.items.length;
    for (const r of page.items) rows.push(...rosterRowsForRegistration(r, slotMap));
    onProgress?.({ loaded, total });
    cursor = page.nextCursor;
  } while (cursor);

  downloadCsvChunks(['﻿', rosterCsvBody(rows)], 'exam-roster');
}
