import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider } from '../confirm-toast-provider';
import type { EventDoc, Slot } from '../lib/types';
import type { EventRegistrationRow } from '../lib/adminDb';

// Functional coverage for the redesigned admin pieces that carry NEW interactive
// logic: Registrations bulk-select + the Overview KPI dashboard. Mocks the data
// boundary (adminDb) and drives the real components.

vi.mock('../lib/adminDb', () => ({
  listEventRegistrations: vi.fn(),
  listEventSlots: vi.fn(),
  deleteEventRegistration: vi.fn(),
  downloadEventRosterCsv: vi.fn(),
  upsertEvent: vi.fn(),
}));

import * as adminDb from '../lib/adminDb';
import type { MailEntry } from '../lib/admin-mail';
import type { AuditEntry } from '../lib/audit';
import { EventRegistrationsPanel } from '../admin/event-registrations-panel';
import { OverviewTab } from '../admin/overview-tab';
import { DashboardTab } from '../admin/dashboard-tab';
import { EventDrawer } from '../admin/event-drawer';

const simpleEvent: EventDoc = {
  eventId: 'e1', name: 'Event 1', subtitle: '', category: '', type: 'simple', allowEnrollment: true,
  deadline: null, deadlinePassed: false, capacity: 40, remaining: 10,
  requireEligibility: false, emailConfirm: false, listed: true, archived: false,
};

const slottedEvent: EventDoc = { ...simpleEvent, eventId: 'a1', name: 'Assessment', type: 'slotted', capacity: null, remaining: null };

const reg = (over: Partial<EventRegistrationRow>): EventRegistrationRow => ({
  email: 'x@clt.com', empCode: '1', fullName: 'X', bu: 'BSG', createdAt: null,
  speakingSlotId: null, skillsSlotId: null, changeCount: 0, updatedAt: null, ...over,
});

// ── Registrations bulk-select ─────────────────────────────────────────────────
describe('Registrations bulk-select', () => {
  beforeEach(() => {
    vi.mocked(adminDb.listEventRegistrations).mockResolvedValue([
      reg({ email: 'a@clt.com', empCode: '101', fullName: 'AAA', bu: 'BSG', createdAt: '2026-06-12T00:00:00Z' }),
      reg({ email: 'b@clt.com', empCode: '102', fullName: 'BBB', bu: 'CHORUS', createdAt: '2026-06-13T00:00:00Z' }),
    ]);
    vi.mocked(adminDb.listEventSlots).mockResolvedValue([]);
    vi.mocked(adminDb.downloadEventRosterCsv).mockClear();
  });

  function renderPanel() {
    return render(<ConfirmProvider><EventRegistrationsPanel adminEmail="admin@clt.com" event={simpleEvent} /></ConfirmProvider>);
  }

  it('reveals the bulk bar on row select and exports only the selected rows', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('AAA');
    // No selection → toolbar shows the count-suffixed export.
    expect(screen.getByRole('button', { name: /Export CSV \(2\)/ })).toBeInTheDocument();

    const boxes = screen.getAllByRole('checkbox'); // [0]=select-all, [1]=AAA, [2]=BBB
    await user.click(boxes[1]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(adminDb.downloadEventRosterCsv).toHaveBeenCalledTimes(1);
    expect(vi.mocked(adminDb.downloadEventRosterCsv).mock.calls[0][1]).toHaveLength(1);
    // Cancel action is present in the bulk bar.
    expect(screen.getByRole('button', { name: /Cancel registration/ })).toBeInTheDocument();
  });

  it('select-all selects every row; Clear selection collapses the bar', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('AAA');
    const boxes = screen.getAllByRole('checkbox');
    await user.click(boxes[0]); // select-all
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Clear selection/ }));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export CSV \(2\)/ })).toBeInTheDocument();
  });
});

