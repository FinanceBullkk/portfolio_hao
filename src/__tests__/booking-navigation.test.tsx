import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InitResult, Slot } from '../lib/types';

// ── Hoisted mock fns (configurable per test) ───────────────────────────────
const h = vi.hoisted(() => ({
  initDb: vi.fn(),
  bookDb: vi.fn(),
  cancelDb: vi.fn(),
  checkIneligibility: vi.fn(),
  onAuth: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
  fetchAdminEmails: vi.fn(),
  isAdmin: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
  onAuth: h.onAuth,
  signInWithGoogle: h.signInWithGoogle,
  signOutUser: h.signOutUser,
}));
vi.mock('../lib/admin', () => ({
  fetchAdminEmails: h.fetchAdminEmails,
  isAdmin: h.isAdmin,
}));

import { App } from '../App';
import { BookingFlow } from '../booking/booking-flow';
import { ConfirmProvider } from '../confirm-toast-provider';

// The assessment BookingFlow is now the archived slotted flow (App's default
// screen pivoted to EventsFlow). These navigation tests still cover that flow by
// rendering BookingFlow directly via a small stateful harness, instead of going
// through App. AUTH-1 keeps using <App> because it tests the app-level auth gate.
function BookingHarness({ initial }: { initial: InitResult }) {
  const [data, setData] = useState(initial);
  return (
    <ConfirmProvider>
      <BookingFlow
        data={data}
        setData={setData}
        canAdmin={false}
        skew={0}
        onOpenAdmin={() => {}}
        onSignOut={() => {}}
        api={{ book: h.bookDb, cancel: h.cancelDb, checkIneligibility: h.checkIneligibility }}
      />
    </ConfirmProvider>
  );
}

// ── Fixtures ───────────────────────────────────────────────────────────────
const SP: Slot = {
  slotId: 'SP1', type: 'Speaking', date: '2026-06-22', startMin: 540, endMin: 600,
  capacity: 10, remaining: 8, location: 'Room A', display: 'SP1',
};
const SK: Slot = {
  slotId: 'SK1', type: '3 Skills', date: '2026-06-22', startMin: 660, endMin: 840,
  capacity: 15, remaining: 12, location: 'Room B', display: 'SK1',
};

const BOOKED: InitResult = {
  email: 'user@cyberlogitec.com',
  myBooking: {
    empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG',
    speakingSlotId: 'SP1', skillsSlotId: 'SK1',
    createdAt: '2026-05-01T00:00:00Z', updatedAt: null, changeCount: 0,
  },
  slots: [SP, SK],
  deadline: null,
  deadlinePassed: false,
  allowEnrollment: true,
  clientNow: new Date().toISOString(),
  maxChanges: 3,
  buList: ['BSG', 'CHORUS', 'LBU', 'MOC', 'ONC', 'POC', 'TBU'],
  assessmentName: 'Assessment Q2 2026',
};

const FRESH: InitResult = { ...BOOKED, myBooking: null };

beforeEach(() => {
  vi.clearAllMocks();
  h.onAuth.mockImplementation((cb: (u: unknown) => void) => {
    cb({ email: 'user@cyberlogitec.com' });
    return () => {};
  });
  h.isAdmin.mockReturnValue(false);
  h.fetchAdminEmails.mockResolvedValue([]);
  h.checkIneligibility.mockResolvedValue(null);
});

// ═══════════════════════════════════════════════════════════════════════════
// Reproduce: "change slots" → back to Step 1 should retain Step-1 form fields.
// ═══════════════════════════════════════════════════════════════════════════
describe('Booking navigation — step-1 form retention', () => {
  it('AUTH-1: blocks signed-in Google accounts outside cyberlogitec.com', async () => {
    h.onAuth.mockImplementation((cb: (u: unknown) => void) => {
      cb({ email: 'user@gmail.com' });
      return () => {};
    });

    render(<App />);

    await screen.findByText('Invalid account');
    expect(screen.getAllByText(/@cyberlogitec\.com/).length).toBeGreaterThan(0);
    expect(h.initDb).not.toHaveBeenCalled();
  });

  // Identity is captured once in the profile, so Step 1 is a CONFIRM SUMMARY
  // (no inputs). These tests verify the summary shows the right person and that
  // it survives the Step 2 ⇄ Step 1 round-trip.
  const FRESH_WITH_PROFILE: InitResult = {
    ...FRESH,
    profile: { empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' },
  };

  it('NAV-1: editing an existing booking, back to Step 1 shows the identity summary (no inputs)', async () => {
    const user = userEvent.setup();
    render(<BookingHarness initial={BOOKED} />);

    // Lands on display
    await screen.findByText('Your exam schedule');

    // "↻ Change slots" → Step 2 calendar
    await user.click(screen.getByRole('button', { name: /Change slots/ }));
    await screen.findByText('Choose your 2 exam slots');

    // "← Edit details" → Step 1 confirm summary
    await user.click(screen.getByRole('button', { name: /Edit details/ }));
    await screen.findByText('Confirm your details');

    expect(screen.getByText('NGUYEN VAN A')).toBeInTheDocument();
    expect(screen.getByText(/262010.*BSG/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 262010')).not.toBeInTheDocument();
  });

  it('NAV-3: after cancelling, the auto-returned Step 1 still shows the same identity', async () => {
    h.cancelDb.mockResolvedValue({ ok: true, state: { ...BOOKED, myBooking: null } });
    const user = userEvent.setup();
    render(<BookingHarness initial={BOOKED} />);

    await screen.findByText('Your exam schedule');

    // ⋮ Options → 🗑 Cancel registration → confirm dialog
    await user.click(screen.getByRole('button', { name: /Options/ }));
    await user.click(screen.getByRole('menuitem', { name: /Cancel registration/ }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /Cancel registration/ }));

    // App auto-returns to Step 1 (the confirm summary), identity intact
    await screen.findByText('Confirm your details');
    expect(screen.getByText('NGUYEN VAN A')).toBeInTheDocument();
    expect(screen.getByText(/262010.*BSG/)).toBeInTheDocument();
  });

  it('NAV-2: fresh enrollment, Step 2 → back to Step 1 keeps the confirmed identity', async () => {
    const user = userEvent.setup();
    render(<BookingHarness initial={FRESH_WITH_PROFILE} />);

    await screen.findByText('Confirm your details');
    expect(screen.getByText(/262010.*BSG/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await screen.findByText('Choose your 2 exam slots');

    await user.click(screen.getByRole('button', { name: /Edit details/ }));
    await screen.findByText('Confirm your details');

    expect(screen.getByText('NGUYEN VAN A')).toBeInTheDocument();
    expect(screen.getByText(/262010.*BSG/)).toBeInTheDocument();
  });

  it('NAV-4: fresh slotted event shows the identity from the saved user profile', async () => {
    render(<BookingHarness initial={FRESH_WITH_PROFILE} />);

    await screen.findByText('Confirm your details');

    expect(screen.getByText('NGUYEN VAN A')).toBeInTheDocument();
    expect(screen.getByText(/262010.*BSG/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 262010')).not.toBeInTheDocument();
  });
});
