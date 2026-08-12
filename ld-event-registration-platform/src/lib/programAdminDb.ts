// Admin operations on /programs/pronunciation (Pronunciation Program vertical).
// Reads are done client-side where firestore.rules allow admins; every write goes
// through a server callable (Admin SDK) so shape validation + the blackout guard run
// server-side. Mirrors admin-events.ts.
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firestore-db';
import { callable } from './callable';
import type { ProgramClass, ProgramSession } from './types';

// Single program for now (one trainer). Mirror of PRONUNCIATION_PROGRAM_ID on the server.
export const PROGRAM_ID = 'pronunciation';
const base = `programs/${PROGRAM_ID}`;

export interface ProgramSlotConfig { sh: number; sm: number; eh: number; em: number }

/** Raw, editable program config (as HR edits it — slots stay in {sh,sm,eh,em} form). */
export interface ProgramAdminConfig {
  trainerName: string;
  timeSlots: ProgramSlotConfig[];
  weekdays: number[];
  openMonth: string | null;
  deadline: string | null; // ISO
  fillMode: boolean;
  monthlyCap: number;
  weeklyCap: number;
  emailConfirm: boolean; // email the PIC on book/move/cancel
}

const DEFAULT_CONFIG: ProgramAdminConfig = {
  trainerName: '', timeSlots: [], weekdays: [1, 2, 3, 4, 5],
  openMonth: null, deadline: null, fillMode: false, monthlyCap: 4, weeklyCap: 1, emailConfirm: false,
};

export async function loadProgramConfig(): Promise<ProgramAdminConfig> {
  const snap = await getDoc(doc(db, base));
  if (!snap.exists()) return { ...DEFAULT_CONFIG };
  const d = snap.data();
  return {
    trainerName: typeof d.trainerName === 'string' ? d.trainerName : '',
    timeSlots: Array.isArray(d.timeSlots) ? (d.timeSlots as ProgramSlotConfig[]) : [],
    weekdays: Array.isArray(d.weekdays) ? d.weekdays.map(Number) : [1, 2, 3, 4, 5],
    openMonth: typeof d.openMonth === 'string' ? d.openMonth : null,
    deadline: typeof d.deadline === 'string' ? d.deadline : null,
    fillMode: d.fillMode === true,
    monthlyCap: Number.isInteger(d.monthlyCap) ? d.monthlyCap : 4,
    weeklyCap: Number.isInteger(d.weeklyCap) ? d.weeklyCap : 1,
    emailConfirm: d.emailConfirm === true,
  };
}

export async function listProgramClasses(): Promise<ProgramClass[]> {
  const snap = await getDocs(collection(db, base, 'classes'));
  return snap.docs
    .map((s) => {
      const d = s.data();
      return {
        code: s.id,
        name: typeof d.name === 'string' ? d.name : '',
        bu: typeof d.bu === 'string' ? d.bu : '',
        picEmail: typeof d.picEmail === 'string' ? d.picEmail : '',
        expectedSize: Number.isInteger(d.expectedSize) ? d.expectedSize : null,
        active: d.active !== false,
      } satisfies ProgramClass;
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export interface ProgramBlackout { date: string; startMin: number }

export async function listProgramBlackouts(): Promise<ProgramBlackout[]> {
  const snap = await getDocs(collection(db, base, 'blackouts'));
  return snap.docs.map((s) => {
    const d = s.data();
    return { date: String(d.date ?? ''), startMin: Number(d.startMin ?? 0) };
  });
}

function mapSession(id: string, d: Record<string, unknown>): ProgramSession {
  return {
    sessionId: id,
    classCode: String(d.classCode ?? ''),
    courseName: String(d.courseName ?? ''),
    bu: String(d.bu ?? ''),
    picEmail: String(d.picEmail ?? ''),
    date: String(d.date ?? ''),
    startMin: Number(d.startMin ?? 0),
    endMin: Number(d.endMin ?? 0),
    mode: 'offline',
    participantCount: Number.isInteger(d.participantCount) ? (d.participantCount as number) : null,
    topic: String(d.topic ?? ''),
    meetLink: String(d.meetLink ?? ''),
    gcalEventId: String(d.gcalEventId ?? ''),
    sequence: null, // derived client-side (assignSequenceByClass) — not stored
    display: '',
  } satisfies ProgramSession;
}

/** Sessions in a month — lets the blackout UI show which cells are already booked. */
export async function listProgramSessionsForMonth(month: string): Promise<ProgramSession[]> {
  const snap = await getDocs(query(collection(db, base, 'sessions'), where('month', '==', month)));
  return snap.docs.map((s) => mapSession(s.id, s.data()));
}

/** Every session in the program — the admin Schedule loads all so the #N order per class
 *  is global (matches what each PIC sees), not restricted to one month. */
export async function listAllProgramSessions(): Promise<ProgramSession[]> {
  const snap = await getDocs(collection(db, base, 'sessions'));
  return snap.docs.map((s) => mapSession(s.id, s.data()));
}

// ── Writes (server callables) ─────────────────────────────────────────────────

export function upsertProgramConfig(input: ProgramAdminConfig): Promise<{ ok: boolean }> {
  return callable('adminUpsertProgramConfig', input);
}

export interface UpsertClassInput {
  code: string; name: string; bu: string; picEmail: string;
  expectedSize: number | null; active: boolean;
}

export function upsertProgramClass(input: UpsertClassInput): Promise<{ ok: boolean; code: string }> {
  return callable('adminUpsertProgramClass', input);
}

export function deleteProgramClass(code: string): Promise<{ ok: boolean; code: string }> {
  return callable('adminDeleteProgramClass', { code });
}

export function setProgramBlackout(date: string, startMin: number): Promise<{ ok: boolean }> {
  return callable('adminSetProgramBlackout', { date, startMin });
}

export function unsetProgramBlackout(date: string, startMin: number): Promise<{ ok: boolean }> {
  return callable('adminUnsetProgramBlackout', { date, startMin });
}

/** Block every configured slot on a date in one call. `skippedSlots` = booked starts. */
export function setProgramBlackoutDay(date: string): Promise<{ ok: boolean; blocked: number; skippedSlots: number[] }> {
  return callable('adminSetProgramBlackoutDay', { date });
}

/** Re-open a whole day (delete every blackout on that date). */
export function unsetProgramBlackoutDay(date: string): Promise<{ ok: boolean; removed: number }> {
  return callable('adminUnsetProgramBlackoutDay', { date });
}
