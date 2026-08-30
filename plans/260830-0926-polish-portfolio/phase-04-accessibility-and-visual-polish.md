---
phase: 4
title: "Accessibility and visual polish"
status: completed
priority: P2
effort: "1d"
dependencies: [2, 3]
---

# Phase 4: Accessibility and visual polish

## Overview

Apply a focused shared-shell polish after content and proof paths are stable. Improve keyboard and
screen-reader usability, theme behavior, motion preferences, layout stability, and visual rhythm
without rewriting the existing mockup internals.

## Requirements

- **Functional:** all interactive controls are keyboard reachable, visibly focused, labelled, and
  usable in light/dark and reduced-motion modes.
- **Non-functional:** preserve the token system and current responsive behavior; no horizontal
  overflow at 390px; reserve image space to avoid layout shift.

## Architecture

Keep the existing class-based theme contract (`:root` / `:root.dark` plus the blocking head
snippet). Centralize shell rules in `base.css` and `home.css`; keep case-study primitives in
`case-study.css`; leave app/mockup styles in their existing files.

## Related Code Files

- Modify: `assets/css/base.css`
- Modify: `assets/css/home.css`
- Modify: `assets/css/case-study.css`
- Modify: `index.html`, `about.html`, `certificate-pipeline.html`, `tms.html`,
  `registration.html`, `recruitment.html`
- Leave unchanged unless a test proves a defect: `assets/css/*-mocks.css`,
  `assets/css/tms.css`, `assets/css/certificate-pipeline-flow-demo.css`,
  `assets/js/flow-demo.js`, `assets/js/reveal.js`

## Implementation Steps

1. Add a skip link and a stable `<main id="main-content">` target to every published page. Give
   the primary nav an accessible label and mark the current home/about link with `aria-current`.
2. Add explicit `:focus-visible` outlines and adequate contrast for nav, social, CTA, and theme
   controls. Keep the theme button’s accessible name synchronized with its action.
3. Mark decorative footer/flow SVGs `aria-hidden="true"`; retain meaningful alt text on project
   icons. Add `width` and `height` attributes to detail icons and any new proof images.
4. Add `meta name="theme-color"` and `color-scheme` values compatible with the class-based toggle.
   Do not add a `prefers-color-scheme` CSS override that can defeat an explicit user choice.
5. Replace `transition: all` with property-specific transitions. Add a `prefers-reduced-motion:
   reduce` block that disables reveal/flow movement and keeps content immediately visible.
6. Remove or relax line clamping where it hides project impact. Use design tokens instead of new
   hard-coded grays; move only the highest-value repeated inline styles into shared classes.
7. Check heading order, link names, text zoom at 200%, keyboard tab order, contrast, and touch
   target size. Test both themes at 1440px and 390px before touching mockup internals.

## Success Criteria

- [x] Keyboard-only path reaches every CTA and theme control with a visible focus indicator.
- [x] Skip link lands on main content; headings remain hierarchical and unique per page.
- [x] Decorative SVGs are hidden from assistive technology; icon-only controls have names.
- [x] Reduced-motion mode shows all content without animation dependency.
- [x] Light/dark choice survives reload and navigation; no theme flash regression is introduced.
- [x] No horizontal overflow at 390px and no new layout shift from proof images/icons.
- [x] Mockup internals remain visually unchanged except for approved captions/labels and contrast tokens.

## Risk Assessment

- **Risk:** shared CSS changes break dense mockups. **Mitigation:** scope selectors to shell/content
  primitives, snapshot before/after, and run page screenshots in both themes.
- **Risk:** focus styles conflict with brand styling. **Mitigation:** use one high-contrast outline
  token and test against both surfaces.
- **Risk:** animation code hides content when reduced motion is enabled. **Mitigation:** test with
  the media query forced and remove dependency on animation completion.

## Security Considerations

- Do not add third-party fonts, analytics, or scripts solely for polish without reviewing privacy,
  CSP, and performance impact.
- Keep external links isolated from same-origin navigation and preserve `noopener`.

## Completion note

Completed. The axe suite runs with reduced motion enabled before each scan so reveal transitions
cannot create transient opacity false positives; the scan is not suppressed or filtered.
