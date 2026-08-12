import type { ReactNode } from 'react';
import type { CancelResult, InitResult } from '../lib/types';
import { BookingDisplay } from './booking-display';

export function CurrentBookingView({
  data,
  topbar,
  cancel,
  flash,
  onFlashDismiss,
  onEdit,
  onCancelled,
  onError,
}: {
  data: InitResult;
  topbar: ReactNode;
  cancel: (email: string) => Promise<CancelResult>;
  flash?: string | null;
  onFlashDismiss?: () => void;
  onEdit: () => void;
  onCancelled: (newState: InitResult) => void;
  onError: (msg: string) => void;
}) {
  if (!data.myBooking) return null;
  return (
    <div className="app c7d">
      {topbar}
      <main className="container">
        <BookingDisplay
          email={data.email}
          booking={data.myBooking}
          slots={data.slots}
          deadlinePassed={data.deadlinePassed}
          allowEnrollment={data.allowEnrollment}
          maxChanges={data.maxChanges}
          scheduleName={data.assessmentName}
          cancel={cancel}
          flash={flash}
          onFlashDismiss={onFlashDismiss}
          onEdit={onEdit}
          onCancelled={onCancelled}
          onError={onError}
        />
      </main>
    </div>
  );
}
