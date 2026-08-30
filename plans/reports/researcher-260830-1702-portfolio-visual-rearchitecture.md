# UX/UI benchmark: portfolio visual rearchitecture

**Researcher:** Technical Analyst / UX + creative-technology reviewer  
**Conducted:** 2026-08-30 17:02 Asia/Ho_Chi_Minh  
**Scope:** Read-only audit of `portfolio_hao` and current public portfolio patterns for a fresher targeting AI Automation Specialist and Digital Transformation Officer roles.

## Executive summary

The portfolio is technically credible but visually interchangeable. The current public layer is a narrow, mostly monochrome card stack: initials replace identity imagery, geometric icons are generic, and the strongest workflow evidence appears deep in long case studies. The result asks a recruiter to read before giving them a memorable visual hook.

Recommended direction: **operational editorial**. Keep the static-first architecture, but give it an authored art direction: an offset editorial grid, an ink/paper foundation, one high-signal accent, and a recurring visual grammar that turns each project into a readable system (input → decisions → automation → human outcome). Use custom SVG/CSS diagrams and short interaction moments as the signature, not decorative 3D. This makes the site recognizably yours while reinforcing transformation and systems thinking.

The design should have two speeds:

1. **Recruiter speed (5–15 seconds):** name, target role, proof-oriented tagline, three project cards, access state, CV/email CTA.
2. **Builder speed (2–5 minutes):** one-page case-study narrative with architecture, ownership, trade-offs, demo, and evidence boundary.

This is a visual/IA recommendation, not a claim that missing metrics are solved. Until owner evidence exists, use qualitative outcomes and explicitly synthetic demos.

## Contents

