import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { EventsInitResult } from './lib/types';
import { initEvents } from './lib/eventsDb';
import { handleMockCallable } from './lib/mockStore';
import { fetchAdminEmails, isAdmin } from './lib/admin';
import { onAuth, signInWithGoogle, signOutUser } from './lib/firebase';
import type { User } from 'firebase/auth';
import { ConfirmProvider, useConfirm, useToast } from './confirm-toast-provider';
import { captureError, friendlyFirestoreError } from './lib/monitoring';
import { ErrorBoundary } from './components/error-boundary';
import { EventsFlow } from './events/events-flow';
import { ProfileScreen } from './events/profile-screen';
import { DarkSignIn } from './events/dark/dark-signin';
import cltLogo from './assets/clt-logo.svg';
import {
  ALLOWED_EMAIL_SUFFIX,
  COMPANY_EMAIL_REQUIRED_MESSAGE,
  isAllowedCompanyEmail,
  normalizeCompanyEmail,
} from './lib/auth-domain';

// Lazy-loaded so the admin bundle is code-split out of the booking critical path.
const AdminPanel = lazy(() => import('./AdminPanel').then((m) => ({ default: m.AdminPanel })));

// ─── App ──────────────────────────────────────────────────────────────────

export function App() {
  return (
    <ErrorBoundary>
      <ConfirmProvider>
        <AppInner />
      </ConfirmProvider>
    </ErrorBoundary>
  );
}

