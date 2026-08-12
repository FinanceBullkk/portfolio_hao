/**
 * Eligibility-rule tests (functions/eligibility-rules.js).
 *
 * The single owner of the blocklist → allowlist → claim-ownership decision and
 * its messages, shared by the booking transaction and the checkEligibility
 * preflight callable.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const realRequire = createRequire(import.meta.url);
const { evaluateEligibility, ELIGIBILITY_MESSAGES } =
  realRequire(join(process.cwd(), 'functions/eligibility-rules.js'));

const email = 'user@test.com';
const allowed = { blockData: null, requireEligibility: false, eligExists: true, claimData: null, email };

describe('evaluateEligibility()', () => {
  it('permanently blocked with a custom reason surfaces that reason', () => {
    expect(evaluateEligibility({ ...allowed, permanentBlockData: { reason: 'No longer employed' } }))
      .toEqual({ ok: false, message: 'No longer employed' });
  });

  it('permanently blocked with no reason falls back to the permanent default', () => {
    expect(evaluateEligibility({ ...allowed, permanentBlockData: {} }))
      .toEqual({ ok: false, message: ELIGIBILITY_MESSAGES.permanentlyBlocked });
  });

  it('permanent block wins over a per-event block (highest priority)', () => {
    expect(evaluateEligibility({ ...allowed, permanentBlockData: { reason: 'PERM' }, blockData: { reason: 'EVENT' } }))
      .toEqual({ ok: false, message: 'PERM' });
  });

  it('blocked with a custom reason surfaces that reason', () => {
    expect(evaluateEligibility({ ...allowed, blockData: { reason: 'Custom block reason' } }))
      .toEqual({ ok: false, message: 'Custom block reason' });
  });

  it('blocked with no reason falls back to the default message', () => {
    expect(evaluateEligibility({ ...allowed, blockData: {} }))
      .toEqual({ ok: false, message: ELIGIBILITY_MESSAGES.blocked });
  });

  it('gated and not in the allowlist → notEligible', () => {
    expect(evaluateEligibility({ ...allowed, requireEligibility: true, eligExists: false }))
      .toEqual({ ok: false, message: ELIGIBILITY_MESSAGES.notEligible });
  });

  it('gated and in the allowlist → ok', () => {
    expect(evaluateEligibility({ ...allowed, requireEligibility: true, eligExists: true }))
      .toEqual({ ok: true });
  });

  it('claim held by another email → claimedByOther', () => {
    expect(evaluateEligibility({ ...allowed, claimData: { email: 'other@test.com' } }))
      .toEqual({ ok: false, message: ELIGIBILITY_MESSAGES.claimedByOther });
  });

  it('claim held by the same email → ok', () => {
    expect(evaluateEligibility({ ...allowed, claimData: { email } }))
      .toEqual({ ok: true });
  });

  it('no block, no gate, no claim → ok', () => {
    expect(evaluateEligibility(allowed)).toEqual({ ok: true });
  });

  it('blocklist wins over a foreign claim (ordering preserved)', () => {
    expect(evaluateEligibility({ ...allowed, blockData: { reason: 'X' }, claimData: { email: 'other@test.com' } }))
      .toEqual({ ok: false, message: 'X' });
  });
});
