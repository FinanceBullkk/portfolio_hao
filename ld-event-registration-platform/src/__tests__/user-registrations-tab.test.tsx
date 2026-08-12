import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRegistrationsTab } from '../admin/user-registrations-tab';

vi.mock('../lib/adminDb', () => ({ adminListUserRegistrations: vi.fn() }));
import { adminListUserRegistrations } from '../lib/adminDb';

describe('UserRegistrationsTab', () => {
  it('looks up a user by email and lists their registrations (incl. archived)', async () => {
    const user = userEvent.setup();
    vi.mocked(adminListUserRegistrations).mockResolvedValue({
      email: 'a@cyberlogitec.com',
      registrations: [
        {
          eventId: 'assessment-q2', eventName: 'Assessment Q2', eventSubtitle: '', category: '',
          type: 'slotted', status: 'archived', archived: true, deadline: null,
          empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG', createdAt: '2026-04-01T00:00:00.000Z',
          slots: [{ slotId: 'sp1', type: 'Speaking', date: '2026-04-20', startMin: 540, endMin: 600, capacity: 2, remaining: 0, location: 'Room A', display: '' }],
        },
      ],
    });

    render(<UserRegistrationsTab />);

    await user.type(screen.getByLabelText(/User email/), 'A@CyberLogitec.com');
    await user.click(screen.getByRole('button', { name: /Look up/ }));

    expect(await screen.findByText('Assessment Q2')).toBeInTheDocument();
    expect(screen.getByText(/registration for/)).toBeInTheDocument();
    // Email is normalised to lowercase before the callable.
    expect(adminListUserRegistrations).toHaveBeenCalledWith('a@cyberlogitec.com');
  });

  it('shows an empty state when the user has no registrations', async () => {
    const user = userEvent.setup();
    vi.mocked(adminListUserRegistrations).mockResolvedValue({ email: 'b@cyberlogitec.com', registrations: [] });

    render(<UserRegistrationsTab />);
    await user.type(screen.getByLabelText(/User email/), 'b@cyberlogitec.com');
    await user.click(screen.getByRole('button', { name: /Look up/ }));

    expect(await screen.findByText(/No registrations found for/)).toBeInTheDocument();
  });
});