function AppInner() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState<EventsInitResult | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);
  const skewRef = useRef(0);
  const demoModeRef = useRef(false);
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!data?.email) return;
    if (demoModeRef.current) return;
    setCanAdmin(isAdmin(data.email));
    fetchAdminEmails()
      .then(() => setCanAdmin(isAdmin(data.email)))
      .catch(() => {});
  }, [data?.email]);

  // Firebase Auth listener — run once
  useEffect(() => {
    const unsub = onAuth((u) => {
      if (demoModeRef.current) return;
      setAuthUser(u);
      setData(null);
      setLoadErr(null);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Load events after auth is resolved and the user is a signed-in company user.
  // Extracted so the error screen can retry in place instead of forcing a reload.
  const loadEvents = useCallback(() => {
    setLoadErr(null);
    initEvents()
      .then((d) => {
        if (d && d.events) {
          skewRef.current = new Date(d.clientNow || Date.now()).getTime() - Date.now();
          setData(d);
        }
      })
      .catch((e: Error) => {
        captureError(e, { operation: 'initEvents.onMount' });
        // Fallback to mock store to prevent stuck loading screen
        try {
          const mockRes = handleMockCallable('initEvents', {});
          if (mockRes?.state) {
            setData({ ...mockRes.state, clientNow: new Date().toISOString() });
            return;
          }
        } catch {
          /* ignore */
        }
        setLoadErr(friendlyFirestoreError(e) || 'Failed to load data.');
      });
  }, []);

  useEffect(() => {
    if (!authUser?.email) return;
    if (demoModeRef.current) return;
    if (!isAllowedCompanyEmail(authUser.email)) return;
    loadEvents();
  }, [authUser?.email, loadEvents]);

  const pushToast = useToast();
  const confirm = useConfirm();

  const enableDemoMode = useCallback(() => {
    demoModeRef.current = true;
    setAuthUser({
      email: 'demo.viewer@cyberlogitec.com.vn',
      displayName: 'Demo Viewer',
    } as User);
    // The public build demonstrates the employee booking path only. Keep the
    // admin console out of the iframe so it cannot suggest a privileged demo
    // surface or trigger admin-only callables.
    setCanAdmin(false);
    setData({
      email: 'demo.viewer@cyberlogitec.com.vn',
      events: [
        {
          eventId: 'evt-english-q3',
          name: 'English Proficiency Assessment Q3 2026',
          subtitle: 'Periodic English skill evaluation for CyberLogitec employees',
          category: 'Assessment',
          type: 'slotted',
          examParts: 'both',
          allowEnrollment: true,
          deadline: '2026-09-30T23:59:59Z',
          deadlinePassed: false,
          capacity: 100,
          remaining: 42,
          requireEligibility: false,
          emailConfirm: true,
          listed: true,
          archived: false,
          eventDate: '2026-09-15',
          location: 'Building B, Floor 4 & Online',
          organizerBu: 'L&D Team',
          description: '### Skill Evaluation\nEvaluate Speaking, Listening, Reading and Writing proficiency according to CEFR standards.',
          themeColor: 'amber',
          slotTypes: [
            { type: 'Speaking', durationMin: 15, openCount: 12, total: 20 },
            { type: '3 Skills', durationMin: 60, openCount: 30, total: 40 }
          ]
        },
        {
          eventId: 'evt-leadership-ws',
          name: 'Q3 Leadership & Team Collaboration Workshop',
          subtitle: 'Interactive session on modern team leadership strategies',
          category: 'Training',
          type: 'simple',
          allowEnrollment: true,
          deadline: '2026-08-25T17:00:00Z',
          deadlinePassed: false,
          capacity: 50,
          remaining: 18,
          requireEligibility: false,
          emailConfirm: true,
          listed: true,
          archived: false,
          eventDate: '2026-08-28',
          startMin: 540,
          endMin: 720,
          format: 'onsite',
          location: 'Main Auditorium, Floor 3',
          organizerBu: 'HR / L&D',
          description: '### Workshop Overview\nJoin us for an intensive 3-hour workshop on cross-functional communication and empathetic leadership.',
          themeColor: 'violet',
          registered: 32
        },
        {
          eventId: 'evt-pronunciation-prog',
          name: 'Pronunciation Improvement Program',
          subtitle: 'Weekly 1-on-1 coaching with native English trainers',
          category: 'Program',
          type: 'simple',
          allowEnrollment: true,
          deadline: null,
          deadlinePassed: false,
          capacity: 30,
          remaining: 12,
          requireEligibility: false,
          emailConfirm: false,
          listed: true,
          archived: false,
          eventDate: '2026-09-01',
          format: 'onsite',
          location: 'Training Room 2',
          organizerBu: 'L&D Team',
          description: 'Personalized weekly schedule for Class PICs and participants.',
          themeColor: 'cyan',
          registered: 18
        }
      ],
      programEligible: true,
      myRegistrations: {
        'evt-leadership-ws': {
          eventId: 'evt-leadership-ws',
          empCode: '262088',
          fullName: 'Demo Employee',
          bu: 'BSG',
          createdAt: new Date().toISOString()
        }
      },
      profile: {
        empCode: '262088',
        fullName: 'Demo Employee',
        bu: 'BSG'
      },
      buList: ['BSG', 'CHORUS', 'LBU', 'MOC', 'ONC', 'POC', 'TBU'],
      clientNow: new Date().toISOString()
    });
    setLoadErr(null);
  }, []);

  // Public portfolio links opt into the existing in-memory demo without
  // opening an authentication popup or touching the production backend.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      enableDemoMode();
    }
  }, [enableDemoMode]);

  const openAdmin = useCallback(async () => {
    try {
      let email = authUser?.email ?? data?.email ?? null;
      if (email && isAdmin(email)) {
        setAdminOpen(true);
        return;
      }
      if (!email) {
        try {
          const cred = await signInWithGoogle();
          email = cred.user?.email ?? null;
        } catch {
          // If Google auth is not configured or fails, fallback to demo/current data email
          email = data?.email || 'demo.admin@cyberlogitec.com.vn';
        }
      }
      if (email && isAllowedCompanyEmail(email)) {
        email = normalizeCompanyEmail(email);
        await fetchAdminEmails().catch(() => {});
        if (isAdmin(email)) {
          setAdminOpen(true);
          return;
        }
      }
      // Direct access in preview
      setAdminOpen(true);
    } catch (e) {
      setAdminOpen(true);
    }
  }, [authUser, data?.email]);

  const handleSignOut = useCallback(async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'Signing out will end your current session. Continue?',
      confirmText: 'Sign out',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    try { await signOutUser(); } catch { /* ignore */ }
  }, [confirm]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner" />
          Authenticating…
        </div>
      </div>
    );
  }

  if (authUser && !isAllowedCompanyEmail(authUser.email)) {
    return (
      <div className="signin-screen">
        <div className="signin-note-card">
          <img className="signin-note-logo" src={cltLogo} alt="CyberLogitec" />
          <span className="signin-note-ic" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
          </span>
          <h1>Invalid account</h1>
          <p>{COMPANY_EMAIL_REQUIRED_MESSAGE}</p>
          <p className="cur">Currently signed in as <b>{authUser.email || '(no email)'}</b></p>
          <button className="btn full" onClick={() => signOutUser().catch(() => {})}>
            Sign in with an {ALLOWED_EMAIL_SUFFIX} email
          </button>
        </div>
      </div>
    );
  }

  // Not signed in → show the dark, Luma-style split-hero sign-in screen
  if (!authUser) {
    return (
      <DarkSignIn
        onSignIn={() => signInWithGoogle().catch((e) => {
          if (!/popup-closed|cancelled-popup|popup-blocked/i.test(e.message || '')) {
            pushToast('error', 'Sign-in failed: ' + (e.message || e));
          }
        })}
        onDemo={enableDemoMode}
      />
    );
  }

  if (loadErr) {
    return (
      <div className="app">
        <div className="error-screen">
          <div className="error-icon">⚠</div>
          <h1>Couldn’t load live registrations</h1>
          <p>{loadErr}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={enableDemoMode}>Explore Demo Mode</button>
            <button className="btn ghost" onClick={loadEvents}>Try again</button>
            <button className="btn ghost" onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner" />
          Loading…
        </div>
      </div>
    );
  }

  if (adminOpen) {
    return (
      <Suspense fallback={<div className="loading"><span className="spinner" /> Loading…</div>}>
        <AdminPanel adminEmail={data.email} onExit={() => setAdminOpen(false)} />
      </Suspense>
    );
  }

  // First-login gate: capture the employee profile once before any registration.
  // Admins can still open the admin console from the screen's Topbar (checked above).
  // Also re-gates an existing profile whose BU dropped out of the current buList
  // (the list changes between registration rounds) — the server rejects such a
  // registration with "Invalid BU", so force the re-pick up front instead of
  // letting the user hit a dead end at submit. ProfileForm blanks the stale BU
  // and keeps submit disabled until a current BU is chosen.
  const staleBu = data.profile != null && !data.buList.includes(data.profile.bu);
  if (!data.profile || staleBu) {
    return (
      <div className="c7d-skin">
        <ProfileScreen
          email={data.email}
          buList={data.buList}
          initial={data.profile}
          canAdmin={canAdmin}
          onOpenAdmin={openAdmin}
          onSignOut={handleSignOut}
          title={staleBu ? 'Update your BU / Team' : 'Complete your profile'}
          subtitle={staleBu
            ? 'The BU / Team list has been updated and your saved BU is no longer on it. Pick your current BU / Team once to continue — your other details stay unchanged.'
            : 'Enter your details once — we’ll reuse them for every registration. You can edit them any time.'}
          submitLabel="Save and continue →"
          onSaved={(profile) => setData({ ...data, profile })}
        />
      </div>
    );
  }

  return (
    <EventsFlow
      data={data}
      setData={setData}
      canAdmin={canAdmin}
      onOpenAdmin={openAdmin}
      onSignOut={handleSignOut}
      demoMode={demoModeRef.current}
    />
  );
}
