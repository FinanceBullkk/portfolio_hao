import { useCallback, useState } from 'react';
import { useToast } from '../confirm-toast-provider';

interface AdminMutationOptions<T> {
  /** Success toast. A function receives the mutation result (e.g. a count). Omit to skip. */
  successMessage?: string | ((result: T) => string);
  /** Tab-specific work after success — close the drawer, refetch the collection, etc. */
  onSuccess?: (result: T) => void;
  /** Error toast used when the thrown error carries no message. */
  fallbackError?: string;
}

/**
 * Owns the admin mutation lifecycle in one place: busy flag → run → success
 * toast + onSuccess → error toast → clear busy. Every admin save/delete used to
 * re-grow this same try/catch/toast/finally; now a tab just declares the
 * mutation and what to refetch.
 *
 * Validation stays with the caller — only call `run` once inputs are valid.
 * Bulk operations with partial-failure messaging and progress-tracked exports
 * keep their own bespoke handling; they are a different lifecycle, not this one.
 */
export function useAdminMutation() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const run = useCallback(
    async <T>(fn: () => Promise<T>, opts: AdminMutationOptions<T> = {}): Promise<void> => {
      setBusy(true);
      try {
        const result = await fn();
        if (opts.successMessage != null) {
          toast('success', typeof opts.successMessage === 'function' ? opts.successMessage(result) : opts.successMessage);
        }
        opts.onSuccess?.(result);
      } catch (e) {
        toast('error', (e as Error).message || opts.fallbackError || 'Operation failed.');
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  return { busy, run };
}
