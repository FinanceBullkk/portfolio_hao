---
phase: 1
title: "Research and direction"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Research and direction

## Overview

Audit the existing static portfolio, benchmark current art-directed portfolio patterns, and lock
one direction that improves memorability without turning the site into a fragile motion demo.

## Requirements

- Functional: document current IA, evidence constraints, and publish boundary.
- Non-functional: source recommendations from current design guidance and preserve accessibility,
  performance, and synthetic-data honesty.

## Architecture

Select operational editorial: a Swiss/offset grid plus one signal accent and reusable workflow SVGs.
Use static HTML/CSS/vanilla JS; keep WebGL and smooth-scroll engines out of scope.

## Related Code Files

- Read: `README.md`, `docs/design-guidelines.md`, `assets/css/base.css`, `assets/css/home.css`,
  `assets/css/case-study.css`, `scripts/build-portfolio.mjs`.
- Reference: `plans/reports/researcher-260830-1702-portfolio-visual-rearchitecture.md`.

## Implementation Steps

1. Run `ck:ui-ux-pro-max --design-system` for portfolio/editorial recommendations.
2. Review current screenshots and source structure; record the narrow-column, placeholder-icon,
   delayed-reveal, and equal-card hierarchy failures.
3. Research Vercel/W3C/MDN guidance and current portfolio/repository references.
4. Lock the “from signal to system” concept, vermilion accent, flagship hierarchy, and static-first
   boundary.

## Success Criteria

- [x] Research report records sources, trade-offs, and limitations.
- [x] Direction is specific enough to implement without another visual fork.
- [x] No unsupported metrics or private data are introduced by the design direction.
