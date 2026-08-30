# Design Guidelines — portfolio_hao

**Status:** current source of truth (2026-08-30)

The portfolio is an **operational editorial** experience. Its job is to make a fresher candidate memorable without making the evidence feel inflated. The authored idea is **from signal to system**: a workflow starts as noise, becomes a model, becomes an automation, and ends with an owned handoff.

## 1. Audience and hierarchy

Primary audience: recruiters and hiring managers scanning for an AI Automation Specialist or Digital Transformation Officer fresher. Secondary audience: technical reviewers who want ownership, decisions, implementation boundaries, and proof.

The home sequence is fixed:

1. Hero: name/identity, target roles, operational thesis, public-proof state, contact path.
2. Transformation ribbon: Observe → Map → Automate → Handover.
3. Flagship: Corgi77 Registration, with visual system map and public walkthrough.
4. Supporting work: CertStudio, TMS v2, Recruitment intake.
5. Approach: four repeatable working steps.
6. About/contact: capability context and an explicit conversation CTA.

Case studies keep a shorter executive summary before technical detail. Public proof pages stay read-only and disclose synthetic data at the header and near tables/mockups.

## 2. Visual language

- **Surface:** warm paper in light mode (`#f1ece2`), deep ink in dark mode (`#171715`).
- **Signal:** one vermilion accent. It marks sequence, action, and evidence labels. It is not used as a decorative rainbow palette.
- **Type:** local Sora variable font for UI/body; Georgia/Iowan-style serif fallback for display moments. No remote font request.
- **Composition:** offset editorial grids, hairlines, generous whitespace, framed SVG workflow diagrams, and a small recurring corner-bracket motif.
- **Texture:** a low-opacity CSS grid/grain atmosphere. It must remain subtle, static, and non-interactive.
- **Product mocks:** retain their light product surfaces and scoped product tokens. Page chrome must not recolour mock internals.

Avoid generic equal-weight card walls, centered “developer hero” patterns, purple/blue gradients, custom cursors, WebGL, audio, stock imagery, scroll hijacking, and decorative motion with no explanatory role.

## 3. Tokens and typography

Use role tokens instead of hardcoded grays in page chrome:

| Role | Light | Dark |
| --- | --- | --- |
| page surface | `--paper` | `--paper` |
| primary ink | `--ink` | `--ink` |
| readable secondary copy | `--ink-soft` | `--ink-soft` |
| metadata | `--signal-dark` | `--signal-dark` |
| action fill | `--signal` | `--signal` |
| separator | `--hairline` | `--hairline` |

Display headings use `--font-display`, usually italic, weight 500, tight tracking, and a short measure. UI labels use Sora, uppercase sparingly, with enough size and contrast to remain scannable. Body copy should stay around 14–16px with a 1.6–1.75 line-height.

The local font is `assets/fonts/sora-latin-ext-wght-normal.woff2` and is loaded through `@font-face` in `assets/css/base.css` with `font-display: swap`.

## 4. Shared shell

Every public page has:

- `<html lang="en">`, viewport metadata, one `<main id="main-content" tabindex="-1">`, and exactly one `<h1>`.
- A skip link and a persistent, labelled `.theme-toggle`.
- A top editorial lockup, availability line, and navigation to Work, Approach, About, and Contact.
- A footer with GitHub, LinkedIn, and email links.
- The blocking theme snippet in `<head>`, before the stylesheets can paint the wrong theme.

Links remain real anchors. Buttons are used only for actions such as theme switching or a controlled workflow panel. Mobile links and buttons have at least a 44px interaction box.

## 5. Accessibility and motion

- Maintain WCAG 2 AA contrast for normal text and action labels in both themes.
- Keep focus visible with a signal-colour outline that is not clipped by an ancestor.
- Preserve visual/DOM order on narrow layouts; do not hide important copy behind hover.
- Images have explicit `width`/`height` and useful alt text. Decorative SVGs are `aria-hidden`.
- `data-reveal` content is visible by default. JavaScript may add a class for enhancement, but a no-JS page must never be blank.
- Reduced motion disables non-essential animation and smooth scrolling.
- Use transform/opacity for motion; never use `transition: all`.
- The TMS workflow tour is manual. Inactive panels are `aria-hidden` and `inert`, so focus cannot move into a hidden panel.

## 6. Content and evidence

Write plain, specific English. Explain the operational constraint, Hao's ownership, the design/control point, and the next proof path. Keep evidence labels adjacent to claims.

- Synthetic names use `Nguyen Van A`, `Tran Thi B`, masked codes such as `19xxxx`, and `you@example.com`.
- Never publish real employee data, credentials, private workspace URLs, or unverified metrics.
- Qualitative outcomes are acceptable when they describe the mechanism. Quantitative outcomes require a dated baseline, sample, and method.
- Production links say `access required` when authentication or owner approval is needed.
- The CV CTA remains a pending state until the owner supplies the actual PDF. Do not create a placeholder PDF.
- Every mockup caption ends with `(test data)` or an equivalent visible synthetic-data disclosure.

## 7. Responsive composition

Validate at 390px, 768px, 1280px, and 1440px. The home hero is split on wide screens and stacks on narrow screens. The flagship remains a two-part visual/copy composition until it reaches the mobile stack. Supporting projects become one column below 768px. No page may create horizontal overflow; wide tables use a labelled `overflow-x: auto` wrapper.

## 8. Verification contract

Run the gates in this order:

```powershell
npm run build:portfolio
npm run check:portfolio
npm run test:portfolio
npm run lint
npm run build
```

Review light/dark screenshots, keyboard order, no-JS first paint, reduced motion, 200% zoom, and the generated file list. Treat local green checks and external deployment as separate facts.

## 9. Change boundary

The static publish allowlist is maintained in `scripts/build-portfolio.mjs`. New public assets must be intentional and added there explicitly. Application workspaces, generated bundles, plans, and unresolved reference captures stay outside `.portfolio-dist`.
