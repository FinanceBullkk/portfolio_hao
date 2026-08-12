import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventsInitResult } from '../lib/types';

// ── Hoisted mock fns ────────────────────────────────────────────────────────
const h = vi.hoisted(() => ({
  initEvents: vi.fn(),
  saveMyProfile: vi.fn(),
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
vi.mock('../lib/eventsDb', () => ({
  initEvents: h.initEvents,
  registerForEventDb: vi.fn(),
  cancelEventRegistrationDb: vi.fn(),
  listMyRegistrationsDb: vi.fn(),
}));
vi.mock('../lib/profileDb', () => ({ saveMyProfile: h.saveMyProfile }));

import { App } from '../App';

// The BU list changed between registration rounds: the saved profile still says
// LEGACY, which is no longer in buList. App must re-gate to the profile screen
// (same as first login) instead of letting the user reach register and die on
// the server's "Invalid BU".
const staleData: EventsInitResult = {
  email: 'user@cyberlogitec.com',
  programEligible: false,
  clientNow: '2026-07-07T00:00:00.000Z',
  buList: ['BSG', 'CHORUS'],
  profile: { empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'LEGACY' },
  myRegistrations: {},
  events: [
    {
      eventId: 'training-1', name: 'Leadership Training', subtitle: 'Cohort 1', category: 'Training',
      type: 'simple', allowEnrollment: true, deadline: null, deadlinePassed: false,
      capacity: 10, remaining: 8, requireEligibility: false, emailConfirm: false,
      listed: true, archived: false, eventDate: '2026-07-08', startMin: 540, endMin: 660, format: 'onsite', location: 'Room A12',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
  h.onAuth.mockImplementation((cb: (u: unknown) => void) => {
    cb({ email: 'user@cyberlogitec.com' });
    return () => {};
  });
  h.isAdmin.mockReturnValue(false);
  h.fetchAdminEmails.mockResolvedValue([]);
});

describe('App — stale-BU re-gate', () => {
  it('re-gates to the profile screen when the saved BU is no longer in buList', async () => {
    h.initEvents.mockResolvedValue(staleData);
    render(<App />);

    // Gate screen, not the events list.
    expect(await screen.findByText('Update your BU / Team')).toBeInTheDocument();
    expect(screen.queryByText('Leadership Training')).not.toBeInTheDocument();

    // Identity is prefilled; the stale BU is blanked and blocks submit.
    expect(screen.getByLabelText(/Employee ID/)).toHaveValue('262010');
    expect(screen.getByLabelText(/Full name/)).toHaveValue('NGUYEN VAN A');
    expect(screen.getByLabelText(/BU \/ Team/)).toHaveValue('');
    expect(screen.getByRole('button', { name: /Save and continue/ })).toBeDisabled();
  });

  it('proceeds to the events list once a current BU is saved', async () => {
    const user = userEvent.setup();
    h.initEvents.mockResolvedValue(staleData);
    h.saveMyProfile.mockResolvedValue({
      ok: true,
      profile: { empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' },
    });
    render(<App />);

    await screen.findByText('Update your BU / Team');
    await user.selectOptions(screen.getByLabelText(/BU \/ Team/), 'BSG');
    await user.click(screen.getByRole('button', { name: /Save and continue/ }));

    expect(h.saveMyProfile).toHaveBeenCalledWith({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
    expect(await screen.findByText('Leadership Training')).toBeInTheDocument();
  });

  it('does not gate a profile whose BU is still current', async () => {
    h.initEvents.mockResolvedValue({
      ...staleData,
      profile: { empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' },
    });
    render(<App />);

    expect(await screen.findByText('Leadership Training')).toBeInTheDocument();
    expect(screen.queryByText('Update your BU / Team')).not.toBeInTheDocument();
  });
});
