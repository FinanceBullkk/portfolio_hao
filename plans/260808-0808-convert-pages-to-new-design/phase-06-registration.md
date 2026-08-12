# Phase 6 — `registration.html`

**Only file to edit: `registration.html`.** Phase 5 must be done and verified first.

Identical recipe to phase 4. **Read `phase-04-certificate-pipeline.md` first** for the reasoning.

506 lines. Note the line numbers here are **one lower** than the other two pages, because this
page loads one fewer stylesheet.

---

## Edit 1 — stylesheet links (lines 9–14)

**Find:**
```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
  <link rel="stylesheet" href="assets/css/registration-mocks.css">
```

**Replace with:**
```html
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/home.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
  <link rel="stylesheet" href="assets/css/registration-mocks.css">
```

---

## Edit 2 — nav + page wrapper (lines 19–30)

**Find:**
```html
  <nav class="subnav">
    <div class="container">
      <a href="index.html" class="subnav-back">← all projects</a>
      <div class="subnav-title">Registration platform <span class="subnav-sub">/ case study</span></div>
      <div class="subnav-actions">
        <a href="about.html" class="subnav-link">About</a>
        <a href="https://github.com/FinanceBullkk/Corgi77" target="_blank" rel="noopener" class="btn btn-primary btn-sm">View repo ↗</a>
      </div>
    </div>
  </nav>

  <div class="container">
```

**Replace with:** `snippets.md` → **BLOCK C**, case-study variant (both nav links plain).

⚠ The "View repo ↗" link is re-added in Edit 4. Do not skip it.

---

## Edit 3 — hero eyebrow becomes a chip (line ~34)

**Find:**
```html
      <div class="eyebrow">Case Study — 04</div>
```
**Replace with:**
```html
      <div class="cs-live-badge">Case study 04 · Firebase</div>
```

---

## Edit 4 — re-add the repo button under the hero

Find the first `</header>` in the file (closes `.cs-hero`, around line 36–48).
**Immediately after** that line, insert:

```html
    <a href="https://github.com/FinanceBullkk/Corgi77" target="_blank" rel="noopener noreferrer" class="cs-cta">View repo ↗</a>
```

---

## Edit 5 — strip inline spacing from eyebrows

This page has the most of them. Search for `class="eyebrow" style=`. There are **3** matches:

```html
      <div class="eyebrow" style="margin-top:48px">Part 1 — the employee side</div>
      <div class="eyebrow" style="margin-top:48px">Part 2 — under the hood</div>
      <div class="eyebrow" style="margin-top:48px">The half that made it a platform</div>
```

Remove only the `style="margin-top:48px"` attribute from each, keeping the text:

```html
      <div class="eyebrow">Part 1 — the employee side</div>
      <div class="eyebrow">Part 2 — under the hood</div>
      <div class="eyebrow">The half that made it a platform</div>
```

---

## Edit 6 — footer + page close (lines 496–503)

**Find:**
```html
    <!-- FOOTER -->
    <footer class="site-footer with-border">
      <a href="index.html" class="footer-back">← back to all projects</a>
      <a href="https://www.linkedin.com/in/nguyenhuynhanhhao/" target="_blank" rel="noopener" class="footer-back">LinkedIn ↗</a>
      <div class="footer-note">Code is public. The live app is CyberLogitec-internal (Google auth, company domain only)</div>
    </footer>

  </div>
```

**Replace with:**
```html
    <p class="caption">Code is public. The live app is CyberLogitec-internal (Google auth, company domain only).</p>

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

## Edit 7 — scripts (line 505)

**Find:**
```html
  <script src="assets/js/reveal.js"></script>
```
**Replace with:**
```html
  <script src="assets/js/theme.js"></script>
  <script src="assets/js/reveal.js"></script>
```

This page has **no** `flow-demo.js`. Do not add it.

---

## Verify phase 6

**1.** `grep -n 'subnav\|site-footer\|footer-back\|footer-note\|IBM Plex' registration.html` → **nothing**.

**2.** `grep -c 'Corgi77' registration.html` → must be **1**. If `0`, you skipped Edit 4.

**3.** `grep -c 'class="eyebrow" style=' registration.html` → must be **0**.

**4.** Tag balance:
```bash
grep -o '<main' registration.html | wc -l ; grep -o '</main>' registration.html | wc -l
grep -o '<div' registration.html | wc -l ; grep -o '</div>' registration.html | wc -l
grep -o '<section' registration.html | wc -l ; grep -o '</section>' registration.html | wc -l
```

**5.** In a browser:

| Check | Expected |
|---|---|
| `<h1>` | 24px |
| Badge + button | Chip above headline, dark "View repo ↗" button under the lede |
| Sheet mockup | The spreadsheet-style mock still renders and scrolls, both themes |
| App screens | The 3 phone-style screens still render side by side |
| Gate rows | Eligibility gate rows still readable |
| Toggle | Works, persists, carries across pages |

**6.** 390px: no horizontal scroll. The sheet mock scrolls inside its own wrapper.

**7.** Console clean.

---

## Do not

- Do not touch `assets/css/registration-mocks.css`.
- Do not edit page content between the hero and the footer, other than Edit 5.
- Do not add `flow-demo.js` to this page.
