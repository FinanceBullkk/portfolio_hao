import { themeColorOptions } from '../lib/event-theme';

// Swatch picker for an event's preset theme-color key ('' = none/neutral). Extracted from
// the event drawer so the colour list + swatch styling live in one place. Renders the
// whole "Theme color" field (label + swatches + help). Value is a theme-color KEY, never
// raw CSS — the server whitelists the stored key (constitution Principle VII).
export function ThemeColorPicker({
  value, onChange,
}: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="field">
      <label className="label">Theme color <span className="opt">(optional)</span></label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onChange('')}
          aria-pressed={value === ''}
          title="None (neutral)"
          style={{
            width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
            border: value === '' ? '2px solid #111' : '1px solid #cbd5e1',
            background: 'repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 4px,#e2e8f0 4px,#e2e8f0 8px)',
          }}
        />
        {themeColorOptions().map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            aria-pressed={value === c.key}
            title={c.label}
            style={{
              width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', background: c.accent,
              border: value === c.key ? '2px solid #111' : '1px solid rgba(0,0,0,.15)',
              outline: value === c.key ? `2px solid ${c.accent}` : 'none', outlineOffset: 2,
            }}
          />
        ))}
      </div>
      <span className="help">A light accent used on the card and detail page. “None” keeps the neutral look.</span>
    </div>
  );
}
