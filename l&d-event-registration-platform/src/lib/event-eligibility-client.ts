import { callable } from './callable';

// Client wrapper over the checkEventEligibility callable — the Step-1 preflight
// fast-fail. Advisory only: the booking transaction re-runs the identical gate on
// submit, so any failure here must NOT block a legitimate registration. Returns the
// human-readable block reason when ineligible, or null when eligible / unknown.

interface PreflightResult { ok: boolean; eligible: boolean; reason: string | null }

export async function checkEventEligibility(eventId: string, empCode: string): Promise<string | null> {
  const code = empCode.trim();
  // The form already validates the 6-digit format; stay quiet for partial input.
  if (!/^\d{6}$/.test(code)) return null;
  try {
    const res = await callable<{ eventId: string; empCode: string }, PreflightResult>(
      'checkEventEligibility',
      { eventId, empCode: code },
    );
    return res.eligible ? null : (res.reason ?? null);
  } catch {
    // Offline / transient — let the user proceed; the server gate is authoritative.
    return null;
  }
}
