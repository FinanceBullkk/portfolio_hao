import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventsInitResult } from '../lib/types';
import { ConfirmProvider } from '../confirm-toast-provider';
import { EventsFlow } from '../events/events-flow';
import { initEvents, registerForEventDb } from '../lib/eventsDb';

vi.mock('../lib/eventsDb', () => ({
  initEvents: vi.fn(),
  registerForEventDb: vi.fn(),
  cancelEventRegistrationDb: vi.fn(),
  listMyRegistrationsDb: vi.fn(),
}));

vi.mock('../program/program-booking-screen', () => ({
  ProgramBookingScreen: () => <div>Program booking calendar</div>,
}));

const baseData: EventsInitResult & { profile: { empCode: string; fullName: string; bu: string } } = {
  email: 'user@cyberlogitec.com',
  programEligible: true,
  clientNow: '2026-06-17T00:00:00.000Z',
  buList: ['BSG', 'CHORUS'],
  profile: { empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' },
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

function renderFlow(data: EventsInitResult = baseData, setData: (d: EventsInitResult) => void = () => {}) {
  return render(
    <ConfirmProvider>
      <EventsFlow data={data} setData={setData} canAdmin={false} onOpenAdmin={() => {}} onSignOut={() => {}} />
    </ConfirmProvider>,
  );
}

describe('EventsFlow (dark)', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('routes card → detail → register (3-layer), confirming with the saved profile', async () => {
    const user = userEvent.setup();
    renderFlow();

    // Layer 1: the timeline list shows the event card (not the form).
    expect(screen.getByText('Leadership Training')).toBeInTheDocument();
    expect(screen.queryByText('Complete your registration')).not.toBeInTheDocument();

    // Layer 1 → 2: tapping the card opens the dark detail surface.
    await user.click(screen.getByText('Leadership Training'));
    expect(window.location.pathname).toBe('/events/training-1');
    expect(screen.getByText(/Organized by/)).toBeInTheDocument(); // detail-only
    expect(screen.getAllByRole('button', { name: /Register to attend/ }).length).toBeGreaterThan(0);

    // Layer 2 → 3: the detail CTA opens the confirm form (saved profile, no re-entry).
    await user.click(screen.getAllByRole('button', { name: /Register to attend/ })[0]);
    expect(screen.getByText('Complete your registration')).toBeInTheDocument();
    expect(screen.getByText('NGUYEN VAN A')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Employee ID/)).not.toBeInTheDocument(); // no re-entry input
  });

  it('shows confirmation before refreshing the broad landing state in background', async () => {
    const user = userEvent.setup();
    const refreshed = {
      ...baseData,
      myRegistrations: { 'training-1': { eventId: 'training-1', ...baseData.profile, createdAt: null } },
    };
    vi.mocked(registerForEventDb).mockResolvedValueOnce({ ok: true });
    vi.mocked(initEvents).mockResolvedValueOnce(refreshed);
    const setData = vi.fn();
    renderFlow(baseData, setData);

    await user.click(screen.getByText('Leadership Training'));
    await user.click(screen.getAllByRole('button', { name: /Register to attend/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Confirm registration' }));

    expect(await screen.findByText('You’re registered')).toBeInTheDocument();
    await waitFor(() => expect(setData).toHaveBeenCalledWith(refreshed));
  });

  it('shows the day-grouped timeline header and the Program card', () => {
    renderFlow();
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByText('English Pronunciation Program')).toBeInTheDocument(); // program vertical card
    expect(screen.getByRole('button', { name: /Upcoming/ })).toBeInTheDocument();
  });

  it('hides the Program card from users who are not assigned PICs', () => {
    renderFlow({ ...baseData, programEligible: false });
    expect(screen.queryByText('English Pronunciation Program')).not.toBeInTheDocument();
  });

  it('opens the PIC-only Program from its direct URL', () => {
    window.history.replaceState(null, '', '/programs/pronunciation');
    renderFlow();
    expect(screen.getByText('Program booking calendar')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/programs/pronunciation');
  });

  it('normalizes the Program URL for a non-PIC back to the event list', async () => {
    window.history.replaceState(null, '', '/programs/pronunciation');
    renderFlow({ ...baseData, programEligible: false });
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
  });

  it('opens an event directly from its URL', () => {
    window.history.replaceState(null, '', '/events/training-1');
    renderFlow();

    expect(screen.getByText(/Organized by/)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/events/training-1');
  });

  it('returns to the list on browser navigation', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByText('Leadership Training'));

    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument());
  });

  it('normalizes an unknown event URL back to the event list', async () => {
    window.history.replaceState(null, '', '/events/not-listed');
    renderFlow();

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
  });
});
