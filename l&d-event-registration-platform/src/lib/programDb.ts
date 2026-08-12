// Client data layer for the Pronunciation Program (PIC-facing). initProgram loads the
// grid state; book/move/cancel go through the server callables. Errors are caught and
// returned as { ok:false, error } so the screen can toast a friendly message — same
// shape as eventsDb's EventActionResult.
import { callable } from './callable';
import type { ProgramInitResult, ProgramActionResult } from './types';

type RawState = Omit<ProgramInitResult, 'clientNow'>;

/** Stamp clientNow locally (the server omits it, like buildEventsState). */
function stamp(state: RawState | undefined): ProgramInitResult | undefined {
  return state ? ({ ...state, clientNow: new Date().toISOString() } as ProgramInitResult) : undefined;
}

export async function initProgram(): Promise<ProgramInitResult> {
  const res = await callable<Record<string, never>, { ok: boolean; state: RawState }>('initProgram', {});
  return stamp(res.state)!;
}

export interface BookSessionInput {
  classCode: string;
  date: string;
  startMin: number;
  endMin: number;
  topic?: string;
}

export interface MoveSessionInput extends Omit<BookSessionInput, 'classCode'> {
  sessionId: string;
}

type RawActionResult = { ok: boolean; warning?: string | null; state?: RawState };

async function action(name: string, args: unknown): Promise<ProgramActionResult> {
  try {
    const res = await callable<unknown, RawActionResult>(name, args);
    return { ok: res.ok !== false, warning: res.warning ?? null, state: stamp(res.state) };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'Operation failed.' };
  }
}

export function bookSession(input: BookSessionInput): Promise<ProgramActionResult> {
  return action('bookProgramSession', input);
}

export function moveSession(input: MoveSessionInput): Promise<ProgramActionResult> {
  return action('moveProgramSession', input);
}

export function cancelSession(sessionId: string): Promise<ProgramActionResult> {
  return action('cancelProgramSession', { sessionId });
}
