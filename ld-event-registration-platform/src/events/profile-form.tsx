import { useState } from 'react';
import { toUpperNoAccent } from '../booking/booking-utils';
import {
  isValidEmpCode,
  isValidFullName,
  sanitizeEmpCode,
  EMP_CODE_LABEL,
  EMP_CODE_HINT,
  EMP_CODE_HELP,
  FULL_NAME_HELP,
} from '../lib/emp-code';
import type { UserProfile } from '../lib/types';

// Shared employee-profile form (empCode / fullName / BU). Used both by the
// first-login "Complete your profile" gate and the "Edit profile" screen. The
// empCode rule + wording come from emp-code.ts (the single owner), so this form,
// the booking client and the admin tools all agree on what a valid identity is.

export function ProfileForm({
  title,
  subtitle,
  buList,
  initial,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
  cancelLabel = 'Cancel',
}: {
  title: string;
  subtitle: string;
  buList: string[];
  initial?: Partial<UserProfile> | null;
  busy?: boolean;
  submitLabel: string;
  onSubmit: (d: UserProfile) => void;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [empCode, setEmpCode] = useState(initial?.empCode ?? '');
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  // Prefill BU only when we already know it; otherwise force an explicit choice.
  const [bu, setBu] = useState(
    initial?.bu && buList.includes(initial.bu) ? initial.bu : '',
  );
  const [buTouched, setBuTouched] = useState(false);

  const empValid = isValidEmpCode(empCode);
  const nameValid = isValidFullName(fullName);
  const buValid = buList.includes(bu);
  const allValid = empValid && nameValid && buValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allValid || busy) return;
    onSubmit({ empCode, fullName: fullName.trim(), bu });
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-hd">
        <h1 className="card-title">{title}</h1>
        <div className="card-sub">{subtitle}</div>
      </div>
      <div className="card-bd">
        <div className="field">
          <label className="label" htmlFor="pf-empCode">
            {EMP_CODE_LABEL} <span className="req">*</span>
            <span className="opt">· {EMP_CODE_HINT}</span>
          </label>
          <input
            id="pf-empCode"
            className={`input ${empCode && !empValid ? 'error' : ''}`}
            placeholder="e.g. 262010"
            value={empCode}
            onChange={(e) => setEmpCode(sanitizeEmpCode(e.target.value))}
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            aria-invalid={Boolean(empCode && !empValid)}
          />
          {empCode && !empValid && (
            <span className="help error" role="alert">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
              {EMP_CODE_HELP}
            </span>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="pf-fullName">
            Full name <span className="req">*</span>
          </label>
          <input
            id="pf-fullName"
            className={`input ${fullName.length > 0 && !nameValid ? 'error' : ''}`}
            placeholder="FULL NAME"
            value={fullName}
            onChange={(e) => setFullName(toUpperNoAccent(e.target.value))}
            maxLength={50}
            autoComplete="name"
            spellCheck={false}
            style={{ textTransform: 'uppercase' }}
            aria-invalid={fullName.length > 0 && !nameValid}
          />
          {fullName.length > 0 && !nameValid
            ? <span className="help error" role="alert">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
                Please enter your full name (letters only)
              </span>
            : <span className="help">{FULL_NAME_HELP}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="pf-bu">
            BU / Team <span className="req">*</span>
          </label>
          <select
            id="pf-bu"
            className={`input ${buTouched && !buValid ? 'error' : ''}`}
            value={bu}
            onChange={(e) => setBu(e.target.value)}
            onBlur={() => setBuTouched(true)}
            aria-invalid={buTouched && !buValid}
          >
            <option value="" disabled>— Select your BU / Team —</option>
            {buList.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {buTouched && !buValid
            ? <span className="help error" role="alert">Choose your team to continue</span>
            : <span className="help">Used for all your event registrations</span>}
        </div>
      </div>
      <div className="card-ft">
        {onCancel && (
          <button type="button" className="btn ghost sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          className={`btn ${allValid && !busy ? '' : 'disabled'}`}
          disabled={!allValid || busy}
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
