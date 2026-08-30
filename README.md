# Nguyen Huynh Anh Hao — portfolio

Static-first portfolio for a fresher applying to AI Automation Specialist and Digital Transformation Officer roles. The site explains operational workflows, ownership, and evidence boundaries before showing implementation detail.

## Publish model

The public artifact is built by `scripts/build-portfolio.mjs` into `.portfolio-dist/`. It contains the six root portfolio pages, shared CSS/JavaScript, the favicon, and four same-origin static walkthroughs under `assets/proof/`.

The repository also contains application workspaces and generated bundles for experiments. Those trees are intentionally outside the publish allowlist. In particular, `certificate-flow/`, `ld-event-registration-platform/`, `src/`, `plans/`, `docs/`, `temp_nghia.html`, `nghia_dom.txt`, and `scrape.js` are not copied. The temporary reference files are preserved because their provenance is unresolved; see `plans/260830-0926-polish-portfolio/reports/publish-boundary.md`.

## Local development

Requirements: Node.js 20 or newer and npm.

```powershell
npm ci
npm run build:portfolio
npm run check:portfolio
npm run preview:portfolio
```

`preview:portfolio` serves the generated artifact at `http://127.0.0.1:4173`. To run the browser and accessibility suite:

```powershell
npm run test:portfolio
```

The test command rebuilds the artifact, starts the local static server, checks all six root pages at desktop and 390px mobile widths, exercises the theme and skip-link keyboard paths, opens every public proof CTA, and runs an axe scan for serious/critical WCAG violations. Use `npm run verify:portfolio` for the complete build → static check → browser check contract.

The existing `dev`, `build`, `preview`, `clean`, and `lint` scripts belong to the legacy Vite application workspace and are preserved. They are not the portfolio publish command.

## Proof and access states

- **Static walkthrough:** public, same-origin, read-only illustration with synthetic data. It does not connect to production systems, upload files, or send messages.
- **Authenticated access:** a hosted application link may require owner-approved credentials. No credentials are published here.
- **Source repository:** retained only where the repository URL was observed and approved in the evidence matrix.

All project metrics, dates, adoption outcomes, and production scale claims are pending owner evidence. The pages use qualitative outcomes or explicitly labelled test data until a dated baseline, sample, and method are available.

The CV CTA is intentionally omitted until the owner supplies the real PDF. Add it as an allowlisted file and a tested link in a focused change; do not add a placeholder document.

## Verification and release boundary

The current local release rehearsal is the source of truth for a candidate artifact:

```powershell
npm run verify:portfolio
```

Before any external publish, inspect `.portfolio-dist/`, record its file list and commit SHA in `plans/260830-0926-polish-portfolio/reports/release-evidence.md`, obtain explicit owner approval, and run the same smoke checks against the deployed URL. This task does not deploy, commit, or push.

## Rollback

Keep the previously approved static artifact or deployment commit. If a post-publish check fails, restore that artifact through the hosting provider's normal rollback mechanism, then fix and rerun the verification contract before trying again. Never roll back by deleting source files or by publishing an unreviewed generated bundle.
