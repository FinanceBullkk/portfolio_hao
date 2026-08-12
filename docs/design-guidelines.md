# Design Guidelines — portfolio_hao

Source of truth for how this site looks. Written to be executed directly by an AI agent.

**Status (2026-08-08):** the page layer was rebuilt to match `https://nghialuong.com/portfolio`.
`index.html` is the finished reference implementation — open it before writing anything.
`about.html` + the 4 case studies still use the OLD dark editorial layer and must be converted.

The old "dark monochrome page / aristidebenoist" model is **superseded**. Sections 6–8 below
(mockups, content, honesty) survive unchanged and still apply.

---

## 0. Two gotchas that break everything

These are the two things that cannot be guessed by looking at the site. Get them wrong and
nothing else matters.

### 0.1 The design does NOT use a webfont

The reference site loads Geist but never applies it. Its body font resolves to the **OS UI stack**
(Segoe UI on Windows, SF Pro on Mac). Reproduced here as `--font-ui` in `base.css`.

- Home / detail / about pages: `font-family: var(--font-ui)`.
- Do **not** add a Google Fonts `<link>` for Geist to a converted page.
- `--font-sans` (Geist) and `--font-mono` (Geist Mono) still exist for legacy case-study CSS.
  As a page is converted, its shell should stop using them.

The same bug already exists in this repo: all 5 unconverted pages load **IBM Plex Sans + Mono**
from Google Fonts, and **no CSS file references `IBM Plex` anywhere**. It is two dead network
requests per page. Delete that `<link>` as part of converting each page.

### 0.2 Dark mode is class-based, not a media query

`base.css` defines light on `:root` and dark on `:root.dark`. There is **no**
`@media (prefers-color-scheme: dark)` anywhere, on purpose: a media query would override the
toggle on a machine set to dark, so the user could never force light.

Every page MUST carry this as the last line of `<head>`, before first paint:

```html
<script>try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}</script>
```

It is already present on all 6 pages. Do not remove it, do not move it below the stylesheets,
do not convert it to an external file — inline and blocking is what prevents the theme flash.

`assets/js/theme.js` handles clicks and OS changes. Load it at the end of `<body>` on any page
that renders the toggle button.

---

## 1. Tokens

Defined in `assets/css/base.css`. Never hardcode a gray; use a token.

**Neutral ramp** (identical in both themes): `--n-50 --n-100 --n-200 --n-300 --n-400 --n-500 --n-600 --n-700 --n-800 --n-900`

**Role tokens** (these are what you actually use — each flips between themes):

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--fg` | black | white | headings, body default, link text |
| `--r-secondary` | n-600 | n-400 | taglines, subtitles, meta lines |
| `--r-body` | n-700 | n-300 | card description text |
| `--r-meta` | n-500 | n-400 | section counts, chip text, link hover |
| `--r-footer` | n-600 | n-300 | footer |
| `--r-line` | n-400 | n-600 | underline colour on links |
| `--r-edge` | n-200 | n-800 | card + image borders |
| `--r-edge-hover` | n-400 | n-600 | card hover border |
| `--r-surface` | n-50 | n-900/50 | hero card fill |
| `--r-chip` | n-100 | n-800 | badge background |
| `--r-hover-bg` | n-100 | n-800 | toggle hover background |
| `--r-nav-hover` | n-800 | n-200 | nav link hover |
| `--r-nav-active` | n-900 | n-100 | active nav link |
| `--r-toggle` / `--r-toggle-hover` | n-600 / n-900 | n-400 / n-100 | theme button |

Legacy `--bg* --fg-* --border*` tokens still exist for unconverted case-study CSS. Do not use
them in new work.

---

## 2. Page shell — identical on every page

```html
<main class="container-sm">
  <aside class="nav-container">
    <div class="nav-sticky">
      <nav class="nav-bar" id="nav">
        <div class="nav">
          <a href="index.html">home</a>
          <a href="about.html">about</a>
        </div>
        <button type="button" class="theme-toggle" …>moon svg + sun svg</button>
      </nav>
    </div>
  </aside>

  <section> … page content … </section>

  <footer class="home-footer"> … </footer>
