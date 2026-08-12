import { useEffect, useState, type ReactNode } from 'react';
import { updateConfig } from '../lib/adminDb';
import { useAdminMutation } from './use-admin-mutation';
import { useConfirm, useToast } from '../confirm-toast-provider';
import { type ConfigState } from './admin-utils';
import { formatTime } from '../lib/format-date';

// ── Config ──────────────────────────────────────────────────────────────────
// Per-event model: enrollment window, deadline, confirmation email and slot-change
// limits live on each event (Events → ⋯ → Edit). This page keeps only what's
// genuinely platform-wide: the BU list + admin permissions. (The legacy flat
// assessment booking flow — and its config/main fields — were removed.)

/** Section header: uppercase label + scope badge + hairline rule. */
function ScopeHeader({ label, badge }: { label: string; badge: string }) {
  return (
    <div className="cfg-sec-hd">
      <span className="lbl">{label}</span>
      <span className="scope-badge brand">{badge}</span>
      <span className="rule" />
    </div>
  );
}

const ICON = {
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>,
  bu: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-5h6v5M3 21h18" /></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>,
};

function GroupCard({ icon, title, desc, children }: { icon: ReactNode; title: string; desc: string; children: ReactNode }) {
  return (
    <section className="card set-group">
      <div className="set-group-hd">
        <span className="gi" aria-hidden="true">{icon}</span>
        <div><div className="gt">{title}</div><div className="gs">{desc}</div></div>
      </div>
      {children}
    </section>
  );
}

export function ConfigTab({
  adminEmail, cfg, onReload,
}: { adminEmail: string; cfg: ConfigState; onReload: () => void }) {
  const [adminEmails, setAdminEmails] = useState(cfg.adminEmails.join('\n'));
  const [buList, setBuList] = useState(cfg.buList.join('\n'));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const { busy, run } = useAdminMutation();
  const toast = useToast();
  const confirm = useConfirm();

  // Sync local state when cfg prop changes (after onReload fetches fresh config)
  useEffect(() => {
    setAdminEmails(cfg.adminEmails.join('\n'));
    setBuList(cfg.buList.join('\n'));
    setDirty(false);
  }, [cfg]);

  // Warn before leaving (close/reload) while there are unsaved config changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const markDirty = () => setDirty(true);

  const save = async () => {
    const extraAdmins = adminEmails.split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    // BU codes: trim, drop empties, de-dup, keep order. Empty list = revert to the
    // server default (DEFAULT_BU_LIST).
    const bus = [...new Set(buList.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];
    // Guard (F-B1): admin authority is derived SOLELY from this list — in the client,
    // Firestore rules AND Cloud Functions — with no built-in owner. An empty list locks
    // EVERYONE out, and because the config write is itself gated by isAdmin(), it is
    // unrecoverable from the app (only the Firestore console can restore it). Refuse it.
    if (extraAdmins.length === 0) {
      toast('error', 'Admin emails can’t be empty — that would lock everyone out of the console. Keep at least one admin.');
      return;
    }
    // Removing your own email leaves the other admins listed but costs YOU access —
    // make that explicit rather than silently locking the current admin out.
    if (!extraAdmins.includes(adminEmail.trim().toLowerCase())) {
      const ok = await confirm({
        title: 'Remove your own admin access?',
        message: `Your account (${adminEmail}) isn’t in the list, so you’ll lose access to this console after saving. The other admins listed keep theirs. Continue?`,
        confirmText: 'Remove my access',
        cancelText: 'Keep me listed',
      });
      if (!ok) return;
    }
    await run(
      () => updateConfig(adminEmail, { adminEmails: extraAdmins, buList: bus }),
      {
        successMessage: 'Configuration saved.',
        onSuccess: () => { setSavedAt(formatTime(new Date())); setDirty(false); onReload(); },
      },
    );
  };

  const undo = () => {
    setAdminEmails(cfg.adminEmails.join('\n'));
    setBuList(cfg.buList.join('\n'));
    setDirty(false);
  };

  return (
    <>
      {/* explainer banner — point admins to where per-event rules now live */}
      <div className="cfg-banner">
        <span className="ic">{ICON.info}</span>
        <p>Registration rules — <b>enrollment window, deadline, confirmation email, slot changes</b> — live on each <b>event</b> and are edited in <b>Events → ⋯ → Edit</b>. This page controls only the settings that are genuinely shared across every event.</p>
      </div>

      {/* PLATFORM-WIDE */}
      <ScopeHeader label="Platform-wide" badge="Applies to all events" />
      <div className="cfg-grid">
        <GroupCard icon={ICON.bu} title="Business units (BU)" desc="Team dropdown in every registration form.">
          <div className="set-row stacked">
            <div className="set-info"><div className="set-label">BU list <span className="text-muted" style={{ fontWeight: 400 }}>· one per line</span></div>
              <div className="set-desc">Used as the team dropdown in every form. Leave empty to fall back to the system default.</div></div>
            <textarea className="input textarea" aria-label="BU list" value={buList} spellCheck={false}
              onChange={(e) => { setBuList(e.target.value); markDirty(); }} placeholder="BSG&#10;CHORUS&#10;LBU" />
          </div>
        </GroupCard>
        <GroupCard icon={ICON.shield} title="Admin permissions" desc="Who can open this console.">
          <div className="set-row stacked">
            <div className="set-info"><div className="set-label">Admin emails <span className="text-muted" style={{ fontWeight: 400 }}>· one per line</span></div>
              <div className="set-desc">The single source of admin authority for the UI, rules and Cloud Functions.</div></div>
            <textarea className="input textarea" aria-label="Admin emails" value={adminEmails} spellCheck={false}
              onChange={(e) => { setAdminEmails(e.target.value); markDirty(); }} placeholder="admin@cyberlogitec.com&#10;hr.team@cyberlogitec.com" />
          </div>
        </GroupCard>
      </div>

      {/* Sticky save bar */}
      <div className="save-bar">
        <div className="save-bar-inner">
          <div className={`save-status${dirty ? ' dirty' : ''}`}>
            <span className="sdot"></span>
            <span>{dirty ? 'Unsaved changes' : savedAt ? `Saved · last updated ${savedAt}` : 'No changes yet'}</span>
          </div>
          <div className="row" style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" type="button" disabled={!dirty} onClick={undo}>Undo</button>
            <button className="btn" type="button" onClick={save} disabled={busy || !dirty}>
              {busy ? <><span className="spinner" /> Saving…</> : 'Save configuration'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
