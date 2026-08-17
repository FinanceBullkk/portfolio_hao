import { Fragment } from 'react';
import cltLogo from '../assets/clt-logo.svg';
import { emailInitials, emailShortName, type DeadlineInfo } from './booking-utils';

// ─── Topbar ───────────────────────────────────────────────────────────────

export function Topbar({
  email,
  deadlineInfo,
  canAdmin,
  onOpenAdmin,
  onSignOut,
  onEditProfile,
  onBack,
  title,
  subtitle,
}: {
  email: string;
  deadlineInfo: DeadlineInfo | null;
  canAdmin?: boolean;
  onOpenAdmin?: () => void;
  onSignOut?: () => void;
  onEditProfile?: () => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-left">
          {onBack && (
            <button type="button" className="btn ghost sm" onClick={onBack} aria-label="Back to all events">← Events</button>
          )}
          <div className="logo">
            <img className="logo-img" width="74" height="35" src={cltLogo} alt="CLT" />
          </div>
          {/* Wordmark only carries meaning for event context (booking shows the
              event name). On the landing the CLT logo alone is the branding. */}
          {title && (
            <>
              <div style={{ width: 1, height: 26, background: 'var(--ink-150)', flexShrink: 0 }} />
              <div className="topbar-title">
                <span className="t">{title}</span>
                {subtitle && <span className="s">{subtitle}</span>}
              </div>
            </>
          )}
        </div>
        <div className="topbar-right">
          {deadlineInfo && !deadlineInfo.passed && (
            <span className={`pill ${deadlineInfo.urgent ? 'danger' : deadlineInfo.daysLeft <= 3 ? 'warn' : 'brand'}`}>
              Due: {deadlineInfo.text}
            </span>
          )}
          {deadlineInfo?.passed && <span className="pill danger">Registration closed</span>}
          {canAdmin && onOpenAdmin && (
            <button className="admin-btn" onClick={onOpenAdmin}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
              Admin
            </button>
          )}
          {onEditProfile ? (
            <button type="button" className="user-chip" onClick={onEditProfile} title="Edit your profile" aria-label="Edit your profile">
              <span className="avatar">{emailInitials(email)}</span>
              <span>{emailShortName(email)}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </button>
          ) : (
            <div className="user-chip" title={email}>
              <span className="avatar">{emailInitials(email)}</span>
              <span>{emailShortName(email)}</span>
            </div>
          )}
          {onSignOut && (
            <button className="topbar-signout" onClick={onSignOut} title="Sign out" aria-label="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────

export function Stepper({ current }: { current: number }) {
  const steps = [
    { n: 1, label: 'Details' },
    { n: 2, label: 'Choose slots' },
    { n: 3, label: 'Confirm' },
  ];
  return (
    <div className="stepper mb-5">
      {steps.map((s, i) => (
        <Fragment key={s.n}>
          <div className={`step ${current === s.n ? 'active' : ''} ${current > s.n ? 'done' : ''}`}>
            <div className="step-dot">{current > s.n ? '✓' : s.n}</div>
            <span className="step-label">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`step-line ${current > s.n ? 'done' : ''}`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}
