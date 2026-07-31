# Design Guidelines — portfolio_hao

Single source of truth for how this site is designed. Any new page, case study, or mockup MUST follow this document. Reference implementation: `certificate-pipeline.html`.

## 1. Core philosophy

The site uses a **three-layer visual model**:

| Layer | Look | Purpose |
|---|---|---|
| **Page** | Dark monochrome (`#0a0a0a`), off-white text, bold condensed headings, thin 1px rules, no cards | Editorial voice — inspired by aristidebenoist.com. Settled; do not redesign. |
| **Mockups** | **Light surfaces** (`#fbfbfa`) framed like app windows | Read as *screenshots of real tools* sitting on the dark page. Real apps (Sheets, Canva, Gmail…) are white UIs — mocks must match reality. |
| **Accents** | Real brand colors, used sparingly | Only inside mockups + automation highlights. Never for page chrome, nav, headings, or body text. |

Rule of thumb: **the page whispers, the mockups are the evidence, color marks only what matters** (tool identity, pass/fail, automation).

## 2. Tokens

Dark page tokens live in `assets/css/base.css` (`--bg*`, `--fg*`, `--border*`, fonts). Light-mock + brand tokens live in `assets/css/certificate-pipeline-mocks.css` `:root`:

- **Light surfaces** `--m-*`: `--m-bg` #fbfbfa · `--m-bg2` #f1f3f4 · `--m-text` #202124 · `--m-text2` #5f6368 · `--m-text3` #9aa0a6 · `--m-border` #e0e3e7 · `--m-border2` #cdd1d6
- **Semantic on light**: green `--m-green`(+`-bg`,`-bd`) = success/sent/match · amber `--m-amber`(+…) = pending/warning/flagged · mint `--m-mint`(+…) = dry-run/preview actions
- **Brand identity**: `--sheets-green`, `--canva-purple`, `--canva-teal`, `--ilovepdf-red`, `--gmail-blue`, Drive gradient — used for `.brand-icon` chips and primary buttons of that tool only
- **On-dark accents**: `--amber`/`--amber-dim` for automation badges & `.time-chip` on the dark page

Never hardcode new grays; extend the token block if something is missing.

## 3. Mockup construction rules

1. Every mockup is a `.mock-shot`: light card, 1px `var(--border-lg)` border, 6px radius, and a `.chrome` bar (3 gray dots + `.brand-icon.<tool>` + window title in mono).
2. Content inside is **DOM, not images** — tables, buttons, log lines. Stays crisp at any size, themable, no PII risk.
3. Type inside mocks: mono ≥ 10.5px, body ≥ 11.5px. Dark text on light (`--m-text*`) — never dark-theme tokens inside a mock.
4. Status/semantic chips use the light tag pattern: colored text + tinted bg + tinted border (e.g. `To-be-printed` amber, `Sent · test` green).
5. Buttons: the tool's real primary color for its primary action (Gmail Send = blue, ilovepdf Split = red, Canva Continue = purple); secondary actions use mint/green/amber tints per semantics above.
6. Wide tables get an `overflow-x:auto` wrapper (mobile).
7. Every mockup carries a `.caption` ending in `(test data)`.

## 4. Content rules (non-negotiable)

- **No real PII ever**: fake roster names only (`Nguyen Van A`, `Tran Thi B`…), masked codes (`19xxxx`), `you@example.com` for self, `*@example.com` for others.
- **Numbers must be coherent across a page**: one batch narrative (43 pages → 42 renamed + 1 flagged → 42 files in Drive → "… 37 more rows — 43 total"). Never mix scales between mocks.
- **Honesty**: mocks reproduce real UI faithfully (real button labels, real menu names like `Cert Sender ▾`, Vietnamese labels kept as-is). Don't invent features or metrics; unverified numbers stay out.

## 5. Presenting a workflow (case-study pattern)

A workflow page uses, in order:

1. **`.flow-demo` carousel** — the "video": one `.flow-demo-panel` per step with `.mini-*` components, auto-advance 4s (`assets/js/flow-demo.js`), prev/next buttons + clickable dots, hover pauses. Panels are simplified teasers of the full steps below.
2. **`.flow-sequence`** — numbered vertical steps connected by line + `↓` arrow. One step = kicker (`Manual ·` / `Automated ·` + tool) → title → body → mockup → caption → optional checklist.
3. **Automation must be visibly marked**: automated steps get class `auto` (amber-filled `.num-badge`) + a `.time-chip` stating the manual-before comparison ("one run — was 2–3 days"). Manual prep steps keep the outline badge, no chip.
4. **Differentiators get an "anatomy" exhibit**, not prose: a light card that *shows* the mechanism — `.match-anatomy` (source → extraction → output, matching parts share a color) and `.verify-anatomy` (key-check rows with ✓/✗ chips and a verdict). One anatomy per hard-won idea, placed next to the step that proves it.
5. Before/after comparisons reuse `.ba-grid`; stack old-process mocks with `.mini-connector` ("then, one by one").

## 6. Motion

- Scroll reveals via `[data-reveal]` + `reveal.js` (respects reduced-motion).
- In-mock micro-animation (e.g. renamer log lines) is CSS keyframes triggered by `.is-visible`, staggered ~0.2s/line.
- The flow-demo carousel is JS-driven and **intentionally ignores** `prefers-reduced-motion` (decorative, user-controllable, pausable); everything it shows also exists statically in `.flow-sequence` below — that redundancy is the accessibility fallback. Keep it that way.

## 7. Files & naming

- Per-page mock styles get their own kebab-case file (`certificate-pipeline-mocks.css`, `certificate-pipeline-flow-demo.css`); keep each under ~200 lines — split by concern when exceeded.
- Shared patterns (`.caption`, `.stat-bar`, `.numbered-list`, `.ba-grid`…) live in `case-study.css`; page-agnostic chrome in `base.css`. Check these before writing new CSS.
- JS: one small vanilla file per behavior (`reveal.js`, `flow-demo.js`). No frameworks, no external requests beyond Google Fonts.

## 8. New case-study checklist

1. Interview for the real workflow: exact steps, real tool/menu names, where automation starts, what the precision mechanism is.
2. Pick a coherent batch number; derive every figure from it.
3. Build step mockups (light, DOM, fake data) → flow-sequence → mark `auto` steps + time-chips → add 1–2 anatomy exhibits for the differentiators → build the flow-demo panels last (simplified copies).
4. Verify: desktop + mobile screenshots, table overflow, carousel controls, log animation, no dark tokens inside mocks (`grep "fg-\|bg-raised\|bg-card" <mock css>`).
5. Captions all end `(test data)`; footer notes the mockup policy.

## Don't

- Don't put raster screenshots or videos of real company data on the site.
- Don't color page chrome — brand color belongs inside mockups only.
- Don't add a mock style that contradicts the real tool's UI.
- Don't state durations/metrics that were never confirmed by the owner.
- Don't reintroduce `filter: grayscale(1)` mocks — superseded by the light-surface system.
