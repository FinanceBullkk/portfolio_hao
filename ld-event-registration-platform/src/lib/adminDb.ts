// Barrel for the admin data layer. Implementations live in focused modules so no
// single file grows unwieldy; consumers keep importing everything from
// `./adminDb`. Each group below is one concern:
//   admin-slots         — flat /slots collection (legacy assessment)
//   admin-events        — /events platform (create/read/migrate/reconcile)
//   admin-event-slots   — slots under a slotted event + cross-event aggregation
//   admin-mail          — /mail delivery status (Trigger Email extension)
//   admin-registrations — registration CRUD, paging, CSV-adjacent helpers
//   admin-config        — global config writes
//   admin-block-list    — generic blocklist CRUD core (BlockListApi)
//   admin-ineligibility — per-event ineligibility list (event-scoped factory)
//   admin-permanent-block — global permanent block list (factory)
//   csv-export          — CSV/roster downloads
export * from './admin-slots';
export * from './admin-events';
export * from './admin-event-slots';
export * from './admin-mail';
export * from './programAdminDb'; // Pronunciation Program: config / classes / blackouts

export { downloadAllRegistrationsCsv, downloadRegistrationsCsv, downloadAllRosterCsv, downloadRosterCsv, downloadEventRosterCsv, type CsvExportProgress } from './csv-export';
export { updateConfig } from './admin-config';
export { type BlockEntry, type BulkBlockInput, type BlockListApi } from './admin-block-list';
export {
  INELIGIBILITY_REASON_PRESETS,
  makeEventIneligibilityApi,
  type BulkIneligibilityInput,
  type IneligibilityEntry,
} from './admin-ineligibility';
export {
  ELIGIBILITY_NOTE_PRESETS,
  makeEventEligibilityApi,
  type BulkEligibilityInput,
  type EligibilityEntry,
} from './admin-eligibility';
export {
  PERMANENT_BLOCK_REASON_PRESETS,
  makePermanentBlockApi,
  type BulkPermanentBlockInput,
  type PermanentBlockEntry,
} from './admin-permanent-block';
export {
  REGISTRATIONS_PAGE_SIZE,
  adminUpdateRegistration,
  countRegistrations,
  listRegistrationsPage,
  type Registration,
  type RegistrationPageCursor,
  type RegistrationsPage,
} from './admin-registrations';
