import { describe, it, expect } from 'vitest';

// The render engine is plain CommonJS in functions/; require it directly (same pattern
// as my-registrations.test.ts) — these are pure functions, no Firestore.
const {
  escHtml, substitute, renderInfoBox, renderShell, renderTemplate, queueMail, loadMailConfig, mergeMail,
} = require('../../functions/mail-render');

describe('mail-render · substitute', () => {
  it('HTML-escapes variable values in the body', () => {
    expect(substitute('Hi {{n}}', { n: '<b>x</b>' }, escHtml)).toBe('Hi &lt;b&gt;x&lt;/b&gt;');
  });
  it('does NOT escape in subject mode (raw)', () => {
    expect(substitute('A {{n}}', { n: 'Q2 & beyond' }, null)).toBe('A Q2 & beyond');
  });
  it('leaves {{details}} intact for separate injection', () => {
    expect(substitute('a {{details}} b', {}, escHtml)).toBe('a {{details}} b');
  });
  it('strips unknown placeholders (not left literal)', () => {
    expect(substitute('x {{missing}} z', {}, escHtml)).toBe('x  z');
  });
  it('tolerates spacing inside the braces', () => {
    expect(substitute('{{ n }}', { n: 'ok' }, escHtml)).toBe('ok');
  });
});

describe('mail-render · renderInfoBox', () => {
  it('returns empty string when there are no rows', () => {
    expect(renderInfoBox([], '#1a73e8')).toBe('');
  });
  it('renders label + escaped value, skips empty-value rows', () => {
    const html = renderInfoBox([
      { label: 'Class', value: 'EL040 & co' },
      { label: 'Topic', value: '' },
    ], '#1a73e8');
    expect(html).toContain('Class');
    expect(html).toContain('EL040 &amp; co');
    expect(html).not.toContain('Topic'); // empty value pruned
  });
});

describe('mail-render · renderShell', () => {
  it('injects brand colour, logo and company (escaped)', () => {
    const html = renderShell({ brand: { brandColor: '#abcdef', logoUrl: 'http://x/y?a=1&b=2', companyName: 'A&B' }, title: 'Hi <there>', innerHtml: '<p>body</p>' });
    expect(html).toContain('background:#abcdef');
    expect(html).toContain('a=1&amp;b=2');
    expect(html).toContain('A&amp;B');
    expect(html).toContain('Hi &lt;there&gt;');
    expect(html).toContain('<p>body</p>');
  });
});

describe('mail-render · renderTemplate', () => {
  const base = {
    shape: 'simpleEvent.register', title: 'Registration Confirmed',
    vars: { fullName: 'Tran <X>', eventName: 'Town Hall & Co' },
    detailsRows: [],
    subjectFallback: '[{{eventName}}] Registration confirmation',
    bodyFallback: '<p>Dear {{fullName}}</p>{{details}}<p>{{unknown}}done</p>',
  };

  it('uses fallbacks when no override; escapes body vars; raw subject', () => {
    const { subject, html } = renderTemplate({ cfgMail: { templates: {} }, ...base });
    expect(subject).toBe('[Town Hall & Co] Registration confirmation'); // subject not HTML-escaped
    expect(html).toContain('Dear Tran &lt;X&gt;');                      // body escaped
    expect(html).not.toContain('{{unknown}}');                         // unknown stripped
    expect(html).toContain('done');
  });

  it('uses a config override body/subject when present', () => {
    const cfgMail = { templates: { 'simpleEvent.register': { subject: 'Hello {{fullName}}', bodyHtml: '<b>{{eventName}}</b>{{details}}' } } };
    const { subject, html } = renderTemplate({ cfgMail, ...base });
    expect(subject).toBe('Hello Tran <X>'); // raw subject
    expect(html).toContain('<b>Town Hall &amp; Co</b>');
  });

  it('replaces {{details}} with the rendered info-box', () => {
    const { html } = renderTemplate({ cfgMail: { templates: {} }, ...base, detailsRows: [{ label: 'Event', value: 'Town Hall' }] });
    expect(html).toContain('border-left:4px solid'); // info-box rendered
    expect(html).toContain('Town Hall');
    expect(html).not.toContain('{{details}}');
  });

  it('sanitizes a malicious brand colour to the default', () => {
    const cfgMail = { templates: {}, brand: { brandColor: 'red;evil:1' } };
    const { html } = renderTemplate({ cfgMail, ...base });
    expect(html).toContain('background:#1a73e8'); // fell back
    expect(html).not.toContain('evil:1');
  });

  it('applies a per-shape header title override + a global footer (var values escaped)', () => {
    const cfgMail = {
      footer: '<p>— {{fullName}} · L&D</p>',
      templates: { 'simpleEvent.register': { title: 'Welcome {{fullName}}', subject: 'Hi', bodyHtml: 'Body {{eventName}}' } },
    };
    const { html } = renderTemplate({ cfgMail, ...base });
    expect(html).toContain('Welcome Tran &lt;X&gt;'); // title: substituted then shell-escaped
    expect(html).toContain('— Tran &lt;X&gt; · L&D'); // footer: value escaped, markup trusted
  });

  it('renders no footer row when footer is empty', () => {
    const { html } = renderTemplate({ cfgMail: { templates: {} }, ...base });
    expect(html).not.toContain('padding:18px 40px 24px'); // footer cell style
  });
});

