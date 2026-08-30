# Portfolio release evidence

Date: 2026-08-30
Workspace: `C:\Users\anhha\.codex\worktrees\a7d8\portfolio_hao`
Revision at review: `c112fde0452f92a95a0ce679a51bf48de057c40c` (pre-delivery baseline)
Decision: **LOCAL RELEASE REHEARSAL PASS; EXTERNAL DEPLOYMENT HOLD**

The local release rehearsal was completed against the working tree before delivery. No external
publish or deployment was performed during verification.

## Exact reviewed publish artifact

Build command: `npm run build:portfolio`
Artifact root: `.portfolio-dist/`
Artifact count: **24 files**
Manifest: `f7bd5df1d8b2eff7e367bef8b60581954a2b9636e03012e097944d0bc9dcc421` (SHA-256 of the
sorted `file-sha256  relative/path` list, UTF-8 with LF line endings)
Boundary: only the six root pages, shared allowlisted assets, favicon, and four same-origin proof
pages. `plans/`, `docs/`, application source trees, `.env*`, `temp_nghia.html`, `nghia_dom.txt`,
and `scrape.js` are excluded.

Exact file list:

```text
.nojekyll
about.html
assets/css/about.css
assets/css/base.css
assets/css/case-study.css
assets/css/certificate-pipeline-flow-demo.css
assets/css/certificate-pipeline-mocks.css
assets/css/home.css
assets/css/proof.css
assets/css/registration-mocks.css
assets/css/tms.css
assets/favicon.svg
assets/js/flow-demo.js
assets/js/reveal.js
assets/js/theme.js
assets/proof/certstudio-walkthrough.html
assets/proof/recruitment-walkthrough.html
assets/proof/registration-walkthrough.html
assets/proof/tms-walkthrough.html
certificate-pipeline.html
index.html
recruitment.html
registration.html
tms.html
```

The legacy Vite output `dist/` is generated but ignored by `.gitignore`; it is not part of the
publish artifact. The reviewed artifact is the separate `.portfolio-dist/` directory.

## Command evidence

| Command | Result | Exact observed outcome / classification |
|---|---|---|
| `npm ci` | **PASS** | Added 434 packages; audited 435; 0 vulnerabilities. npm reported a `node-domexception` deprecation and pending install-script review warnings; neither blocked verification. |
| `npm ls @playwright/test @axe-core/playwright --depth=0` | **PASS** | `@playwright/test@1.62.1`; `@axe-core/playwright@4.13.0`. |
| `npx playwright install chromium` | **PASS** | Chromium install command exited 0. |
| `npm run build:portfolio` | **PASS** | `Built .portfolio-dist with 24 allowlisted files.` |
| `npm run check:portfolio` | **PASS** | Six root pages and four proof pages passed; five external checks intentionally skipped. |
| `npm run check:portfolio -- --external` | **PASS — probe only** | Latest bounded probe: LinkedIn returned HTTP 999 (inconclusive); GitHub profile and Corgi77 repository reachable; CertStudio Railway and TMS Render endpoints reachable. Reachability does not establish anonymous access: production apps remain access-controlled per the evidence matrix. |
| `npm run test:portfolio` | **PASS — invoked by final verify** | The final verification invoked this Playwright phase: **74 passed (17.2s)** using Chromium desktop and mobile projects. No console errors, failed local requests, or 390px horizontal overflow. |
| `npm run verify:portfolio` | **PASS** | One final combined build + static check + Playwright gate after the copy-safe patch; build produced 24 files, static checks passed, and Playwright reported **74 passed (17.2s)**. |
| `npm run lint` | **PASS** | `tsc --noEmit` exited 0. |
| `npm run build` | **PASS — legacy app** | Vite build exited 0. Two non-blocking warnings remain because `theme.js`/`reveal.js` are classic scripts without `type="module"`; this build is not the portfolio publish command. |
| `git diff --check` | **PASS** | Exit 0; only Windows LF/CRLF normalization warnings, no whitespace errors. |
| `git check-ignore -v dist` | **PASS** | Root `dist/` is ignored by `.gitignore`; generated output is not an untracked release candidate. |

### Browser and accessibility evidence

- The 74-test suite contains 20 serious/critical axe scans (10 public URLs × desktop/mobile),
  52 smoke/interaction checks, and two reduced-motion checks; all passed.
