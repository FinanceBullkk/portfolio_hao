# Publish boundary decision

Date: 2026-08-30

The public artifact is static-first. `scripts/build-portfolio.mjs` copies only the six approved
root pages, their shared CSS/JavaScript, the favicon, and the sanitised walkthrough pages under
`assets/proof/`. It does not copy application source trees, environment files, plan files, or
research material.

The following files are present in the checkout but intentionally excluded:

- `temp_nghia.html`
- `nghia_dom.txt`
- `scrape.js`
- `certificate-flow/src/` and `certificate-flow/dist/`
- `ld-event-registration-platform/src/` and `ld-event-registration-platform/dist/`

Their provenance and long-term disposition are unresolved. They are not deleted or overwritten in
this pass. If the owner confirms the reference files are not legitimate, remove them in a separate
focused change after preserving a backup. If a nested application demo is later approved for
publication, sanitize it and add its exact `dist` path to the allowlist with a dedicated review.

This boundary keeps the public walkthroughs deterministic and prevents accidental exposure of
credentials, source maps, employer data, or scraped third-party content.
