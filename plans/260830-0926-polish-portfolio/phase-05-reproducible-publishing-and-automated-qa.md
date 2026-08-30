---
phase: 5
title: "Reproducible publishing and automated QA"
status: completed
priority: P1
effort: "1-1.5d"
dependencies: [2, 3, 4]
---

# Phase 5: Reproducible publishing and automated QA

## Overview

Make the static portfolio artifact understandable and repeatable from a clean checkout. Add a
small validation/test layer that catches dead links, missing local assets, console errors,
accessibility regressions, mobile overflow, and accidental publication of research artifacts.

## Requirements

- **Functional:** `npm ci` plus documented portfolio commands builds/checks the exact artifact that
  will be deployed.
- **Non-functional:** keep the existing nested application sources and generated demos intact; do
  not make a full monorepo migration or require production credentials in CI.

## Architecture

Use a static-first publish boundary:

```text
root HTML + assets + approved nested dist demos
        ↓ scripts/build-portfolio.mjs (allowlist copy)
        .portfolio-dist/
        ↓ check + Playwright/axe smoke suite
        GitHub Pages artifact (deployment requires explicit approval)
```

The root Vite app remains a separately documented legacy/application workspace for this pass. Do
not assume `vite build` is the portfolio build. The allowlist prevents `plans/`, `docs/`, source
trees, `.env*`, and `temp_nghia*` from entering the published artifact.

## Related Code Files

- Modify: `package.json`, `README.md`, `.gitignore`
- Create: `scripts/build-portfolio.mjs`
- Create: `scripts/check-portfolio.mjs`
- Create: `playwright.config.ts`
- Create: `tests/portfolio-smoke.spec.ts`
- Create: `tests/portfolio-a11y.spec.ts`
- Create: `.github/workflows/portfolio-checks.yml`
- Inspect/possibly move out of publish boundary: `temp_nghia.html`, `nghia_dom.txt`, `scrape.js`
- Inspect: `.env.example`, nested `dist` directories, `metadata.json`

## Implementation Steps

1. Write the README first: project map, static-vs-app boundary, local preview command, clean
   install, build/check/test commands, deployment source, demo access states, synthetic-data
   policy, and rollback procedure.
2. Add `build:portfolio` with an explicit allowlist of root HTML/CSS/JS/assets and approved nested
   `dist` folders. Fail if a required file is missing; never copy `.env`, `src`, `plans`, or
   scraped reference files. Output to `.portfolio-dist/` and add it to `.gitignore`.
3. Add `check:portfolio` to parse every published HTML file and fail on missing local references,
   duplicate/missing titles, missing viewport/lang/main, broken fragment targets, absent image
   dimensions, and forbidden strings (`IBM Plex`, known dead repository URL, raw credentials,
   `temp_nghia`). Keep external access checks in a short allowlist with expected behavior and a
   bounded timeout so auth-gated apps are reported accurately rather than treated as anonymous
   demos.
4. Add Playwright smoke tests for all six root pages at desktop and 390px widths, light/dark
   theme toggles, keyboard navigation, no horizontal overflow, no console errors, and the exact
   expected result for each public proof CTA. Use `axe-core` for a focused WCAG scan and fail on
   serious/critical violations.
5. Add a GitHub Actions workflow that runs `npm ci`, `npm run build:portfolio`,
   `npm run check:portfolio`, and the Playwright suite on pull requests and the deployment branch.
   Cache dependencies, but do not cache the generated publish artifact across commits.
6. Decide disposition of the scraped reference files. Preferred: move them outside the published
   tree and document provenance in the plan/research area. If the owner confirms they are not
   legitimate, remove them in a separate focused commit after backup; do not silently overwrite.
7. Add a favicon to each nested static demo or update the allowlisted HTML to point at the root
   favicon. Verify no `/favicon.ico` 404 remains in the browser console.
8. Run the new commands on a clean clone/runner. Fix failures in source, not by weakening checks;
   classify external cold-start/auth behavior explicitly in the expected-results fixture.

### Suggested command contract

```json
{
  "scripts": {
    "build:portfolio": "node scripts/build-portfolio.mjs",
    "check:portfolio": "node scripts/check-portfolio.mjs",
    "test:portfolio": "playwright test",
    "verify:portfolio": "npm run build:portfolio && npm run check:portfolio && npm run test:portfolio"
  }
}
```

Preserve existing app-specific `dev`, `build`, `lint`, and `test` scripts until the root workspace
ownership decision is made; name the portfolio commands explicitly rather than silently changing
what `npm run build` means.

## Success Criteria

- [x] A clean runner can install dependencies and create `.portfolio-dist/` deterministically.
- [x] The artifact contains only approved public files and preserves nested demo relative paths.
- [x] Static checks catch dead local links, missing metadata, forbidden artifacts, and known bad
      URLs.
- [x] Playwright/axe checks pass for all pages, themes, and target widths.
- [x] CI runs the same verification contract and stores failure artifacts/screenshots.
- [x] README explains how to preview, verify, deploy, and roll back.

## Risk Assessment

- **Risk:** Playwright external checks flake because Railway/Render cold-start. **Mitigation:** use
  local fallback assertions for public proof and separately classify remote status with retries;
  never hide a user-visible login wall.
- **Risk:** allowlist omits a required generated asset. **Mitigation:** build fails on missing
  references; inspect the artifact tree before deployment.
- **Risk:** root Vite app expectations are disrupted. **Mitigation:** preserve current scripts,
  use namespaced portfolio scripts, and defer package/workspace migration.

## Security Considerations

- Run secret scanning against the artifact and Git history; never log environment values in CI.
- Use least-privilege GitHub Pages permissions (`contents: read`, `pages: write`, `id-token: write`)
  if a deployment workflow is added.
- Do not put demo credentials in workflow variables, test snapshots, or README.

## Completion note

Completed. The root Vite `dist/` output is generated by the legacy app build and is ignored; the
reviewed publish artifact is the separate allowlisted `.portfolio-dist/` directory.
