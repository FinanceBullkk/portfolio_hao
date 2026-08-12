import { useEffect, useState } from 'react';
import {
  loadMailConfig, saveMailConfig, sendTestMail, MAIL_SHAPES, DEFAULT_MAIL_CONFIG,
  type MailConfig, type MailTemplate,
} from '../lib/mail-config';
import { useAdminMutation } from './use-admin-mutation';
import { useToast } from '../confirm-toast-provider';
import { captureError } from '../lib/monitoring';
import { MailTemplateEditor } from './mail-template-editor';

// ── Email templates tab ──────────────────────────────────────────────────────
// Global mail config (config/main.mail): sender identity, brand shell, and per-shape
// HTML template overrides. Empty template fields fall back to the server's branded
// defaults. "Send test to me" renders a shape with sample data to the admin's inbox —
// the safety net for hand-edited HTML. Delivery stays on the Trigger Email extension
// (SMTP credentials are NOT configurable here — see docs/adr/0003).

const EMPTY: MailTemplate = { title: '', subject: '', bodyHtml: '' };

export function MailSettingsTab({ adminEmail }: { adminEmail: string }) {
  const [cfg, setCfg] = useState<MailConfig | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const { busy, run } = useAdminMutation();
  const toast = useToast();

  useEffect(() => {
    loadMailConfig()
      .then(setCfg)
      .catch((e) => { setErr((e as Error).message); captureError(e, { operation: 'admin.loadMailConfig' }); });
  }, []);

  if (err) return <div className="error-screen"><h2>Failed to load mail settings</h2><p>{err}</p></div>;
  if (!cfg) return <div className="loading"><span className="spinner" /> Loading…</div>;

  const set = (patch: Partial<MailConfig>) => { setCfg({ ...cfg, ...patch }); setDirty(true); };
  const setBrand = (patch: Partial<MailConfig['brand']>) => { setCfg({ ...cfg, brand: { ...cfg.brand, ...patch } }); setDirty(true); };
  const setTemplate = (key: string, v: MailTemplate) => { setCfg({ ...cfg, templates: { ...cfg.templates, [key]: v } }); setDirty(true); };

  const save = () => run(() => saveMailConfig(adminEmail, cfg), {
    successMessage: 'Mail settings saved.', fallbackError: 'Could not save mail settings.',
    onSuccess: () => setDirty(false),
  });

  // Test-send renders the SAVED config, so block it while there are unsaved edits.
  const test = async (shape: string) => {
    if (dirty) { toast('error', 'Save your changes first, then send a test.'); return; }
    setTesting(shape);
    try { await sendTestMail(shape); toast('success', `Test email sent to ${adminEmail}.`); }
    catch (e) { toast('error', (e as Error).message); }
    finally { setTesting(null); }
  };

  return (
    <>
      <section className="card set-group">
        <div className="set-group-hd"><div>
          <div className="gt">Sender identity</div>
          <div className="gs">From name + reply-to. SMTP credentials stay in the Trigger Email extension; the from address is best-effort (the relay may override it).</div>
        </div></div>
        <div className="cfg-grid">
          <label className="set-row stacked"><span className="set-label">Sender name</span>
            <input className="input" value={cfg.senderName} placeholder={DEFAULT_MAIL_CONFIG.senderName}
              onChange={(e) => set({ senderName: e.target.value })} /></label>
          <label className="set-row stacked"><span className="set-label">From address <span className="text-muted" style={{ fontWeight: 400 }}>· optional</span></span>
            <input className="input" value={cfg.fromAddress} placeholder="(use extension default)"
              onChange={(e) => set({ fromAddress: e.target.value })} /></label>
          <label className="set-row stacked"><span className="set-label">Reply-to <span className="text-muted" style={{ fontWeight: 400 }}>· optional</span></span>
            <input className="input" value={cfg.replyTo} placeholder="hr.team@cyberlogitec.com"
              onChange={(e) => set({ replyTo: e.target.value })} /></label>
        </div>
      </section>

      <section className="card set-group" style={{ marginTop: 16 }}>
        <div className="set-group-hd"><div>
          <div className="gt">Brand</div>
          <div className="gs">Header logo + colour shown on every confirmation email.</div>
        </div></div>
        <div className="cfg-grid">
          <label className="set-row stacked"><span className="set-label">Company name</span>
            <input className="input" value={cfg.brand.companyName} onChange={(e) => setBrand({ companyName: e.target.value })} /></label>
          <label className="set-row stacked"><span className="set-label">Brand colour</span>
            <input className="input" value={cfg.brand.brandColor} placeholder="#1a73e8" onChange={(e) => setBrand({ brandColor: e.target.value })} /></label>
          <label className="set-row stacked"><span className="set-label">Logo URL</span>
            <input className="input" value={cfg.brand.logoUrl} onChange={(e) => setBrand({ logoUrl: e.target.value })} /></label>
        </div>
        <label className="set-row stacked"><span className="set-label">Footer / signature <span className="text-muted" style={{ fontWeight: 400 }}>· HTML, shown below the divider on every email; supports {'{{vars}}'}</span></span>
          <textarea className="input textarea" rows={3} spellCheck={false} value={cfg.footer}
            placeholder="e.g. <p>— The L&amp;D Team · CyberLogitec</p>" style={{ fontFamily: 'monospace' }}
            onChange={(e) => set({ footer: e.target.value })} /></label>
      </section>

      <div className="cfg-sec-hd" style={{ marginTop: 20 }}><span className="lbl">Templates</span><span className="rule" /></div>
      {MAIL_SHAPES.map((meta) => (
        <MailTemplateEditor key={meta.key} meta={meta}
          value={cfg.templates[meta.key] ?? EMPTY}
          onChange={(v) => setTemplate(meta.key, v)}
          onTest={() => test(meta.key)}
          testing={testing === meta.key}
          disabled={busy || dirty} />
      ))}

      <div className="save-bar">
        <div className="save-bar-inner">
          <div className={`save-status${dirty ? ' dirty' : ''}`}><span className="sdot" /><span>{dirty ? 'Unsaved changes' : 'No changes'}</span></div>
          <button className="btn" type="button" onClick={save} disabled={busy || !dirty}>{busy ? <><span className="spinner" /> Saving…</> : 'Save mail settings'}</button>
        </div>
      </div>
    </>
  );
}
