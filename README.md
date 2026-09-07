# Nguyen Huynh Anh Hao — portfolio

Product-first portfolio for a fresher applying to AI Automation Specialist and Digital Transformation Officer roles. The public experience uses a compact monochrome shell around inspectable workflow evidence.

## Experience model

- **Recruiter path:** the home page is a compact product gallery. Each card leads with the strongest honest evidence available for that project.
- **Technical path:** each project keeps only its essential evidence or access state visible, then places the full problem, trade-offs, controls, and supporting material inside an optional native disclosure.
- **Public proof:** Proxy & Browser Profile Management uses a synthetic in-memory control-path demo, Corgi77 embeds its isolated product build, and CertStudio remains a case study with authenticated production access.
- **Honest access:** hosted application links remain labelled `access required`; the CV remains a visible pending state until the real PDF is supplied.

The visual system uses the local OS UI stack, black/white surfaces, restrained borders, and compact cards. There is no remote font, WebGL, scroll hijacking, stock imagery, or framework migration.

## Local development

Requirements: Node.js 20 or newer and npm.

```powershell
npm ci
npm --prefix ld-event-registration-platform run build
npm run verify:portfolio
npm run preview:portfolio
```

`preview:portfolio` serves the generated artifact at `http://127.0.0.1:4173`. The portfolio test command rebuilds the artifact, starts the static server, checks all five root pages at desktop and 390px mobile widths, exercises theme and skip-link keyboard paths, opens every public product CTA, and runs an axe scan for serious/critical WCAG violations on the portfolio shell. Dedicated interaction tests exercise both public workflows, including the revoked-device branch in the proxy/profile demo.

The existing `dev`, `build`, `preview`, `clean`, and `lint` scripts belong to the legacy Vite application workspace and are preserved. They are not the portfolio publish command.

## Publish boundary

`scripts/build-portfolio.mjs` copies an explicit allowlist into `.portfolio-dist/`: five root pages, two proof pages, shared assets, and the generated Corgi77 runtime bundle. The proxy/profile walkthrough is static in-memory code and the approved hashed Corgi77 `dist/assets` output is the only application bundle crossing that boundary; application source, environment files, plans, docs, and unresolved captures do not. In particular, `src/`, `plans/`, `docs/`, `temp_nghia.html`, `nghia_dom.txt`, and `scrape.js` are not published.

Inspect the output before any external release:

```powershell
npm run build:portfolio
npm run check:portfolio
Get-ChildItem .portfolio-dist -Recurse -File
```

The static checker rejects missing local references, missing image dimensions/alt text, duplicate IDs, leaked credentials, unresolved reference captures, and known dead links. External access probes are opt-in with `npm run check:portfolio -- --external`.

## Evidence and access states

- **Playable build:** public, same-origin runtime with synthetic data and no production write path, used only when the interaction adds credible evidence.
- **Case-study evidence:** static architecture and interface material that explains a workflow without pretending to be a runnable product.
- **Authenticated access:** a hosted app may require owner-approved credentials; no credentials are published here.
- **Source repository:** retained only where the repository URL was observed and approved.
- **Metrics:** dates, adoption, scale, and performance claims stay qualitative or marked pending until a baseline, sample, and method exist.

## Design source of truth

See [`docs/design-guidelines.md`](docs/design-guidelines.md) for tokens, composition, typography, accessibility, responsive behavior, and content rules. The restored visual baseline is documented in [`plans/260808-0808-convert-pages-to-new-design/`](plans/260808-0808-convert-pages-to-new-design/); public demos remain project-specific rather than mandatory.

## Rollback and release discipline

Keep the previously approved static artifact or deployment commit. If a post-publish check fails, restore that artifact through the hosting provider's normal rollback mechanism, then fix and rerun the verification contract. Local verification does not imply external deployment; publish only after an explicit owner decision.
