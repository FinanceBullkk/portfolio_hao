# Design Guidelines - portfolio_hao

**Status:** current source of truth (2026-09-05)

The portfolio uses the owner's earlier compact monochrome design. The public proof remains product-first: visitors can open a playable demo, while case studies provide optional technical depth.

## 1. Audience and hierarchy

Primary audience: recruiters and hiring managers scanning for an AI Automation Specialist or Digital Transformation Officer fresher. Secondary audience: technical reviewers checking ownership, controls, implementation boundaries, and evidence.

The home sequence is:

1. Identity and target-role summary.
2. Skills and focus.
3. Four selected-work cards.
4. Contact and profile links.

Each work card links to a playable demo first and a case study second. Production links remain visibly access-controlled.

## 2. Visual language

- Surface: white in light mode and black in dark mode.
- Type: the operating-system UI stack for the public shell.
- Colour: neutral grayscale only in portfolio chrome. Product interfaces keep their own scoped tokens.
- Composition: one narrow reading column, simple cards, small radii, restrained borders, and generous vertical spacing.
- Navigation: lowercase home/about links with an adjacent theme toggle.
- Motion: limited to short reveal transitions and state changes.

Avoid editorial paper textures, oversized serif headlines, decorative diagrams, warm accent palettes, custom cursors, remote fonts, WebGL, stock imagery, and scroll hijacking.

## 3. Tokens and typography

Use the role tokens in `assets/css/base.css`; do not introduce arbitrary grays.

| Role | Token |
| --- | --- |
| Page background | `--bg` |
| Primary text | `--fg` |
| Secondary text | `--r-secondary` |
| Metadata | `--r-meta` |
| Card border | `--r-edge` |
| Raised surface | `--r-surface` |
| Link underline | `--r-line` |

Public shell copy uses `--font-ui`. Case-study mockups may retain their internal product or monospace fonts because they represent separate application surfaces.

## 4. Shared shell

Every root public page has:

- `<html lang="en">`, viewport metadata, one `<main id="main-content" tabindex="-1">`, and exactly one `<h1>`.
- A skip link, home/about navigation, and a labelled theme toggle.
- The blocking theme snippet in `<head>`; it also adds the `js` class so reveal animation is progressive enhancement.
- A compact footer with GitHub, LinkedIn, and email links.
- `assets/css/base.css` followed by `assets/css/home.css`, then page-specific CSS.

Links remain anchors. Buttons are reserved for actions. Navigation and theme controls keep at least a 44px interaction target.

## 5. Home page

The home page is the visual reference.

- Hero: compact bordered card with identity, role fit, contact action, and profile links.
- Skills: four small cards in a two-column desktop grid.
- Selected work: four cards with a product marker, short description, evidence label, playable-demo link, and case-study link.
- Responsive: grids collapse to one column below 640px without horizontal overflow.

Do not replace the narrow shell with a full-width marketing layout or add decorative hero art.

## 6. Case studies

Case studies reuse the same nav, width, typography, and footer. Keep the detailed DOM mockups and diagrams inside their existing framed surfaces.

The default view is a recruiter scan, not a long article. It should show:

- one short sentence describing the product;
- three compact facts: problem, what Hao built, and the outcome or control;
- the playable-demo action before any technical detail;
- one concise proof/access statement.

Tags, architecture, mockups, decisions, and safeguards belong inside a native `<details>` disclosure labelled `Read the full case study`. The disclosure is collapsed by default, works without JavaScript, keeps a visible keyboard focus state, and must not hide the primary demo action.

Playable-demo links use `data-proof-cta` so automated checks can verify the route.

## 7. Playable demo pages

The four pages under `assets/proof/` keep the current interactive implementations.

- CertStudio uses an approved standalone React sandbox mirroring the production PDF/OCR review flow; Corgi77 embeds its approved isolated React demo build.
- TMS and Recruitment are focused in-memory prototypes.
- All public records are synthetic.
- State resets on refresh.
- No public demo may authenticate, call a production backend, expose admin-only controls, or persist user data.

Their outer shell follows the monochrome portfolio tokens. The embedded product UI keeps its own scoped design system.

## 8. Accessibility and responsive behavior

- Maintain WCAG 2 AA contrast in light and dark themes.
- Keep visible keyboard focus.
- Keep meaningful DOM and visual order at narrow widths.
- Do not hide required information behind hover.
- Wide tables use labelled horizontal scrolling containers.
- Reveal content stays visible when JavaScript is unavailable.
- Reduced motion disables non-essential animation.
- Validate at 390px, 768px, 1280px, and 1440px.

## 9. Content and evidence

Use plain, specific English. Keep claims adjacent to their evidence state.

- Synthetic names use explicit demo labels and `example.test` addresses.
- Never publish real employee data, credentials, private URLs, or unverified metrics.
- Production links say `access required` when authorization is needed.
- Do not create a placeholder CV.
- Mockup captions identify test or synthetic data.

## 10. Verification contract

Run:

```powershell
npm --prefix certificate-flow run build
npm --prefix ld-event-registration-platform run build
npm run build:portfolio
npm run check:portfolio
npm run test:portfolio
npm run lint
npm run build
```

Review both themes, keyboard order, no-JavaScript first paint, reduced motion, 200% zoom, and the generated allowlist. Local green checks do not imply external deployment.

## 11. Change boundary

`scripts/build-portfolio.mjs` owns the static publish allowlist. Only approved public files and the two approved runtime bundles enter `.portfolio-dist`. Source code, environment files, plans, docs, and unresolved captures stay outside the artifact.