describe('mail-render · queueMail', () => {
  const fakeDb = () => { const adds: any[] = []; return { adds, collection: () => ({ add: async (d: any) => { adds.push(d); } }) }; };

  it('omits `from` when no fromAddress (uses extension DEFAULT_FROM)', async () => {
    const db = fakeDb();
    await queueMail(db, { senderName: 'L&D Team', fromAddress: '', replyTo: '' }, { to: 'a@x.com', subject: 'S', html: 'H' });
    expect(db.adds[0].from).toBeUndefined();
    expect(db.adds[0]).toMatchObject({ to: 'a@x.com', message: { subject: 'S', html: 'H' } });
  });
  it('sets `from` as "Name <addr>" and replyTo when configured', async () => {
    const db = fakeDb();
    await queueMail(db, { senderName: 'L&D Team', fromAddress: 'no-reply@x.com', replyTo: 'hr@x.com' }, { to: 'a@x.com', subject: 'S', html: 'H' });
    expect(db.adds[0].from).toBe('L&D Team <no-reply@x.com>');
    expect(db.adds[0].replyTo).toBe('hr@x.com');
  });
});

describe('mail-render · loadMailConfig + mergeMail', () => {
  it('merges a partial override over the defaults', () => {
    const merged = mergeMail(
      { senderName: 'D', fromAddress: '', replyTo: '', brand: { companyName: 'C', brandColor: '#000', logoUrl: 'L' }, templates: {} },
      { senderName: 'Custom', brand: { brandColor: '#fff' } },
    );
    expect(merged.senderName).toBe('Custom');
    expect(merged.brand.brandColor).toBe('#fff');
    expect(merged.brand.companyName).toBe('C'); // untouched default kept
  });
  it('reads config/main.mail and merges; returns defaults when missing', async () => {
    const withMail = { doc: () => ({ get: async () => ({ exists: true, data: () => ({ mail: { senderName: 'X' } }) }) }) };
    const cfg = await loadMailConfig(withMail);
    expect(cfg.senderName).toBe('X');
    expect(cfg.brand.companyName).toBe('CyberLogitec'); // default

    const noDoc = { doc: () => ({ get: async () => ({ exists: false }) }) };
    expect((await loadMailConfig(noDoc)).senderName).toBe('L&D Team');

    const throws = { doc: () => ({ get: async () => { throw new Error('no firebase'); } }) };
    expect((await loadMailConfig(throws)).senderName).toBe('L&D Team'); // defensive
  });
});
