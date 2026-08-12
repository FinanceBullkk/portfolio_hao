// Build the .ics for the 2 exam slots — client version (the "Add to calendar"
// button on the success screen).
// SYNC: logic matches functions/ics-helpers.js.
import type { Slot } from './types';

const VN_OFFSET_MIN = 7 * 60;
const pad = (n: number) => String(n).padStart(2, '0');

function fmtUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
    + `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function toIcsUtc(date: string, minLocal: number): string {
  const [y, mo, d] = date.split('-').map(Number);
  return fmtUtc(Date.UTC(y, mo - 1, d) + (minLocal - VN_OFFSET_MIN) * 60000);
}

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function vevent(uid: string, seq: number, stamp: string, summary: string, slot: Slot, desc: string): string[] {
  return [
    'BEGIN:VEVENT', `UID:${uid}`, `SEQUENCE:${seq}`, `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsUtc(slot.date, slot.startMin)}`, `DTEND:${toIcsUtc(slot.date, slot.endMin)}`,
    `SUMMARY:${escapeText(summary)}`,
    slot.location ? `LOCATION:${escapeText(slot.location)}` : '',
    `DESCRIPTION:${escapeText(desc)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Exam reminder (1 day before)', 'TRIGGER:-P1D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Exam reminder (1 hour before)', 'TRIGGER:-PT1H', 'END:VALARM',
    'END:VEVENT',
  ].filter(Boolean);
}

export function buildBookingIcs(opts: {
  empCode: string; sp: Slot; sk: Slot; sequence: number; assessmentName: string; now?: Date;
}): string {
  const { empCode, sp, sk, sequence, assessmentName, now = new Date() } = opts;
  const stamp = fmtUtc(now.getTime());
  const seq = Number.isFinite(sequence) && sequence >= 0 ? sequence : 0;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Assessment Booking//L&D//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...vevent(`${empCode}-SP@assessment-booking`, seq, stamp, `${assessmentName} — Speaking`, sp, 'Speaking exam. Bring your ID card / employee badge.'),
    ...vevent(`${empCode}-3S@assessment-booking`, seq, stamp, `${assessmentName} — 3 Skills`, sk, '3 Skills exam. Bring your ID card / employee badge.'),
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}

export function downloadBookingIcs(opts: { empCode: string; sp: Slot; sk: Slot; sequence: number; assessmentName: string }) {
  const ics = buildBookingIcs(opts);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'assessment-schedule.ics';
  a.click();
  URL.revokeObjectURL(url);
}
