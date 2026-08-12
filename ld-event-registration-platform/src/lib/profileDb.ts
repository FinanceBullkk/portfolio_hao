import type { UserProfile } from './types';
import { captureError, friendlyFirestoreError } from './monitoring';
import { callable } from './callable';

// Client API for the account-tied employee profile (empCode / fullName / BU).
// Writes via the updateMyProfile callable (region pinned in callable.ts); the
// callable validates, audits the change, and returns the normalized profile. The
// profile is READ on initial load (initEvents returns it in EventsInitResult) —
// this module only writes it.

export interface SaveProfileResult {
  ok: boolean;
  profile?: UserProfile;
  error?: string;
}

export async function saveMyProfile(payload: UserProfile): Promise<SaveProfileResult> {
  try {
    const data = await callable<UserProfile, { profile: UserProfile }>('updateMyProfile', {
      empCode: payload.empCode.trim(),
      fullName: payload.fullName.trim(),
      bu: payload.bu.trim(),
    });
    return { ok: true, profile: data.profile };
  } catch (e) {
    captureError(e, { operation: 'updateMyProfile' });
    return { ok: false, error: friendlyFirestoreError(e) };
  }
}
