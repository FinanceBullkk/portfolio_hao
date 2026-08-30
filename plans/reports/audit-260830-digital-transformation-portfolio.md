# Portfolio audit — 30 August 2026

## Executive verdict

The portfolio has a credible digital-transformation story: it starts from operational pain, shows internal tools rather than toy landing pages, and communicates reliability concerns (transactions, idempotency, audit trails, and handover). The strongest evidence is the L&D registration case study and the “what I actually did” section on the About page.

The current presentation would still lose recruiter attention before those strengths are reached. The landing page says only “Portfolio,” uses a placeholder avatar, exposes two products while hiding two others, and sends visitors to an inaccessible CertStudio embed and a broken repository link. Several large performance and quality claims are presented without measurement context. My hiring read is therefore:

- **Potential after a 60-second conversation:** strong candidate for Automation Engineer, Business/Solutions Engineer, Internal Tools/Platform Engineer, or Digital Transformation Engineer.
- **Current shortlist confidence:** medium (approximately **6.5/10** for a digital-transformation role; **4.5–5/10** for a conventional product-SWE screen).
- **Main risk:** the portfolio makes the reviewer verify too much. The evidence exists, but the trust path is not yet reliable.

This is a read-only audit of the existing checkout. No application code was changed.

## Recruiter lens

### What is working

1. **The positioning is differentiated.** “Finding the manual steps … and building the software that removes them” communicates an outcome, not a list of tools (`index.html:45–46`).
2. **The work sounds operationally real.** The About page names the operating environment, handover, reliability, and non-technical users (`about.html:43–56`). That is a good signal for transformation work where adoption matters as much as implementation.
3. **Ownership is unusually clear.** “Scoped, built and handed over solo” and “Designed and built it end to end” answer a question recruiters normally have to ask (`about.html:125–142`).
4. **The case studies show systems thinking.** Registration discusses server-side seat claims, rate limiting, audit trails, asynchronous email side effects, and rules tests (`registration.html:466–485`). Those details are more persuasive than generic “built a React app” language.
5. **The visual system is coherent.** The restrained typography, dark/light theme, consistent case-study shell, and responsive layout feel intentional. The mobile smoke check found no horizontal overflow on the public pages.

### What lowers conversion

- **Identity is delayed.** The home H1 is “Portfolio,” not the candidate’s name or target role (`index.html:45`). A recruiter should know who this is and what role to consider within the first viewport.
- **The first impression looks unfinished.** The gray avatar placeholder (`index.html:41–42`) and generic geometric skill icons make the site read as a template or work-in-progress, even though the underlying projects are stronger.
- **The funnel hides evidence.** The home page labels the section “2 shipped” (`index.html:97–100`) while TMS and Recruitment are commented out (`index.html:123–158`). Both pages remain directly accessible, so the information architecture is inconsistent.
- **No resume or explicit hiring CTA.** Email is available as an icon, but there is no visible “Download résumé,” availability, target-role, or “contact me about…” action in the hero.
- **Impact claims are not audit-ready.** CertStudio presents “0% mismatch error rate,” “60 FPS,” “99% turnaround reduction,” “zero privacy breaches,” and “100% team autonomy” (`certificate-pipeline.html:69–74`, `certificate-pipeline.html:285–301`). TMS presents “120+ hrs,” “100% audit compliance,” and “4x throughput” (`tms.html:67–72`). Without date, baseline, sample size, measurement method, or “target/test result” labels, a skeptical reviewer may read these as marketing rather than evidence.
- **The strongest proof is buried.** Registration is a long page (roughly 10k px on a 390px viewport); TMS is roughly 8.7k px. A recruiter needs a short “problem → ownership → result → proof” summary before the deep technical narrative.
- **Collaboration context is thin.** The portfolio says who built the systems, but not enough about stakeholders, constraints, rollout, feedback, trade-offs, or what changed after launch. That weakens the “digital transformation” signal even when the engineering content is good.

### Recommended recruiter-facing rewrite

Use this structure in the first screen and each project card:

> **Nguyen Huynh Anh Hao — Digital Transformation Engineer**
> I turn spreadsheet- and inbox-heavy L&D operations into reliable internal tools that teams can run themselves.
> Ho Chi Minh City · Open to [target roles] · [résumé] · [email]

Each card should answer, in one scan:

`problem / users / my ownership / measurable result / evidence link / access state`

For example: “Corgi77 — event registration for 1,000+ employees; owned data model, 31 Cloud Functions, security rules, and React client; atomic seat claims; demo uses synthetic data; repo + case study.” Put dates and production status beside the title. Keep the detailed engineering narrative below the fold.

## Builder / SWE / product audit

### P0 — fix before sending the portfolio to anyone

| Finding | Evidence | Risk | Fix |
|---|---|---|---|
| **CertStudio “live” iframe is unusable.** | The case study embeds the Railway app (`certificate-pipeline.html:185–196`). The app responds with `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'`; browser smoke testing records a blocked frame and a blank error surface. Direct navigation is an authenticated Google-login screen, not an anonymous demo. | The page visibly fails and its caption says visitors can test uploads/OCR (`certificate-pipeline.html:196`). This is the largest trust break. | Remove the iframe and replace it with a tested static demo, a short recorded walkthrough, or a screenshot plus “request access.” If embedding is required, change the deployed app’s framing policy under the app owner’s control and retest from the actual portfolio origin. Do not promise anonymous testing until it works. |
| **Certificate GitHub link returns 404.** | Both home and case study link `FinanceBullkk/certificate-automation` (`index.html:117–120`; `certificate-pipeline.html:54–56`); live HTTP check on 2026-08-30 returned 404. | A recruiter clicking “GitHub” sees a dead project and may distrust the other claims. | Restore/rename the repository and update every reference, or remove the link. Add a link-check gate so this cannot recur. |

