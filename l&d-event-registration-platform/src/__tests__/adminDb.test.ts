import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase module BEFORE importing adminDb.ts ──
vi.mock('../lib/firestore-db', () => ({ db: {} }));
vi.mock('../lib/firebase', () => ({ db: {}, functions: {}, app: {} }));

const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockGetCountFromServer = vi.fn();
const mockAddDoc = vi.fn();
const mockRunTransaction = vi.fn();
const mockHttpsCallable = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn();

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: any[]) => mockAddDoc(...args),
  collection: vi.fn((_db: any, ...segs: string[]) => ({ path: segs.join('/') })),
  doc: vi.fn((_db: any, ...segs: string[]) => ({ path: segs.join('/') })),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  getCountFromServer: (...args: any[]) => mockGetCountFromServer(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  writeBatch: vi.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit })),
  runTransaction: (_db: any, fn: any) => mockRunTransaction(fn),
  query: vi.fn((...args: any[]) => args),
  where: vi.fn(),
  orderBy: vi.fn((field: string) => ({ orderBy: field })),
  startAfter: vi.fn((cursor: unknown) => ({ startAfter: cursor })),
  documentId: vi.fn(() => '__name__'),
  limit: vi.fn((n: number) => ({ limit: n })),
  deleteField: () => 'DELETE_FIELD',
  serverTimestamp: () => 'SERVER_TIMESTAMP',
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

import {
  generateSlotId,
  listRegistrationsPage,
  updateConfig,
  makeEventIneligibilityApi,
  makePermanentBlockApi,
  deleteEvent,
  reconcileEventCapacity,
} from '../lib/adminDb';
import { mockQuerySnap, TEST_REGISTRATION } from './mocks/firebase';

// ═══════════════════════════════════════════════════════════════════════════
// UC-AD04: generateSlotId() — Generate deterministic slot ID
// ═══════════════════════════════════════════════════════════════════════════
describe('generateSlotId()', () => {
  it('UC-AD04: generates correct ID for Speaking type', () => {
    expect(generateSlotId('Speaking', '2026-06-22', 540)).toBe('SP-2206-0900');
  });

  it('UC-AD05: generates correct ID for 3 Skills type', () => {
    expect(generateSlotId('3 Skills', '2026-06-22', 660)).toBe('3S-2206-1100');
  });

  it('UC-AD06: generates correct ID for afternoon slot', () => {
    expect(generateSlotId('Speaking', '2026-06-23', 780)).toBe('SP-2306-1300');
  });
});

describe('listRegistrationsPage()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns one page plus total registration count', async () => {
    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([
      { id: 'user@test.com', data: () => TEST_REGISTRATION },
    ]));
    mockGetCountFromServer.mockResolvedValueOnce({ data: () => ({ count: 42 }) });

    const result = await listRegistrationsPage();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].email).toBe('user@test.com');
    expect(result.total).toBe(42);
    expect(result.nextCursor).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UC-AD19: updateConfig() — Update system configuration
