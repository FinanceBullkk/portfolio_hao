import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '../confirm-toast-provider';
import { ProfileScreen } from '../events/profile-screen';

// Covers the Complete-profile gate + Edit-profile screen (shared ProfileScreen +
// ProfileForm). The save callable is mocked — we assert the form gates on
// validity and hands the normalized identity to the callable + onSaved.
const h = vi.hoisted(() => ({ saveMyProfile: vi.fn() }));
vi.mock('../lib/profileDb', () => ({ saveMyProfile: h.saveMyProfile }));

function renderScreen(onSaved = vi.fn()) {
  render(
    <ConfirmProvider>
      <ProfileScreen
        email="user@cyberlogitec.com"
        buList={['BSG', 'CHORUS']}
        canAdmin={false}
        onOpenAdmin={() => {}}
        onSignOut={() => {}}
        title="Complete your profile"
        subtitle="Enter once."
        submitLabel="Save and continue"
        onSaved={onSaved}
      />
    </ConfirmProvider>,
  );
  return onSaved;
}

describe('ProfileScreen — first-login gate / edit profile', () => {
  it('saves a freshly entered profile and reports the normalized identity back', async () => {
    const user = userEvent.setup();
    h.saveMyProfile.mockResolvedValue({ ok: true, profile: { empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' } });
    const onSaved = renderScreen();

    await screen.findByText('Complete your profile');
    await user.type(screen.getByLabelText(/Employee ID/), '262010');
    await user.type(screen.getByLabelText(/Full name/), 'Nguyen Van A'); // uppercased on input
    await user.selectOptions(screen.getByLabelText(/BU \/ Team/), 'BSG');
    await user.click(screen.getByRole('button', { name: /Save and continue/ }));

    expect(h.saveMyProfile).toHaveBeenCalledWith({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
    expect(onSaved).toHaveBeenCalledWith({ empCode: '262010', fullName: 'NGUYEN VAN A', bu: 'BSG' });
  });

  it('keeps submit disabled until empCode + name + BU are all valid', async () => {
    const user = userEvent.setup();
    renderScreen();

    await screen.findByText('Complete your profile');
    const submit = screen.getByRole('button', { name: /Save and continue/ });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/Employee ID/), '262010');
    expect(submit).toBeDisabled(); // name + BU still missing

    await user.type(screen.getByLabelText(/Full name/), 'AB');
    await user.selectOptions(screen.getByLabelText(/BU \/ Team/), 'BSG');
    expect(submit).toBeEnabled();
  });
});
