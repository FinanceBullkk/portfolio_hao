// @vitest-environment node
// Emulator tests for storage.rules — the admin-only gate on event cover uploads.
// Runs under `npm run test:rules` (firebase emulators:exec --only firestore,storage),
// so the cross-service firestore.get(config/main) in the rule resolves.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-corgi7-rules';
const ADMIN = 'admin@cyberlogitec.com';
const USER = 'user@cyberlogitec.com';
const COVER = 'event-covers/e1/cover.png';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // tiny PNG header
const OVERSIZE = new Uint8Array(2 * 1024 * 1024 + 1024); // > 2 MB
const IMAGE_META = { contentType: 'image/png' };

let testEnv: RulesTestEnvironment;

function storageFor(email: string | null) {
  const ctx = email
    ? testEnv.authenticatedContext(email, { email, email_verified: true })
    : testEnv.unauthenticatedContext();
  return ctx.storage();
}

async function seedAdminConfig(adminEmails = [ADMIN]) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'config/main'), { adminEmails });
  });
}

async function seedCoverObject() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), COVER), PNG, IMAGE_META);
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await testEnv.clearStorage();
  await testEnv.clearFirestore();
  await seedAdminConfig();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('storage.rules — event cover uploads', () => {
  it('admin may upload a small image', async () => {
    await assertSucceeds(uploadBytes(ref(storageFor(ADMIN), COVER), PNG, IMAGE_META));
  });

  it('non-admin company user may NOT upload', async () => {
    await assertFails(uploadBytes(ref(storageFor(USER), COVER), PNG, IMAGE_META));
  });

  it('unauthenticated user may NOT upload', async () => {
    await assertFails(uploadBytes(ref(storageFor(null), COVER), PNG, IMAGE_META));
  });

  it('admin may NOT upload an image larger than 2 MB', async () => {
    await assertFails(uploadBytes(ref(storageFor(ADMIN), COVER), OVERSIZE, IMAGE_META));
  });

  it('admin may NOT upload a non-image content-type', async () => {
    await assertFails(uploadBytes(ref(storageFor(ADMIN), COVER), PNG, { contentType: 'text/plain' }));
  });

  it('admin may NOT upload an SVG cover (script-in-SVG served from Storage origin)', async () => {
    await assertFails(uploadBytes(ref(storageFor(ADMIN), COVER), PNG, { contentType: 'image/svg+xml' }));
  });

  it('admin may upload JPEG and WebP covers (raster formats allowed)', async () => {
    await assertSucceeds(uploadBytes(ref(storageFor(ADMIN), COVER), PNG, { contentType: 'image/jpeg' }));
    await assertSucceeds(uploadBytes(ref(storageFor(ADMIN), COVER), PNG, { contentType: 'image/webp' }));
  });

  it('cover images are publicly readable', async () => {
    await seedCoverObject();
    await assertSucceeds(getBytes(ref(storageFor(null), COVER)));
  });

  it('non-admin may NOT delete a cover; admin may', async () => {
    await seedCoverObject();
    await assertFails(deleteObject(ref(storageFor(USER), COVER)));
    await assertSucceeds(deleteObject(ref(storageFor(ADMIN), COVER)));
  });

  it('writes outside event-covers/ are denied even for admin', async () => {
    await assertFails(uploadBytes(ref(storageFor(ADMIN), 'random/x.png'), PNG, IMAGE_META));
  });
});
