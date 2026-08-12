import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { isValidFullName as tsIsValidFullName } from '../lib/emp-code';

// The server keeps a JS mirror of the client name validator (TS<->JS can't share
// a module). This test pins the two together so they can never drift (audit P0-3).
const require = createRequire(import.meta.url);
const { isValidFullName: jsIsValidFullName } = require(join(process.cwd(), 'functions/identity-validation.js'));

const SAMPLES = [
  'NGUYEN VAN A', 'AN', "O'BRIEN", 'TRAN THI-MAI', 'LE V.',
  '321321', 'A', '', '   ', '123 456', 'EL001', '@#$%', 'A1', 'NGUYỄN VĂN A',
];

describe('server isValidFullName mirrors the client rule', () => {
  it('agrees with src/lib/emp-code.ts on every sample', () => {
    for (const s of SAMPLES) {
      expect(jsIsValidFullName(s), `mismatch for ${JSON.stringify(s)}`).toBe(tsIsValidFullName(s));
    }
  });

  it('rejects digit/symbol garbage on the server', () => {
    expect(jsIsValidFullName('321321')).toBe(false);
    expect(jsIsValidFullName('EL001')).toBe(false);
    expect(jsIsValidFullName('NGUYEN VAN A')).toBe(true);
  });
});
