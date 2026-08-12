import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgramBookDrawer } from '../program/program-book-drawer';
import type { ProgramConfig, ProgramSession } from '../lib/types';

// Audit P1-7: the book/move drawer must warn — and block — when the chosen slot
// clashes with another of the PIC's own sessions (a trainer can't run two 1:1s).

const program: ProgramConfig = {
  trainerName: 'Trainer', weekdays: [1, 2, 3, 4, 5], openMonth: null, deadline: null,
  fillMode: false, monthlyCap: 8, weeklyCap: 2,
  timeSlots: [
    { startMin: 540, endMin: 570, label: '09:00–09:30' },
    { startMin: 600, endMin: 630, label: '10:00–10:30' },
  ],
};

function session(over: Partial<ProgramSession>): ProgramSession {
  return {
    sessionId: 'sess-1', classCode: 'EL001', courseName: 'Foundation', bu: 'BSG',
    picEmail: 'pic@cyberlogitec.com', date: '2026-06-29', startMin: 540, endMin: 570,
    mode: 'offline', participantCount: null, topic: '', meetLink: '', gcalEventId: '', sequence: 1, display: '',
    ...over,
  };
}

describe('ProgramBookDrawer — schedule-clash guard (P1-7)', () => {
  it('warns and disables Save when the moved session overlaps another of mine', () => {
    const moving = session({ sessionId: 'sess-1', classCode: 'EL001', startMin: 540 });
    const other = session({ sessionId: 'sess-2', classCode: 'EL002', startMin: 540 }); // same slot/date
    render(
      <ProgramBookDrawer
        program={program}
        manage={moving}
        mySessions={[moving, other]}
        busy={false}
        onBook={() => {}}
        onMove={vi.fn()}
        onCancel={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/already have/i);
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeDisabled();
  });

  it('allows Save when there is no clash', () => {
    const moving = session({ sessionId: 'sess-1', startMin: 540 });
    const other = session({ sessionId: 'sess-2', classCode: 'EL002', startMin: 600 }); // different slot
    render(
      <ProgramBookDrawer
        program={program}
        manage={moving}
        mySessions={[moving, other]}
        busy={false}
        onBook={() => {}}
        onMove={vi.fn()}
        onCancel={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save changes/ })).not.toBeDisabled();
  });

  it('shows Class as a read-only "fixed" info row, not an input', () => {
    const moving = session({});
    render(
      <ProgramBookDrawer
        program={program}
        manage={moving}
        mySessions={[moving]}
        busy={false}
        onBook={() => {}}
        onMove={() => {}}
        onCancel={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/fixed/)).toBeInTheDocument();
    // Class value is plain text — there is no textbox carrying the class code.
    expect(screen.queryByRole('textbox', { name: /class/i })).not.toBeInTheDocument();
  });
});

// Booking is class + cell only (Topic removed). The class is chosen in the drawer:
// fixed when there's one option, a picker when a multi-class PIC / HR must choose.
describe('ProgramBookDrawer — create (class picker, no Topic)', () => {
  const cell = { date: '2026-06-29', startMin: 540, endMin: 570 };

  it('one class → fixed, no Topic field, Book enabled', () => {
    render(
      <ProgramBookDrawer
        program={program} create={cell} classes={[{ code: 'EL001', name: 'Foundation' }]}
        busy={false} onBook={vi.fn()} onMove={() => {}} onCancel={() => {}} onClose={() => {}}
      />,
    );
    expect(screen.getByText(/fixed/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/greetings/i)).not.toBeInTheDocument(); // Topic input gone
    expect(screen.getByRole('button', { name: /Book session/ })).not.toBeDisabled();
  });

  it('many classes → picker shown, Book blocked until one is chosen, then books that class', () => {
    const onBook = vi.fn();
    render(
      <ProgramBookDrawer
        program={program} create={cell}
        classes={[{ code: 'EL001', name: 'Foundation' }, { code: 'EL002', name: 'Advanced' }]}
        busy={false} onBook={onBook} onMove={() => {}} onCancel={() => {}} onClose={() => {}}
      />,
    );
    const picker = screen.getByRole('combobox', { name: /class/i });
    expect(screen.getByRole('button', { name: /Book session/ })).toBeDisabled(); // nothing chosen yet
    fireEvent.change(picker, { target: { value: 'EL002' } });
    const book = screen.getByRole('button', { name: /Book session/ });
    expect(book).not.toBeDisabled();
    fireEvent.click(book);
    expect(onBook).toHaveBeenCalledWith({ classCode: 'EL002', date: '2026-06-29', startMin: 540, endMin: 570 });
  });

  it('defaultClassCode pre-selects a class for a multi-class PIC (Book ready)', () => {
    render(
      <ProgramBookDrawer
        program={program} create={cell} defaultClassCode="EL002"
        classes={[{ code: 'EL001', name: 'Foundation' }, { code: 'EL002', name: 'Advanced' }]}
        busy={false} onBook={vi.fn()} onMove={() => {}} onCancel={() => {}} onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /Book session/ })).not.toBeDisabled();
  });

  it('manage + showOwner → renders the PIC owner row (admin context)', () => {
    render(
      <ProgramBookDrawer
        program={program} manage={session({ picEmail: 'hao.nha@cyberlogitec.com' })} showOwner
        mySessions={[]} busy={false} onBook={() => {}} onMove={() => {}} onCancel={() => {}} onClose={() => {}}
      />,
    );
    expect(screen.getByText('hao.nha@cyberlogitec.com')).toBeInTheDocument();
  });
});
