# Release evidence — art-directed portfolio rearchitecture

Date: 2026-08-30
Branch: `main`
Scope: local static portfolio only

## Verified local gates

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run build:portfolio` | PASS | Deterministic `.portfolio-dist`; 31 allowlisted files including the font license. |
| `npm run check:portfolio` | PASS | 6 root pages + 4 proof pages; local references, image dimensions, IDs, and forbidden-content checks pass. |
| Playwright smoke | PASS | 84 tests across desktop and 390px mobile; navigation, theme persistence, skip link, proof CTAs, intermediate widths, target sizes, and the TMS tour pass. |
| Playwright a11y | PASS | Serious/critical axe checks pass on all ten public pages in light mode and the recruiter surface in dark mode; reduced-motion and no-JS checks pass. |
| TMS workflow tour | PASS | Manual navigation; inactive panels are `aria-hidden` and `inert`. |
| `npm run lint` | PASS | TypeScript check passes. |
| `npm run build` | PASS | Legacy Vite build passes. |

## Visual evidence

- Baseline: `visuals/baseline-home.png`, `visuals/baseline-home-mobile.png`
- Current light: `visuals/home-desktop-light.png`, `visuals/home-mobile-light.png`
- Current dark: `visuals/home-desktop-dark.png`
- Case shell: `visuals/registration-desktop-light.png`

The current screenshots show the recruiter path in the first viewport, the Corgi77 flagship hierarchy, supporting workflow visuals, and the mobile stacked composition. The no-JS path keeps content visible because the reveal layer defaults to visible.

## Publish inventory

The generated artifact contains the six root pages, four proof pages, shared CSS/JS, `assets/favicon.svg`, `assets/fonts/sora-latin-ext-wght-normal.woff2` plus `assets/fonts/OFL.txt`, and five authored workflow SVGs. Application workspaces, plans, unresolved reference captures, and generated bundles remain outside the allowlist.

## Bounded external probes

Latest `npm run check:portfolio -- --external` completed: the GitHub profile/repository and both hosted application URLs returned reachable responses; LinkedIn returned HTTP 999 (rate-limited/opaque), so it remains an owner-controlled external dependency. Reachability is not an authorization or functional-health claim, and the hosted application links stay labelled access required.

## Owner-dependent gates (still open)

- Final CV PDF and approval to publish it.
- Approved portrait, if one is desired later.
- Dated baseline/sample/method for any quantitative outcome claim.
- Owner-approved credentials or environment for authenticated production walkthroughs.
- External deployment/publish approval. This local pass is not a deployment authorization.
