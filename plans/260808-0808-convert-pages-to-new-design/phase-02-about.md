# Phase 2 — `about.html`

**Only file to edit: `about.html`.** Phase 1 must be done first.

This is the smallest page. Do it first to learn the pattern, then phases 3–6 repeat it.

There are **6 edits**. Do them top to bottom.

---

## Edit 1 — stylesheet links (line ~11–14)

**Find:**
```html
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
  <link rel="stylesheet" href="assets/css/about.css">
```

**Replace with:**
```html
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/home.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
  <link rel="stylesheet" href="assets/css/about.css">
```

The Google Fonts line is deleted. Also delete the two `<link rel="preconnect">` lines above it
if they are present — they only existed to speed up that font request.

Leave the `<script>` theme line under these alone.

---

## Edit 2 — nav + page wrapper (line ~19–29)

**Find** (the whole `<nav class="subnav">` block AND the `<div class="container">` after it):
```html
  <nav class="subnav">
    <div class="container">
      <a href="index.html" class="subnav-back">← home</a>
      <div class="subnav-title">About</div>
      <div class="subnav-actions">
        <a href="https://www.linkedin.com/in/nguyenhuynhanhhao/" target="_blank" rel="noopener" class="subnav-link">LinkedIn ↗</a>
      </div>
    </div>
  </nav>

  <div class="container">
```

**Replace with:** `snippets.md` → **BLOCK C**, using the `about.html` variant
(the `about` link gets `class="active" aria-current="page"`).

---

## Edit 3 — delete the hero eyebrow (line ~35)

**Find and delete this single line:**
```html
        <div class="eyebrow">About</div>
```

The `<h1>` now sits directly under the avatar. Leave everything else in `.about-hero` alone.

---

## Edit 4 — strip two inline styles

**4a.** Find:
```html
    <section class="cs-section bordered" style="padding-bottom:64px" data-reveal>
```
Replace with:
```html
    <section class="cs-section bordered" data-reveal>
```

**4b.** Find:
```html
      <div class="eyebrow" style="margin-top:48px">Role on each project</div>
```
Replace with:
```html
      <div class="eyebrow">Role on each project</div>
```

**4c.** Find:
```html
    <p class="caption" style="margin-bottom:8px">Placeholder above. Real photo coming soon.</p>
```
Replace with:
```html
    <p class="caption">Placeholder above. Real photo coming soon.</p>
```

Those inline values came from the old 100px-spacing design and now fight the new CSS. After this,
`grep -c 'style="' about.html` must return **0**.

---

## Edit 5 — footer + page close (line ~144–151)

**Find:**
```html
    <!-- FOOTER -->
    <footer class="site-footer with-border">
      <a href="index.html" class="footer-back">← back to all projects</a>
      <a href="https://www.linkedin.com/in/nguyenhuynhanhhao/" target="_blank" rel="noopener" class="footer-back">LinkedIn ↗</a>
      <div class="footer-note">Static site. Host anywhere.</div>
    </footer>

  </div>
```

**Replace with:** `snippets.md` → **BLOCK D**.

BLOCK D starts with `</section>` — that closes the `<section>` opened by BLOCK C in Edit 2.
BLOCK D ends with `</main>` instead of the old `</div>`.

---

## Edit 6 — scripts (line ~153)

**Find:**
```html
  <script src="assets/js/reveal.js"></script>
```

**Replace with:**
```html
  <script src="assets/js/theme.js"></script>
  <script src="assets/js/reveal.js"></script>
```

---

## Verify phase 2

Run all of these. Every one must pass before you start phase 3.

**1. No legacy shell classes left:**
```bash
grep -n 'subnav\|site-footer\|footer-back\|footer-note\|IBM Plex' about.html
grep -c 'class="container"' about.html
grep -c 'style="' about.html
```
First command: **nothing**. Second and third: **0**.

If the first command prints `subnav-back` / `subnav-title` lines, you hit the
`<div class="container">` trap described in `snippets.md` BLOCK C. Undo and redo Edit 2 matching
the full literal block.

**2. Tags balance:**
```bash
grep -o '<main' about.html | wc -l ; grep -o '</main>' about.html | wc -l
grep -o '<div' about.html | wc -l ; grep -o '</div>' about.html | wc -l
```
Both pairs must be equal. `<main>` must be `1` and `1`.

**3. Open the page in a browser and check:**

| Check | Expected |
|---|---|
| Nav | `home` and `about` at top left, `about` underlined thick and black |
| Theme button | Top right, moon in light mode, sun in dark mode |
| Toggle works | Click it, page flips light ↔ dark |
| Theme persists | Reload the page, theme stays |
| Theme carries over | Go to `index.html`, same theme |
| `<h1>` size | DevTools computed `font-size` = **24px** |
| Avatar | 64×64 rounded square with "H", left of the name |
| Page width | Content column same width as `index.html` |
| Font | Segoe UI (Windows). NOT Geist, NOT IBM Plex |

**4. Mobile:** resize to 390px wide. No horizontal scrollbar. Avatar stacks above the text.

**5. Console:** no errors, no failed requests (the IBM Plex request must be gone).

---

## Do not

- Do not change any wording on the page.
- Do not remove `data-reveal` attributes.
- Do not touch `.skills-groups`, `.tag`, `.numbered-list` markup — phase 1 already restyled them.
- Do not edit any CSS file in this phase.
