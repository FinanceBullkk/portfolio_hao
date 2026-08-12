import { describe, expect, it } from 'vitest';
import { toLocalDateTimeInputValue } from '../admin/datetime-local';

describe('admin datetime-local helpers', () => {
  it('formats Date values in local time for datetime-local inputs', () => {
    const localDeadline = new Date(2026, 5, 22, 17, 30);
    expect(toLocalDateTimeInputValue(localDeadline)).toBe('2026-06-22T17:30');
  });
});
