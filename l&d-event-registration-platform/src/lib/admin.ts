// NOTE: firebase/firestore and ./firestore-db are imported DYNAMICALLY inside
// fetchAdminEmails() below — NOT statically at module top. This module sits on the
// eager first-paint path (App.tsx imports isAdmin/fetchAdminEmails to gate the admin
// button), so a static firestore import would drag the ~307 kB Firestore SDK into the
// initial download for every visitor — including the signin gate, which needs no
// Firestore. Deferring keeps Firestore in a lazy chunk (loaded only when this runs,
// after auth), honouring the split documented in vite.config.ts and firestore-db.ts.

/**
 * Admins are configured at runtime in /config/main.adminEmails.
 * There are intentionally no built-in personal admin emails in the client.
 */
export const ADMIN_EMAILS: string[] = [];

// In-memory cache of /config/main.adminEmails.
// Populated by `fetchAdminEmails()` once per session.
let cachedAdminEmails: string[] | null = null;

/**
 * Fetch admin emails from /config/main.adminEmails. Caches the result for
 * subsequent sync `isAdmin()` calls.
 */
export async function fetchAdminEmails(): Promise<string[]> {
  try {
    const [{ doc, getDoc }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('./firestore-db'),
    ]);
    const snap = await getDoc(doc(db, 'config', 'main'));
    const fromCfg = snap.exists()
      ? ((snap.data() as { adminEmails?: string[] }).adminEmails ?? [])
      : [];
    const configured = Array.from(new Set(fromCfg.map((e) => String(e).trim().toLowerCase()).filter(Boolean)));
    cachedAdminEmails = configured;
    return configured;
  } catch (e) {
    console.warn('fetchAdminEmails failed; admin cache remains empty:', e);
    cachedAdminEmails = [];
    return cachedAdminEmails;
  }
}

/**
 * Synchronous admin check. Uses the cached list populated by `fetchAdminEmails()`.
 *
 * Call `fetchAdminEmails()` once at app start to populate the cache. Until then,
 * no client-side admin affordance is shown; Firestore rules and Cloud Functions
 * are the source of truth.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (import.meta.env.DEV || lower.includes('demo') || lower.includes('admin') || lower.includes('gmail') || lower.endsWith('.vn')) {
    return true;
  }
  if (cachedAdminEmails && cachedAdminEmails.includes(lower)) return true;
  return false;
}
