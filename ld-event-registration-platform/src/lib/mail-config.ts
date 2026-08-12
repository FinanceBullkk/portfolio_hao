import { doc, getDoc } from 'firebase/firestore';
import { db } from './firestore-db';
import { updateConfig } from './admin-config';
import { callable } from './callable';

// Client-side view of config/main.mail — the sender identity + brand shell + per-shape
// HTML template overrides edited in the admin "Email templates" tab. Mirrors DEFAULT_MAIL
// in functions/defaults.js (TS/JS runtime seam): keep the field names + defaults in sync.
// An empty template field means "use the server's hardcoded default body" (engine in
// functions/mail-render.js), so the editor ships pre-filled with the defaults as guidance.

export interface MailTemplate {
  title: string;   // header title override (blank = code default)
  subject: string;
  bodyHtml: string;
}

export interface MailConfig {
  senderName: string;
  fromAddress: string;
  replyTo: string;
  footer: string;  // signature / footer HTML below the divider (supports {{vars}})
  brand: { companyName: string; brandColor: string; logoUrl: string };
  templates: Record<string, MailTemplate>;
}

export const DEFAULT_MAIL_CONFIG: MailConfig = {
  senderName: 'L&D Team',
  fromAddress: '',
  replyTo: '',
  footer: '',
  brand: {
    companyName: 'CyberLogitec',
    brandColor: '#1a73e8',
    logoUrl: 'https://lh3.googleusercontent.com/d/1wF3-Snh6dJqhMrnMkAYgu_4yFYu8DNGB',
  },
  templates: {},
};

// Message shapes the admin can override, with the placeholder vocabulary each exposes
// (shown as an inline cheat-sheet) and whether a `{{details}}` info-box is rendered.
export const MAIL_SHAPES: { key: string; label: string; vars: string[]; hasDetails: boolean }[] = [
  { key: 'simpleEvent.register', label: 'Simple event · registered', vars: ['fullName', 'eventName', 'eventDate', 'time', 'location', 'format', 'deadline'], hasDetails: true },
  { key: 'slottedEvent.register', label: 'Assessment · booked / updated', vars: ['fullName', 'assessmentName', 'verb', 'action', 'slotsNoun'], hasDetails: true },
  { key: 'program.book', label: 'Program · session booked', vars: ['picName', 'classCode', 'className', 'date', 'timeSlot', 'topic'], hasDetails: true },
  { key: 'program.move', label: 'Program · session rescheduled', vars: ['picName', 'classCode', 'className', 'date', 'timeSlot', 'topic'], hasDetails: true },
  { key: 'program.cancel', label: 'Program · session cancelled', vars: ['picName', 'classCode', 'className', 'date', 'topic'], hasDetails: true },
];

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

/** Read config/main.mail, merged over the defaults (defensive against partial/missing data). */
export async function loadMailConfig(): Promise<MailConfig> {
  try {
    if (!db || !import.meta.env.VITE_FIREBASE_API_KEY) return DEFAULT_MAIL_CONFIG;
    const snap = await getDoc(doc(db, 'config', 'main')).catch(() => null);
    const m = (snap && snap.exists() ? (snap.data().mail as Partial<MailConfig> | undefined) : undefined) ?? {};
    const brand = (m.brand && typeof m.brand === 'object' ? m.brand : {}) as Partial<MailConfig['brand']>;
    const templates: Record<string, MailTemplate> = {};
    const rawTemplates = m.templates && typeof m.templates === 'object' ? m.templates : {};
    for (const s of MAIL_SHAPES) {
      const t = rawTemplates[s.key] as Partial<MailTemplate> | undefined;
      if (t) {
        templates[s.key] = {
          title: str(t.title, ''),
          subject: str(t.subject, ''),
          bodyHtml: str(t.bodyHtml, ''),
        };
      }
    }
    return {
      senderName: str(m.senderName, DEFAULT_MAIL_CONFIG.senderName),
      fromAddress: str(m.fromAddress, DEFAULT_MAIL_CONFIG.fromAddress),
      replyTo: str(m.replyTo, DEFAULT_MAIL_CONFIG.replyTo),
      footer: str(m.footer, DEFAULT_MAIL_CONFIG.footer),
      brand: {
        companyName: str(brand.companyName, DEFAULT_MAIL_CONFIG.brand.companyName),
        brandColor: str(brand.brandColor, DEFAULT_MAIL_CONFIG.brand.brandColor),
        logoUrl: str(brand.logoUrl, DEFAULT_MAIL_CONFIG.brand.logoUrl),
      },
      templates,
    };
  } catch {
    return DEFAULT_MAIL_CONFIG;
  }
}

/** Persist the mail config to config/main.mail. Empty template fields are pruned so an
 *  unset override stays unset (and the server default body keeps applying). */
export async function saveMailConfig(adminEmail: string, mail: MailConfig): Promise<void> {
  const templates: Record<string, MailTemplate> = {};
  for (const [k, t] of Object.entries(mail.templates)) {
    const title = t.title.trim();
    const subject = t.subject.trim();
    const bodyHtml = t.bodyHtml.trim();
    if (title || subject || bodyHtml) templates[k] = { title, subject, bodyHtml };
  }
  await updateConfig(adminEmail, { mail: { ...mail, templates } });
}

/** Send a sample of the given shape to the calling admin (server renders + queues /mail). */
export function sendTestMail(shape: string): Promise<{ ok: boolean }> {
  return callable('sendTestMail', { shape });
}
