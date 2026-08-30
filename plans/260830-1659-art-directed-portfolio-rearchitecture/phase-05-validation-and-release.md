---
phase: 5
title: Validation and release
status: completed
priority: P1
effort: 1d
dependencies:
  - 4
---

# Phase 5: Validation and release

## Overview

Validate the visual rearchitecture as a real product surface: browser behavior, accessibility,
responsive composition, no-JS fallback, publish determinism, and recruiter comprehension.

## Requirements

- Functional: all smoke/interaction paths pass, every page has one h1, local links resolve, and
  diagrams/proof CTAs are reachable by keyboard.
- Non-functional: serious/critical axe violations remain zero; reduced motion and 200% zoom preserve
  readable content; no new remote dependency is required.

## Architecture

Keep local gates separate: static checker, Playwright smoke/a11y, lint/build, visual screenshot review,
and external access probes. External deployment is not implied by a local pass.

## Related Code Files

- Modify: `scripts/check-portfolio.mjs`, `tests/portfolio-smoke.spec.ts`,
  `tests/portfolio-a11y.spec.ts` only when new assertions are needed.
- Create: visual evidence under this plan's `visuals/` directory; update release evidence under
  `plans/260830-1659-art-directed-portfolio-rearchitecture/reports/`.

## Implementation Steps

1. Run build/static checks and Playwright at desktop/mobile widths in both themes.
2. Add/execute no-JS, reduced-motion, keyboard, and 200% zoom checks.
3. Review screenshots for hierarchy, clipping, contrast, and visual consistency.
4. Run `npm run lint` and `npm run build`; scan staged/public output for secrets and PII.
5. Record verified gates, owner-dependent evidence, and deployment HOLD in release evidence.

## Success Criteria

- [x] `npm run verify:portfolio` passes with zero serious/critical axe violations.
- [x] Visual review confirms the flagship hierarchy and no blank first paint.
- [x] Release notes distinguish local verification from external deployment.
