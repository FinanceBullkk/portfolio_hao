---
phase: 6
title: "Final deployment review"
status: completed
priority: P1
effort: "0.5-1d"
dependencies: [5]
---

# Phase 6: Final deployment review

## Overview

Perform the final release rehearsal against the exact artifact and deployed URL. This phase is a
go/no-go gate, not a place to add new features or excuse a broken proof path.

## Requirements

- **Functional:** recruiter and engineer journeys complete from a fresh browser session on desktop
  and mobile; all public claims and access labels match the evidence matrix.
- **Non-functional:** preserve a known-good rollback artifact/commit and obtain explicit owner
  approval before publishing externally.

## Architecture

Use a two-stage release:

```text
clean artifact → staging/local review → owner sign-off → GitHub Pages deploy → post-deploy smoke
       ↘ rollback = previous artifact/commit if any gate fails
```

## Related Code Files

- Inspect: `.portfolio-dist/` (generated, not committed unless the deployment policy requires it)
- Inspect: all root HTML/CSS/JS and nested approved demo `dist` assets
- Inspect: `.github/workflows/portfolio-checks.yml`
- Create: `plans/260830-0926-polish-portfolio/reports/release-evidence.md`

## Implementation Steps

1. Build from a clean checkout with `npm ci`; record commit SHA, build time, artifact file list,
   and verification command output.
2. Run the complete matrix: Chromium desktop 1440px and mobile 390px; light and dark themes;
   keyboard-only path; 200% text zoom; reduced motion; fresh/incognito session; direct URL and
   normal navigation.
3. Verify each project’s first action: static demo opens, authenticated app clearly says access
   required, repository exists, and no CTA claims anonymous functionality that is unavailable.
4. Review screenshots and console/network logs for blank iframes, failed local requests, favicon
   404s, CSP errors, layout overflow, theme flash, and leaked PII.
5. Run a 60-second recruiter test with one person unfamiliar with the project: ask them to name
   the candidate, target role, strongest project, outcome, and contact path. Run a separate engineer
   test: ask them to identify ownership, architecture, proof, and access state.
6. Record pass/fail evidence in `reports/release-evidence.md`. Any P0/P1 failure is **NO-GO**;
   fix and rerun the relevant gate rather than publishing with a caveat.
7. Obtain explicit owner approval, then deploy through the documented GitHub Pages mechanism. Do
   not use an ad-hoc push or modify production hosting settings as part of this plan.
8. Run post-deploy smoke checks from the public URL, compare the published artifact hash/file list
   to the reviewed one, and keep the previous artifact available for rollback.

## Success Criteria

- [x] Clean install, build, static checks, browser checks, and accessibility checks pass.
- [ ] **HOLD —** an independent recruiter/engineer 60-second comprehension test was not run in
      this workspace; owner review is required.
- [x] No local P0/P1 findings remain: blocked iframe, dead repo, misleading auth CTA, leaked artifact,
      or unreproducible build.
- [ ] **HOLD —** no external deployment or post-deploy smoke was authorized or performed.
- [x] Release evidence is recorded; the rollback reference is explicitly marked owner HOLD until
      a previous approved artifact/commit is nominated.

## Risk Assessment

- **Risk:** deployment changes relative paths or GitHub Pages base path. **Mitigation:** test the
  project subpath URL, not only localhost; preserve `.nojekyll` and use relative references.
- **Risk:** remote app changes after approval. **Mitigation:** keep static fallback proof primary and
  run a bounded post-deploy access check.
- **Risk:** owner requests last-minute copy changes. **Mitigation:** rerun content/links/visual
  checks after every material change; do not treat the previous sign-off as still valid.

## Security Considerations

- Review published artifact for `.env`, source maps containing secrets, internal hostnames, private
  screenshots, and credentials before upload.
- Do not record real user sessions or login tokens in screenshots, video, or CI artifacts.
- Remove debug logs and temporary test endpoints from the final artifact.

## Completion note

The final local release rehearsal is complete and the exact artifact is reviewable. Deployment,
post-deploy checks, independent recruiter/engineer comprehension testing, and rollback nomination
remain explicit HOLDs pending owner approval; no publish action was taken. See the exact command,
artifact, and gate record in [release-evidence.md](./reports/release-evidence.md).
