// Single client owner of the event theme system. Each preset KEY (kept byte-identical
// with functions/event-shape.js EVENT_THEME_COLORS) maps to a full dark "theme": an
// accent plus the soft/border/orgBg/glow tints and a radial cover gradient used by the
// Luma-style dark user app (design_handoff_user_events). The server whitelists the
// stored key; the client only ever renders these fixed values, never arbitrary CSS
// (constitution Principle VII).

export const EVENT_THEME_COLORS = [
  'slate', 'blue', 'violet', 'emerald', 'amber', 'rose', 'teal', 'indigo',
] as const;

export type EventThemeColor = (typeof EVENT_THEME_COLORS)[number];

export interface EventTheme {
  accent: string;
  accentSoft: string;
  accentBorder: string;
  orgBg: string;
  glow: string;
  coverBg: string; // radial-gradient string for the cover surface
}

// The four handoff themes (blue/amber/violet/teal) carry the exact values from the
// prototype seed; the rest are analogous dark variants so all eight keys are usable.
const THEMES: Record<EventThemeColor, EventTheme> = {
  blue: {
    accent: '#5b9bff', accentSoft: 'rgba(91,155,255,0.14)', accentBorder: 'rgba(91,155,255,0.3)',
    orgBg: 'rgba(91,155,255,0.13)', glow: 'rgba(91,155,255,0.55)',
    coverBg: 'radial-gradient(135% 120% at 18% 8%, #243a63 0%, #15203a 46%, #0e1424 100%)',
  },
  amber: {
    accent: '#e0a45c', accentSoft: 'rgba(224,164,92,0.15)', accentBorder: 'rgba(224,164,92,0.3)',
    orgBg: 'rgba(224,164,92,0.13)', glow: 'rgba(224,164,92,0.45)',
    coverBg: 'radial-gradient(135% 120% at 82% 6%, #4d3719 0%, #271c10 48%, #15110b 100%)',
  },
  violet: {
    accent: '#9b8bf2', accentSoft: 'rgba(155,139,242,0.15)', accentBorder: 'rgba(155,139,242,0.3)',
    orgBg: 'rgba(155,139,242,0.14)', glow: 'rgba(155,139,242,0.5)',
    coverBg: 'radial-gradient(135% 120% at 25% 12%, #352c5b 0%, #1d1838 46%, #131022 100%)',
  },
  teal: {
    accent: '#46c0a8', accentSoft: 'rgba(70,192,168,0.15)', accentBorder: 'rgba(70,192,168,0.3)',
    orgBg: 'rgba(70,192,168,0.14)', glow: 'rgba(70,192,168,0.45)',
    coverBg: 'radial-gradient(135% 120% at 78% 10%, #144a42 0%, #0f2b27 48%, #0c1816 100%)',
  },
  emerald: {
    accent: '#4cc985', accentSoft: 'rgba(76,201,133,0.14)', accentBorder: 'rgba(76,201,133,0.3)',
    orgBg: 'rgba(76,201,133,0.13)', glow: 'rgba(76,201,133,0.5)',
    coverBg: 'radial-gradient(135% 120% at 20% 10%, #18482f 0%, #102a1d 48%, #0b1712 100%)',
  },
  rose: {
    accent: '#e5645f', accentSoft: 'rgba(229,100,95,0.14)', accentBorder: 'rgba(229,100,95,0.3)',
    orgBg: 'rgba(229,100,95,0.13)', glow: 'rgba(229,100,95,0.5)',
    coverBg: 'radial-gradient(135% 120% at 80% 8%, #5b2a2a 0%, #321819 48%, #170d0d 100%)',
  },
  indigo: {
    accent: '#7d8cf8', accentSoft: 'rgba(125,140,248,0.14)', accentBorder: 'rgba(125,140,248,0.3)',
    orgBg: 'rgba(125,140,248,0.13)', glow: 'rgba(125,140,248,0.5)',
    coverBg: 'radial-gradient(135% 120% at 22% 10%, #2c2f63 0%, #1a1b3a 48%, #101023 100%)',
  },
  slate: {
    accent: '#94a3b8', accentSoft: 'rgba(148,163,184,0.14)', accentBorder: 'rgba(148,163,184,0.3)',
    orgBg: 'rgba(148,163,184,0.13)', glow: 'rgba(148,163,184,0.4)',
    coverBg: 'radial-gradient(135% 120% at 20% 10%, #2a3340 0%, #1a2029 48%, #11151b 100%)',
  },
};

// Events that have no themeColor still get a stable, varied look (like the prototype's
// per-event colours) by hashing the eventId over the colourful themes.
const FALLBACK_ORDER: EventThemeColor[] = ['blue', 'amber', 'violet', 'teal', 'emerald', 'indigo', 'rose'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function isEventThemeColor(key: string | undefined | null): key is EventThemeColor {
  return !!key && (EVENT_THEME_COLORS as readonly string[]).includes(key);
}

/** Full theme for an event: the picked preset, or a stable fallback derived from the id. */
export function eventTheme(key: string | undefined | null, seed = ''): EventTheme {
  if (isEventThemeColor(key)) return THEMES[key];
  return THEMES[FALLBACK_ORDER[hash(seed) % FALLBACK_ORDER.length]];
}

/** Just the accent colour (admin swatch picker, simple tints). '' / unknown → '' so a
 *  caller can fall back to a neutral default. */
export function themeAccent(key: string | undefined | null): string {
  return isEventThemeColor(key) ? THEMES[key].accent : '';
}

/** A short 2-char decorative glyph for the cover, derived from the event name. */
export function eventGlyph(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '•';
  if (words.length === 1) return words[0].slice(0, 2);
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Palette options for the admin swatch picker. */
export function themeColorOptions(): { key: EventThemeColor; label: string; accent: string }[] {
  const labels: Record<EventThemeColor, string> = {
    slate: 'Slate', blue: 'Blue', violet: 'Violet', emerald: 'Emerald',
    amber: 'Amber', rose: 'Rose', teal: 'Teal', indigo: 'Indigo',
  };
  return EVENT_THEME_COLORS.map((k) => ({ key: k, label: labels[k], accent: THEMES[k].accent }));
}
