# Handoff — portfolio_hao (cert-pipeline done w/ new design system; 3 case studies remain)

Repo: `c:\Users\anhha\OneDrive\Documents\GitHub\portfolio_hao`. User communicates in **Vietnamese**; site copy is English. NOTHING committed all session — user will explicitly ask for git when ready (standing rule). `git status`: modified 4 html + assets/, untracked: `about.html`, `registration.html`, `assets/`, `plans/`, `docs/`, `.gitignore`. `.gitignore` ignores `Video/` (444MB raw recordings) + `assets/raw/`.

## READ FIRST

`docs/design-guidelines.md` — the settled design system, written this session. Everything below conforms to it. Reference implementation: `certificate-pipeline.html`.

## Design system (settled after many pivots — do NOT re-litigate)

Style history: monochrome Aristide (approved) → user asked for brand colors → user found dark mocks illegible → **final: 3-layer system**: dark monochrome page + **light-surface mockups** (like real app screenshots — Sheets/Canva/Gmail are white UIs) + brand accents only inside mocks/automation markers. Global text tokens brightened this session (`--fg-dim/mute/faint/ghost` in `base.css`, affects ALL pages; `.caption` now `--fg-mute`).

## certificate-pipeline.html — DONE (fully rebuilt this session)

- **6-step flow** (`.flow-sequence`): 1 Check Sheet (w/ real custom menus "Cert Sender ▾ / Module Cert Sender ▾") → 2 Canva Bulk Create (side panel + white cert preview) → 3 Download merged PDF → 4 "CLT Certificate Renamer" (real tool name; folder picker, dry-run/real + Canva-split toolbars, animated log) → 5 Push to Drive → 6 Apps Script test-send & log (running-script strip).
- Automated steps (4,6) marked: `.flow-step.auto` amber num-badge + `.time-chip` ("one click — was file-by-file" / "one run — was 2–3 days").
- **Differentiator anatomies**: `.match-anatomy` (page's own text → filename, color-linked = no page-order mistakes) & `.verify-anatomy` (2-key name+cert-no check w/ diacritics normalization; 2/2→send, 1/2→flagged).
- **Flow-demo carousel** ("Watch the flow"): 6 panels, JS `assets/js/flow-demo.js` (4s auto, ←/→ buttons, clickable dots, hover-pause, ignores reduced-motion deliberately — static steps below are the fallback).
- Coherent batch narrative everywhere: 43 pages → 42 renamed + 1 flagged → 42 in Drive.
- All mock data FAKE (Nguyen Van A…, 19xxxx, you@example.com), captions end "(test data)".
- CSS: `certificate-pipeline-mocks.css` (light mock components + `--m-*` tokens) & `certificate-pipeline-flow-demo.css` (flow-sequence, carousel, anatomies).

Facts learned from user's real screen recordings (`Video/*.mkv`, gitignored, NOT embedded — mockup approach replaced raster media for PII+style reasons):
- Old manual flow: Canva → **ilovepdf.com Split PDF** page-by-page → rename by hand in Explorer → Gmail attach+send one-by-one.
- New flow & tool names as in the 6 steps above; test batch was 43 certs; user test-sends to own inbox by swapping their email in, then swaps real emails (NOT "owner approves" — that old copy was corrected).

## Earlier this session (all done, verified)

- `about.html` NEW (bio + placeholder avatar — real photo still owed by user; full skills; role-per-project).
- `registration.html` NEW — Corgi77 "L&D event registration platform" case study from github.com/FinanceBullkk/Corgi77 repo docs (live CyberLogitec-internal, no public demo; repo public). Stats used: 31 callables, 400+ tests, 0 crit/high/med audit.
- TMS honesty fixes: badge "In development · built for CyberLogitec's L&D team", removed 885-commits stat (4 stats now), lede admits demo-not-live.
- index.html: 4 projects (cert centerpiece, TMS, recruitment, registration), About + LinkedIn (https://www.linkedin.com/in/nguyenhuynhanhhao/) in nav/footers sitewide; "My role & tools" sections removed from case pages (moved to About).
- Cert/recruitment numbers (~300 certs, 3–5d; ~40 applications) confirmed accurate by user.

## NEXT STEPS (in order)

1. **Apply light-mock system for consistency**: home page previews (`.mock-preview` tms/recruit/corgi minis in `home.css` still dark+grayscale), `tms.html` admin mocks (`tms.css`), `recruitment.html` board mock (`case-study.css .board-mock`). Follow guideline §3.
2. **Grill remaining 3 case studies** one at a time (same treatment as cert pipeline: real workflow interview → coherent numbers → light mocks → flow + automation markers + anatomy for differentiators): TMS → recruitment → registration/Corgi77.
3. Cert-pipeline mini tools (calendar invite tool, exam results tool) — deferred by user, revisit later.
4. About page real photo — waiting on user.

## Open questions

- Corgi77 case study extra facts never answered: rough scale (#events/#registrants). Repo docs had none.
- Recording script for mini tools exists: `plans/reports/script-260731-0646-cert-pipeline-recording.md` (partially obsolete — mockup pivot).

## Tooling gotchas (Windows)

- Local server: `python -m http.server 8791` from repo root (likely still running).
- chrome-devtools skill: write temp `.mjs` INSIDE `~/.claude/skills/chrome-devtools/scripts/` (ESM `import` from absolute `C:/` path fails); use `elementHandle.screenshot()` not page.screenshot+clip (coord bug after scroll); headless reports `prefers-reduced-motion: reduce` (why carousel ignores it); delete temp script after run.
- ffmpeg (installed via winget): `/c/Users/anhha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin/ffmpeg.exe` (new shells may have it on PATH).
- Verify pattern: screenshot desktop+mobile, scroll-to-bottom first to trigger `[data-reveal]`, check table overflow-x, measure panel content vs container for clipping.
