// Single owner of "what a valid employee identity is" on the client.
//
// The 6-digit empCode rule, its help text, and the full identity check used to be
// copied across the booking client, the events client, the register forms and the
// admin ineligibility tools — with the user-facing label already drifting
// ("Employee ID" on the booking forms vs "Employee Code" in admin/server). One
// owner: import from here, never re-inline the /^\d{6}$/ regex.
//
// The Cloud Functions keep their own JS mirror (TS↔JS can't share a module); only
// the wording is kept aligned with EMP_CODE_LABEL below.

export const EMP_CODE_LEN = 6;

/** Canonical user-facing label, so every form/message reads the same. */
export const EMP_CODE_LABEL = 'Employee ID';
export const EMP_CODE_HINT = `${EMP_CODE_LEN} digits`;
export const EMP_CODE_HELP = `${EMP_CODE_LABEL} must be exactly ${EMP_CODE_LEN} digits`;

/** A valid employee code is exactly 6 digits, e.g. 262010. */
export function isValidEmpCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

/** Strip non-digits and cap at 6 — the input sanitizer every empCode field uses. */
export function sanitizeEmpCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, EMP_CODE_LEN);
}

// Names are stored uppercased + accent-stripped (toUpperNoAccent), so a valid
// full name is Latin letters plus the usual name punctuation (space, hyphen,
// apostrophe, dot), starting with a letter and carrying ≥2 letters. This blocks
// the digit/symbol garbage the old free-text field accepted — e.g. "321321" —
// while staying lenient enough for real single- and multi-part names (audit P0-3).
const FULL_NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/;
export const FULL_NAME_HELP = 'Letters only · match your name in the HR system';

export function isValidFullName(value: string): boolean {
  const v = value.trim();
  if (v.length < 2 || !FULL_NAME_RE.test(v)) return false;
  return (v.match(/[A-Za-z]/g)?.length ?? 0) >= 2;
}

export interface IdentityInput {
  empCode: string;
  fullName: string;
  bu: string;
}

/**
 * Data-layer guard for the registration payload: all three present + a 6-digit
 * empCode. Returns the first problem as a user-facing message, or null when valid.
 * This is the cheap fast-fail the booking/event clients run before the callable;
 * form-level rules (name length, BU membership) live in the forms, and the server
 * transaction is the final authority.
 */
export function validateIdentity({ empCode, fullName, bu }: IdentityInput): string | null {
  const code = empCode.trim();
  if (!code || !fullName.trim() || !bu.trim()) return `Please fill in ${EMP_CODE_LABEL}, Full name and BU.`;
  if (!isValidEmpCode(code)) return `${EMP_CODE_LABEL} must be ${EMP_CODE_LEN} digits (e.g. 262010).`;
  if (!isValidFullName(fullName)) return 'Please enter your full name (letters only).';
  return null;
}
