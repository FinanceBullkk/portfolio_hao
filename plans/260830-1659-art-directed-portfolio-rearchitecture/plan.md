---
title: Rearchitect portfolio as an art-directed transformation journal
description: >-
  Rebuild the static portfolio as an operational editorial experience that makes
  AI automation and digital transformation work memorable without sacrificing
  recruiter clarity, accessibility, or evidence honesty.
status: completed
priority: P2
branch: main
tags:
  - ux
  - ui
  - art-direction
  - accessibility
  - portfolio
  - static-web
blockedBy: []
blocks: []
created: '2026-08-30T10:03:32.703Z'
createdBy: 'ck:plan'
source: skill
---

# Rearchitect portfolio as an art-directed transformation journal

## Overview

The current portfolio is technically credible but visually interchangeable: a narrow monochrome
column, equal-weight cards, placeholder initials, and long case studies that delay the strongest
proof. This plan keeps the static HTML/CSS/vanilla-JS architecture and trustworthy synthetic-data
boundary, then re-architects the experience around one authored idea: **from signal to system**.

The visual language is operational editorial: warm paper and ink, one vermilion signal accent,
an offset grid, expressive display type paired with a readable UI face, and a recurring SVG flow
motif (`signal → rules → automation → handoff`). The art direction must explain Hao's work rather
than decorate it. A recruiter should understand role fit and flagship work in one viewport; an
engineer should reach ownership, trade-offs, proof, and access boundaries in under two minutes.

## Decisions locked for this implementation

- **Audience:** fresher applications for AI Automation Specialist and Digital Transformation
  Officer roles.
- **Primary conversion:** inspect a public walkthrough or email Hao. CV remains a visible “coming
  soon” state until the owner supplies the real PDF; no placeholder download.
- **Visual direction:** operational editorial, not WebGL/cinematic. CSS/SVG progressive enhancement
  only; no scroll hijacking, audio, remote stock imagery, or framework migration.
- **Hierarchy:** one flagship project (Corgi77 Registration) followed by three supporting systems;
  skills move below proof and become capability-to-project evidence instead of a tag wall.
- **Evidence:** qualitative outcomes and synthetic/read-only labels remain adjacent to every claim;
  no unsupported metric is amplified typographically.
- **Typography:** self-host the already-installed Sora variable font for UI/body; use a resilient
  editorial serif fallback for display moments. No blocking third-party font request.
- **Theme:** paper/ink light mode and ink/paper dark mode, with a single high-signal vermilion
  accent. Mockups retain their light product surfaces and scoped tokens.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Research and direction](./phase-01-research-and-direction.md) | Completed |
| 2 | [Information architecture and content](./phase-02-information-architecture-and-content.md) | Completed |
| 3 | [Visual system and interaction](./phase-03-visual-system-and-interaction.md) | Completed |
| 4 | [Implementation and migration](./phase-04-implementation-and-migration.md) | Completed |
| 5 | [Validation and release](./phase-05-validation-and-release.md) | Completed |

## Architecture boundary

```text
HTML pages
  ├─ shared shell: nav / theme / skip link / contact
  ├─ recruiter layer: hero / flagship / supporting work / method
  ├─ case layer: outcome strip / visual flow / decisions / proof / reflection
  └─ proof layer: static walkthroughs with synthetic data

CSS
  ├─ base.css               tokens, typography, surfaces, grid, motion primitives
  ├─ home.css               shared shell and recruiter-first home composition
  ├─ case-study.css         long-form case shell and evidence framing
  ├─ about.css              capability map and about composition
  └─ proof.css              public walkthrough shell overrides

JS
  ├─ theme.js                existing persistent light/dark toggle
  ├─ reveal.js               progressive enhancement with visible fallback
  └─ flow-demo.js            manual TMS tour with inert inactive panels
```

Keep the current publish allowlist and extend it only for the new SVG/font assets. Keep
application workspaces and unknown-provenance scrape files outside the public artifact.

## Acceptance contract

- First viewport states name, target roles, operational thesis, flagship project, proof state, and
  contact path without requiring a hover or scroll.
- Home has one clear flagship, three supporting projects, and no equal-weight wall of cards.
- Every visual diagram has an accessible text equivalent; every meaningful image has dimensions and
  alt text; decorative SVGs are `aria-hidden`.
- Keyboard order follows visual order, focus is visible and unobscured, links remain real `<a>`s,
  and all mobile targets are at least 44px.
- Light/dark modes preserve contrast; accent is never the only status cue; reduced motion disables
  pulses/reveals without hiding content.
- 390px, 768px, 1280px, and 1440px layouts have no horizontal overflow or clipped content.
- `npm run verify:portfolio`, `npm run lint`, and the legacy `npm run build` pass; publish output is
  deterministic and contains no secrets, PII, dead embeds, or unsupported metric claims.

## Research references

See [`plans/reports/researcher-260830-1702-portfolio-visual-rearchitecture.md`](../reports/researcher-260830-1702-portfolio-visual-rearchitecture.md)
for the benchmark and source notes. The direction is informed by Codrops' Swiss/editorial case
studies, Astro/native-CSS portfolio repositories, Vercel's Web Interface Guidelines, W3C WCAG 2.2,
and MDN reduced-motion guidance.

## Unresolved questions

1. Which portrait, if any, is approved for public use?
2. When will the owner provide the final CV PDF and public contact copy?
3. Which project should become the flagship if later evidence ranks it above Corgi77?
4. Which dated baseline/sample/method can replace qualitative outcomes?