- [Current-state diagnosis](#current-state-diagnosis)
- [Benchmarked patterns](#benchmarked-patterns)
- [Direction trade-off](#direction-trade-off)
- [Recommended art direction](#recommended-art-direction)
- [Information architecture](#information-architecture)
- [Interaction and accessibility contract](#interaction-and-accessibility-contract)
- [Implementation architecture](#implementation-architecture)
- [Phased plan](#phased-plan)
- [Risks and adoption](#risks-and-adoption)
- [Limitations and unresolved questions](#limitations-and-unresolved-questions)

## Current-state diagnosis

### What already works

- Positioning is specific to workflow automation and digital transformation rather than generic “full-stack developer”.
- Case studies communicate real operational concerns: ownership, eligibility, seat claims, idempotency, audit trails, and handover.
- Public proof pages are same-origin, static, read-only, and labelled synthetic; this is a strong trust boundary.
- The existing build/check/Playwright/axe contract is a good senior-engineering foundation.

### Why it does not feel distinctive

| Observation in current checkout | Perceptual effect | Re-architecture implication |
|---|---|---|
| Home shell is a narrow centered column with neutral cards and thin borders | Reads like a safe template; weak visual memory | Use a deliberate editorial grid and stronger scale contrast |
| Hero avatar is `HA`; skill/project marks are initials or primitive geometry | No human or authored signature | Add a real portrait when available, plus a bespoke “workflow signal” mark built in SVG |
| Almost all content is text and UI-card chrome | Recruiter cannot infer the systems quickly | Convert each project into one visual “system card” and one annotated flow |
| Four projects have similar card treatment | No hierarchy; everything appears equally important | Choose one flagship, two supporting projects, and an archive lane |
| Long case studies defer the executive outcome | High scroll cost before proof | Add a 30-second summary rail and progressive disclosure |
| Accent colour is largely absent outside mockups | Product evidence and personal brand are disconnected | Reserve one personal accent for navigation, diagrams, and status; keep product brands inside mocks |

### Hiring lens

Nielsen Norman Group notes that the first evaluator is often a recruiter, PM, or founder rather than a designer. The page therefore has to explain the value proposition in plain language before showing craft. Source: [NN/G — UX Hiring: Insights from a Design Recruiter](https://www.nngroup.com/articles/ux-hiring-insights/).

## Benchmarked patterns

### 1. Swiss/editorial structure with a digital layer (strongest fit)

[Stefan Vitasović’s 2025 portfolio case study](https://tympanus.net/codrops/2025/03/05/case-study-stefan-vitasovic-portfolio-2025/) describes a minimalist system using Swiss-print references, offset/asymmetric layouts, generous whitespace, geometry, typography, and recurring motion motifs. The important pattern is not WebGL; it is the contrast between a rigid information structure and a small fluid layer.

**Adopt:** offset grid, typographic scale, one repeatable motion motif, intentional asymmetry.  
**Avoid:** copying shader/glitch effects that do not explain Hao’s work.

### 2. Meaningful motion and lightweight delivery

[Troa 25′ Folio’s case study](https://tympanus.net/codrops/2025/03/28/case-study-troa-25-folio/) explicitly reframes motion as something that should reinforce identity and reports performance/sustainability as a design constraint. It also uses authentic visual material instead of filling every surface with effects.

**Adopt:** motion only at moments of cause/effect (a manual step collapses into an automated step; a status changes). Add a static frame and text equivalent.  
**Avoid:** perpetual scroll hijacking, autoplay sound, and animation on every card.

### 3. Bento systems as a modular content model

[Ladvace/astro-bento-portfolio](https://github.com/Ladvace/astro-bento-portfolio) demonstrates a responsive bento layout, theme variants, a playground, and explicit SEO/performance scripts. It is useful as a component/content model, not as a reason to migrate this repository.

**Adopt:** heterogeneous card sizes and a visible “playground/lab” lane for experiments.  
**Avoid:** its optional guestbook, database, SSR, and multi-framework islands; those add operational surface without improving a recruiter’s decision.

### 4. Cinematic scroll/WebGL (inspiration only)

[Aakash Puri’s open-source portfolio](https://github.com/aakashpuree/Portfolio) shows the common cinematic recipe: dark theme, red/blue gradient, GSAP/Lenis, scroll-linked canvas, and multiple animated sections. It is a good reference for pacing and a poor default architecture for this candidate: the repository has a small community signal (4 stars at review), and canvas/animation adds mobile, accessibility, and maintenance cost.

**Adopt:** a single hero reveal or scroll-linked diagram if measured.  
**Avoid:** full-screen canvas, smooth-scroll replacement, audio, and hidden navigation.

### 5. Accessibility and interaction guardrails

- [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) recommends keyboard-operable flows, visible `:focus-visible`, 44px mobile targets, semantic links/buttons, reduced motion, compositor-friendly properties, and explicit accessible names.
- [W3C WCAG 2.2](https://www.w3.org/TR/wcag/) provides the normative requirements for focus visibility, headings/labels, target size, contrast, and predictable navigation.
- [MDN reduced-motion guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility) recommends reducing or removing non-essential motion when `prefers-reduced-motion: reduce` is set.

These sources are more authoritative than visual-award galleries. They define the non-negotiable floor for an art-directed portfolio.

## Direction trade-off

Scores are relative to this repository: static HTML/CSS/vanilla JS, existing Playwright + axe checks, fresher audience, public synthetic demos, no verified impact dataset, and limited reason to add backend infrastructure.

| Direction | Memorability | Recruiter clarity | Implementation cost | Maintenance/adoption risk | Architectural fit | Rank |
|---|---:|---:|---:|---:|---:|---:|
| **Operational editorial (Swiss grid + workflow diagrams)** | 4/5 | 5/5 | 2/5 | 1/5 | 5/5 | **1** |
| Bento editorial (modular cards + lab lane) | 4/5 | 4/5 | 3/5 | 2/5 | 4/5 | 2 |
| Cinematic motion/WebGL | 5/5 | 2/5 | 5/5 | 5/5 | 2/5 | 3 |
| Brutalist/glitch maximalism | 5/5 | 2/5 | 4/5 | 4/5 | 2/5 | 4 |

### Why the ranking is not “most visual wins”

- The candidate’s differentiator is operational judgment, not visual-effects engineering.
- A recruiter must understand the role fit before interacting with the site.
- A fresher portfolio has a higher trust burden; unsupported spectacle can look like compensation for missing evidence.
- Static SVG/CSS diagrams can be art-directed, indexed, tested, and printed. WebGL cannot be assumed to work on every device or in reduced-motion mode.

## Recommended art direction

### Core concept: “From signal to system”

Make the visual identity a translation of Hao’s work:

```text
messy signal  →  mapped decision  →  reliable workflow  →  human handoff
```

Every page repeats this grammar through a thin line, nodes, and one highlighted state. The motif is recognizable but also explains the work; it is not a decorative network graphic.

### Visual tokens (starting point, validate contrast)

- **Base:** warm paper `#F4F1EA` and ink `#111318`; dark mode uses ink as base with paper text.
- **Signal accent:** vermilion/orange (recommended) or cobalt blue (alternate). Use it for active nav, diagram nodes, and one CTA only. Do not use it for body text unless contrast is tested.
- **System neutrals:** keep current neutral ramp for cards and mockups; avoid adding five more grays.
- **Type:** one expressive display face for the hero (variable serif or humanist grotesk) paired with the existing OS/system UI for body. Self-host or use a resilient fallback; no blocking third-party font dependency unless performance is measured.
- **Grid:** 12-column desktop editorial grid; 4-column mobile; asymmetry limited to hero/flagship card so reading order remains linear.
- **Shape language:** squared/soft-rectangle cards with one or two intentional circles/nodes. Remove random triangle/diamond skill icons.

### Hero composition

Left: name + role + one-sentence outcome.  
Right: a 240–320px “workflow instrument” SVG: four nodes labelled `signal`, `rules`, `automation`, `handoff`, with a single animated pulse.  
Below: role chips, location, availability, `View selected work`, `Download CV` (when supplied), and `Email me`.

The SVG must have a text equivalent (`aria-label` or adjacent caption) and a no-motion first frame.

### Project card composition

Use one flagship card spanning two columns and two smaller supporting cards:

```text
[ project number / domain / access state ]
[ bespoke visual: workflow map or UI crop ]
[ one-line problem ]
[ my ownership ] [ evidence type ] [ result state ]
[ Walkthrough ] [ Case study ] [ Source / access required ]
```

Do not show a metric as a large number unless the baseline, date, sample, and method are available. Use “synthetic walkthrough”, “target”, or “access required” labels consistently.

### Case-study rhythm

1. **Outcome strip:** problem, user, role, state, evidence.
2. **Before/after visual:** manual path in muted ink; automated path in accent.
3. **Decision cards:** three architecture decisions with trade-offs.
4. **Proof panel:** public demo, source, test data, and access boundary.
5. **Reflection:** what would be measured next / known limitation.

This turns the existing technical depth into a designed narrative without deleting it.

## Information architecture

### Proposed top-level routes

1. `/` — **Home / selected work**: recruiter-first, one flagship + two supporting projects, no wall of skills.
2. `/work/:slug` (or current static equivalents) — **Case study**: same template, project-specific visual and architecture.
3. `/about` — **About / operating style**: short bio, role fit, collaboration model, toolkit grouped by outcomes.
4. `/lab` — **Experiments** (optional, only if at least three real experiments exist). Keep separate from shipped work.
5. `/resume.pdf` — add only when the real PDF exists and link is tested.

If migration to a router is not justified, preserve the existing static files and implement the same IA with anchored sections and consistent breadcrumbs. Do not add a framework solely for routing.

### Navigation labels

Use plain labels: `Work`, `About`, `Lab` (optional), `Resume`, `Contact`. Keep a persistent small status line such as `Open to AI automation / digital transformation roles`.

### Content hierarchy

The first viewport must answer, in this order:

1. Who is Hao?
2. What role is he seeking?
3. What operational problem does he solve?
4. Which project proves it?
5. How can a reviewer inspect or contact him?

## Interaction and accessibility contract

### Interactions to implement

- Hover/focus preview on project cards: reveal the workflow node path; never hide the project title or link.
- Scroll reveal: opacity/translate only, one short sequence per section; no scroll hijack.
- Diagram pulse: one 1–1.5s loop; pause on hover/focus and disable under reduced motion.
- Case-study “show technical detail” disclosure: native `<details>` where content is optional; no modal for essential content.
- Theme toggle remains persistent and keyboard accessible.

### Acceptance checks

- Keyboard can reach every CTA in DOM order; visible, high-contrast focus ring; focused item not obscured.
- Every icon-only control has an accessible name; decorative SVG has `aria-hidden="true"`.
- Text remains readable at 200% zoom and 390px width; no horizontal overflow.
- Contrast meets WCAG AA for body text and controls; accent is not the sole status cue.
- `prefers-reduced-motion: reduce` produces a stable first frame, no parallax, no autoplay video/audio.
- Animation uses `transform`/`opacity`; measure LCP/CLS/INP on a mid-range mobile device before adding libraries.

## Implementation architecture

### Keep

- Static-first HTML/CSS/vanilla JS publish artifact.
- Existing allowlist build and Playwright/axe gates.
- Current synthetic/read-only proof boundary and access labels.
- Existing mockup internals; reframe rather than rewrite them.

### Add (smallest useful layer)

- `assets/css/art-direction.css`: tokens, editorial grid, display typography, focus/motion primitives.
- `assets/css/workflow-visuals.css`: reusable SVG/node/edge styles.
- `assets/js/motion.js`: tiny progressive-enhancement controller (IntersectionObserver + reduced-motion check), or inline CSS only if sufficient.
- `assets/visuals/*.svg`: four project-specific workflow diagrams; include text labels and a static fallback.
- A data object/JSON fragment for project metadata to avoid repeating access/evidence labels across cards (only if static generation remains simple).

### Avoid

- Astro/Next migration for visual reasons alone.
- Three.js, Lenis, sound, analytics, guestbook, CMS, or remote image APIs before a measured need.
- A design system larger than the site; three card primitives and one flow primitive are enough.

## Phased plan

### Phase 0 — Art direction lock (0.5–1 day)

- Produce one desktop/mobile moodboard and a token sheet.
- Choose vermilion vs cobalt after contrast test.
- Create hero SVG and one flagship project visual.
- Run a five-second comprehension check with one non-designer.

**Gate:** reviewer can name candidate, target role, and flagship project without scrolling.

### Phase 1 — Shell rearchitecture (1–2 days)

- Replace generic card stack with editorial grid.
- Add persistent work/about/resume/contact nav and visible CV placeholder state (not a fake PDF).
- Add authored hero, status line, and flagship CTA.
- Keep old URLs working; update metadata and social preview.

**Gate:** static build, keyboard path, 390px/1280px screenshots, axe pass.

### Phase 2 — Project storytelling (2–3 days)

- Give each project a bespoke workflow visual and a one-line problem/ownership/evidence summary.
- Add outcome strip + before/after + decision cards to each case study.
- Move deep mockups behind clear headings/details; preserve technical content.

**Gate:** recruiter can compare three projects in under 30 seconds; engineer can find architecture and source in under 2 minutes.

### Phase 3 — Motion polish (0.5–1 day)

- Add only the node pulse, card hover/focus, and short reveal.
- Add reduced-motion and pause controls; test CPU/network throttling.

**Gate:** no motion-induced layout shift, no console errors, no regression in Playwright/axe.

### Phase 4 — Evidence/CV release (when available)

- Replace qualitative placeholders with dated, sourced evidence.
- Add real CV PDF, checksum/link test, and OG image.
- Re-run link and public-demo checks; ask one recruiter and one senior engineer to complete the comprehension test.

**Gate:** no unsupported metric, dead CTA, or ambiguous access state.

## Risks and adoption

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Art direction becomes a theme disconnected from work | Medium | High | Derive every visual motif from a real workflow and label it |
| Accent colour fails contrast or looks like a product brand | Medium | Medium | Test WCAG contrast; reserve accent for non-body UI and use text labels |
| Motion harms accessibility/performance | Medium | High | CSS/transform only, reduced-motion branch, mobile throttling gate |
| More pages create maintenance drift | Medium | Medium | One static template, shared tokens, data-driven metadata, link checks |
| Unverified evidence gets visually amplified | High | High | Keep evidence state adjacent to every claim; no oversized unsupported numbers |
| Framework migration delays delivery | Medium | High | Stay static; add libraries only after a measured requirement |

### Adoption/maturity notes

- Vercel guidelines, W3C WCAG, and MDN are stable, authoritative references; low adoption risk.
- Astro-bento and cinematic repositories are useful patterns but optional templates with varying maintenance/community signals; do not inherit their stack wholesale.
- WebGL/GSAP ecosystems are mature, but the portfolio-specific complexity, mobile cost, and accessibility work remain high. Use only a tiny progressive enhancement if the visual benefit is demonstrable.

## Limitations and unresolved questions

This review did not inspect a final deployed URL, real recruiter analytics, real CV, verified impact measurements, or user interviews. Visual recommendations should be validated with screenshots and a five-second comprehension test before implementation is considered complete.

Unresolved questions:

- Which personal visual material can be published (portrait, sketches, diagrams, project screenshots)?
- Is vermilion/orange or cobalt closer to Hao’s identity and target employers?
- Which project is the true flagship once ownership/evidence is ranked, not just technical complexity?
- Should Vietnamese be a visible language option, or should the public portfolio remain English-only?
- What real baseline/date/sample can replace each qualitative outcome later?

## Sources

1. Vercel, *Web Interface Guidelines*: https://vercel.com/design/guidelines
2. W3C, *Web Content Accessibility Guidelines (WCAG) 2.2*: https://www.w3.org/TR/wcag/
3. MDN, *Using media queries for accessibility*: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility
4. Nielsen Norman Group, *UX Hiring: Insights from a Design Recruiter*: https://www.nngroup.com/articles/ux-hiring-insights/
5. Codrops, *Case Study: Stefan Vitasović Portfolio — 2025*: https://tympanus.net/codrops/2025/03/05/case-study-stefan-vitasovic-portfolio-2025/
6. Codrops, *Case Study: Troa 25′ Folio*: https://tympanus.net/codrops/2025/03/28/case-study-troa-25-folio/
7. GitHub, *Ladvace/astro-bento-portfolio*: https://github.com/Ladvace/astro-bento-portfolio
8. GitHub, *aakashpuree/Portfolio*: https://github.com/aakashpuree/Portfolio
9. GitHub, *vercel-labs/web-interface-guidelines*: https://github.com/vercel-labs/web-interface-guidelines
