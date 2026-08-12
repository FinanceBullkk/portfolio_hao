/**
 * Eligibility-gate tests (functions/eligibility-gate.js).
 *
 * The I/O-bearing half of the eligibility decision: it performs the gated allowlist
 * read and assembles the verdict. The `read` seam lets us exercise the previously
 * un-unit-testable bit — the "only read /eligibility when gated AND not already
 * blocked" short-circuit that used to be copy-pasted across three callers — with a
 * fake reader, no emulator. (The pure verdict itself is covered in
 * eligibility-rules.test.ts.)
 */
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const realRequire = createRequire(import.meta.url);
const { resolveEligibility } =
  realRequire(join(process.cwd(), 'functions/eligibility-gate.js'));

const email = 'user@test.com';
const empCode = '262010';
// A deterministic stand-in for the scope: eligibility(code) returns a structurally
// stable ref so toHaveBeenCalledWith can deep-match it.
const scope = { eligibility: (code: string) => ({ __ref: 'eligibility', code }) };
const makeRead = (exists: boolean) => vi.fn(async () => ({ exists }));

const base = {
  scope,
  empCode,
  email,
  requireEligibility: false,
  permanentBlockData: null,
  blockData: null,
  claimData: null,
};

describe('resolveEligibility() — eligibility gate (reads + decision)', () => {
  it('not gated → never touches the allowlist, returns ok', async () => {
    const read = makeRead(false);
    expect(await resolveEligibility({ ...base, requireEligibility: false, read })).toEqual({ ok: true });
    expect(read).not.toHaveBeenCalled();
  });

  it('gated + not blocked + on the allowlist → reads it exactly once, ok', async () => {
    const read = makeRead(true);
    expect(await resolveEligibility({ ...base, requireEligibility: true, read })).toEqual({ ok: true });
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith(scope.eligibility(empCode));
  });

  it('gated + not blocked + NOT on the allowlist → not eligible', async () => {
    const read = makeRead(false);
    const r = await resolveEligibility({ ...base, requireEligibility: true, read });
    expect(r.ok).toBe(false);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('permanently blocked → short-circuits the allowlist read (the duplicated bug surface)', async () => {
    const read = makeRead(true);
    expect(await resolveEligibility({ ...base, requireEligibility: true, permanentBlockData: { reason: 'X' }, read }))
      .toEqual({ ok: false, message: 'X' });
    expect(read).not.toHaveBeenCalled();
  });

  it('per-event blocked → also short-circuits the allowlist read', async () => {
    const read = makeRead(true);
    const r = await resolveEligibility({ ...base, requireEligibility: true, blockData: {}, read });
    expect(r.ok).toBe(false);
    expect(read).not.toHaveBeenCalled();
  });

  it('passes claimData through to the verdict (claim held by another → not ok)', async () => {
    const read = makeRead(true);
    const r = await resolveEligibility({ ...base, claimData: { email: 'other@test.com' }, read });
    expect(r.ok).toBe(false);
  });

  it('claimData null (simple-event path) bypasses the claim tier → ok', async () => {
    const read = makeRead(true);
    expect(await resolveEligibility({ ...base, claimData: null, read })).toEqual({ ok: true });
  });
});