// ── Event drawer: archive vs delete protection ────────────────────────────────
describe('Event drawer danger zone', () => {
  function renderDrawer(ev: EventDoc) {
    return render(
      <ConfirmProvider>
        <EventDrawer adminEmail="admin@clt.com" event={ev} onClose={() => {}} onSaved={() => {}} onRequestDelete={() => {}} />
      </ConfirmProvider>,
    );
  }

  it('protected assessment-q2 can still be unarchived but not deleted', () => {
    const protectedEvent: EventDoc = {
      ...simpleEvent, eventId: 'assessment-q2', type: 'slotted', archived: true, capacity: null, remaining: null,
    };
    renderDrawer(protectedEvent);
    expect(screen.getByRole('button', { name: 'Unarchive' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('a normal event shows both Archive and Delete', () => {
    renderDrawer({ ...simpleEvent, archived: false });
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});

// ── Overview dashboard ────────────────────────────────────────────────────────
describe('Overview dashboard', () => {
  const slot = (over: Partial<Slot>): Slot => ({
    slotId: 's', type: 'Speaking', date: '2026-06-23', startMin: 540, endMin: 600,
    capacity: 10, remaining: 10, location: 'Room A', display: '', ...over,
  });

  it('computes slotted KPIs + recent statuses from slots and registrations', async () => {
    vi.mocked(adminDb.listEventSlots).mockResolvedValue([
      slot({ slotId: 'SP1', type: 'Speaking', capacity: 10, remaining: 2 }),   // 8 booked
      slot({ slotId: 'SP2', type: 'Speaking', capacity: 10, remaining: 10 }),  // 0 booked  → SP 8/20 = 40%
      slot({ slotId: 'SK1', type: '3 Skills', capacity: 10, remaining: 5 }),   // 5 booked  → 3S 5/10 = 50%
    ]);
    vi.mocked(adminDb.listEventRegistrations).mockResolvedValue([
      reg({ email: 'a@clt.com', fullName: 'ALICE', bu: 'BSG', speakingSlotId: 'SP1', skillsSlotId: 'SK1', createdAt: '2026-06-14T00:00:00Z' }),
      reg({ email: 'b@clt.com', fullName: 'BOB', bu: 'MOC', speakingSlotId: 'SP2', skillsSlotId: null, createdAt: '2026-06-13T00:00:00Z' }),
    ]);

    const slottedEvent: EventDoc = { ...simpleEvent, eventId: 'a1', name: 'Assessment', type: 'slotted', capacity: null, remaining: null };
    render(<OverviewTab event={slottedEvent} />);

    await screen.findByText('8/20');          // Speaking booked/capacity → 40%
    expect(screen.getByText('5/10')).toBeInTheDocument(); // 3 Skills booked/capacity → 50%
    expect(screen.getByText('17')).toBeInTheDocument();   // seats remaining (12 SP + 5 3S)
    // Recent registrations with derived status.
    expect(screen.getByText('ALICE')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('simple event shows registration count without slot fetch', async () => {
    vi.mocked(adminDb.listEventRegistrations).mockResolvedValue([
      reg({ email: 'a@clt.com', fullName: 'AAA' }),
      reg({ email: 'b@clt.com', fullName: 'BBB' }),
    ]);
    vi.mocked(adminDb.listEventSlots).mockClear();

    render(<OverviewTab event={simpleEvent} />);
    await screen.findByText('AAA');
    // capacity 40, remaining 10 → 30 used = 75% fill, 10 remaining.
    expect(screen.getByText('30/40')).toBeInTheDocument(); // used/capacity
    expect(screen.getAllByText('Registered').length).toBe(2); // status pill per recent row
    expect(adminDb.listEventSlots).not.toHaveBeenCalled();
  });
});

// ── Registrations quick filters + slotted slot columns (A6) ───────────────────
describe('Registrations quick filters (slotted)', () => {
  beforeEach(() => {
    vi.mocked(adminDb.listEventSlots).mockResolvedValue([
      { slotId: 'SP1', type: 'Speaking', date: '2026-06-23', startMin: 540, endMin: 600, capacity: 10, remaining: 5, location: 'A', display: '' },
      { slotId: 'SK1', type: '3 Skills', date: '2026-06-24', startMin: 600, endMin: 750, capacity: 10, remaining: 5, location: 'B', display: '' },
    ]);
    vi.mocked(adminDb.listEventRegistrations).mockResolvedValue([
      reg({ email: 'done@clt.com', fullName: 'DONE', speakingSlotId: 'SP1', skillsSlotId: 'SK1' }),
      reg({ email: 'miss@clt.com', fullName: 'MISSING', speakingSlotId: 'SP1', skillsSlotId: null, changeCount: 2 }),
    ]);
  });

  function renderPanel() {
    return render(<ConfirmProvider><EventRegistrationsPanel adminEmail="admin@clt.com" event={slottedEvent} /></ConfirmProvider>);
  }

  it('renders Speaking/3 Skills columns and a "Not picked" pill for an unpicked slot', async () => {
    renderPanel();
    await screen.findByText('DONE');
    expect(screen.getByRole('columnheader', { name: /Speaking/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /3 Skills/ })).toBeInTheDocument();
    expect(screen.getByText('Not picked')).toBeInTheDocument(); // MISSING's empty 3 Skills cell
  });

  it('"Incomplete" chip filters to incomplete rows only', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('DONE');
    await user.click(screen.getByRole('button', { name: /Incomplete/ }));
    expect(screen.queryByText('DONE')).not.toBeInTheDocument();
    expect(screen.getByText('MISSING')).toBeInTheDocument();
  });

  it('"Changed" chip filters to rows with changes', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('DONE');
    await user.click(screen.getByRole('button', { name: /Changed/ }));
    expect(screen.queryByText('DONE')).not.toBeInTheDocument(); // changeCount 0
    expect(screen.getByText('MISSING')).toBeInTheDocument();    // changeCount 2
  });
});

// ── Global Dashboard ──────────────────────────────────────────────────────────
describe('Global Dashboard', () => {
  const mail = (over: Partial<MailEntry>): MailEntry => ({ id: 'm', to: 't@clt.com', subject: 's', state: 'SUCCESS', error: null, attempts: 1, deliveredAt: null, ...over });
  const audit = (over: Partial<AuditEntry>): AuditEntry => ({ id: 'a', timestamp: new Date().toISOString(), email: 'who@clt.com', event: 'book.create', detail: {}, ...over });

  const events: EventDoc[] = [
    { ...simpleEvent, eventId: 'open1', name: 'Open Workshop', capacity: 40, remaining: 4 }, // 90% full → attention
    { ...simpleEvent, eventId: 'arch1', name: 'Archived One', capacity: null, remaining: null, archived: true },
  ];

  it('shows KPIs, surfaces a near-full event + email failure, and deep-links', async () => {
    const onOpenEvent = vi.fn();
    const onGotoNotifications = vi.fn();
    const user = userEvent.setup();
    render(
      <DashboardTab
        events={events}
        stats={{}}
        statsReady
        mail={[mail({ id: 'm1', state: 'ERROR', error: 'SMTP 550' })]}
        audit={[audit({ id: 'a1', email: 'duc@clt.com', event: 'book.create' })]}
        onOpenEvent={onOpenEvent}
        onGotoNotifications={onGotoNotifications}
      />,
    );

    expect(screen.getByText('Total registrations')).toBeInTheDocument();
    expect(screen.getByText('Email failures')).toBeInTheDocument();

    // Needs-attention row for the near-full event (text uses an em-dash, so this
    // targets the attention row, not the "events filling up" list item).
    await user.click(screen.getByText(/Open Workshop —/));
    expect(onOpenEvent).toHaveBeenCalledWith('open1');

    // The email-failure row routes to Notifications.
    await user.click(screen.getByText(/confirmation email/));
    expect(onGotoNotifications).toHaveBeenCalled();
  });

  it('surfaces a 100%-full event in Needs attention (audit P1-9)', async () => {
    const onOpenEvent = vi.fn();
    const user = userEvent.setup();
    render(
      <DashboardTab
        events={[{ ...simpleEvent, eventId: 'full1', name: 'Packed Event', capacity: 30, remaining: 0 }]}
        stats={{}}
        statsReady
        mail={[]}
        audit={[]}
        onOpenEvent={onOpenEvent}
        onGotoNotifications={() => {}}
      />,
    );
    expect(screen.queryByText(/Nothing needs attention/)).not.toBeInTheDocument();
    await user.click(screen.getByText(/Packed Event — full/));
    expect(onOpenEvent).toHaveBeenCalledWith('full1');
  });
});
