import { useState } from 'react';
import type { UserProfile } from '../lib/types';
import { DarkNav } from './dark/dark-chrome';
import { ProfileForm } from './profile-form';
import { saveMyProfile } from '../lib/profileDb';
import { useToast } from '../confirm-toast-provider';

// Account-tied employee profile screen, used in two modes:
//   • gate — first login, no profile yet (no Cancel; "Save and continue")
//   • edit — reached from the Topbar any time (Cancel returns to the caller)
// Both share the save+audit callable (saveMyProfile) and the shared ProfileForm,
// so the identity is captured/edited in exactly one place.

export function ProfileScreen({
  email,
  buList,
  initial,
  canAdmin,
  onOpenAdmin,
  onSignOut,
  onViewHistory,
  title,
  subtitle,
  submitLabel,
  onSaved,
  onCancel,
}: {
  email: string;
  buList: string[];
  initial?: Partial<UserProfile> | null;
  canAdmin: boolean;
  onOpenAdmin: () => void;
  onSignOut: () => void;
  onViewHistory?: () => void;
  title: string;
  subtitle: string;
  submitLabel: string;
  onSaved: (profile: UserProfile) => void;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const pushToast = useToast();

  async function handleSubmit(d: UserProfile) {
    setBusy(true);
    try {
      const res = await saveMyProfile(d);
      if (!res.ok || !res.profile) {
        pushToast('error', res.error || 'Could not save your profile.');
        return;
      }
      pushToast('success', 'Profile saved.');
      onSaved(res.profile);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <DarkNav
        email={email}
        onHome={onCancel ?? (() => {})}
        current="other"
        menu={{ canAdmin, onOpenAdmin, onViewHistory, onSignOut }}
      />
      <main className="container">
        <ProfileForm
          title={title}
          subtitle={subtitle}
          buList={buList}
          initial={initial}
          busy={busy}
          submitLabel={submitLabel}
          onSubmit={handleSubmit}
          onCancel={onCancel}
        />
      </main>
    </div>
  );
}
