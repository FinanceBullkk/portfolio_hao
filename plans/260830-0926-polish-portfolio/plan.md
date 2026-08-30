---
title: "Polish portfolio for recruiter conversion and trustworthy delivery"
description: "Make the portfolio recruiter-ready by repairing proof paths, sharpening the story, improving accessibility, and making publishing reproducible."
status: completed
priority: P1
effort: "5-7d"
branch: "main"
tags: [frontend, accessibility, docs, infra, content]
blockedBy: []
blocks: []
created: "2026-08-30"
createdBy: "ck:plan"
source: skill
---

# Polish portfolio for recruiter conversion and trustworthy delivery

## Overview

This plan polishes the existing static portfolio so a recruiter can understand the candidate,
the transformation impact, and the proof path in under 60 seconds, while an engineer can inspect
credible implementation evidence without encountering dead links, blocked embeds, or ambiguous
build instructions.

The plan is based on [the 2026-08-30 audit](../reports/audit-260830-digital-transformation-portfolio.md)
and the current checkout, not on a green-field redesign.

### Goals

- Make identity, target role, ownership, dates, scale, and contact options visible immediately.
- Make every demo/repository CTA truthful about access state and verifiable from the published site.
- Preserve the existing case-study mockups and transformation narrative while shortening the
  recruiter path to the evidence.
- Meet a practical accessibility baseline (keyboard, focus, reduced motion, semantics, mobile).
- Produce one documented, repeatable static publish artifact with automated smoke gates.

### Explicit non-goals

- No rewrite of the CertStudio, TMS, or registration backends.
- No bot-evasion, credential automation, or production data exposure.
- No large visual framework migration or monorepo split in this polish pass.
- No publication of a résumé or metric that the owner has not supplied and approved.

### End-state user journey

```text
Recruiter: hero identity → selected work card → one-sentence outcome → reliable proof → contact
Engineer: case summary → ownership/architecture → sanitized demo or access note → repo/tests
Operator: access label → expected login/demo behavior → no leaked credentials or PII
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Evidence and content contract](./phase-01-evidence-and-content-contract.md) | Completed |
| 2 | [Trustworthy demos and project IA](./phase-02-trustworthy-demos-and-project-ia.md) | Completed |
| 3 | [Recruiter-first copy and information architecture](./phase-03-recruiter-first-copy-and-information-architecture.md) | Completed |
| 4 | [Accessibility and visual polish](./phase-04-accessibility-and-visual-polish.md) | Completed |
| 5 | [Reproducible publishing and automated QA](./phase-05-reproducible-publishing-and-automated-qa.md) | Completed |
| 6 | [Final deployment review](./phase-06-final-deployment-review.md) | Completed — deployment HOLD |

## Implementation status (2026-08-30)

The implementation and local release rehearsal are complete. The exact static artifact contains
24 allowlisted files under `.portfolio-dist/`; `npm ci`, build, static checks, Chromium desktop
and 390px smoke tests, and serious/critical axe scans pass (74/74 tests). Unsupported outcome
numbers are either removed or retained only as clearly labelled synthetic UI values with a
page-level disclosure. External deployment, post-deploy checks, owner metric evidence, the CV
PDF, and disposition of unknown-provenance scrape files remain explicit owner gates. No commit,
push, or deployment was performed.

## Dependencies

### Cross-plan dependencies

| Relationship | Plan | Decision |
|---|---|---|
| Follow-on / supersedes remaining presentation work | `260808-0808-convert-pages-to-new-design` | The older plan is outside this scope; its current-checkout output is the baseline. Do not redo its shell conversion; resolve only the gaps listed here. |

### Required inputs

- Owner-approved target roles, availability, and preferred contact method.
- Evidence for every headline metric: baseline, date, sample, and whether it is observed,
  tested, estimated, or a target.
- Access decision for CertStudio and TMS: anonymous demo, authenticated stakeholder app, or
  static/video walkthrough.
- Owner decision on the provenance and disposition of `temp_nghia.html`, `nghia_dom.txt`, and
  `scrape.js`.

### Constraints

- Keep `1 project → 1 truthful access state`; never imply a public demo where login is required.
- Keep mockup data synthetic and label it consistently as `(test data)`.
- Preserve the current class/token system in `docs/design-guidelines.md`; do not reintroduce a
  media-query theme override or a second page shell.

## Definition of done

- A cold recruiter can identify Hao, target role, strongest projects, and contact path in one
  viewport.
- All published internal links resolve; external CTAs either work as advertised or clearly say
  “access required/request access.”
- No blocked iframe, dead repository link, console error, horizontal overflow, or obvious PII in
  the published artifact.
- `npm ci` followed by the documented portfolio check/build/smoke commands succeeds on a clean
  runner.
- Desktop/mobile and light/dark evidence is captured for the exact artifact that is deployed.
- Deployment is held until the final go/no-go checklist is signed off; rollback is the previous
  known-good published artifact/commit.

## Plan-level risks

- **Owner evidence arrives late:** keep claims in a pending matrix and ship only verified copy.
- **Auth-gated apps remain unavailable:** use static/video proof; do not weaken app security just
  to make an embed work.
- **Legacy Vite app conflicts with static publishing:** isolate the portfolio build command and
  artifact; defer source-tree migration.
- **External endpoints are flaky:** classify expected auth/cold-start behavior and test the user
  visible result, not only HTTP 200.

## Unresolved questions

1. Which exact job titles and seniority should the hero target?
2. Is a résumé PDF available and approved for public hosting?
3. Should CertStudio/TMS remain stakeholder-only, or is an anonymous sanitized walkthrough
   required?
4. Which metrics can be supported with dated evidence, and which should be removed?
5. Is the scraped reference material legitimate and private, or should it be deleted?
