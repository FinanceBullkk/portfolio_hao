---
phase: 1
title: "Evidence and content contract"
status: completed
priority: P1
effort: "0.5-1d"
dependencies: []
---

# Phase 1: Evidence and content contract

## Overview

Freeze the facts and access states that the public pages are allowed to claim. This phase is a
content and risk gate; it prevents attractive copy from outrunning evidence during later HTML
edits.

## Requirements

- **Functional:** one row per public project with owner role, audience, dates, deployment status,
  canonical URLs, demo mode, and approved metrics.
- **Non-functional:** no secrets, real employee/applicant data, employer-confidential details, or
  untraceable absolute claims enter the publishable copy.

## Architecture

Create a plan-scoped evidence matrix at
`plans/260830-0926-polish-portfolio/reports/evidence-matrix.md`. It is not shipped to GitHub Pages.
The matrix is the handoff contract between content, UI, and QA:

```text
evidence matrix → approved copy/access labels → HTML cards/case studies → automated checks
```

Use four access labels only: `Public demo`, `Static walkthrough`, `Authenticated access`, and
`Archived`. A URL may not receive `Public demo` unless an incognito browser can complete the
promised journey without credentials.

## Related Code Files

- Create: `plans/260830-0926-polish-portfolio/reports/evidence-matrix.md`
- Inspect: `index.html`, `about.html`, `certificate-pipeline.html`, `tms.html`,
  `registration.html`, `recruitment.html`, `metadata.json`
- Inspect: `certificate-flow/dist/`, `ld-event-registration-platform/dist/`
- Inspect: `docs/design-guidelines.md`

## Implementation Steps

1. Record the current public URL, repository URL, case-study URL, and nested demo path for each
   project. Capture the observed result (works, redirects to login, 404, blocked frame, or
   unavailable) and the check date.
2. For each project, fill `audience`, `my ownership`, `team/stakeholders`, `timeframe`,
   `production status`, `data classification`, and one approved outcome sentence.
3. Classify every metric as `observed`, `automated test result`, `estimate`, or `target`. Require
   a baseline/date/sample/method for observed claims. Remove or soften claims that cannot be
   supported; never silently invent a denominator.
4. Audit all mockups and generated demo data. Replace or mask realistic names, employee codes,
   emails, and company-sensitive values with the existing synthetic convention; mark captions
   `(test data)`.
5. Decide the access label and fallback proof for CertStudio, TMS, Registration, and Recruitment.
   A fallback must be a tested static page, sanitized screenshot, or short video—not a promise to
   “request access” with no owner contact.
6. Obtain owner sign-off on the matrix before editing public claims. Keep unresolved rows marked
   `PENDING_OWNER_EVIDENCE` rather than blocking the rest of the plan.

## Success Criteria

- [x] Four project rows exist; owner-dependent fields are explicitly marked in the matrix.
- [x] Every headline number in the current pages is either evidenced, explicitly qualified, or
      removed from the planned copy.
- [x] CertStudio and TMS have a truthful static fallback path selected.
- [x] PII/secrets scan finds no publishable real data in the allowlisted artifact.
- [x] Owner decisions supplied for this pass are recorded; unresolved evidence remains explicit.

## Risk Assessment

- **Risk:** metrics are business-sensitive or cannot be reproduced. **Mitigation:** use ranges or
  qualitative outcomes, cite the measurement date internally, and omit unverifiable numbers.
- **Risk:** a live URL changes between audit and implementation. **Mitigation:** store the expected
  user-visible behavior and recheck at Phase 2 and Phase 6.
- **Risk:** evidence gathering delays the polish. **Mitigation:** ship a static walkthrough label
  while authenticated production proof remains pending.

## Security Considerations

- Never place demo credentials, OAuth tokens, API keys, or `.env` contents in the matrix or site.
- Treat employer names and operational numbers as owner-approved content, not automatically public.
- Keep all mock data synthetic, even when a screenshot looks realistic.

## Completion note

Completed with the evidence matrix and publish-boundary decisions recorded. Metric/date/production
sign-off is still owner-dependent and is not represented as verified evidence.
