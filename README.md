# Nguyen Huynh Anh Hao — portfolio

Product-first portfolio for a fresher applying to AI Automation Specialist and Digital Transformation Officer roles. The public experience uses a compact monochrome shell around playable, inspectable workflow evidence.

## Experience model

- **Recruiter path:** the home page is a compact product gallery. Each card opens the working surface before asking the visitor to read a case study.
- **Technical path:** each project keeps the demo and three scan-friendly facts visible, then places the full problem, trade-offs, controls, and evidence inside an optional native disclosure.
- **Public proof:** CertStudio uses a standalone React sandbox that mirrors the production PDF review workflow; Corgi77 embeds its isolated demo build. TMS and Recruitment are focused in-memory prototypes. Every demo uses synthetic data and resets without touching a production system.
- **Honest access:** hosted application links remain labelled `access required`; the CV remains a visible pending state until the real PDF is supplied.

The visual system uses the local OS UI stack, black/white surfaces, restrained borders, and compact cards. There is no remote font, WebGL, scroll hijacking, stock imagery, or framework migration.

## Local development

Requirements: Node.js 20 or newer and npm.

```powershell
npm ci
npm --prefix certificate-flow run build
npm --prefix ld-event-registration-platform run build
npm run verify:portfolio
npm run preview:portfolio
```

`preview:portfolio` serves the generated artifact at `http://127.0.0.1:4173`. The portfolio test command rebuilds the artifact, starts the static server, checks all six root pages at desktop and 390px mobile widths, exercises theme and skip-link keyboard paths, opens every public product CTA, and runs an axe scan for serious/critical WCAG violations on the portfolio shell. Dedicated frame tests exercise the embedded product workflows.

The existing `dev`, `build`, `preview`, `clean`, and `lint` scripts belong to the legacy Vite application workspace and are preserved. They are not the portfolio publish command.

## Publish boundary

`scripts/build-portfolio.mjs` copies an explicit allowlist into `.portfolio-dist/`: six root pages, four product shells, shared assets, and two generated runtime bundles. Only the hashed `dist/assets` output for CertStudio and Corgi77 crosses that boundary; application source, environment files, plans, docs, and unresolved captures do not. In particular, `src/`, `plans/`, `docs/`, `temp_nghia.html`, `nghia_dom.txt`, and `scrape.js` are not published.

Inspect the output before any external release:

```powershell
npm run build:portfolio
npm run check:portfolio
Get-ChildItem .portfolio-dist -Recurse -File
```

The static checker rejects missing local references, missing image dimensions/alt text, duplicate IDs, leaked credentials, unresolved reference captures, and known dead links. External access probes are opt-in with `npm run check:portfolio -- --external`.

## Evidence and access states

- **Playable build:** public, same-origin runtime with synthetic data and no production write path.
- **In-memory prototype:** focused public interaction that resets on refresh and has no backend connection.
- **Authenticated access:** a hosted app may require owner-approved credentials; no credentials are published here.
- **Source repository:** retained only where the repository URL was observed and approved.
- **Metrics:** dates, adoption, scale, and performance claims stay qualitative or marked pending until a baseline, sample, and method exist.

## Design source of truth

See [`docs/design-guidelines.md`](docs/design-guidelines.md) for tokens, composition, typography, accessibility, responsive behavior, and content rules. The restored visual baseline is documented in [`plans/260808-0808-convert-pages-to-new-design/`](plans/260808-0808-convert-pages-to-new-design/); the later playable-demo work remains active.

## Rollback and release discipline

Keep the previously approved static artifact or deployment commit. If a post-publish check fails, restore that artifact through the hosting provider's normal rollback mechanism, then fix and rerun the verification contract. Local verification does not imply external deployment; publish only after an explicit owner decision.
