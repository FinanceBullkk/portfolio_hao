export function toLocalDateTimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isoToLocalDateTimeInputValue(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : toLocalDateTimeInputValue(d);
}
