import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToastKind = 'success' | 'error' | 'info';
type Toast = { id: string; kind: ToastKind; text: string };

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmRequest = ConfirmOptions & { id: string; resolve: (ok: boolean) => void };

type Ctx = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  toast: (kind: ToastKind, text: string) => void;
};

const ConfirmContext = createContext<Ctx | null>(null);

function uid(): string {
  return Math.random().toString(36).slice(2);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [req, setReq] = useState<ConfirmRequest | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((kind: ToastKind, text: string) => {
    // Auto-dismiss is owned by each ToastItem so it can pause on hover.
    setToasts((t) => [...t, { id: uid(), kind, text }]);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setReq({ ...opts, id: uid(), resolve });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    setReq((cur) => {
      if (cur) cur.resolve(ok);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, toast }}>
      {children}
      {req && <ConfirmDialog req={req} onClose={close} />}
      {toasts.length > 0 && (
        <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// ─── Toast item (self-dismissing, pauses on hover, manual close) ───────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const timer = useRef<number | undefined>(undefined);
  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onDismiss(toast.id), 5000);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    start();
    return () => window.clearTimeout(timer.current);
  }, [start]);

  return (
    <div
      className={`toast ${toast.kind}`}
      role="status"
      onMouseEnter={() => window.clearTimeout(timer.current)}
      onMouseLeave={start}
    >
      <span className="toast-text">{toast.text}</span>
      <button type="button" className="toast-x" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>×</button>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ req, onClose }: { req: ConfirmRequest; onClose: (ok: boolean) => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Destructive dialogs focus the SAFE (Cancel) action so a stray Enter/Space
    // can't confirm a delete; non-destructive ones focus Confirm for speed.
    (req.danger ? cancelRef : okRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(false); return; }
      // Enter confirms only for non-destructive dialogs.
      if (e.key === 'Enter' && !req.danger) { onClose(true); return; }
      if (e.key === 'Tab') {
        // Minimal focus trap between the dialog's two actions.
        e.preventDefault();
        (document.activeElement === okRef.current ? cancelRef : okRef).current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, req.danger]);

  return (
    <div className="modal-backdrop" onClick={() => onClose(false)}>
      <div
        className="modal"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={req.title}
      >
        <div className="modal-hd">
          <div className="modal-title">{req.title}</div>
        </div>
        {req.message != null && (
          <div className="modal-bd" style={{ whiteSpace: 'pre-line' }}>
            {req.message}
          </div>
        )}
        <div className="modal-ft">
          <button ref={cancelRef} className="btn ghost" onClick={() => onClose(false)}>
            {req.cancelText ?? 'Cancel'}
          </button>
          <button
            ref={okRef}
            className={`btn${req.danger ? ' danger' : ''}`}
            onClick={() => onClose(true)}
          >
            {req.confirmText ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

export function useToast() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useToast must be used within ConfirmProvider');
  return ctx.toast;
}
