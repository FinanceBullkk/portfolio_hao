import type { ReactNode } from 'react';
import { ClockIcon, LockIcon } from './booking-icons';

export function EnrollmentLocked({ topbar }: { topbar: ReactNode }) {
  return (
    <div className="app c7d">
      {topbar}
      <main className="container">
        <div className="banner warn mt-4">
          <span className="banner-icon"><LockIcon size={16} /></span>
          <div>Registration is currently locked. Please contact the organizers.</div>
        </div>
      </main>
    </div>
  );
}

export function DeadlinePassed({ topbar }: { topbar: ReactNode }) {
  return (
    <div className="app c7d">
      {topbar}
      <main className="container">
        <div className="banner danger mt-4">
          <span className="banner-icon"><ClockIcon size={16} /></span>
          <div>The registration deadline has passed. You have not registered — please contact the organizers.</div>
        </div>
      </main>
    </div>
  );
}
