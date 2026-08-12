# Phase 5 — `tms.html`

**Only file to edit: `tms.html`.** Phase 4 must be done and verified first.

Identical recipe to phase 4. **Read `phase-04-certificate-pipeline.md` first** — it explains why
each edit exists. This file only gives the literal strings for this page.

630 lines. You edit the top ~32 and the bottom ~13, plus 3 small edits in between.

---

## Edit 1 — stylesheet links (lines 9–15)

**Find:**
```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
  <link rel="stylesheet" href="assets/css/certificate-pipeline-flow-demo.css">
  <link rel="stylesheet" href="assets/css/tms.css">
```

**Replace with:**
```html
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/home.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
  <link rel="stylesheet" href="assets/css/certificate-pipeline-flow-demo.css">
  <link rel="stylesheet" href="assets/css/tms.css">
```

Note this page's font weight list is `400;500;600` — slightly different from the other pages.
Delete the line regardless.

---

## Edit 2 — nav + page wrapper (lines 20–31)

**Find:**
```html
  <nav class="subnav">
    <div class="container">
      <a href="index.html" class="subnav-back">← all projects</a>
      <div class="subnav-title">TMS v2 <span class="subnav-sub">/ case study</span></div>
      <div class="subnav-actions">
        <a href="about.html" class="subnav-link">About</a>
        <a href="https://concho2.onrender.com/home" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Live demo ↗</a>
      </div>
    </div>
  </nav>

  <div class="container">
```

**Replace with:** `snippets.md` → **BLOCK C**, case-study variant (both nav links plain).

⚠ The "Live demo ↗" link is re-added in Edit 4. Do not skip it.

---

## Edit 3 — hero eyebrow becomes a chip (line ~35)

**Find:**
```html
      <div class="eyebrow">Case Study — 02</div>
```
**Replace with:**
```html
      <div class="cs-live-badge">Case study 02 · PostgreSQL</div>
```

---

## Edit 4 — re-add the live-demo button under the hero

Find the first `</header>` in the file (closes `.cs-hero`, around line 37–48).
**Immediately after** that line, insert:

```html
    <a href="https://concho2.onrender.com/home" target="_blank" rel="noopener noreferrer" class="cs-cta">Live demo ↗</a>
```

---

## Edit 5 — strip inline spacing from eyebrows

Search for `class="eyebrow" style=`. Remove the `style="…"` attribute from every match, keeping
the text. There should be 0–2 matches on this page.

---

## Edit 6 — footer + page close (lines 620–627)

**Find:**
```html
    <!-- FOOTER -->
    <footer class="site-footer with-border">
      <a href="index.html" class="footer-back">← back to all projects</a>
      <a href="https://www.linkedin.com/in/nguyenhuynhanhhao/" target="_blank" rel="noopener" class="footer-back">LinkedIn ↗</a>
      <div class="footer-note">Screens are faithful UI recreations. The live demo above is the real thing.</div>
    </footer>

  </div>
```

**Replace with:**
```html
    <p class="caption">Screens are faithful UI recreations. The live demo above is the real thing.</p>

    </section>

    <footer class="home-footer">
      <ul>
        <li>
          <a href="index.html" class="u-link">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z" fill="currentColor"></path></svg>
            <span>all projects</span>
          </a>
        </li>
        <li>
          <a href="https://www.linkedin.com/in/nguyenhuynhanhhao/" target="_blank" rel="noopener noreferrer" class="u-link">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z" fill="currentColor"></path></svg>
            <span>linkedin</span>
          </a>
        </li>
      </ul>
      <p>© 2026 Nguyen Huynh Anh Hao</p>
    </footer>

  </main>
```

---

## Edit 7 — scripts (lines 629–630)

**Find:**
```html
  <script src="assets/js/reveal.js"></script>
  <script src="assets/js/flow-demo.js"></script>
```
**Replace with:**
```html
  <script src="assets/js/theme.js"></script>
  <script src="assets/js/reveal.js"></script>
  <script src="assets/js/flow-demo.js"></script>
```

---

## Verify phase 5

**1.** `grep -n 'subnav\|site-footer\|footer-back\|footer-note\|IBM Plex' tms.html` → **nothing**.

**2.** `grep -c 'concho2.onrender.com' tms.html` → must be **1**. If `0`, you skipped Edit 4.

**3.** Tag balance:
```bash
grep -o '<main' tms.html | wc -l ; grep -o '</main>' tms.html | wc -l
grep -o '<div' tms.html | wc -l ; grep -o '</div>' tms.html | wc -l
grep -o '<section' tms.html | wc -l ; grep -o '</section>' tms.html | wc -l
```

**4.** In a browser:

| Check | Expected |
|---|---|
| `<h1>` | 24px |
| Badge + button | Chip above headline, dark "Live demo ↗" button under the lede |
| TMS mockups | Grid, profile, drawer, completion, intelligence — all still render, both themes |
| Flow carousel | Still works |
| Toggle | Works, persists, carries across pages |

**5.** 390px: no horizontal scroll. The wide TMS grid table scrolls inside its own wrapper.

**6.** Console clean.

---

## Do not

- Do not touch `assets/css/tms.css`. Every `.tms-*` mockup style lives there and is correct.
- Do not edit page content between the hero and the footer.
- Do not remove `data-reveal` or the hidden connector elements.
