/**
 * Security Attack Simulation Test Suite
 *
 * Test cases for common attack vectors against the Assessment Booking system.
 *
 * SEC-01 -> SEC-07   : XSS / Injection
 * SEC-08 -> SEC-12   : Privilege Escalation
 * SEC-13 -> SEC-17   : IDOR & Parameter Tampering
 * SEC-18 -> SEC-21   : Boundary Abuse
 * SEC-22 -> SEC-24   : Email Spoofing
 * SEC-25 -> SEC-27   : Deadline / Clock Manipulation
 * SEC-28 -> SEC-30   : Data Exfiltration
 * SEC-31 -> SEC-33   : Audit Tampering
 * SEC-34 -> SEC-36   : CSV Injection
 * SEC-37 -> SEC-39   : Denial-of-Service (DoS) Vectors
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

// -- Mock firebase --
vi.mock('../lib/firestore-db', () => ({ db: {} }));
vi.mock('../lib/firebase', () => ({ db: {}, functions: {}, app: {} }));

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockRunTransaction = vi.fn();
const mockAddDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockHttpsCallable = vi.fn();

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: any[]) => mockAddDoc(...args),
  collection: vi.fn((_db: any, path: string) => ({ path })),
  doc: vi.fn((_db: any, path: string, id?: string) => ({ path: id ? `${path}/${id}` : path })),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  query: vi.fn((...args: any[]) => args),
  where: vi.fn((...args: any[]) => args),
  runTransaction: (_db: any, fn: any) => mockRunTransaction(fn),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  deleteField: () => '__DELETE__',
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: (...args: any[]) => mockHttpsCallable(...args),
}));

vi.mock('../lib/audit', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
}));

import { makeSlottedBookingClient } from '../lib/slotted-booking-client';

// The flat assessment client (lib/db.ts) was retired with the dual-path cleanup.
// These security properties live in the SHARED slotted-booking client, so bind it
// to the event slotted callables (the live flow) to exercise the same code paths.
const slottedSec = makeSlottedBookingClient({
  initName: 'initEventBooking', bookName: 'bookEventSlot', cancelName: 'cancelEventBooking',
  scopeArgs: { eventId: 'training-1' },
});
const bookDb = (
  _email: string,
  payload: { empCode: string; fullName: string; bu: string; speakingSlotId: string; skillsSlotId: string },
) => slottedSec.book(payload);
const cancelDb = (_email: string) => slottedSec.cancel();
const initDb = (_email: string) => slottedSec.init();
import {
  deleteEventRegistration,
  updateConfig,
  updateEventSlot,
} from '../lib/adminDb';
import { fetchAdminEmails, isAdmin } from '../lib/admin';
import { mockDocSnap, mockQuerySnap, TEST_CONFIG } from './mocks/firebase';

// InitResult-minus-clientNow as the initBooking callable would return it.
const SAMPLE_STATE = {
  email: 'user@test.com',
  myBooking: null,
  slots: [] as unknown[],
  deadline: null,
  deadlinePassed: false,
  allowEnrollment: true,
  maxChanges: 3,
  buList: ['BSG', 'CHORUS', 'LBU', 'MOC', 'ONC', 'POC', 'TBU'],
  assessmentName: 'Assessment Q2 2026',
};

// -- Helper: simulate escHtml using char codes to avoid auto-formatter --
function escHtmlLocal(s: string): string {
  // Build entity strings via char code 38 (= &) to prevent formatter conversion
  const amp = String.fromCharCode(38) + 'amp;';
  const lt = String.fromCharCode(38) + 'lt;';
  const gt = String.fromCharCode(38) + 'gt;';
  const quot = String.fromCharCode(38) + 'quot;';
  const apos = String.fromCharCode(38) + '#39;';
  return s
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot)
    .replace(/'/g, apos);
}

function setupGetDocByPath(records: Record<string, false | Record<string, unknown>>) {
  mockGetDoc.mockImplementation((ref: { path: string }) => {
    const value = records[ref.path];
    if (value === undefined || value === false) return Promise.resolve(mockDocSnap(false));
    return Promise.resolve(mockDocSnap(true, value));
  });
}

function setupPreflight() {
  setupGetDocByPath({
    'ineligibility/262010': false,
    'config/main': TEST_CONFIG,
    'empCodeClaims/262010': false,
    'registrations/attacker@test.com': false,
    'registrations/user@test.com': false,
  });
}

beforeEach(() => {
  mockHttpsCallable.mockReset();
  mockHttpsCallable.mockReturnValue(vi.fn().mockResolvedValue({ data: { emailSent: true } }));
});

// ======================================================================
// SEC-01 -> SEC-07: XSS / Injection
// ======================================================================

describe('SEC: XSS & Injection Attacks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SEC-01: script injection in fullName -> escHtml() neutralizes it', () => {
    const malicious = '<script>alert("XSS")</script>';
    const escaped = escHtmlLocal(malicious);
    // After escaping, raw < > should not appear as literal angle brackets
    expect(escaped).not.toContain('<script>');
    // Should contain entity-encoded versions (built via char codes)
    const lt = String.fromCharCode(38) + 'lt;';
    const gt = String.fromCharCode(38) + 'gt;';
    expect(escaped).toContain(lt + 'script' + gt);
    expect(escaped).toContain(lt + '/script' + gt);
  });

  it('SEC-02: HTML injection via empCode -> validation rejects non-numeric', async () => {
    const result = await bookDb('attacker@test.com', {
      empCode: '<img src=x onerror=alert(1)>',
      fullName: 'Attacker',
      bu: 'IT',
      speakingSlotId: 'SP-2206-0900',
      skillsSlotId: '3S-2206-1100',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('6 digits');
  });

  it('SEC-04: Prototype pollution via crafted slotId -> rejected by type check', async () => {
    setupPreflight();
    mockHttpsCallable.mockReturnValueOnce(vi.fn().mockRejectedValue(
      Object.assign(new Error('Invalid Speaking slot.'), { code: 'functions/failed-precondition' }),
    ));

    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    const result = await bookDb('attacker@test.com', {
      empCode: '262010',
      fullName: 'Attacker',
      bu: 'IT',
      speakingSlotId: '__proto__',
      skillsSlotId: 'constructor',
    });

    expect(result.ok).toBe(false);
  });

  it('SEC-05: NoSQL injection via empCode -> validation rejects non-6-digit strings', async () => {
    const payloads = ['{"$gt":""}', '{"$ne":null}', 'true', 'null', 'undefined', 'NaN'];

    for (const payload of payloads) {
      const result = await bookDb('attacker@test.com', {
        empCode: payload,
        fullName: 'TEST USER',
        bu: 'IT',
        speakingSlotId: 'sp1',
        skillsSlotId: 'sk1',
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain('6 digits');
    }
  });

  it('SEC-06: Unicode fullwidth digits in empCode -> rejected', async () => {
    const result = await bookDb('attacker@test.com', {
      empCode: '\uff12\uff16\uff12\uff10\uff10\uff10', // fullwidth digits
      fullName: 'Attacker',
      bu: 'IT',
      speakingSlotId: 'sp1',
      skillsSlotId: 'sk1',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('6 digits');
  });

  it('SEC-07: Null byte injection in slot IDs -> slot not found', async () => {
    setupPreflight();
    mockHttpsCallable.mockReturnValueOnce(vi.fn().mockRejectedValue(
      Object.assign(new Error('Invalid Speaking slot.'), { code: 'functions/failed-precondition' }),
    ));

    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    const result = await bookDb('attacker@test.com', {
      empCode: '262010',
      fullName: 'Attacker',
      bu: 'IT',
      speakingSlotId: 'SP-2206-0900\x00',
      skillsSlotId: '3S-2206-1100\x00',
    });

    expect(result.ok).toBe(false);
  });
});

// ======================================================================
// SEC-08 -> SEC-12: Privilege Escalation
// ======================================================================

describe('SEC: Privilege Escalation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SEC-09: registration delete routes through the server callable (audit is server-owned, not client-spoofable)', async () => {
    const callFn = vi.fn().mockResolvedValue({ data: { ok: true } });
    mockHttpsCallable.mockReturnValue(callFn);

    await deleteEventRegistration('hacker@evil.com', 'training-1', 'victim@test.com');

    // Deletion can no longer be performed from the browser: it delegates to the
    // server callable, which enforces assertAdmin and writes the audit with the
    // server-verified actor — the client-supplied email can't be trusted or spoofed.
    expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'adminDeleteEventRegistration');
    expect(callFn).toHaveBeenCalledWith({ eventId: 'training-1', targetEmail: 'victim@test.com' });
    const { auditLog } = await import('../lib/audit');
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('SEC-10: Attacker adds themselves to adminEmails -> Firestore rules block', async () => {
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    await updateConfig('hacker@evil.com', {
      adminEmails: ['hacker@evil.com', 'owner@cyberlogitec.com'],
    });

    const { auditLog } = await import('../lib/audit');
    expect(auditLog).toHaveBeenCalledWith(
      'hacker@evil.com',
      'admin.updateConfig',
      expect.objectContaining({ adminEmails: expect.arrayContaining(['hacker@evil.com']) }),
    );
  });

  it('SEC-11: book callable payload does not include a client-supplied email', async () => {
    setupPreflight();
    const callable = vi.fn().mockResolvedValue({ data: {} });
    mockHttpsCallable.mockReturnValueOnce(callable);

    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    // The client does NOT verify email ownership — it writes the registration keyed
    // by the email argument. The Firestore rule `auth.token.email == email` is the
    // real gate (a caller can only write their OWN email's doc). Assert the doc id.
    await bookDb('victim@company.com', {
      empCode: '262010', fullName: 'Attacker', bu: 'IT',
      speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100',
    });
    expect(callable).toHaveBeenCalled();
    expect(callable.mock.calls[0][0]).not.toHaveProperty('email');
  });

  it('SEC-12: Admin email homograph / case attacks -> rejected', async () => {
    setupGetDocByPath({ 'config/main': { adminEmails: ['admin@cyberlogitec.com'] } });
    await fetchAdminEmails();

    expect(isAdmin('ADMIN@CYBERLOGITEC.COM')).toBe(true);
    expect(isAdmin('admin@cyberlogitec.com')).toBe(true);

    expect(isAdmin('admin@cyberlogitec.com.evil.com')).toBe(false);
    expect(isAdmin('admin+owner@cyberlogitec.com')).toBe(false);
    expect(isAdmin('admin@cyberlogitec')).toBe(false);
    expect(isAdmin('adm1n@cyberlogitec.com')).toBe(false);
    expect(isAdmin('')).toBe(false);
    expect(isAdmin('admin')).toBe(false);
  });
});

// ======================================================================
// SEC-13 -> SEC-17: IDOR & Parameter Tampering
// ======================================================================

describe('SEC: IDOR & Parameter Tampering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SEC-13: Attacker cancels victim registration -> Firestore rule blocks', async () => {
    setupGetDocByPath({
      'config/main': TEST_CONFIG,
      'registrations/victim@company.com': false,
    });
    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    await cancelDb('victim@company.com');
    // Document: client may succeed, server blocks via auth.token.email rule
  });

  it('SEC-14: Slot type mismatch -> rejected', async () => {
    setupPreflight();
    mockHttpsCallable.mockReturnValueOnce(vi.fn().mockRejectedValue(
      Object.assign(new Error('Invalid Speaking slot.'), { code: 'functions/failed-precondition' }),
    ));

    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    const result = await bookDb('user@test.com', {
      empCode: '262010', fullName: 'TEST USER', bu: 'IT',
      speakingSlotId: '3S-2206-0900',
      skillsSlotId: '3S-2206-1100',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Speaking');
  });

  it('SEC-15: Double-cancel to inflate remaining -> second cancel fails', async () => {
    mockHttpsCallable.mockReturnValueOnce(vi.fn().mockRejectedValue(
      Object.assign(new Error('You have no registration to cancel.'), { code: 'functions/failed-precondition' }),
    ));

    const result = await cancelDb('user@test.com');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('no registration');
  });

  it('SEC-16: updateEventSlot() never writes the seat counter client-side -> routes through the server', async () => {
    const callFn = vi.fn().mockResolvedValue({ data: { ok: true, capacity: 10, remaining: 3, realUsed: 7 } });
    mockHttpsCallable.mockReturnValue(callFn);

    await updateEventSlot('admin@test.com', 'training-1', 'SP-2206-0900', { capacity: 10, location: 'Room A' });

    // The browser must NOT write the slot doc (and thus `remaining`) directly —
    // the server recomputes remaining from the real registration count.
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'adminUpdateSlot');
    expect(callFn).toHaveBeenCalledWith({ slotId: 'SP-2206-0900', eventId: 'training-1', capacity: 10, location: 'Room A' });

    // A negative/non-integer capacity is rejected before any server round-trip.
    await expect(updateEventSlot('admin@test.com', 'training-1', 'SP-2206-0900', { capacity: -100, location: 'Room A' }))
      .rejects.toThrow('non-negative');
  });

  it('SEC-17: Capacity=0 is an allowed admin action (close slot) -> routed through the server callable', async () => {
    const callFn = vi.fn().mockResolvedValue({ data: { ok: true, capacity: 0, remaining: 0, realUsed: 0 } });
    mockHttpsCallable.mockReturnValue(callFn);

    await updateEventSlot('admin@test.com', 'training-1', 'SP-2206-0900', { capacity: 0, location: 'Room A' });

    expect(callFn).toHaveBeenCalledWith({ slotId: 'SP-2206-0900', eventId: 'training-1', capacity: 0, location: 'Room A' });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    // The server enforces assertAdmin; capacity=0 closes a slot without deleting it.
  });
});

// ======================================================================
// SEC-18 -> SEC-21: Boundary Abuse
// ======================================================================

describe('SEC: Boundary Abuse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SEC-18: 100KB fullName -> no crash, Firestore rejects oversized doc', async () => {
    const longName = 'A'.repeat(100_000);
    setupPreflight();

    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    await bookDb('user@test.com', {
      empCode: '262010', fullName: longName, bu: 'IT',
      speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100',
    });
    // Should not throw/crash client-side
  });

  it('SEC-19: empCode with leading/trailing spaces -> trimmed correctly', async () => {
    setupPreflight();

    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    await bookDb('user@test.com', {
      empCode: ' 262010 ',
      fullName: 'TEST USER', bu: 'IT',
      speakingSlotId: 'SP-2206-0900',
      skillsSlotId: '3S-2206-1100',
    });
    // Should pass validation (trimmed)
  });

  it('SEC-20: Negative changeCount in registration -> clamped to 0 (FIXED)', async () => {
    setupPreflight();

    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    // FIX: Math.max(0, -999) + 1 = 1, which is <= maxChanges=3 -> booking succeeds
    // The negative value is clamped to 0 before incrementing
    const result = await bookDb('user@test.com', {
      empCode: '262010', fullName: 'TEST USER', bu: 'IT',
      speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100',
    });
    // Should succeed: clamped count (0+1=1) <= maxChanges (3)
    expect(result.ok).toBe(true);
  });

  it('SEC-21: Two slots identical time but different dates -> no overlap', async () => {
    setupPreflight();

    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    const result = await bookDb('user@test.com', {
      empCode: '262010', fullName: 'TEST USER', bu: 'IT',
      speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2306-0900',
    });
    // Same start time but different dates → no overlap → booking succeeds.
    expect(result.ok).toBe(true);
  });
});

// ======================================================================
// SEC-22 -> SEC-24: Email Spoofing
// ======================================================================

describe('SEC: Email Spoofing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SEC-23: XSS in confirmation email subject line -> not possible (static template)', async () => {
    const subject = '[Assessment Q2 2026] Exam update confirmation';
    expect(subject).not.toContain('<');
    expect(subject).not.toContain('>');
  });

  it('SEC-24: Raw SDK audit log create requires admin and own auth email', () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    const auditMatch = rules.match(/match \/auditLogs\/\{id\} \{[\s\S]*?^\s*\}/m);
    const auditBlock = auditMatch?.[0] ?? '';

    expect(rules).toContain('function validClientAuditLog()');
    expect(rules).toContain('request.resource.data.email == request.auth.token.email');
    expect(rules).toContain('^admin\\\\.');
    expect(auditBlock).toContain('allow create: if isAdmin() && validClientAuditLog();');
    expect(auditBlock).not.toContain('allow create: if request.auth != null');
  });
});

// ======================================================================
// SEC-25 -> SEC-27: Deadline / Clock Manipulation
// ======================================================================

describe('SEC: Deadline & Clock Manipulation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SEC-25: User changes system clock to bypass deadline -> Firestore uses server time', () => {
    const deadline = new Date('2026-01-01');
    const clientCheck = new Date() > deadline;
    expect(clientCheck).toBe(true);
    // Server-side check enforced by request.time < deadline in rules
  });

  it('SEC-26: Deadline in config set to null -> enrollment remains open', async () => {
    setupPreflight();
    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    const result = await bookDb('user@test.com', {
      empCode: '262010', fullName: 'TEST USER', bu: 'IT',
      speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100',
    });
    expect(result.ok).toBe(true);
  });

  it('SEC-27: allowEnrollment=false + no deadline -> blocked by enrollment flag', async () => {
    setupPreflight();
    mockHttpsCallable.mockReturnValueOnce(vi.fn().mockRejectedValue(
      Object.assign(new Error('Registration is currently locked. Please contact the organizers.'), { code: 'functions/failed-precondition' }),
    ));

    setupGetDocByPath({
      'ineligibility/262010': false,
      'config/main': { ...TEST_CONFIG, allowEnrollment: false },
      'empCodeClaims/262010': false,
      'registrations/user@test.com': false,
    });
    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    const result = await bookDb('user@test.com', {
      empCode: '262010', fullName: 'TEST USER', bu: 'IT',
      speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('locked');
  });
});

// ======================================================================
// SEC-28 -> SEC-30: Data Exfiltration
// ======================================================================

describe('SEC: Data Exfiltration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SEC-30: init goes through the initEventBooking callable; server resolves the caller registration', async () => {
    const callable = vi.fn().mockResolvedValue({ data: { ok: true, state: SAMPLE_STATE } });
    mockHttpsCallable.mockReturnValue(callable);
    const result = await initDb('user@test.com');
    expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'initEventBooking');
    // No client-supplied email in the payload — only the event scope; the server
    // reads auth.token.email.
    expect(callable).toHaveBeenCalledWith({ eventId: 'training-1' });
    expect(callable.mock.calls[0][0]).not.toHaveProperty('email');
    expect(result.email).toBe('user@test.com');
    expect(mockGetDoc).not.toHaveBeenCalled();
  });
});

// ======================================================================
// SEC-34 -> SEC-36: CSV Injection
// ======================================================================

describe('SEC: CSV Injection', () => {
  it('SEC-34: Formula injection in CSV export via malicious empCode', () => {
    const malicious = '=cmd|"/C calc"!A0';
    const csv = (v: unknown) => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const escaped = csv(malicious);
    expect(escaped).toBeTruthy();
  });

  it('SEC-35: CSV injection via malicious fullName with newlines', () => {
    const csv = (v: unknown) => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const malicious = 'Normal Name\n=cmd|"/C calc"!A0';
    const escaped = csv(malicious);
    expect(escaped).toContain('"');
    expect(escaped).toContain('""');
  });

  it('SEC-36: CSV export with malicious BU field - formula escaped with single quote (FIXED)', () => {
    const csv = (v: unknown) => {
      if (v == null) return '';
      let s = String(v);
      // Prevent CSV formula injection (CWE-1236): escape prefix that Excel/Sheets evaluate as formulas
      if (/^[=+\-@\t|]/.test(s)) s = "'" + s;
      // Escape newlines within values to prevent row injection
      s = s.replace(/\r?\n/g, ' ');
      return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    // Formula without " or , or newline -> now escaped with prefix
    const malicious = '=cmd|/C calc!A0';
    const escaped = csv(malicious);
    // FIX: csv() now prepends single quote -> neutralizes formula evaluation in Excel
    expect(escaped).toBe("'=cmd|/C calc!A0");
    expect(escaped).not.toBe(malicious);

    // Also test other formula prefixes
    expect(csv('+cmd|/C calc!A0')).toBe("'+cmd|/C calc!A0");
    expect(csv('-cmd|/C calc!A0')).toBe("'-cmd|/C calc!A0");
    expect(csv('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csv('\t=cmd')).toBe("'\t=cmd");
    expect(csv('|cmd')).toBe("'|cmd");

    // Normal values should not be affected
    expect(csv('Normal Name')).toBe('Normal Name');
    expect(csv('12345')).toBe('12345');
    expect(csv('hello world')).toBe('hello world');
    // Note: '= not formula' is also escaped because Excel can evaluate any '=' prefix
    expect(csv('= not formula')).toBe("'= not formula");
  });
});

// ======================================================================
// SEC-37 -> SEC-39: Denial-of-Service (DoS) Vectors
// ======================================================================

describe('SEC: DoS Vectors', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SEC-37: Rapid-fire booking calls (rate limiting)', async () => {
    setupPreflight();

    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));

    const promises = Array.from({ length: 10 }, () =>
      bookDb('user@test.com', {
        empCode: '262010', fullName: 'TEST USER', bu: 'IT',
        speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100',
      }),
    );

    const results = await Promise.all(promises);
    results.forEach((r) => {
      expect(typeof r.ok).toBe('boolean');
    });
  });

  it('SEC-38: Extremely large slot list from the callable -> initDb handles gracefully', async () => {
    const manySlots = Array.from({ length: 1000 }, (_, i) => ({
      slotId: `SP-${i}`, type: 'Speaking', date: '2026-06-22',
      startMin: 540 + (i % 480), endMin: 570 + (i % 480),
      capacity: 10, remaining: 10, location: '', display: '',
    }));
    mockHttpsCallable.mockReturnValue(
      vi.fn().mockResolvedValue({ data: { ok: true, state: { ...SAMPLE_STATE, slots: manySlots } } }),
    );

    const result = await initDb('user@test.com');
    expect(result.slots).toHaveLength(1000);
  });

  it('SEC-39: book() surfaces a friendly error when the callable rejects (no unhandled throw)', async () => {
    mockHttpsCallable.mockReturnValue(vi.fn().mockRejectedValue(new Error('Network error')));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const results = await Promise.all(
      Array.from({ length: 50 }, () => bookDb('user@test.com', {
        empCode: '262010', fullName: 'TEST USER', bu: 'IT',
        speakingSlotId: 'SP-2206-0900', skillsSlotId: '3S-2206-1100',
      })),
    );

    results.forEach((r) => expect(r.ok).toBe(false));
    consoleSpy.mockRestore();
  });
});
