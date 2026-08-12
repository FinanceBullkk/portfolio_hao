# Phase 3 — `recruitment.html`

**Only file to edit: `recruitment.html`.** Phase 2 must be done and verified first.

Same 6-edit pattern as phase 2. This page has one extra step (Edit 4, the mockup frame).

---

## Edit 1 — stylesheet links (line ~11–13)

**Find:**
```html
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
```

**Replace with:**
```html
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/home.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
```

Delete the `<link rel="preconnect">` lines above it too.

---

## Edit 2 — nav + page wrapper (line ~18–29)

**Find:**
```html
  <nav class="subnav">
    <div class="container">
      <a href="index.html" class="subnav-back">← all projects</a>
      <div class="subnav-title">Recruitment intake <span class="subnav-sub">/ case study</span></div>
      <div class="subnav-actions">
        <a href="about.html" class="subnav-link">About</a>
        <span class="subnav-tag">No-code</span>
      </div>
    </div>
  </nav>

  <div class="container">
```

**Replace with:** `snippets.md` → **BLOCK C**, case-study variant.
Both nav links stay plain — **no** `active`, **no** `aria-current`.

---

## Edit 3 — hero eyebrow becomes a chip (line ~33)

The old eyebrow read `Case Study — 03 · No-code`. Keep the information, move it into the badge
style used by the reference detail pages.

**Find:**
```html
      <div class="eyebrow">Case Study — 03 · No-code</div>
```

**Replace with:**
```html
      <div class="cs-live-badge">Case study 03 · No-code</div>
```

`.cs-live-badge` is already styled by phase 1 as a grey chip.

---

## Edit 4 — frame the board mockup (line ~63–99)

The board was designed to sit on a dark page. On a light page it needs a border to read as a
screenshot. Phase 1 already gave `.board-mock` that border, so there is **nothing to change in
the markup here**.

Only one thing to fix — the inline eyebrow spacing above it:

**Find:**
```html
      <div class="eyebrow" style="margin-bottom:28px">The pipeline</div>
```
**Replace with:**
```html
      <div class="eyebrow">The pipeline</div>
```

And:
```html
      <div class="eyebrow" style="margin:48px 0 18px">Why it stuck</div>
```
**Replace with:**
```html
      <div class="eyebrow">Why it stuck</div>
```

---

## Edit 5 — the bare `<section style=…>` (line ~39)

**Find:**
```html
    <section style="padding:16px 0 0" data-reveal>
```
**Replace with:**
```html
    <section class="cs-section" data-reveal>
```

This gives the block the standard 32px bottom margin instead of an ad-hoc padding.

---

## Edit 6 — footer + page close (line ~121–128)

**Find:**
```html
    <!-- FOOTER -->
    <footer class="site-footer with-border" style="margin-top:48px">
      <a href="index.html" class="footer-back">← back to all projects</a>
      <a href="https://www.linkedin.com/in/nguyenhuynhanhhao/" target="_blank" rel="noopener" class="footer-back">LinkedIn ↗</a>
      <div class="footer-note">Screenshot of the real Notion board available on request</div>
    </footer>

  </div>
```

**Replace with:** `snippets.md` → **BLOCK D**.

The "Screenshot available on request" note is dropped from the footer. That fact is already
stated in the `.caption` under the board mockup on line ~98, so nothing is lost.

---

## Edit 7 — scripts (line ~130)

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

## Verify phase 3

**1.** `grep -n 'subnav\|site-footer\|footer-back\|footer-note\|IBM Plex' recruitment.html`
→ **nothing**.

**2.** `grep -n 'style="' recruitment.html` → only the mockup bar widths
(`style="width:74%"` etc). No `padding:`, no `margin:`.

**3.** Tag balance:
```bash
grep -o '<main' recruitment.html | wc -l ; grep -o '</main>' recruitment.html | wc -l
grep -o '<div' recruitment.html | wc -l ; grep -o '</div>' recruitment.html | wc -l
```

**4.** In a browser:

| Check | Expected |
|---|---|
| `<h1>` | 24px, not 34px or 54px |
| Badge | Grey chip "Case study 03 · No-code" above the headline |
| Board mockup | Has a visible 1px border and rounded corners in **both** themes |
| Pipeline row | 3 nodes with arrows, readable, no overflow |
| Nav | Neither link underlined thick (no active state on case studies) |
| Toggle | Works, persists, carries to other pages |

**5.** 390px wide: no horizontal scroll. The 4-column board becomes 2 columns.

**6.** Console clean.

---

## Do not

- Do not change any wording except the eyebrow → badge text in Edit 3.
- Do not restyle `.board-mock` in CSS. Phase 1 handled it.
- Do not remove `data-reveal`.
