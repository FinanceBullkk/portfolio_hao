# Phase 1 — restyle the shared CSS

**Edits: CSS only. Do not open any `.html` file in this phase.**

After this phase all 5 pages will already look ~80% converted, because the class names in their
HTML stay the same and we are changing what those classes mean.

Three tasks, in order:
1. Replace `assets/css/case-study.css` entirely.
2. Replace `assets/css/about.css` entirely.
3. Patch one section inside `assets/css/base.css`.

---

## Task 1 — replace `assets/css/case-study.css`

Delete the whole file content and write exactly this:

```css
/* ============================================================
   Case-study page primitives
   Spec: docs/design-guidelines.md §3
   Depends on home.css for the shell (.container-sm, nav, footer).
   Class names are unchanged from the old dark design on purpose —
   the HTML keeps its markup, only the meaning of each class moves.
   ============================================================ */

/* ---- Hero ---- */
.cs-hero { margin-bottom: 24px; }

.cs-hero h1 {
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  letter-spacing: -0.05em;
  color: var(--fg);
  max-width: none;
  margin-bottom: 8px;
}

.cs-hero p.lede {
  font-size: 16px;
  line-height: 24px;
  color: var(--n-800);
  max-width: none;
  text-wrap: pretty;
}
:root.dark .cs-hero p.lede { color: var(--n-200); }
.cs-hero p.lede b { font-weight: 600; color: var(--fg); }

.cs-live-badge {
  display: inline-block;
  font-size: 12px;
  line-height: 16px;
  color: var(--r-meta);
  background: var(--r-chip);
  border-radius: 4px;
  padding: 2px 8px;
  margin-bottom: 12px;
}

.cs-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

/* ---- Primary call to action ----
   The old design hid each case study's repo / live-demo link inside the
   sticky subnav. That subnav is gone, so the link becomes a real button
   under the lede, the way the reference detail pages do it. */
.cs-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
  padding: 12px 20px;
  border-radius: 8px;
  background: var(--n-900);
  color: var(--n-100);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s ease;
}
.cs-cta:hover { background: var(--n-700); }
:root.dark .cs-cta { background: var(--n-100); color: var(--n-900); }
:root.dark .cs-cta:hover { background: var(--n-300); }

/* ---- Section blocks ---- */
.cs-section { margin-bottom: 32px; padding: 0; }
.cs-section.tight { padding: 0; }
.cs-section.bordered {
  border-top: 1px solid var(--r-edge);
  padding-top: 32px;
  margin-top: 0;
}

.cs-section h2 {
  /* weight 500 here, NOT 600. The home page uses 600; detail pages use 500. */
  font-size: 18px;
  line-height: 28px;
  font-weight: 500;
  letter-spacing: -0.025em;
  color: var(--fg);
  max-width: none;
  margin-bottom: 12px;
}

.cs-section > p {
  font-size: 14px;
  line-height: 1.625;
  color: var(--n-800);
  max-width: none;
  text-wrap: pretty;
}
:root.dark .cs-section > p { color: var(--n-200); }
.cs-section > p b { font-weight: 600; color: var(--fg); }

/* ---- Caption under a mockup ---- */
.caption {
  font-size: 14px;
  line-height: 20px;
  color: var(--r-secondary);
  margin-top: 8px;
  margin-bottom: 32px;
  max-width: none;
  text-wrap: pretty;
  font-family: inherit;
}
.caption em { font-style: normal; font-weight: 500; color: var(--fg); }
.cs-section > p.caption { font-size: 14px; max-width: none; }

/* ---- Stat row ---- */
.stat-bar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  border: 0;
  margin-bottom: 32px;
}
@media (min-width: 640px) {
  .stat-bar { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.stat-bar .stat {
  border: 1px solid var(--r-edge);
  border-radius: 8px;
  padding: 16px;
}
.stat-bar .stat .value {
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  letter-spacing: -0.05em;
  color: var(--fg);
}
.stat-bar .stat .label {
  font-size: 12px;
  line-height: 16px;
  letter-spacing: normal;
  color: var(--r-meta);
  margin-top: 4px;
}

/* ---- Two-column stage / before-after grids ---- */
.stage-grid,
.ba-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  border: 0;
  margin: 0 0 32px;
}
@media (min-width: 640px) {
  .stage-grid,
  .ba-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.stage-card,
.ba-card {
  border: 1px solid var(--r-edge);
  border-radius: 8px;
  padding: 16px;
}
.stage-card + .stage-card,
.ba-card.after { border-left: 1px solid var(--r-edge); padding-left: 16px; }

.stage-card .head { margin-bottom: 12px; }
.stage-card .head .kicker {
  font-size: 12px;
  line-height: 16px;
  letter-spacing: normal;
  color: var(--r-meta);
  margin-bottom: 4px;
}
.stage-card .head .title {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: -0.025em;
  color: var(--fg);
}
.stage-card .body > p {
  font-size: 14px;
  line-height: 1.625;
  color: var(--r-secondary);
  margin-bottom: 12px;
  text-wrap: pretty;
}

.ba-card .heading {
  font-size: 12px;
  line-height: 16px;
  letter-spacing: normal;
  color: var(--r-meta);
  margin-bottom: 12px;
}
.ba-card .rows { display: flex; flex-direction: column; gap: 8px; }
.ba-card .rows div {
  display: flex;
  gap: 8px;
  font-size: 14px;
  line-height: 20px;
  color: var(--r-secondary);
}
.ba-card .rows div .mark { color: var(--r-meta); }

/* ---- Inline code + small code blocks on the page (not in mockups) ---- */
.stage-card code, .stage-card .code {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--r-secondary);
}

.rename-example, .sheet-log {
  border: 1px solid var(--r-edge);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.rename-example .file-line { display: flex; align-items: center; gap: 8px; color: var(--r-secondary); margin-bottom: 4px; }
.rename-example .file-line:last-child { margin-bottom: 0; color: var(--r-meta); }
.rename-example .file-line .arrow { color: var(--r-meta); }
.rename-example .meta { color: var(--r-meta); margin-bottom: 8px; }
.sheet-log .row { display: flex; padding: 6px 0; color: var(--r-secondary); border-top: 1px solid var(--r-edge); }
.sheet-log .row:first-child { border-top: none; }
.sheet-log .row.head { color: var(--r-meta); }
.sheet-log .row .who { flex: 1; }
.sheet-log .row .status { width: 80px; text-align: right; }
.sheet-log .row.ok .status { color: var(--r-secondary); }
.sheet-log .row.err .status { color: var(--fg); font-weight: 600; }

/* ---- Checklist ---- */
.checklist { display: flex; flex-direction: column; gap: 8px; }
.checklist .item { display: flex; gap: 8px; font-size: 14px; line-height: 20px; color: var(--r-secondary); }
.checklist .item .check { color: var(--r-meta); }
.checklist .kicker {
  font-size: 12px;
  line-height: 16px;
  letter-spacing: normal;
  color: var(--r-meta);
  margin-bottom: 8px;
}

/* ---- Board mockup (recruitment). Stays a light-ish surface, framed. ---- */
.board-mock {
  border: 1px solid var(--r-edge);
  border-radius: 8px;
  overflow: hidden;
  background: var(--r-surface);
}
.board-mock .chrome {
  padding: 10px 12px;
  border-bottom: 1px solid var(--r-edge);
  font-size: 12px;
  color: var(--r-meta);
  font-family: inherit;
}
.board-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; }
@media (max-width: 680px) { .board-cols { grid-template-columns: repeat(2, 1fr); } }
.board-cols .col-head {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; line-height: 16px; margin-bottom: 8px; color: var(--r-meta);
}
.board-cols .col-head .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.board-cols .cards { display: flex; flex-direction: column; gap: 8px; }
.board-cols .card {
  border-radius: 4px;
  background: var(--r-chip);
  padding: 10px;
  border: 1px solid var(--r-edge);
}
.board-cols .card .bar-1 { height: 8px; border-radius: 2px; background: var(--r-edge); margin-bottom: 6px; }
.board-cols .card .bar-2 { height: 6px; border-radius: 2px; background: var(--r-edge); }
.board-cols .card .comment-row { display: flex; gap: 5px; margin-top: 8px; align-items: center; }
.board-cols .card .comment-row .avatar { width: 14px; height: 14px; border-radius: 50%; background: var(--r-edge); }
.board-cols .card .comment-row .comment-label { font-size: 10px; color: var(--r-meta); }

/* ---- Numbered step sequence ----
   Was an absolutely-positioned rail with a connector line. Now a plain
   card stack, which is what the new language uses everywhere else. ---- */
.flow-sequence { display: flex; flex-direction: column; gap: 12px; margin: 0 0 32px; }

.flow-step {
  position: static;
  padding: 16px;
  border: 1px solid var(--r-edge);
  border-radius: 8px;
}
.flow-step .connector-line,
.flow-step .connector-arrow { display: none; }

.flow-step .num-badge {
  position: static;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: var(--r-chip);
  color: var(--r-meta);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
}
.flow-step .step-kicker {
  font-size: 12px;
  line-height: 16px;
  letter-spacing: normal;
  text-transform: none;
  color: var(--r-meta);
  margin-bottom: 4px;
}
.flow-step .step-title {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: -0.025em;
  color: var(--fg);
  margin-bottom: 4px;
}
.flow-step .step-body {
  font-size: 14px;
  line-height: 1.625;
  color: var(--r-secondary);
  max-width: none;
  margin-bottom: 12px;
}
.flow-step .step-body code {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--fg);
  background: var(--r-chip);
  border: 0;
  border-radius: 4px;
  padding: 1px 5px;
}

@media (max-width: 680px) {
  .flow-step { padding: 16px; }
}
```

