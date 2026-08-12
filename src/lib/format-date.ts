// Single source of truth for date/time DISPLAY across the whole app.
//
// Audit P0-1: the UI mixed ≥5 ad-hoc formats ("Fri 10 Jul 2026", "01/07/2026",
// "25/6/2026", "25/06/2026, 18:39:57", …) — ambiguous and inconsistent. Every
// user- and admin-facing date now flows through these helpers, which render a
// single canonical pattern in local (Asia/Saigon) time:
//
//   formatDate      → dd/MM/yyyy            e.g. 25/06/2026
//   formatTime      → HH:mm (24h)           e.g. 18:39
//   formatDateTime  → dd/MM/yyyy HH:mm      e.g. 25/06/2026 18:39
//   formatDateWeekday → EEE dd/MM/yyyy      e.g. Thu 25/06/2026
//
// NOTE: this is for DISPLAY only. Date *keys* used in logic/IDs (the
// `YYYY-MM-DD` ISO strings, CSV filenames, etc.) intentionally stay ISO.

export type DateInput = Date | number | string | null | undefined;

// Date-only keys ("2026-06-27") must format from their calendar parts directly,
// never via `new Date()` — that parses them as UTC midnight and a getDate() in a
// negative-offset timezone would shift the day. Parsing the parts is TZ-stable.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_ONLY = /^(\d{4})-(\d{2})$/;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const p2 = (n: number) => String(n).padStart(2, '0');

function toDate(input: DateInput): Date | null {
  if (input == null || input === '') return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** dd/MM/yyyy — e.g. "25/06/2026". Empty string for missing/invalid input. */
export function formatDate(input: DateInput): string {
  if (typeof input === 'string') {
    const m = DATE_ONLY.exec(input);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = toDate(input);
  if (!d) return '';
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** HH:mm (24h) — e.g. "18:39". Empty string for missing/invalid input. */
export function formatTime(input: DateInput): string {
  const d = toDate(input);
  if (!d) return '';
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** dd/MM/yyyy HH:mm — e.g. "25/06/2026 18:39". */
export function formatDateTime(input: DateInput): string {
  const d = toDate(input);
  if (!d) return '';
  return `${formatDate(d)} ${formatTime(d)}`;
}

/** "YYYY-MM" → "July 2026". A month LABEL (not a timestamp), so it reads in words
 *  rather than the dd/MM date pattern. Empty string for missing/invalid input. */
export function formatMonthYear(input: string | null | undefined): string {
  if (!input) return '';
  const m = MONTH_ONLY.exec(input);
  if (!m) return '';
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : '';
}

/** EEE dd/MM/yyyy — e.g. "Thu 25/06/2026". Weekday stays TZ-stable for keys. */
export function formatDateWeekday(input: DateInput): string {
  const date = formatDate(input);
  if (!date) return '';
  if (typeof input === 'string' && DATE_ONLY.test(input)) {
    return `${WD[new Date(`${input}T00:00:00Z`).getUTCDay()]} ${date}`;
  }
  const d = toDate(input)!;
  return `${WD[d.getDay()]} ${date}`;
}

/** EEE dd/MM — like formatDateWeekday but drops the year for dates in the current
 *  calendar year (near-term events read cleaner: "Fri 10/07"). The year is kept only
 *  when it differs from today's, so cross-year dates stay unambiguous. Canonical
 *  dd/MM/yyyy is unchanged everywhere else. `now` is injectable for deterministic tests. */
export function formatDateWeekdayShort(input: DateInput, now: Date = new Date()): string {
  const full = formatDateWeekday(input); // "Fri 10/07/2026" (or '' for missing input)
  if (!full) return '';
  const m = /\/(\d{4})$/.exec(full);
  if (!m) return full;
  return Number(m[1]) === now.getFullYear() ? full.slice(0, -5) : full;
}
