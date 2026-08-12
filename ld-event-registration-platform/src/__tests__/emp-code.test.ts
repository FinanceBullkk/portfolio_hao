import { describe, it, expect } from 'vitest';
import {
  isValidEmpCode,
  isValidFullName,
  sanitizeEmpCode,
  validateIdentity,
  EMP_CODE_LABEL,
} from '../lib/emp-code';

describe('emp-code — single owner of employee identity validation', () => {
  describe('isValidEmpCode', () => {
    it('accepts exactly 6 digits', () => {
      expect(isValidEmpCode('262010')).toBe(true);
      expect(isValidEmpCode('  262010  ')).toBe(true); // trims
    });
    it('rejects non-6-digit values', () => {
      ['', '12345', '1234567', 'abcdef', '26201a', '26 010'].forEach((v) =>
        expect(isValidEmpCode(v)).toBe(false),
      );
    });
  });

  describe('sanitizeEmpCode', () => {
    it('strips non-digits and caps at 6', () => {
      expect(sanitizeEmpCode('26-20-10')).toBe('262010');
      expect(sanitizeEmpCode('2620109999')).toBe('262010');
      expect(sanitizeEmpCode('abc262')).toBe('262');
    });
  });

  describe('isValidFullName (audit P0-3 — block garbage names)', () => {
    it('accepts real names (single and multi-part)', () => {
      ['NGUYEN VAN A', 'AN', "O'BRIEN", 'TRAN THI-MAI', 'LE V.'].forEach((v) =>
        expect(isValidFullName(v)).toBe(true),
      );
    });
    it('rejects digit/symbol garbage and too-short input', () => {
      ['321321', 'A', '', '   ', '123 456', 'EL001', '@#$%', 'A1'].forEach((v) =>
        expect(isValidFullName(v)).toBe(false),
      );
    });
  });

  describe('validateIdentity (data-layer guard: presence + 6-digit + name)', () => {
    const ok = { empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BU-X' };

    it('returns null for a valid identity', () => {
      expect(validateIdentity(ok)).toBeNull();
    });

    it('rejects a garbage name (no longer a form-only concern)', () => {
      expect(validateIdentity({ ...ok, fullName: '321321' })).toMatch(/full name/i);
      expect(validateIdentity({ ...ok, fullName: 'A' })).toMatch(/full name/i);
    });

    it('does not enforce BU membership (server is the authority)', () => {
      expect(validateIdentity({ ...ok, bu: 'ANYTHING' })).toBeNull();
    });

    it('flags missing fields', () => {
      expect(validateIdentity({ ...ok, empCode: '' })).toMatch(/fill in/i);
      expect(validateIdentity({ ...ok, fullName: '' })).toMatch(/fill in/i);
      expect(validateIdentity({ ...ok, bu: '' })).toMatch(/fill in/i);
    });

    it('flags a bad empCode with the canonical label', () => {
      const msg = validateIdentity({ ...ok, empCode: '123' });
      expect(msg).toContain(EMP_CODE_LABEL);
      expect(msg).toMatch(/6 digits/);
    });
  });
});
