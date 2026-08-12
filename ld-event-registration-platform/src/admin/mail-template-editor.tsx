import type { MailTemplate } from '../lib/mail-config';

// One per-shape template editor: subject + full-HTML body, a placeholder cheat-sheet,
// and a "send a sample to myself" button. Empty fields fall back to the server default.
export function MailTemplateEditor({
  meta, value, onChange, onTest, testing, disabled,
}: {
  meta: { key: string; label: string; vars: string[]; hasDetails: boolean };
  value: MailTemplate;
  onChange: (v: MailTemplate) => void;
  onTest: () => void;
  testing: boolean;
  disabled: boolean;
}) {
  const placeholders = [
    ...meta.vars.map((v) => `{{${v}}}`),
    ...(meta.hasDetails ? ['{{details}}'] : []),
  ].join('  ');

  return (
    <section className="card set-group" style={{ marginTop: 12 }}>
      <div className="set-group-hd">
        <div>
          <div className="gt">{meta.label}</div>
          <div className="gs">Leave blank to use the built-in default. Placeholders: <code>{placeholders}</code></div>
        </div>
        <button type="button" className="btn ghost sm" onClick={onTest} disabled={testing || disabled}>
          {testing ? 'Sending…' : 'Send test to me'}
        </button>
      </div>
      <label className="set-row stacked">
        <span className="set-label">Header title <span className="text-muted" style={{ fontWeight: 400 }}>· big title in the coloured header</span></span>
        <input className="input" value={value.title} placeholder="(default title)"
          onChange={(e) => onChange({ ...value, title: e.target.value })} />
      </label>
      <label className="set-row stacked">
        <span className="set-label">Subject</span>
        <input className="input" value={value.subject} placeholder="(default subject)"
          onChange={(e) => onChange({ ...value, subject: e.target.value })} />
      </label>
      <label className="set-row stacked">
        <span className="set-label">Body HTML</span>
        <textarea className="input textarea" rows={8} spellCheck={false} value={value.bodyHtml}
          placeholder="(default body)" style={{ fontFamily: 'monospace', minHeight: 140 }}
          onChange={(e) => onChange({ ...value, bodyHtml: e.target.value })} />
      </label>
    </section>
  );
}
