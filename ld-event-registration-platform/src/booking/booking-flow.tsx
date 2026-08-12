import { useCallback, useEffect, useState } from 'react';
import type { BookingApi, InitResult } from '../lib/types';
import { useToast } from '../confirm-toast-provider';
import { type FlowState, type Step1Data, type Selection } from './booking-utils';
import { DarkNav } from '../events/dark/dark-chrome';
import { Step1Form } from './step1-form';
import { BookingStep2View } from './booking-step2-view';
import { DeadlinePassed, EnrollmentLocked } from './booking-gates';
import { CurrentBookingView } from './booking-result-views';

function step1FromData(data: InitResult): Step1Data {
  const identity = data.myBooking ?? data.profile;
  return {
    empCode: identity?.empCode ?? '',
    fullName: identity?.fullName ?? '',
    bu: identity?.bu ?? '',
  };
}

export function BookingFlow({
  data,
  setData,
  canAdmin,
  onOpenAdmin,
  onSignOut,
  api,
  title,
  subtitle,
  onBack,
  onReload,
  onEditProfile,
  onViewHistory,
}: {
  data: InitResult;
  setData: (data: InitResult) => void;
  canAdmin: boolean;
  skew: number;
  onOpenAdmin: () => void;
  onSignOut: () => void;
  api: BookingApi;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onReload?: () => void;
  onEditProfile?: () => void;
  onViewHistory?: () => void;
}) {
  const [screen, setScreen] = useState<FlowState>(data.myBooking ? 'display' : 'step1');
  const [step1, setStep1] = useState<Step1Data>(() => step1FromData(data));
  const [selection, setSelection] = useState<Selection>({
    speakingId: data.myBooking?.speakingSlotId ?? null,
    skillsId: data.myBooking?.skillsSlotId ?? null,
  });
  const [isEditing, setIsEditing] = useState(false);
  // One-time success banner shown on the management screen right after a
  // booking/edit (replaces the old standalone success screen).
  const [flash, setFlash] = useState<string | null>(null);
  const pushToast = useToast();

  useEffect(() => {
    setScreen(data.myBooking ? 'display' : 'step1');
    setStep1(step1FromData(data));
    setSelection({
      speakingId: data.myBooking?.speakingSlotId ?? null,
      skillsId: data.myBooking?.skillsSlotId ?? null,
    });
    setIsEditing(false);
    setFlash(null);
  }, [data.email]);

  // Warm the Functions SDK chunk in the background so the first submit doesn't
  // pay the dynamic import() cost on the critical path.
  useEffect(() => {
    import('firebase/functions').catch(() => {});
  }, []);

  const curSpId = isEditing ? (data.myBooking?.speakingSlotId ?? null) : null;
  const curSkId = isEditing ? (data.myBooking?.skillsSlotId ?? null) : null;

  // Required exam parts (per-event). Only the required part(s) gate submit.
  const examParts = data.examParts ?? 'both';
  const needsSpeaking = examParts !== 'skills';
  const needsSkills = examParts !== 'speaking';

  // One consistent dark nav (MUST-FIX #3). The event title — which the old nav showed —
  // moves into the page body just under the nav so the slotted flow still has context.
  const topbar = (
    <>
      <DarkNav
        email={data.email}
        onHome={onBack ?? (() => {})}
        menu={{ canAdmin, onOpenAdmin, onEditProfile, onViewHistory, onSignOut }}
      />
      {title && (
        <div className="container" style={{ paddingBottom: 0 }}>
          <button type="button" className="c7d-back" onClick={onBack}>← Events</button>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', margin: '2px 0 0' }}>{title}</h1>
          {subtitle && <p className="text-sm text-muted" style={{ marginTop: 4 }}>{subtitle}</p>}
        </div>
      )}
    </>
  );

  const handleConfirmSubmit = useCallback(async () => {
    // Only the required part(s) must be picked (single-part events leave the other null).
    if ((needsSpeaking && !selection.speakingId) || (needsSkills && !selection.skillsId)) return;
    if (
      isEditing &&
      step1.empCode === (data.myBooking?.empCode ?? '') &&
      selection.speakingId === curSpId &&
      selection.skillsId === curSkId
    ) {
      setIsEditing(false);
      setScreen('display');
      return;
    }
    try {
      const res = await api.book(data.email, {
        empCode: step1.empCode,
        fullName: step1.fullName,
        bu: step1.bu,
        // Send '' for a part the event does not require (server treats it as absent).
        speakingSlotId: needsSpeaking ? (selection.speakingId ?? '') : '',
        skillsSlotId: needsSkills ? (selection.skillsId ?? '') : '',
      });
      if (!res.ok) {
        pushToast('error', res.error || 'Registration failed.');
        if (res.state) setData(res.state);
        setScreen('step2');
      } else if (res.state) {
        const nSlots = (needsSpeaking ? 1 : 0) + (needsSkills ? 1 : 0);
        setFlash(isEditing
          ? 'Your slots have been updated.'
          : `Registration successful — your ${nSlots === 1 ? 'slot is' : 'slots are'} reserved.`);
        setData(res.state);
        setIsEditing(false);
        setScreen('display');
      } else {
        pushToast('error', 'Registered but no state received. Please reload.');
        setScreen('step2');
      }
    } catch (e) {
      pushToast('error', (e as Error).message || 'Registration failed.');
      setScreen('step2');
    }
  }, [api, curSkId, curSpId, data.email, data.myBooking, isEditing, needsSpeaking, needsSkills, pushToast, selection, setData, step1]);

  if (screen === 'step1') {
    if (!isEditing && !data.allowEnrollment) {
      return <EnrollmentLocked topbar={topbar} />;
    }
    if (!isEditing && data.deadlinePassed) {
      return <DeadlinePassed topbar={topbar} />;
    }
    return (
      <div className="app c7d">
        {topbar}
        <main className="container">
          <Step1Form
            email={data.email}
            initial={step1}
            checkIneligibility={api.checkIneligibility}
            onContinue={(d) => { setStep1(d); setScreen('step2'); }}
            onCancel={isEditing ? () => { setIsEditing(false); setScreen('display'); } : undefined}
            onEditProfile={onEditProfile}
          />
        </main>
      </div>
    );
  }

  if (screen === 'step2' || screen === 'confirm') {
    return (
      <BookingStep2View
        data={data}
        step1={step1}
        selection={selection}
        setSelection={setSelection}
        curSpId={curSpId}
        curSkId={curSkId}
        isConfirm={screen === 'confirm'}
        isEditing={isEditing}
        onBack={() => setScreen('step1')}
        onConfirmOpen={() => setScreen('confirm')}
        onConfirmCancel={() => setScreen('step2')}
        onConfirmSubmit={handleConfirmSubmit}
        onReload={onReload}
        topbar={topbar}
      />
    );
  }

  if (screen === 'display' && data.myBooking) {
    return (
      <CurrentBookingView
        data={data}
        topbar={topbar}
        cancel={api.cancel}
        flash={flash}
        onFlashDismiss={() => setFlash(null)}
        onEdit={() => {
          setFlash(null);
          setIsEditing(true);
          setSelection({ speakingId: data.myBooking!.speakingSlotId, skillsId: data.myBooking!.skillsSlotId });
          setScreen('step2');
        }}
        onCancelled={(newState) => {
          pushToast('success', 'Registration cancelled.');
          setData(newState);
          setSelection({ speakingId: null, skillsId: null });
          setIsEditing(false);
          setScreen('step1');
        }}
        onError={(msg) => pushToast('error', msg)}
      />
    );
  }

  return null;
}
