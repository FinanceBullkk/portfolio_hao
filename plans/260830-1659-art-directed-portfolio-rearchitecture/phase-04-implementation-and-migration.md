---
phase: 4
title: Implementation and migration
status: completed
priority: P1
effort: 2d
dependencies:
  - 3
---

# Phase 4: Implementation and migration

## Overview

Implement the new shell and IA in the existing static pages, keeping mockup internals and public
proof behavior intact while eliminating the blank-on-load and mobile narrow-column failures.

## Requirements

- Functional: all six root pages and four proof pages render through the new shell; links and theme
  persistence continue to work.
- Non-functional: no framework migration, no data exposure, no dead embeds, and file sizes remain
  maintainable through CSS/asset modularization.

## Architecture

Shared HTML shell stays duplicated because the publish target is static. New classes are namespaced
under `portfolio-redesign`; old mockup styles remain loaded after the shell and keep their scoped
product variables. `reveal.js` defaults content visible and only applies a reveal class when JS is
available.

## Related Code Files

- Modify: all published HTML shells, `scripts/build-portfolio.mjs`, `assets/js/reveal.js`.
- Create: new SVG/font files; modify the existing CSS/JS layers to avoid duplicate redesign stylesheets.
- Preserve: `assets/css/*-mocks.css`, `assets/css/certificate-pipeline-flow-demo.css`, and DOM mock
  internals unless a selector collision is proven.

## Implementation Steps

1. Add the new asset files and extend the publish allowlist.
2. Replace the home markup with the recruiter-first editorial IA.
3. Update nav/footer/body classes and add case visual/TOC landmarks to detail and proof pages.
4. Add responsive overrides and test at 390/768/1280/1440px.
5. Resolve any global token collisions found in mockup pages.

## Success Criteria

- [x] Existing URLs, proof CTA selectors, and theme toggle behavior remain valid.
- [x] Generated artifact contains only intentional public files.
- [x] Legacy nested application workspaces remain outside the artifact.
