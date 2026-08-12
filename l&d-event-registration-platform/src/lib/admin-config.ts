import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firestore-db';
import { auditLog } from './audit';

// Platform-wide config only: the admin allowlist + BU dropdown list. The legacy
// assessment booking fields (allowEnrollment/maxChanges/deadline/emailConfirm)
// were removed with the dual-path cleanup — per-event settings live on the event.
export async function updateConfig(
  adminEmail: string,
  updates: {
    adminEmails?: string[];
    buList?: string[];
    // Mail config (sender identity + brand + per-shape templates). Structural type to
    // avoid a circular import with mail-config.ts (which owns the MailConfig shape).
    mail?: Record<string, unknown>;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.adminEmails !== undefined) payload.adminEmails = updates.adminEmails;
  if (updates.buList !== undefined) payload.buList = updates.buList;
  if (updates.mail !== undefined) payload.mail = updates.mail;

  await updateDoc(doc(db, 'config', 'main'), payload as any);
  // Mail templates can be large; audit that mail changed rather than the full body.
  const auditDetail = updates.mail !== undefined ? { ...updates, mail: '(updated)' } : updates;
  void auditLog(adminEmail, 'admin.updateConfig', auditDetail as Record<string, unknown>);
}