</main>
<script src="assets/js/theme.js"></script>
```

Copy nav + footer verbatim from `index.html`. Mark the current page's link
`class="active" aria-current="page"`. Case studies have no nav entry of their own, so no link is
active on them — that is correct and matches the reference.

`.container-sm`, `.nav-container`, `.nav-bar`, `.nav`, `.theme-toggle`, `.u-link` and
`.home-footer` all live in `home.css`. A converted page therefore links, in this order:

```html
<link rel="stylesheet" href="assets/css/base.css">
<link rel="stylesheet" href="assets/css/home.css">   <!-- shell: nav, footer, container -->
<link rel="stylesheet" href="assets/css/case-study.css">  <!-- page content primitives -->
<!-- then any page-specific mock css, unchanged -->
```

Delete the IBM Plex `<link>` at the same time (see §0.1).

Shell metrics (already in `home.css`, do not redefine):
max-width `42rem` → `46rem` at 1024 → `48rem` at 1280 · padding `40px 20px` → `56px 24px` at 640 ·
`line-height: 1.5`.

---

## 3. Detail / case-study page template

Taken from the reference site's own detail pages (`nghialuong.com/lidless`). Use this shape.

| Block | Spec |
|---|---|
| Header row | `flex`, `align-items:center`, `gap 16px`, `margin-bottom 20px` |
| — icon | 64×64, `border-radius 12px`, no shrink |
| — title row | `flex`, `align-items:center`, `gap 8px`, `flex-wrap:wrap` |
| — `h1` | **24px / 32px, weight 600, letter-spacing −0.05em** |
| — badge | 12px, `--r-meta` text, `--r-chip` bg, `radius 4px`, `padding 2px 8px` |
| — subtitle `p` | 14px, `--r-secondary` |
| Lede `p` | **16px**, colour `--n-800` (light) / `--n-200` (dark), `margin-bottom 24px` |
| CTA block | `flex column`, centred, `gap 8px`, `margin-bottom 32px` |
| — primary button | bg `--n-900`→text `--n-100` (inverted in dark), weight 500, `padding 12px 20px`, `radius 8px`, hover bg `--n-700` |
| — meta `p` | 14px `--r-secondary` |
| Figure / mockup | `border 1px --r-edge`, `radius 8px`, `margin-bottom 32px`, full width |
| `h2` | **18px / 28px, weight 500, letter-spacing −0.025em, margin-bottom 12px** |
| Feature grid | `grid`, 1 col → 2 cols at 640, **`gap 16px`**, `margin-bottom 32px` |
| — feature card | `border 1px --r-edge`, **`radius 8px`**, `padding 16px` |
| — card `h3` | **14px**, weight 500, letter-spacing −0.025em, `margin-bottom 4px` |
| — card `p` | 14px `--r-secondary` |
| Prose `p` | 14px, `--n-800` / `--n-200`, `margin-bottom 32px` |
| Ordered list | `flex column`, `gap 8px`, `list-decimal list-inside`, 14px, `--n-800` / `--n-200` |
| Inline links | class `u-link` (already defined) |

Two easy-to-miss differences from the home page — do not unify them:

- Detail-page `h2` is **weight 500**; home-page `h2` is weight 600.
- Detail-page cards use **radius 8px / gap 16px**; home-page cards use radius 12px / gap 12px.
- Detail-page badge is 12px / `px 8px`; home product tag is 10px / `px 6px`.

---

## 4. What to convert, what to leave alone

The case studies contain ~950 lines of intricate mockup CSS. **Do not rewrite the mockup
internals.** Convert only the page shell and the section primitives around them.

| File | Action |
|---|---|
| `about.html`, `tms.html`, `certificate-pipeline.html`, `recruitment.html`, `registration.html` | Convert shell + typography |
| `assets/css/case-study.css` | Rewrite `.cs-hero .cs-section .stat-bar .ba-grid .flow-step .caption` to §3 spec |
| `assets/css/about.css` | Rewrite to §3 spec |
| `assets/css/tms.css`, `*-mocks.css`, `*-flow-demo.css` | **Leave alone.** Mockup internals only. |
| `assets/js/flow-demo.js`, `reveal.js` | Leave alone |

**Replace** on every converted page: `.subnav` → the §2 `aside` nav · `.container` →
`.container-sm` · `.site-footer` → `.home-footer` · `.eyebrow` (mono uppercase) → delete or
demote to a §3 badge · `.cs-hero h1` 54px → 24px · `.cs-section h2` 30px → 18px.

**Keep**: every `.mock-shot`, `.chrome`, `.mini-*`, `.flow-demo` component, and all mockup
colour tokens.

### Mockups on a light page

Mockups were designed as light surfaces floating on a dark page. The page is now light, so they
need a frame instead of contrast. Wrap each in the §3 figure treatment:
`border 1px var(--r-edge); border-radius 8px`. This is exactly how the reference frames its own
screenshots. In dark mode a light mockup still reads correctly as a screenshot — leave it light.

---

## 5. Per-page task list

1. **`about.html`** — smallest, do first to establish the pattern. Header row (avatar 64px +
   h1 + badge) → lede → `h2` sections → skills as a §3 feature grid. Drop `.subnav`,
   `.eyebrow`, `.tag-row`, mono type.
2. **`recruitment.html`** — short, one board mockup. Same conversion; frame the mockup.
3. **`certificate-pipeline.html`** — long, has flow-demo + many mocks. Shell + `.flow-step` +
   `.stat-bar` + captions only.
4. **`tms.html`** — same as 3.
5. **`registration.html`** — same as 3.

Convert one page fully and verify it before starting the next. Do not batch all five.

---

## 6. Verification (required before calling a page done)

Open the page and check, in this order:

1. **Font** — DevTools → Computed → `font-family` on `<main>` must resolve to the OS stack, not
   Geist. Rendered glyphs on Windows should be Segoe UI.
2. **Theme toggle** — click it. Light ↔ dark must flip, survive a reload, and survive navigating
   to another page. If a page stays light on a dark machine, its `<head>` snippet is missing.
3. **No legacy shell left** — the HTML files contain class names, not tokens, so grep for classes:

   ```bash
   grep -n 'class="subnav\|eyebrow\|site-footer\|container"\|cs-hero' <the page>
   ```

   Must return nothing. Current counts to work down from: about 10, recruitment 11, tms 13,
   certificate-pipeline 13, registration 16.

   Separately, the page must no longer pull legacy type: `grep -n "IBM Plex" <the page>` → nothing.
4. **Both themes, both widths** — 1280px and 390px, light and dark. Four screenshots.
5. **No horizontal scroll** at 390px. Wide tables keep their `overflow-x:auto` wrapper.
6. **Console clean** — no JS errors, no failed requests.

Spot-check computed values against §3. If `h2` reports 30px or `h1` reports 54px, the old
`case-study.css` rule is still winning.

---

## 7. Mockup construction rules (unchanged)

1. Every mockup is a `.mock-shot`: light card, 1px border, radius, `.chrome` bar (3 gray dots +
   `.brand-icon.<tool>` + window title in mono).
2. Content inside is **DOM, not images** — tables, buttons, log lines. Crisp at any size, no PII risk.
3. Type inside mocks: mono ≥ 10.5px, body ≥ 11.5px. Dark text on light (`--m-text*`).
   Never use page tokens inside a mock.
4. Status chips: coloured text + tinted bg + tinted border.
5. Buttons use the real tool's primary colour for its primary action only.
6. Wide tables get an `overflow-x:auto` wrapper.
7. Every mockup carries a `.caption` ending in `(test data)`.

Light-mock + brand tokens live in `assets/css/certificate-pipeline-mocks.css` `:root`
(`--m-bg` #fbfbfa · `--m-bg2` #f1f3f4 · `--m-text` #202124 · `--m-text2` #5f6368 ·
`--m-text3` #9aa0a6 · `--m-border` #e0e3e7 · `--m-border2` #cdd1d6, plus green/amber/mint
semantics and per-tool brand colours).

---

## 8. Content rules (non-negotiable)

- **No real PII ever.** Fake roster names (`Nguyen Van A`), masked codes (`19xxxx`),
  `you@example.com` for self, `*@example.com` for others.
- **Numbers stay coherent across a page.** One batch narrative; never mix scales between mocks.
- **Honesty.** Mocks reproduce real UI faithfully. Don't invent features or metrics; unverified
  numbers stay out.
- **Voice.** Plain direct sentences, simple words, accuracy over polish. No em-dashes in body
  copy except as a structural separator.

---

## Don't

- Don't add a Geist `<link>` to a converted page, or set `font-family: var(--font-sans)` on its shell.
- Don't reintroduce `@media (prefers-color-scheme: dark)` anywhere.
- Don't remove or relocate the inline theme snippet in `<head>`.
- Don't rewrite mockup CSS while converting a shell. Two separate jobs.
- Don't unify the detail-page and home-page heading weights or card radii — the reference
  deliberately differs.
- Don't colour page chrome. Brand colour belongs inside mockups only.
- Don't put raster screenshots of real company data on the site.
- Don't state durations or metrics that were never confirmed by the owner.

---

## Open questions

- Nav has only `home` / `about`. If a `blog` or `tech` page is added later, the nav in all 6
  pages must be updated by hand — there is no template layer.
- Case studies have no nav entry, so nothing is active on them. Reference behaves the same, but
  a "← back to home" affordance may still be wanted. Not currently specced.
- Product icons and the hero avatar are still placeholders. The hero avatar frame expects a
  **transparent cut-out portrait**, not a square crop (it is scaled 1.4× from the top edge).