// ═══════════════════════════════════════════════════════════════════════════
describe('updateConfig()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('UC-AD20: can update adminEmails list', async () => {
    await updateConfig('admin@test.com', { adminEmails: ['a@test.com', 'b@test.com'] });
    expect(mockUpdateDoc).toHaveBeenCalledOnce();
    const [docRef, payload] = mockUpdateDoc.mock.calls[0];
    expect(docRef.path).toContain('config/main');
    expect(payload.adminEmails).toEqual(['a@test.com', 'b@test.com']);
  });

  it('UC-AD21: can update the BU list', async () => {
    await updateConfig('admin@test.com', { buList: ['BSG', 'CHORUS'] });
    const [, payload] = mockUpdateDoc.mock.calls[0];
    expect(payload.buList).toEqual(['BSG', 'CHORUS']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UC-AD23: makeEventIneligibilityApi() — per-event blocklist (event-scoped path)
// ═══════════════════════════════════════════════════════════════════════════
describe('makeEventIneligibilityApi()', () => {
  beforeEach(() => vi.clearAllMocks());
  const api = () => makeEventIneligibilityApi('admin@test.com', 'training-2026');

  it('UC-AD23: list() returns mapped entries', async () => {
    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([
      { id: '262010', data: () => ({ reason: 'Less than 12 months since last test' }) },
    ]));
    const result = await api().list();
    expect(result).toHaveLength(1);
    expect(result[0].empCode).toBe('262010');
    expect(result[0].reason).toBe('Less than 12 months since last test');
  });

  it('UC-AD24: list() returns empty array when none', async () => {
    mockGetDocs.mockResolvedValueOnce(mockQuerySnap([]));
    expect(await api().list()).toEqual([]);
  });

  it('UC-AD25: upsert() writes to the EVENT-scoped path with reason', async () => {
    await api().upsert('262010', { reason: 'Less than 12 months since last test' });
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const [docRef, payload, options] = mockSetDoc.mock.calls[0];
    expect(docRef.path).toBe('events/training-2026/ineligibility/262010');
    expect(payload.reason).toBe('Less than 12 months since last test');
    expect(options.merge).toBe(true);
  });

  it('UC-AD26: upsert() throws when empCode is not 6 digits', async () => {
    await expect(api().upsert('12345', { reason: 'test' })).rejects.toThrow('6 digits');
  });

  it('UC-AD27: upsert() throws when reason is empty', async () => {
    await expect(api().upsert('262010', { reason: '' })).rejects.toThrow('reason');
  });

  it('UC-AD28: upsert() includes optional email (lowercased) and fullName', async () => {
    await api().upsert('262010', { reason: 'test', email: 'TEST@company.com', fullName: 'Nguyen Van A' });
    const [, payload] = mockSetDoc.mock.calls[0];
    expect(payload.email).toBe('test@company.com');
    expect(payload.fullName).toBe('Nguyen Van A');
  });

  it('UC-AD28B: bulkUpsert() writes each entry to the event-scoped path', async () => {
    mockBatchCommit.mockResolvedValueOnce(undefined);
    const result = await api().bulkUpsert([
      { empCode: '262010', reason: 'Less than 12 months since last test', email: 'USER@company.com' },
      { empCode: '262011', reason: 'Start date too late', fullName: 'Nguyen Van B' },
    ]);
    expect(result.count).toBe(2);
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    expect(mockBatchSet.mock.calls[0][0].path).toBe('events/training-2026/ineligibility/262010');
    expect(mockBatchSet.mock.calls[0][1]).toMatchObject({
      reason: 'Less than 12 months since last test',
      email: 'user@company.com',
    });
    expect(mockBatchSet.mock.calls[1][0].path).toBe('events/training-2026/ineligibility/262011');
    expect(mockBatchSet.mock.calls[1][1]).toMatchObject({
      reason: 'Start date too late',
      fullName: 'Nguyen Van B',
    });
    expect(mockBatchCommit).toHaveBeenCalledOnce();
  });

  it('UC-AD28C: bulkUpsert() throws when a bulk empCode is invalid', async () => {
    await expect(api().bulkUpsert([{ empCode: '12345', reason: 'test' }])).rejects.toThrow('6 digits');
    expect(mockBatchSet).not.toHaveBeenCalled();
  });

  it('UC-AD29: remove() deletes the event-scoped document', async () => {
    await api().remove('262010');
    expect(mockDeleteDoc).toHaveBeenCalledOnce();
    expect(mockDeleteDoc.mock.calls[0][0].path).toBe('events/training-2026/ineligibility/262010');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UC-AD29P: makePermanentBlockApi() — global permanent block (top-level path)
// ═══════════════════════════════════════════════════════════════════════════
describe('makePermanentBlockApi()', () => {
  beforeEach(() => vi.clearAllMocks());
  const api = () => makePermanentBlockApi('admin@test.com');

  it('UC-AD29P: upsert() writes to the GLOBAL /permanentBlock path', async () => {
    await api().upsert('262010', { reason: 'No longer employed at the company.' });
    const [docRef, payload, options] = mockSetDoc.mock.calls[0];
    expect(docRef.path).toBe('permanentBlock/262010');
    expect(payload.reason).toBe('No longer employed at the company.');
    expect(options.merge).toBe(true);
  });

  it('UC-AD29Q: remove() deletes the global document', async () => {
    await api().remove('262010');
    expect(mockDeleteDoc.mock.calls[0][0].path).toBe('permanentBlock/262010');
  });
});

describe('deleteEvent()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpsCallable.mockReset();
  });

  it('UC-AD31: delegates to the adminDeleteEvent callable with eventId', async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { ok: true, eventId: 'training-1', deleted: { events: 1 } },
    });
    mockHttpsCallable.mockReturnValue(callable);

    const result = await deleteEvent('admin@test.com', 'training-1');

    expect(result.ok).toBe(true);
    expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'adminDeleteEvent');
    expect(callable).toHaveBeenCalledWith({ eventId: 'training-1' });
  });
});

describe('reconcileEventCapacity()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpsCallable.mockReset();
  });

  it('delegates to the adminReconcileEventCapacity callable', async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { ok: true, checked: 1, reconciled: [], skipped: [] },
    });
    mockHttpsCallable.mockReturnValue(callable);

    const result = await reconcileEventCapacity('admin@test.com');

    expect(result.ok).toBe(true);
    expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'adminReconcileEventCapacity');
    expect(callable).toHaveBeenCalledWith({});
  });
});
