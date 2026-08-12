# Plan — convert remaining 5 pages to the new design language

**Goal:** make `about.html` + the 4 case studies look like `index.html`, which already matches
`https://nghialuong.com/portfolio` exactly.

**Spec:** `docs/design-guidelines.md`. Read §0 before touching anything.

---

## Core strategy — read this first

The conversion is done **mostly in CSS, not HTML**. Class names in the HTML stay exactly as they
are. We restyle `.eyebrow`, `.cs-hero`, `.cs-section`, `.numbered-row` etc. in place.

This means:

- **Phase 1 changes CSS only.** After it, all 5 pages are already ~80% converted.
- **Phases 2–6 change HTML only**, and each is the *same small mechanical edit*: swap the
  `<head>` font link, the top nav, the page wrapper, and the footer. Nothing else.
- **Phase 7 deletes the CSS that became dead.**

Do NOT invent new class names. Do NOT restructure page content. Do NOT touch mockups.

---

## Phases

| # | File | What | Risk |
|---|---|---|---|
| 1 | `phase-01-restyle-shared-css.md` | Rewrite `case-study.css` + `about.css`, patch `base.css` components | Medium — CSS only |
| 2 | `phase-02-about.md` | HTML shell swap | Low |
| 3 | `phase-03-recruitment.md` | HTML shell swap | Low |
| 4 | `phase-04-certificate-pipeline.md` | HTML shell swap | Low |
| 5 | `phase-05-tms.md` | HTML shell swap | Low |
| 6 | `phase-06-registration.md` | HTML shell swap | Low |
| 7 | `phase-07-cleanup.md` | Delete dead CSS, final check | Low |

**Order is mandatory.** Phase 1 must be finished and verified before phase 2.
Finish and verify one phase completely before starting the next. Never batch.

`snippets.md` holds the exact copy-paste blocks used by phases 2–6.

### These instructions were tested, not guessed

Phases 1 and 2 were executed end to end on a scratch copy of this repo before this plan was
written. Every literal find-block matched on the first try, tags balanced, and the rendered page
measured:

```
main      max-width 768px · padding-top 56px · OS font stack
h1        24px / 600 / -1.2px
h2        18px / 500 / 28px
avatar    64×64 · radius 12px
tag chip  12px · neutral-100 bg · 2px 8px · radius 4px
cards     1px neutral-200 · radius 8px · padding 16px
390px     no horizontal overflow · 0 console errors
```

If your result does not match those numbers, you deviated from the instructions. Re-read the
phase file rather than adjusting the CSS to compensate.

---

## Files you may edit

```
assets/css/case-study.css      phase 1  (full rewrite)
assets/css/about.css           phase 1  (full rewrite)
assets/css/base.css            phase 1  (patch component section only)
about.html                     phase 2
recruitment.html               phase 3
certificate-pipeline.html      phase 4
tms.html                       phase 5
registration.html              phase 6
```

## Files you must NOT edit

```
index.html                     already done, it is the reference
assets/css/home.css            already done
assets/js/theme.js             already done
assets/css/tms.css
assets/css/certificate-pipeline-mocks.css
assets/css/certificate-pipeline-flow-demo.css
assets/css/registration-mocks.css
assets/js/reveal.js
assets/js/flow-demo.js
```

Those 4 mock CSS files style the *insides* of the app-screenshot mockups. They are a separate
visual layer and are deliberately staying light-on-light. Touching them will break the mockups.

---

## Definition of done

All 5 pages pass the phase checklist, plus:

- Theme toggle works on every page and the choice survives navigation between pages.
- `grep -rn "IBM Plex" .` returns nothing.
- No console errors, no failed requests, no horizontal scroll at 390px.
