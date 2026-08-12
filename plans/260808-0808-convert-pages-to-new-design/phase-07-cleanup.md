# Phase 7 — delete dead CSS and final check

**Only after phases 1–6 are all done and verified.**

Now that no HTML uses `.subnav*` or `.site-footer*`, those rules are dead weight. Delete them.

---

## Step 1 — confirm they really are unused

Run first. **If any of these print anything, STOP** and finish the phase that left them behind.

```bash
grep -rn 'class="subnav' *.html
grep -rn 'site-footer\|footer-back\|footer-note' *.html
grep -rn 'IBM Plex' .
```

All three must return nothing.

---

## Step 2 — delete dead rules from `assets/css/base.css`

Delete these complete rule blocks. They start after the `.brand-name` / `.status-pill` rules and
run until the `Buttons + tags` comment banner.

Delete every rule whose selector starts with:

- `.subnav`
- `.subnav .container`
- `.subnav-back`
- `.subnav-title`
- `.subnav-title .subnav-sub`
- `.subnav-tag`
- `.subnav-actions`
- `.subnav-link`
- the `@media (max-width: 460px)` block that only contains `.subnav-title`

Also delete:

- `.site-footer`
- `.site-footer.with-border`
- `.footer-meta`
- `.footer-note`
- `.footer-back`
- `.footer-back:hover`
- the whole `Footer` comment banner above them

**Keep** `.topbar`, `.brand`, `.brand-mark`, `.brand-name`, `.status-pill`, `.nav-links` for now —
they are unused too, but they are only ~40 lines and deleting more at once raises the chance of
cutting a brace. If you want them gone, do it as a separate pass and re-verify.

---

## Step 3 — check the file still parses

```bash
grep -c '{' assets/css/base.css ; grep -c '}' assets/css/base.css
```

The two numbers must be equal. If not, you cut through a rule — restore from git and redo:

```bash
git checkout assets/css/base.css
```

Then open `index.html`. If it still looks correct, `base.css` parsed fine.

---

## Step 4 — full-site final check

Open all 6 pages, in both themes, at 1280px and 390px. That is 24 views. For each:

| Check | Expected |
|---|---|
| Nav | `home` / `about` top left, theme button top right |
| Active state | Only on `index.html` (home) and `about.html` (about). None on case studies |
| Column width | Identical on all 6 pages |
| Font | Segoe UI on Windows. Never Geist, never IBM Plex |
| Theme | Toggle works on every page; choice survives reload and navigation |
| Horizontal scroll at 390px | None |
| Console | No errors, no failed requests |

---

## Step 5 — cross-page theme test

This is the one that catches a missing `<head>` snippet:

1. Open `index.html`, set the theme to **dark**.
2. Click through: `about.html` → `certificate-pipeline.html` → `tms.html` →
   `recruitment.html` → `registration.html` → back to `index.html`.
3. Every page must already be dark on arrival, with **no white flash**.

A white flash on one page means its inline `<head>` script is missing, or was moved below the
stylesheet links. Put it back as the last line before `</head>`.

---

## Step 6 — update the docs

In `docs/design-guidelines.md`, edit the **Status** line near the top:

Old:
```
`about.html` + the 4 case studies still use the OLD dark editorial layer and must be converted.
```

New:
```
All 6 pages are converted.
```

---

## Done

Report which of the 24 views you actually checked, and anything that looked wrong but you left
alone. Do not claim a check passed that you did not run.
