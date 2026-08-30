---
phase: 2
title: Information architecture and content
status: completed
priority: P1
effort: 1d
dependencies:
  - 1
---

# Phase 2: Information architecture and content

## Overview

Reshape the recruiter path around a flagship project and a short operating thesis, while preserving
deep case-study URLs and public proof pages for technical reviewers.

## Requirements

- Functional: home answers who/role/problem/proof/contact in one viewport; deep pages expose outcome,
  ownership, decisions, proof, and limitations.
- Non-functional: content remains plain, specific, evidence-labelled, English-first, and printable.

## Architecture

Top-level navigation: `Work`, `Approach`, `About`, `Contact`, plus theme toggle and persistent
availability line. Home order: hero → transformation ribbon → flagship Corgi77 → supporting work →
method → about/contact. Case-study order: back link → executive summary → visual flow → decisions →
existing mock evidence → public proof → reflection. About becomes a capability map tied to projects.

## Related Code Files

- Modify: `index.html`, `about.html`, `certificate-pipeline.html`, `tms.html`, `registration.html`,
  `recruitment.html`, and the four `assets/proof/*.html` shells.
- Modify: `README.md` and `docs/design-guidelines.md` after implementation.

## Implementation Steps

1. Rewrite the home content structure and nav labels; keep all existing proof/case URLs valid.
2. Add explicit project metadata blocks: problem, ownership, evidence, access, and next action.
3. Add a short method section and contact CTA; keep CV as an honest pending state.
4. Add chapter landmarks/TOC hooks to long case studies without deleting mockup content.
5. Give each proof page a consistent visual header and disclosure banner.

## Success Criteria

- [x] A recruiter can compare the flagship and supporting work in 30 seconds.
- [x] All existing smoke-test proof selectors still resolve.
- [x] No copy implies verified impact where only synthetic data exists.