### Why some rules look odd

- `position: static` and `display: none` on `.connector-line` / `.connector-arrow` are there to
  **neutralise** the old absolutely-positioned rail without editing the HTML. The elements stay
  in the markup, they just stop rendering. This is intentional. Do not delete them from the HTML.
- `max-width: none` appears repeatedly to cancel the old `max-width: 22ch` / `64ch` limits. The
  new shell is already narrow, so a second limit would make lines too short.

---

## Task 2 — replace `assets/css/about.css`

Delete the whole file content and write exactly this:

```css
/* ============================================================
   About page
   Spec: docs/design-guidelines.md §3
   ============================================================ */

/* ---- Header row: avatar + name + bio + meta ----
   flex-start, not center: the text column holds the lede and the meta
   row too, so it is much taller than the 64px avatar. */
.about-hero {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 0;
  margin-bottom: 32px;
}
@media (max-width: 560px) {
  .about-hero { flex-direction: column; }
}

.about-hero h1 {
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  letter-spacing: -0.05em;
  color: var(--fg);
  margin-bottom: 8px;
}

.about-hero .lede {
  font-size: 16px;
  line-height: 24px;
  color: var(--n-800);
  max-width: none;
  text-wrap: pretty;
  margin-bottom: 12px;
}
:root.dark .about-hero .lede { color: var(--n-200); }
.about-hero .lede b { font-weight: 600; color: var(--fg); }

.avatar-placeholder {
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  border: 1px solid var(--r-edge);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.05em;
  color: var(--r-meta);
  background: var(--r-surface);
}

.about-meta {
  display: flex;
  gap: 8px 16px;
  flex-wrap: wrap;
  font-size: 14px;
  line-height: 20px;
  color: var(--r-secondary);
}
.about-meta a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--r-line);
  text-underline-offset: 2px;
  border: 0;
  transition: all 0.15s ease;
}
.about-meta a:hover { color: var(--r-meta); }

/* ---- Grouped skill list ---- */
.skills-groups {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 0;
  margin-bottom: 32px;
}
@media (min-width: 640px) {
  .skills-groups { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.skills-groups .group {
  border: 1px solid var(--r-edge);
  border-radius: 8px;
  padding: 16px;
}
.skills-groups .group h3 {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: -0.025em;
  color: var(--fg);
  margin-bottom: 8px;
}
```

