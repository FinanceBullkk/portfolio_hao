import type {
  UserProfile,
  Slot,
  MyBooking,
} from './types';

// In-memory persistent state for preview / fallback when Firebase calls cannot be reached.
const STORAGE_KEY = 'corgi7_demo_store_v1';

interface MockStoreState {
  email: string;
  profile: UserProfile | null;
  buList: string[];
  myRegistrations: any[];
  events: any[];
  slots: Record<string, Slot[]>;
  myBooking: MyBooking | null;
  adminEmails: string[];
  auditLogs: any[];
}

function getDefaultState(email: string = 'demo.user@cyberlogitec.com'): MockStoreState {
  return {
    email,
    profile: {
      empCode: '262010',
      fullName: 'Nguyen Van A',
      bu: 'IT',
    },
    buList: ['BSG', 'CHORUS', 'LBU', 'MOC', 'ONC', 'POC', 'TBU', 'IT', 'HR'],
    adminEmails: ['admin@cyberlogitec.com', 'demo.user@cyberlogitec.com', 'anhhao.dl108@gmail.com'],
    myRegistrations: [
      {
        registrationId: 'reg-demo-1',
        eventId: 'ai-engineering-workshop',
        eventName: 'AI-Powered Software Engineering with Gemini 2.5',
        type: 'simple',
        registeredAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        empCode: '262010',
        fullName: 'Nguyen Van A',
        bu: 'IT',
        eventDate: '2026-09-05',
        location: 'Google Meet / Room 4B',
      },
    ],
    events: [
      {
        eventId: 'eng-assessment-q3',
        name: 'English Proficiency Assessment Q3 2026',
        subtitle: 'Speaking & 3 Skills (Listening, Reading, Writing) - Required for English L&D certification',
        category: 'Assessment',
        type: 'slotted',
        examParts: 'both',
        allowEnrollment: true,
        deadline: '2026-09-15T23:59:00Z',
        deadlinePassed: false,
        capacity: 100,
        remaining: 42,
        requireEligibility: false,
        emailConfirm: true,
        listed: true,
        archived: false,
        eventDate: '2026-08-25',
        startMin: 540,
        endMin: 1020,
        format: 'onsite',
        location: 'Training Room 3A & Online',
        organizerBu: 'HR',
        description: '### Q3 English Proficiency Assessment\n\nEvaluates Speaking, Listening, Reading, and Writing competencies according to internal L&D benchmarks.\n\n#### Checklist for Candidates:\n1. Bring your headset with noise-canceling mic\n2. Complete pre-assessment questionnaire\n3. Select your time slot below',
        themeColor: 'amber',
        userRegistration: null,
      },
      {
        eventId: 'pronunciation-program-w34',
        name: 'Pronunciation Improvement Program',
        subtitle: 'Weekly 1-on-1 coaching sessions with native English trainers',
        category: 'Coaching',
        type: 'simple',
        allowEnrollment: true,
        deadline: '2026-09-30T23:59:00Z',
        deadlinePassed: false,
        capacity: 50,
        remaining: 18,
        requireEligibility: false,
        emailConfirm: true,
        listed: true,
        archived: false,
        eventDate: '2026-08-28',
        startMin: 600,
        endMin: 720,
        format: 'onsite',
        location: 'Coaching Pod 2',
        organizerBu: 'L&D',
        description: '### Pronunciation Improvement Program\n\nEnhance your spoken English clarity, rhythm, and intonation through personalized 1-on-1 coaching sessions.\n\n- Duration: 4 weeks\n- Frequency: 1 session / week',
        themeColor: 'violet',
        userRegistration: null,
      },
      {
        eventId: 'ai-engineering-workshop',
        name: 'AI-Powered Software Engineering with Gemini 2.5',
        subtitle: 'Hands-on masterclass on code generation, agentic workflows & prompt design',
        category: 'Workshop',
        type: 'simple',
        allowEnrollment: true,
        deadline: '2026-09-01T23:59:00Z',
        deadlinePassed: false,
        capacity: 60,
        remaining: 25,
        requireEligibility: false,
        emailConfirm: true,
        listed: true,
        archived: false,
        eventDate: '2026-09-05',
        startMin: 840,
        endMin: 1020,
        format: 'online',
        location: 'Google Meet / Room 4B',
        organizerBu: 'IT',
        description: '### AI-Powered Software Engineering\n\nLearn to build modern web applications using Google Gemini API and agentic workflows.',
        themeColor: 'blue',
        userRegistration: {
          registeredAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          empCode: '262010',
          fullName: 'Nguyen Van A',
          bu: 'IT',
        },
      },
      {
        eventId: 'agile-leadership-2026',
        name: 'Agile Leadership & Team Dynamics',
        subtitle: 'For Team Leads, Scrum Masters, and Senior Engineers',
        category: 'Management',
        type: 'simple',
        allowEnrollment: true,
        deadline: '2026-09-10T23:59:00Z',
        deadlinePassed: false,
        capacity: 30,
        remaining: 12,
        requireEligibility: false,
        emailConfirm: true,
        listed: true,
        archived: false,
        eventDate: '2026-09-12',
        startMin: 540,
        endMin: 720,
        format: 'onsite',
        location: 'Main Auditorium',
        organizerBu: 'HR',
        description: '### Agile Leadership Workshop\n\nMaster feedback loops, retrospective facilitation, and team empowerment techniques.',
        themeColor: 'emerald',
        userRegistration: null,
      },
    ],
    slots: {
      'eng-assessment-q3': [
        {
          slotId: 'SP-01',
          type: 'Speaking',
          date: '2026-08-25',
          session: 'S1',
          startMin: 540,
          endMin: 600,
          capacity: 10,
          remaining: 6,
          location: 'Room 3A',
          display: '09:00 - 10:00 (Room 3A)',
        },
        {
          slotId: 'SP-02',
          type: 'Speaking',
          date: '2026-08-25',
          session: 'S2',
          startMin: 630,
          endMin: 690,
          capacity: 10,
          remaining: 4,
          location: 'Room 3A',
          display: '10:30 - 11:30 (Room 3A)',
        },
        {
          slotId: '3S-01',
          type: '3 Skills',
          date: '2026-08-25',
          session: 'S3',
          startMin: 720,
          endMin: 900,
          capacity: 25,
          remaining: 14,
          location: 'Computer Lab 1',
          display: '12:00 - 15:00 (Lab 1)',
        },
        {
          slotId: '3S-02',
          type: '3 Skills',
          date: '2026-08-26',
          session: 'S1',
          startMin: 540,
          endMin: 720,
          capacity: 25,
          remaining: 18,
          location: 'Computer Lab 2',
          display: '09:00 - 12:00 (Lab 2)',
        },
      ],
    },
    myBooking: null,
    auditLogs: [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        actorEmail: 'admin@cyberlogitec.com',
        action: 'event.create',
        details: 'Created event "English Proficiency Assessment Q3 2026"',
      },
    ],
  };
}

