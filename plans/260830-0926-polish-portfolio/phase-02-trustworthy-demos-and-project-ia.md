---
phase: 2
title: "Trustworthy demos and project IA"
status: completed
priority: P1
effort: "1-1.5d"
dependencies: [1]
---

# Phase 2: Trustworthy demos and project IA

## Overview

Repair the proof path before improving the copy. Every card and case study must lead to a page or
artifact whose access behavior matches its label, with a clear fallback when production access is
restricted.

## Requirements

- **Functional:** no dead repository CTA, blocked live iframe, or misleading “admin demo” promise.
- **Non-functional:** preserve application security headers and avoid embedding credentials or
  weakening authentication solely for recruiter access.

## Architecture

Use a proof ladder, from lowest friction to highest trust:

```text
case summary → static/video walkthrough → source repository → authenticated production app
```

The static walkthrough is the default public proof when the production app requires login. Keep
production links as secondary actions with an explicit access label. Do not make a cross-origin
iframe the primary experience unless the deployed app owner explicitly permits framing and the
browser test proves it.

## Related Code Files

- Modify: `index.html`
- Modify: `certificate-pipeline.html`
- Modify: `tms.html`
- Modify: `registration.html`
- Modify: `recruitment.html`
- Inspect/possibly rebuild: `certificate-flow/` and `certificate-flow/dist/`
- Inspect/possibly rebuild: `ld-event-registration-platform/` and its `dist/`
- Create if approved: `assets/images/proof/` or `assets/videos/` walkthrough assets

## Implementation Steps

1. Create a link map from the Phase 1 matrix. For each CTA record the visible label, destination,
   expected status, and fallback. Remove or update `FinanceBullkk/certificate-automation` after
   the owner confirms the canonical repository; do not leave a speculative URL.
2. Replace the CertStudio iframe in `certificate-pipeline.html` with the tested public fallback.
   Preferred order: a same-origin static `certificate-flow/dist` walkthrough, then a sanitized
   poster/video, then an access-request panel. Change the caption so it describes exactly what a
   visitor can do.
3. Change TMS wording from “opens as an admin demo session” to the matrix-approved state. If the
   Render app remains login-gated, make “Authenticated access” explicit and add a static/video
   walkthrough or mailto request path. Never publish credentials.
4. Keep Registration’s static demo only if it works in an incognito browser. Add a visible return
   path to the portfolio after entering the demo and label all data synthetic.
5. Keep Recruitment’s board as an illustrative mock unless a sanitized real artifact is approved.
   Provide a short evidence link or video so “available on request” is not the only proof.
6. Surface projects consistently on the homepage. Recommended order: Registration, CertStudio,
   TMS, Recruitment. Each card must show `case study`, `source`, and one access-state label. If a
   project fails the evidence gate, show it as `Archived` or omit it from both homepage and public
   navigation; do not hide it only in an HTML comment while leaving a discoverable direct page.
7. Run a local and deployed link sweep. Test normal navigation, new-tab navigation, back navigation,
   and the exact mobile viewport used by the smoke suite.

## Success Criteria

- [x] Certificate iframe is removed; the same-origin static walkthrough is the primary proof.
- [x] The unverified certificate repository link is removed from public copy.
- [x] TMS CTA accurately describes authenticated/access-required behavior.
- [x] Registration walkthrough loads with synthetic data and a return path.
- [x] Every homepage card has a tested next action and access label.
- [x] No link points to a missing local file or the known 404 external repository.

## Risk Assessment

- **Risk:** static demos diverge from production behavior. **Mitigation:** call them walkthroughs,
  include a date/version, and keep production access as a separate label.
- **Risk:** an external host changes headers or route behavior. **Mitigation:** retain a local
  fallback asset and run the link/access check in CI with a bounded timeout.
- **Risk:** adding large video files harms page speed. **Mitigation:** use a compressed poster plus
  click-to-play video, or a static DOM walkthrough; do not autoplay.

## Security Considerations

- Preserve `frame-ancestors`/X-Frame-Options on authenticated applications unless the owner makes
  an explicit security decision.
- Use `rel="noopener noreferrer"` on external new-tab links.
- Do not expose Firebase configuration beyond already-public client config, and never add secrets
  to a demo or video.

## Completion note

Completed and exercised by the local link/CTA smoke suite. Production URLs remain secondary
access-request paths; anonymous production access is not claimed.
