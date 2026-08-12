import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/** Initialize Sentry once at app startup. No-op when DSN is not configured. */
export function initMonitoring(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // Only report errors, not performance traces (keeps free quota)
    tracesSampleRate: 0,
    // Ignore noise: popup-closed is user-initiated, not an error
    ignoreErrors: [/popup-closed/i, /cancelled-popup/i, /popup-blocked/i],
  });
}

/**
 * Report an error to Sentry (if configured) with optional context tags.
 * Never throws — safe to call from inside catch blocks.
 */
export function captureError(
  error: unknown,
  context?: { operation?: string; extra?: Record<string, unknown> }
): void {
  if (DSN) {
    Sentry.captureException(error, {
      tags: context?.operation ? { operation: context.operation } : undefined,
      extra: context?.extra,
    });
  } else {
    // Keep console.warn as local fallback (useful in dev / when DSN not set).
    // Constant format string (%s) so a non-literal operation can't forge the log
    // message — see semgrep unsafe-formatstring (CWE-134).
    console.warn('[%s]', context?.operation ?? 'error', error);
  }
}

/**
 * Map FirebaseError codes to user-friendly English messages.
 * Falls back to the raw message for non-Firebase errors.
 */
export function friendlyFirestoreError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const message = String((e as Error)?.message || '');
  // App Check / attestation failures surface as opaque codes — give a recoverable hint.
  if (/app[\s-]?check|attestation|recaptcha/i.test(message))
    return "We couldn't verify this device. Please refresh and try again — if it persists, check your network or any ad-blocker.";
  if (code === 'permission-denied') return 'You do not have permission to perform this action.';
  if (code === 'unavailable' || code === 'deadline-exceeded')
    return 'Connection temporarily interrupted. Please try again.';
  if (code === 'internal' || code === 'resource-exhausted')
    return 'Something went wrong on our side. Please try again in a moment.';
  if (code === 'not-found') return 'The requested data was not found.';
  if (code === 'unauthenticated') return 'Your session has expired. Please sign in again.';
  return message || 'An unexpected error occurred.';
}