### P1 — fix this week

| Finding | Evidence | Risk | Fix |
|---|---|---|---|
| **TMS CTA does not match reality.** | Copy says “Opens as an admin demo session, with test data” (`tms.html:634–639`). The live Render URL cold-starts, redirects to `/login`, and requires credentials; the browser check also observed `/api/auth/me` 401. | Recruiters encounter a login wall after being told they will see a demo. | Either provide a disposable, documented demo account; publish a sanitized static walkthrough; or relabel the CTA “Open authenticated production app (access required)” and add a screenshot/video. Keep the cold-start warning only if the link is genuinely usable. |
| **Publish/build model is ambiguous.** | The deployed root is a collection of static HTML pages, while `package.json` is named `react-example` and `vite.config.ts` builds `src/main.tsx` (`package.json:1–11`; `vite.config.ts:24–58`). Root `README.md` is only a heading. `npm run lint` and `npm run build` cannot run in this checkout because `tsc`/`vite` are not installed in the root. | A maintainer cannot tell which artifact is authoritative or reproduce the site; deployment drift is likely. | Choose and document one model: (a) static portfolio repo with demo apps external, or (b) explicit monorepo with workspaces and per-app scripts. Add a real README, `build:portfolio`, `test`, `lint`, and a clean CI build from a fresh clone. |
| **Potentially scraped reference content is in the public tree.** | `temp_nghia.html` and `nghia_dom.txt` contain another person’s portfolio content/links; `scrape.js` is the extraction helper. They are tracked beside the publishable pages. | Accidental publication creates ethical, attribution, SEO, and maintenance risk. | Move research artifacts outside the deploy root or remove them from the published artifact. If retained for legitimate reference, document provenance and exclude them in the build. Verify the generated GitHub Pages output after cleanup. |
| **No automated portfolio smoke gates.** | There is no root test script (`package.json:6–12`), and the public surface depends on several external URLs plus generated nested `dist` folders. | Broken links, CSP regressions, and accessibility issues are likely to return silently. | Add CI checks for HTML validity, internal/external links, Playwright smoke navigation, console errors, mobile overflow, and axe accessibility. Run them against the exact published artifact, not only source files. |

### P2 — polish after the trust path is fixed

- Add a skip link and a `<main id="main-content">` target; provide explicit `:focus-visible` styles for nav links, social links, and the theme toggle. This aligns with the [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
- Mark decorative flow/footer SVGs `aria-hidden="true"`; retain accessible names on icon-only social controls. Add `width`/`height` attributes to the detail-page icons to reserve layout space.
- Add `meta name="theme-color"`, `color-scheme`, canonical/OG metadata, and a sitemap/robots policy appropriate to the deployment.
- Replace `transition: all` in shared CSS (`assets/css/base.css:374`; `assets/css/home.css:75,104,177,225`) with property-specific transitions and add reduced-motion handling for reveal/flow animations.
- Add a favicon to `ld-event-registration-platform/dist`; the local smoke test currently requests `/favicon.ico` and receives 404.
- Reduce inline style duplication and split the very long case studies into a short executive summary plus expandable technical evidence. Avoid clamping the most important product description to three lines.
- Label every screenshot/mockup and dataset consistently as synthetic or `(test data)`. The recruitment page correctly calls its board illustrative (`recruitment.html:84–123`); use the same honesty standard on registration/TMS visuals.

## Verification performed

- Local static server served the six public root pages with HTTP 200.
- Desktop and 390px mobile browser smoke checks found no horizontal overflow and confirmed the theme toggle changes the page theme.
- Heading hierarchy has one H1 on each root page and ordered H2/H3 sections.
- Internal relative assets referenced by the public pages were found locally.
- External checks on 2026-08-30: GitHub profile and `Corgi77` repository responded; the certificate repository returned 404; CertStudio was auth-gated and refused framing; TMS redirected to login and was not an anonymous admin demo.
- Root `npm run lint` and `npm run build` were attempted but are **not verified** because dependencies/binaries are absent in the checkout. No claim of passing tests should be made until a clean install and CI run are recorded.
- The working tree was clean before this report was added; no production files were modified. The only current change is this untracked audit report.

## Seven-day action plan

1. **Day 1:** Fix/remove dead and misleading CTAs; remove the CertStudio iframe; decide what is public versus access-controlled.
2. **Day 2:** Rewrite the hero and project cards for name, target role, ownership, dates, scale, evidence, and access state; add résumé/contact CTA.
3. **Day 3:** Add a static/video proof path for each project, especially TMS and Recruitment; sanitize all data.
4. **Day 4:** Choose the repository/build model and write the README plus reproducible scripts.
5. **Day 5:** Add link, HTML, accessibility, console, and mobile smoke checks to CI.
6. **Day 6:** Apply focus/skip/theme/reduced-motion fixes and trim long-page repetition.
7. **Day 7:** Re-run checks against the deployed URL, ask one recruiter and one engineer to complete a 60-second “what does Hao do?” test, then publish only if both can answer correctly and reach working evidence.

## Unresolved questions

- Which roles, seniority, and employment constraints should the hero explicitly target?
- Are the CertStudio and TMS deployments intended for authenticated stakeholders only, or should anonymous recruiters be able to explore them?
- What dates, baselines, sample sizes, and test reports substantiate each headline metric?
- Is the `temp_nghia` material a legitimate private reference artifact, or should it be removed entirely?
