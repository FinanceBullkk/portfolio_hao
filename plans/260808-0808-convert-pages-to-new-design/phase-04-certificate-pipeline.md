# Phase 4 — `certificate-pipeline.html`

**Only file to edit: `certificate-pipeline.html`.** Phase 3 must be done and verified first.

This page is 449 lines and contains many mockups. **You are only editing the top ~32 lines and
the bottom ~12 lines, plus 6 small one-line edits in between.** Everything else stays untouched.

The same recipe applies to phases 5 and 6 — only the literal strings differ.

---

## Edit 1 — stylesheet links (lines 9–15)

**Find:**
```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
  <link rel="stylesheet" href="assets/css/certificate-pipeline-mocks.css">
  <link rel="stylesheet" href="assets/css/certificate-pipeline-flow-demo.css">
```

**Replace with:**
```html
  <link rel="stylesheet" href="assets/css/base.css">
  <link rel="stylesheet" href="assets/css/home.css">
  <link rel="stylesheet" href="assets/css/case-study.css">
  <link rel="stylesheet" href="assets/css/certificate-pipeline-mocks.css">
  <link rel="stylesheet" href="assets/css/certificate-pipeline-flow-demo.css">
```

The two mock CSS lines are **kept**. Only the 3 font lines are deleted, and `home.css` is added.

---

## Edit 2 — nav + page wrapper (lines 20–31)

**Find:**
```html
  <nav class="subnav">
    <div class="container">
      <a href="index.html" class="subnav-back">← all projects</a>
      <div class="subnav-title">Cert pipeline <span class="subnav-sub">/ case study</span></div>
      <div class="subnav-actions">
        <a href="about.html" class="subnav-link">About</a>
        <a href="https://github.com/FinanceBullkk/ConCho4" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Splitter repo ↗</a>
      </div>
    </div>
  </nav>

  <div class="container">
```

**Replace with:** `snippets.md` → **BLOCK C**, case-study variant (both nav links plain).

⚠ **The "Splitter repo ↗" link is NOT thrown away.** It is re-added in Edit 4 below as a button.
Do not skip Edit 4.

---

## Edit 3 — hero eyebrow becomes a chip (line ~35)

**Find:**
```html
      <div class="eyebrow">Case Study — 01 · Centerpiece</div>
```
**Replace with:**
```html
      <div class="cs-live-badge">Case study 01 · Apps Script</div>
```

---

## Edit 4 — re-add the repo button under the hero

Find the closing `</header>` of the `.cs-hero` block (around line 37–48; it is the first
`</header>` in the file). **Immediately after** that `</header>` line, insert:

```html
    <a href="https://github.com/FinanceBullkk/ConCho4" target="_blank" rel="noopener noreferrer" class="cs-cta">Splitter repo ↗</a>
```

This is the link that used to live in the subnav. `.cs-cta` was styled in phase 1.

---

## Edit 5 — strip inline spacing from eyebrows

Search the file for `class="eyebrow" style=`. There is **1** match:

**Find:**
```html
      <div class="eyebrow" style="margin-top:48px">More automations, same pattern</div>
```
**Replace with:**
```html
      <div class="eyebrow">More automations, same pattern</div>
```

---

## Edit 6 — footer + page close (lines 439–446)

**Find:**
```html
    <!-- FOOTER -->
    <footer class="site-footer with-border" style="margin-top:48px">
      <a href="index.html" class="footer-back">← back to all projects</a>
      <a href="https://www.linkedin.com/in/nguyenhuynhanhhao/" target="_blank" rel="noopener" class="footer-back">LinkedIn ↗</a>
      <div class="footer-note">UI mockups above use test data, not real participant records</div>
    </footer>

  </div>
```

**Replace with:**
```html
    <p class="caption">UI mockups above use test data, not real participant records.</p>

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

The old footer note was real information, so it is kept as a `.caption` line rather than deleted.

---

## Edit 7 — scripts (lines 448–449)

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

## Verify phase 4

**1.** `grep -n 'subnav\|site-footer\|footer-back\|footer-note\|IBM Plex' certificate-pipeline.html`
→ **nothing**.

**2.** The repo link survived:
```bash
grep -c 'ConCho4' certificate-pipeline.html
```
→ must be **1** (the `.cs-cta` button). If it is `0` you skipped Edit 4.

**3.** Tag balance:
```bash
grep -o '<main' certificate-pipeline.html | wc -l ; grep -o '</main>' certificate-pipeline.html | wc -l
grep -o '<div' certificate-pipeline.html | wc -l ; grep -o '</div>' certificate-pipeline.html | wc -l
grep -o '<section' certificate-pipeline.html | wc -l ; grep -o '</section>' certificate-pipeline.html | wc -l
```
All three pairs equal. `<main>` = 1.

**4.** In a browser:

| Check | Expected |
|---|---|
| `<h1>` | 24px |
| Badge + button | Grey chip above headline, dark filled "Splitter repo ↗" button under the lede |
| Flow carousel | Still auto-advances, prev/next and dots still work |
| Every mockup | Still light-surfaced and readable in **both** themes |
| Step list | Cards with a small grey number chip. No vertical connector line |
| Toggle | Works, persists, carries across pages |

**5.** 390px wide: no horizontal scroll. Wide tables scroll inside their own box, not the page.

**6.** Console clean, no failed requests.

---

## Do not

- Do not edit anything between the hero and the footer except the 1 eyebrow in Edit 5.
- Do not touch `certificate-pipeline-mocks.css` or `certificate-pipeline-flow-demo.css`.
- Do not delete `.connector-line` / `.connector-arrow` elements from the HTML. Phase 1 hides them
  with CSS on purpose.
- Do not remove `data-reveal`.