- Axe found **zero serious or critical violations**. The test sets
  `page.emulateMedia({ reducedMotion: 'reduce' })` before each scan and waits for reveal content
  to settle. This prevents a transient animation frame from producing a false contrast result;
  it does not suppress, exclude, or downgrade axe rules.
- Contrast tokens/selectors were updated for the mock status colours. The final browser run has no
  malformed SVG/path console errors.
- Independent light/dark + reduced-motion audit result: `axeSeriousCriticalViolations: 0`,
  `footerPathsParsed: 18`, `proofCtasMarked: 15`, `consoleErrors: []`.
- A DOM audit loaded all six root pages: 3 parseable footer SVG paths per page (18/18), no page
  console errors, and 15/15 links to `assets/proof/` carry `data-proof-cta`.

## Content, numeric, and privacy audit

- TMS values `Sample 847 Enrolled`, `Sample 612 Completed`, `Sample 491 Certified`, `Sample
  72%`, `Illustrative rule: ≥ 80%`, `Illustrative sample · 2,840 hrs · 186 employees`, and
  the detailed learner scores/dates are retained only as illustrative UI. The TMS page places an
  unmistakable **“Page-level disclosure: illustrative UI — Synthetic/test data.”** before the
  mockups and repeats the synthetic-data qualification before the detailed flow. Captions and
  labels state that these values are not production telemetry or observed impact.
- Registration sheet dates, times, seat counts, masked employee codes, and capacity examples are
  covered by the same page-level Synthetic/test data disclosure and are described as workflow
  placeholders. CertStudio and Recruitment mock values receive equivalent synthetic/read-only
  captions and disclosures.
- Structural/version numbers (`React 19`, `Express 5`, `Python 3.11`, section numbering, and the
  copyright year) remain descriptive, not outcome claims.
- The public HTML contains no unsupported `A week`, `instantly`, `never finds`, `traffic never`,
  `impossible`, `always`, `never`, `100%`, `99%`, `guarantee`, `real sheet`, `production UI`, or
  `Redrawn` wording. Registration copy now uses design-intent language such as “designed to” and
  “can show”; the CertStudio heading uses “Fragmented manual work & silent failure risks”.
- Homepage CertStudio/TMS production links say **“Production app (access required) ↗”** and the
  static walkthrough is the primary CTA. Registration uses **“Request authorized access”**; no
  résumé CTA or fake/broken CV file is shipped.
- The malformed footer icon path was replaced with one valid path on all six root pages. Unknown-
  provenance `temp_nghia.html`, `nghia_dom.txt`, and `scrape.js` were preserved, excluded from the
  artifact, and recorded as an owner decision rather than silently deleted.

## Gate status

### Verified

- Deterministic 24-file `.portfolio-dist/` artifact.
- Clean dependency install from the updated lockfile.
- Static local link/metadata/forbidden-content checks.
- Chromium desktop/mobile smoke, theme persistence, keyboard skip links, proof CTAs, no console
  errors, and no mobile overflow.
- Serious/critical axe checks and reduced-motion behavior.
- Recruiter-facing copy, access labels, synthetic-data disclosures, footer SVG validity, and
  publish-boundary exclusion.

### HOLD / owner-dependent

- **External deployment and post-deploy smoke:** HOLD pending explicit owner approval. No deploy or
  hosting change was attempted.
- **Production authorization/telemetry:** live CertStudio/TMS access and any observed metrics need
  owner-approved evidence; endpoint reachability is not anonymous-demo approval.
- **Independent recruiter/engineer 60-second comprehension test:** not run in this workspace;
  owner review remains required.
- **Résumé PDF:** owner has not supplied an approved file, so no CV link is published.
- **Scraped-file disposition:** provenance of the three temporary files is unknown; owner must
  decide whether to retain or remove them in a separate backed-up change.
- **Rollback reference:** HOLD — no previous approved published artifact/commit was nominated.
  Owner must nominate one before deployment.

### Blocked

No technical local gate is blocked. External authentication, owner evidence, deployment approval,
human comprehension review, and rollback nomination are intentionally open gates, not masked as
local passes.

## Unresolved questions

1. Which dated, reproducible project metrics (if any) can the owner approve for public use?
2. When will the owner provide the approved résumé PDF and final public contact details?
3. What is the legitimate provenance and final disposition of the preserved scrape files?
4. Which previous published artifact or commit should be the rollback target, and when is external
   deployment approved?
