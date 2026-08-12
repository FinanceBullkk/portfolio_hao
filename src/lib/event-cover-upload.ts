// Single owner of the event-cover Storage path + upload/delete. The cover binary
// lives in Firebase Storage (event-covers/{eventId}/…) — the Event doc keeps only
// the resulting download URL (see docs/adr/0004). `firebase/storage` is lazy-imported
// so it never lands on the first-paint critical path (mirrors firestore/functions).
// Storage rules (storage.rules) are the real gate; the size/type checks here are fast
// client feedback only.
import { app } from './firebase';

const EVENT_COVERS = 'event-covers';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — must match storage.rules
// Raster only — must mirror storage.rules. SVG is excluded (it can carry <script> and is
// served from the Storage origin); these three cover every real cover-photo format.
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Upload a cover image for an event; returns its public download URL. */
export async function uploadEventCover(eventId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Cover must be a PNG, JPG, or WebP image.');
  if (file.size >= MAX_BYTES) throw new Error('Cover image must be under 2 MB.');
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storage = getStorage(app);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60) || 'cover';
  const objectRef = ref(storage, `${EVENT_COVERS}/${eventId}/cover-${Date.now()}-${safeName}`);
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}

/** Best-effort delete of a previously-uploaded cover (the doc URL is the source of
 *  truth, so a failed delete just leaves an orphan object — never blocks the save). */
export async function deleteEventCover(url: string): Promise<void> {
  if (!url) return;
  try {
    const { getStorage, ref, deleteObject } = await import('firebase/storage');
    const storage = getStorage(app);
    await deleteObject(ref(storage, url));
  } catch {
    // Orphan tolerated; ignore (object may already be gone, or be cross-bucket).
  }
}