Note: `.about-hero` becomes a **64px avatar next to the name**, matching the reference detail
page. It is no longer a 148px block with a 54px headline.

---

## Task 3 — patch `assets/css/base.css`

Do **not** rewrite this file. Change only the rules listed below. Leave the token block at the
top, the reset, `.btn*`, `.subnav*`, and `.site-footer*` alone (those last two get deleted in
phase 7, not now).

### 3a. `.hl`

Find:
```css
.hl { color: var(--fg); font-weight: 600; }
```
Leave it exactly as is. It is already correct.

### 3b. `.eyebrow` — replace the whole rule

Old:
```css
.eyebrow {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--fg-mute);
  margin-bottom: 18px;
}
```

New:
```css
/* Small kicker above a section heading. Was mono uppercase on the old
   dark design; now a plain meta line to match the new language. */
.eyebrow {
  font-family: inherit;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: normal;
  text-transform: none;
  color: var(--r-meta);
  margin-bottom: 4px;
}
```

### 3c. `.tag` and `.tag-row` — replace both rules

Old (three rules: `.tag`, `.tag-lg`, `.tag-row`, `.tag-row .tag:not(:last-child)::after`):
```css
.tag {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg-mute);
  white-space: nowrap;
}
.tag-lg { font-size: 12.5px; }

.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
  row-gap: 8px;
}
.tag-row .tag:not(:last-child)::after {
  content: '/';
  margin: 0 10px;
  color: var(--fg-ghost);
}
```

New:
```css
/* Chips. The old design separated tags with a "/" glyph; chips do not
   need a separator, so that ::after rule is gone. */
.tag {
  font-family: inherit;
  font-size: 12px;
  line-height: 16px;
  color: var(--r-meta);
  background: var(--r-chip);
  border-radius: 4px;
  padding: 2px 8px;
  white-space: nowrap;
}
.tag-lg { font-size: 12px; }

.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
```