function loadStore(email?: string): MockStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (email) parsed.email = email;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  const state = getDefaultState(email);
  saveStore(state);
  return state;
}

function saveStore(state: MockStoreState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function handleMockCallable(name: string, args: any, currentEmail?: string): any {
  const store = loadStore(currentEmail);

  if (name === 'initEvents') {
    return {
      state: {
        email: store.email,
        profile: store.profile,
        buList: store.buList,
        events: store.events,
        myRegistrations: store.myRegistrations,
      },
    };
  }

  if (name === 'registerForEvent') {
    const { eventId, empCode, fullName, bu } = args;
    const ev = store.events.find((e) => e.eventId === eventId);
    if (ev) {
      ev.userRegistration = {
        registeredAt: new Date().toISOString(),
        empCode,
        fullName,
        bu,
      };
      if (typeof ev.remaining === 'number' && ev.remaining > 0) {
        ev.remaining -= 1;
      }
      if (typeof ev.registered === 'number') {
        ev.registered += 1;
      }
      store.myRegistrations.push({
        registrationId: 'reg-' + Date.now(),
        eventId: ev.eventId,
        eventName: ev.name,
        type: ev.type,
        registeredAt: new Date().toISOString(),
        empCode,
        fullName,
        bu,
        eventDate: ev.eventDate,
        location: ev.location,
      });
      saveStore(store);
    }
    return {
      state: {
        email: store.email,
        profile: store.profile,
        buList: store.buList,
        events: store.events,
        myRegistrations: store.myRegistrations,
      },
    };
  }

  if (name === 'cancelEventRegistration') {
    const { eventId } = args;
    const ev = store.events.find((e) => e.eventId === eventId);
    if (ev) {
      ev.userRegistration = null;
      if (typeof ev.remaining === 'number') ev.remaining += 1;
      store.myRegistrations = store.myRegistrations.filter((r) => r.eventId !== eventId);
      saveStore(store);
    }
    return {
      state: {
        email: store.email,
        profile: store.profile,
        buList: store.buList,
        events: store.events,
        myRegistrations: store.myRegistrations,
      },
    };
  }

  if (name === 'listMyRegistrations') {
    return {
      email: store.email,
      registrations: store.myRegistrations,
    };
  }

  if (name === 'updateMyProfile') {
    const { empCode, fullName, bu } = args;
    store.profile = { empCode, fullName, bu };
    saveStore(store);
    return { profile: store.profile };
  }

  if (name === 'initBooking') {
    return {
      state: {
        email: store.email,
        profile: store.profile,
        config: {
          allowEnrollment: true,
          maxChanges: 3,
          deadline: null,
          emailConfirm: true,
          adminEmails: store.adminEmails,
          buList: store.buList,
          assessmentName: 'English Assessment Q3 2026',
        },
        slots: store.slots['eng-assessment-q3'] || [],
        myBooking: store.myBooking,
      },
    };
  }

  if (name === 'bookSlots') {
    const { speakingSlotId, skillsSlotId, empCode, fullName, bu } = args;
    store.myBooking = {
      empCode,
      fullName,
      bu,
      speakingSlotId,
      skillsSlotId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      changeCount: 0,
    };
    saveStore(store);
    return {
      emailSent: true,
      state: {
        email: store.email,
        profile: store.profile,
        config: {
          allowEnrollment: true,
          maxChanges: 3,
          deadline: null,
          emailConfirm: true,
          adminEmails: store.adminEmails,
          buList: store.buList,
          assessmentName: 'English Assessment Q3 2026',
        },
        slots: store.slots['eng-assessment-q3'] || [],
        myBooking: store.myBooking,
      },
    };
  }

  if (name === 'cancelBooking') {
    store.myBooking = null;
    saveStore(store);
    return {
      state: {
        email: store.email,
        profile: store.profile,
        config: {
          allowEnrollment: true,
          maxChanges: 3,
          deadline: null,
          emailConfirm: true,
          adminEmails: store.adminEmails,
          buList: store.buList,
          assessmentName: 'English Assessment Q3 2026',
        },
        slots: store.slots['eng-assessment-q3'] || [],
        myBooking: null,
      },
    };
  }

  if (name === 'initProgram') {
    return {
      ok: true,
      state: {
        email: store.email,
        profile: store.profile,
        config: {
          activeProgramId: 'prog-1',
          programTitle: 'Pronunciation Improvement Program',
        },
        classes: [
          { classId: 'cls-1', name: 'Class 1 - Beginners', trainerName: 'John Smith' },
          { classId: 'cls-2', name: 'Class 2 - Intermediate', trainerName: 'Sarah Jenkins' },
        ],
        weeks: [
          { weekId: 'w34', weekLabel: 'Week 34 (Aug 24 - Aug 28)', startDate: '2026-08-24' },
          { weekId: 'w35', weekLabel: 'Week 35 (Aug 31 - Sep 04)', startDate: '2026-08-31' },
        ],
        myBookings: [],
      },
    };
  }

  if (name === 'fetchAdminEmails') {
    return { adminEmails: store.adminEmails };
  }

  if (name === 'adminListEventRegistrations') {
    return {
      registrations: store.myRegistrations.map((r) => ({
        email: store.email,
        empCode: r.empCode,
        fullName: r.fullName,
        bu: r.bu,
        createdAt: r.registeredAt,
        speakingSlotId: r.speakingSlotId || null,
        skillsSlotId: r.skillsSlotId || null,
        changeCount: 0,
        updatedAt: r.registeredAt,
      })),
    };
  }

  // Fallback default
  return {
    ok: true,
    state: {
      email: store.email,
      profile: store.profile,
      buList: store.buList,
      events: store.events,
      myRegistrations: store.myRegistrations,
    },
  };
}
