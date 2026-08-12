// Shared slot-id generator for admin slot creation. The flat /slots admin
// operations (legacy assessment booking) were retired with the dual-path
// cleanup; the event-scoped slot admin lives in admin-event-slots.ts and reuses
// generateSlotId below.

/** Auto-generate slotId from type/date/startMin: e.g. SP-2206-1330, 3S-2306-0900 */
export function generateSlotId(type: 'Speaking' | '3 Skills', date: string, startMin: number): string {
  const prefix = type === 'Speaking' ? 'SP' : '3S';
  const parts = date.split('-');
  const dd = parts[2] ?? '00';
  const mm = parts[1] ?? '00';
  const hh = String(Math.floor(startMin / 60)).padStart(2, '0');
  const mn = String(startMin % 60).padStart(2, '0');
  return `${prefix}-${dd}${mm}-${hh}${mn}`;
}
