# Nguyen Huynh Anh Hao — portfolio

Static-first portfolio for a fresher applying to AI Automation Specialist and Digital Transformation Officer roles. The public experience is art-directed around one idea: **from signal to system**. It pairs an editorial paper/ink system with honest, inspectable workflow evidence.

## Experience model

- **Recruiter path:** the home page states role fit, operating thesis, flagship work, public proof, and contact in the first viewport and the first scroll.
- **Technical path:** each case study keeps the existing DOM mockups, trade-offs, ownership notes, access state, and evidence boundary.
- **Public proof:** four same-origin walkthroughs are read-only illustrations using synthetic data. They never connect to production systems or send messages.
- **Honest access:** hosted application links remain labelled `access required`; the CV remains a visible pending state until the real PDF is supplied.

The visual system uses a self-hosted Sora variable font for UI/body copy, a resilient editorial serif for display type, warm paper and ink surfaces, and one vermilion signal accent. CSS/SVG carries the art direction; there is no WebGL, scroll hijacking, remote font, stock imagery, or framework migration.

## Local development

Requirements: Node.js 20 or newer and npm.

```powershell
npm ci
npm run verify:portfolio
npm run preview:portfolio
```

`preview:portfolio` serves the generated artifact at `http://127.0.0.1:4173`. The portfolio test command rebuilds the artifact, starts the static server, checks all six root pages at desktop and 390px mobile widths, exercises theme and skip-link keyboard paths, opens every public proof CTA, and runs an axe scan for serious/critical WCAG violations.

The existing `dev`, `build`, `preview`, `clean`, and `lint` scripts belong to the legacy Vite application workspace and are preserved. They are not the portfolio publish command.

## Publish boundary

`scripts/build-portfolio.mjs` copies an explicit allowlist into `.portfolio-dist/`: six root pages, four proof pages, shared CSS/JavaScript, the favicon, the local Sora font plus its OFL license, and five authored workflow SVGs (31 files total). Application workspaces and generated bundles stay outside the artifact. In particular, `certificate-flow/`, `ld-event-registration-platform/`, `src/`, `plans/`, `docs/`, `temp_nghia.html`, `nghia_dom.txt`, and `scrape.js` are not published.

Inspect the output before any external release:

```powershell
npm run build:portfolio
npm run check:portfolio
Get-ChildItem .portfolio-dist -Recurse -File
```

The static checker rejects missing local references, missing image dimensions/alt text, duplicate IDs, leaked credentials, unresolved reference captures, and known dead links. External access probes are opt-in with `npm run check:portfolio -- --external`.

## Evidence and access states

- **Static walkthrough:** public, same-origin, read-only illustration with synthetic data.
- **Authenticated access:** a hosted app may require owner-approved credentials; no credentials are published here.
- **Source repository:** retained only where the repository URL was observed and approved.
- **Metrics:** dates, adoption, scale, and performance claims stay qualitative or marked pending until a baseline, sample, and method exist.

## Design source of truth

See [`docs/design-guidelines.md`](docs/design-guidelines.md) for tokens, composition, typography, accessibility, responsive behavior, and content rules. The implementation record and screenshot evidence live in [`plans/260830-1659-art-directed-portfolio-rearchitecture/`](plans/260830-1659-art-directed-portfolio-rearchitecture/).

## Rollback and release discipline

Keep the previously approved static artifact or deployment commit. If a post-publish check fails, restore that artifact through the hosting provider's normal rollback mechanism, then fix and rerun the verification contract. Local verification does not imply external deployment; publish only after an explicit owner decision.