**Delete** the `.tag-row .tag:not(:last-child)::after` rule entirely.
Also delete the identical `/` separator rule for `.cs-tags` if you find one in `case-study.css`
(there is none in the new file you wrote in Task 1, so nothing to do there).

### 3d. `.text-link` — replace the whole rule

Old:
```css
.text-link {
  font-family: var(--font-mono);
  font-size: 13.5px;
  color: var(--fg);
  text-decoration: none;
  border-bottom: 1.5px solid var(--fg);
  padding-bottom: 3px;
  transition: opacity .16s;
}
.text-link:hover { opacity: .7; }
.text-link.muted {
  color: var(--fg-mute);
  border-bottom-color: var(--fg-faint);
}
```

New:
```css
.text-link {
  font-family: inherit;
  font-size: 14px;
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--r-line);
  text-underline-offset: 2px;
  border-bottom: 0;
  padding-bottom: 0;
  transition: all 0.15s ease;
}
.text-link:hover { color: var(--r-meta); opacity: 1; }
.text-link.muted { color: inherit; border-bottom: 0; }
```

### 3e. `.numbered-list` / `.numbered-row` — replace the rules

Old rules to replace: `.numbered-row`, `.numbered-row:last-child`, `.numbered-row .num`,
`.numbered-row .title`, `.numbered-row .body`.

New:
```css
.numbered-list { display: flex; flex-direction: column; gap: 12px; }

.numbered-row {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--r-edge);
  border-radius: 8px;
}
.numbered-row:last-child { border-bottom: 1px solid var(--r-edge); }

.numbered-row .num {
  font-family: inherit;
  font-size: 12px;
  line-height: 20px;
  color: var(--r-meta);
  flex: 0 0 24px;
  padding-top: 0;
}

.numbered-row .title {
  font-family: inherit;
  font-weight: 500;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.025em;
  color: var(--fg);
  margin-bottom: 4px;
}

.numbered-row .body {
  color: var(--r-secondary);
  font-size: 14px;
  line-height: 1.625;
  text-wrap: pretty;
  max-width: none;
}
```

### 3f. `.line-flow` block — replace the type rules only

Keep the flex layout. Replace these five rules:

```css
.flow-node .kicker {
  font-family: inherit;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: normal;
  text-transform: none;
  color: var(--r-meta);
}
.flow-node .title {
  font-family: inherit;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: -0.025em;
  color: var(--fg);
}
.flow-node p {
  font-size: 14px;
  line-height: 1.625;
  color: var(--r-secondary);
  max-width: none;
}
.flow-connector { color: var(--r-meta); }
```

Leave `.line-flow`, `.flow-node`, and the `@media` rules for them unchanged.

### 3g. `.role-grid` — replace the type rules

```css
.role-grid h2 {
  font-family: inherit;
  font-size: 18px;
  line-height: 28px;
  font-weight: 500;
  letter-spacing: -0.025em;
  margin-bottom: 12px;
}
.role-grid p { color: var(--r-secondary); font-size: 14px; line-height: 1.625; text-wrap: pretty; }
.role-grid .aside { color: var(--r-meta); }
```

---

## Verify phase 1

CSS-only phase, so pages will still have the old nav. That is expected. Check:

1. **No syntax errors.** Open `about.html` in a browser. If a stylesheet failed to parse, the
   page will look completely unstyled. If it looks styled, parsing is fine.

2. **No leftover old tokens** in the two rewritten files:
   ```bash
   grep -n "fg-mute\|fg-dim\|fg-faint\|fg-ghost\|fg-whisper\|border-lg\|border-md\|bg-card\|bg-raised" assets/css/case-study.css assets/css/about.css
   ```
   Expected output: **nothing**. If anything prints, you missed a replacement.

3. **base.css patched rules use new tokens:**
   ```bash
   grep -n "font-mono" assets/css/base.css
   ```
   Expected: only the `--font-mono` token definition itself, plus `.rename-example` / `.sheet-log`
   / `code` rules. `.eyebrow`, `.tag`, `.text-link`, `.numbered-row`, `.flow-node` must NOT appear.

4. **Headings shrank.** Open `about.html`, DevTools, inspect the `<h1>`. Computed `font-size`
   must be **24px**, not 54px. If it still reads 54px, `about.css` was not saved.

5. Both themes still switch (use the toggle on `index.html`, then navigate to `about.html`).

## Do not

- Do not touch any `.html` file in this phase.
- Do not edit `tms.css`, `*-mocks.css`, or `*-flow-demo.css`.
- Do not delete `.subnav*` or `.site-footer*` yet. Phase 7 does that, after the HTML stops using them.
