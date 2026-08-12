import { useState } from 'react';
import { Stepper } from './booking-chrome';
import type { Step1Data } from './booking-utils';

// ─── Step 1 · Confirm details ─────────────────────────────────────────────
//
// Identity is now captured once in the account profile (Complete-profile gate),
// so Step 1 no longer asks for it — it shows a confirm summary of the saved
// profile with an "Edit" affordance, then continues to slot selection. The
// optional ineligibility preflight still runs once at Continue (a UX fast-fail;
// the booking transaction re-enforces it on write).

export function Step1Form({
  email,
  initial,
  checkIneligibility,
  onContinue,
  onCancel,
  onEditProfile,
}: {
  email: string;
  initial: Step1Data;
  // Supplied by the booking flow's BookingApi (no-op when an event has no
  // per-event eligibility check). Kept so a future per-event preflight can wire in.
  checkIneligibility: (empCode: string, email?: string) => Promise<string | null>;
  onContinue: (d: Step1Data) => void;
  onCancel?: () => void;
  onEditProfile?: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [blockErr, setBlockErr] = useState<string | null>(null);
  const initials = (initial.fullName || initial.empCode || '?').slice(0, 2).toUpperCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (checking) return;
    setBlockErr(null);
    setChecking(true);
    try {
      // Pre-flight eligibility check. The booking transaction enforces the same
      // rule on write, so this stays a UX fast-fail, not the only guard.
      try {
        const reason = await checkIneligibility(initial.empCode, email);
        if (reason) { setBlockErr(reason); return; }
      } catch {
        // Network error at submit gate — proceed; server will enforce on write.
      }
      onContinue(initial);
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <Stepper current={1} />
      <form className="card" onSubmit={handleSubmit}>
        <div className="card-hd">
          <div className="card-title">Confirm your details</div>
          <div className="card-sub">
            We’ll register you with your saved profile. Edit it if anything changed.
          </div>
        </div>
        <div className="card-bd">
          <div className="confirm-recap">
            <span className="av">{initials}</span>
            <div className="t">Registering as <b>{initial.fullName}</b>
              <span className="s">{initial.empCode}{initial.bu ? ` · ${initial.bu}` : ''}</span>
            </div>
            {onEditProfile && (
              <button type="button" className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={onEditProfile}>
                Edit
              </button>
            )}
          </div>
          {blockErr && <span className="help error" role="alert">{blockErr}</span>}
        </div>
        <div className="card-ft">
          {onCancel
            ? <button type="button" className="btn ghost sm" onClick={onCancel}>← Cancel</button>
            : <span />}
          <button
            type="submit"
            className={`btn ${checking ? 'disabled' : ''}`}
            disabled={checking}
          >
            {checking ? 'Checking…' : 'Continue →'}
          </button>
        </div>
      </form>
    </>
  );
}
