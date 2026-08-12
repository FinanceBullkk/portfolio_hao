/**
 * Shared callable-handler helper tests (functions/handler-helpers.js).
 * Covers the rate-limit guard that was previously copy-pasted across the
 * booking and cancel handlers, plus the businessError constructor.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const realRequire = createRequire(import.meta.url);
const { createRateLimiter, businessError } = realRequire(join(process.cwd(), 'functions/handler-helpers.js'));

class FakeHttpsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function fakeDb() {
  const docs: string[] = [];
  return { docs, doc: (path: string) => { docs.push(path); return { path }; } };
}

describe('businessError()', () => {
  it('builds a failed-precondition HttpsError carrying the message', () => {
    const err = businessError(FakeHttpsError, 'Business rule error');
    expect(err).toBeInstanceOf(FakeHttpsError);
    expect(err.code).toBe('failed-precondition');
    expect(err.message).toBe('Business rule error');
  });
});

describe('createRateLimiter()', () => {
  const make = (windowMs = 3000) => {
    const db = fakeDb();
    return { db, limiter: createRateLimiter(db, { HttpsError: FakeHttpsError, windowMs }) };
  };

  it('ref() sanitizes the email into a Firestore-safe doc id', () => {
    const { db, limiter } = make();
    const ref = limiter.ref('bookRegistration', 'User.Name@Test.com');
    expect(ref.path).toBe('functionRateLimits/bookRegistration_user_name@test_com');
    expect(db.docs).toContain('functionRateLimits/bookRegistration_user_name@test_com');
  });

  it('assert() does nothing for a missing or absent snapshot', () => {
    const { limiter } = make();
    expect(() => limiter.assert(undefined)).not.toThrow();
    expect(() => limiter.assert({ exists: false, data: () => ({}) })).not.toThrow();
  });

  it('assert() throws resource-exhausted within the window', () => {
    const { limiter } = make(3000);
    const snap = { exists: true, data: () => ({ lastCallAt: { toDate: () => new Date(Date.now() - 100) } }) };
    expect(() => limiter.assert(snap)).toThrow(/too fast/);
    try {
      limiter.assert(snap);
    } catch (e: any) {
      expect(e.code).toBe('resource-exhausted');
    }
  });

  it('assert() allows a call older than the window', () => {
    const { limiter } = make(3000);
    const snap = { exists: true, data: () => ({ lastCallAt: { toDate: () => new Date(Date.now() - 10_000) } }) };
    expect(() => limiter.assert(snap)).not.toThrow();
  });

  it('assert() allows when lastCallAt is malformed (no toDate)', () => {
    const { limiter } = make();
    expect(() => limiter.assert({ exists: true, data: () => ({ lastCallAt: 12345 }) })).not.toThrow();
  });
});
