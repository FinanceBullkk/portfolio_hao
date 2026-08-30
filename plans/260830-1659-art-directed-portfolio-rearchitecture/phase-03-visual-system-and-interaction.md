---
phase: 3
title: Visual system and interaction
status: completed
priority: P1
effort: 1d
dependencies:
  - 2
---

# Phase 3: Visual system and interaction

## Overview

Translate the concept into a reusable visual system: paper/ink surfaces, a vermilion signal, fluid
editorial type, offset grids, and one meaningful diagram pulse with a static fallback.

## Requirements

- Functional: theme-aware tokens, responsive layout, hover/focus states, reduced-motion behavior,
  and accessible diagrams.
- Non-functional: CSS transform/opacity animation only, no layout shift, no remote image or font
  dependency, and no accent leakage into product mockups.

## Architecture

Use the existing `base.css`, `home.css`, `case-study.css`, `about.css`, and `proof.css` as the
namespaced visual-system layers. This avoids duplicate redesign stylesheets while preserving the
legacy mockup CSS. Use self-hosted Sora latin-ext for body/UI and a resilient serif stack for display.
Define z-index, spacing, radius, shadow, and motion scales once.

## Related Code Files

- Modify: `assets/css/base.css`, `assets/css/home.css`, `assets/css/case-study.css`,
  `assets/css/about.css`, and `assets/css/proof.css`.
- Create: `assets/fonts/sora-latin-ext-wght-normal.woff2`, `assets/visuals/*.svg`.
- Modify: `assets/js/reveal.js` and `assets/js/flow-demo.js`.

## Implementation Steps

1. Add semantic color/type/spacing tokens and a fixed grain/grid atmosphere.
2. Build the signal-system hero and four project workflow visuals as SVG with text alternatives.
3. Style the split hero, asymmetric flagship, supporting work rail, method timeline, and contact
   panel; collapse all offsets below 768px.
4. Add active nav/chapter state and a pauseable pulse; disable non-essential motion under reduced
   motion.

## Success Criteria

- [x] Art direction reads as one system across home, case, and proof pages.
- [x] Accent and display type remain legible in both themes.
- [x] No generic three-card feature row or centered hero remains on home.
