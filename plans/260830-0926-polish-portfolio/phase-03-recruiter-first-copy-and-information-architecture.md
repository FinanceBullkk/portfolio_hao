---
phase: 3
title: "Recruiter-first copy and information architecture"
status: completed
priority: P1
effort: "1-1.5d"
dependencies: [1, 2]
---

# Phase 3: Recruiter-first copy and information architecture

## Overview

Turn the verified evidence into a fast, human-readable hiring story. Keep the detailed case
studies, but place identity, role fit, ownership, timeline, outcomes, and proof above the long
technical sections.

## Requirements

- **Functional:** a first-time visitor can identify the candidate, target roles, location,
  availability/contact path, and strongest projects without scrolling through a case study.
- **Non-functional:** plain direct language; no unsupported superlatives, confidential detail, or
  duplicate claims that disagree between homepage and case study.

## Architecture

Use one content hierarchy across all pages:

```text
identity + target role
  → selected work cards (problem / ownership / result / evidence state)
    → case-study summary (users / constraints / decisions / measured outcome)
      → technical evidence and mockups
        → next action
```

The page remains static HTML. Do not introduce a runtime CMS or a new component framework for this
pass.

## Related Code Files

- Modify: `index.html`
- Modify: `about.html`
- Modify: `certificate-pipeline.html`
- Modify: `tms.html`
- Modify: `registration.html`
- Modify: `recruitment.html`
- Modify: `metadata.json` (only if its values are used by the publish flow)
- Create only when owner supplies it: `assets/documents/hao-resume.pdf`

## Implementation Steps

1. Replace the home H1 “Portfolio” with the owner-approved name and role. Add one sentence that
   explains the transformation value, plus location, availability/engagement preference, email,
   LinkedIn, and an optional résumé CTA. Do not ship a résumé link until the file exists and is
   approved.
2. Rewrite the homepage section as “Selected work” (or an approved equivalent). For every card,
   use the same five-line pattern: project/outcome, users or scale, personal ownership, status,
   and proof links. Keep the strongest two cards above the fold; expose additional work only when
   its evidence state is honest.
3. Add a compact case-study summary block near the top of each detail page containing: problem,
   role, timeframe, users/scale, result, and access state. Link to `#technical-evidence` (or a
   consistent anchor) for readers who want depth.
4. Add team/stakeholder and rollout context where known. State “solo,” “with L&D stakeholders,”
   or the approved equivalent; never imply team size or production adoption without evidence.
5. Rewrite metric labels from absolute marketing claims to evidence-aware language. Examples:
   `under 2 minutes in recorded batch test (date)`; `400+ automated tests at commit ...`; or a
   qualitative outcome when no denominator exists. Keep one coherent scale per page.
6. Make the About page answer “what role should I hire Hao for?” in the first paragraph, then keep
   the process, skills, and role-by-project sections as supporting proof. Add dates/years only from
   the owner-approved résumé or profile.
7. Add page titles/descriptions and social metadata consistently. Add canonical/OG URLs only after
   the production domain is confirmed; never point metadata at a staging URL.
8. Read the pages aloud as a recruiter: remove repeated tool lists, shorten paragraphs, make every
   heading outcome-oriented, and keep the detailed engineering explanation available below.

## Success Criteria

- [x] Name, target role, location, contact, and availability appear in the home first viewport.
- [x] Each surfaced project has a concise recruiter summary and a direct proof path.
- [x] Each case study has a reviewed summary before deep technical content.
- [x] Homepage and detail-page numbers follow the evidence matrix's synthetic/structural rules.
- [x] No résumé, date, team-size, adoption, or production claim is fabricated.
- [x] All CTA labels match Phase 2 access behavior.

## Risk Assessment

- **Risk:** copy becomes too generic after removing bold numbers. **Mitigation:** replace weak
  numbers with concrete users, constraints, decisions, and dated test evidence.
- **Risk:** homepage becomes crowded when all projects are surfaced. **Mitigation:** keep four
  compact cards and move detail to case pages; use a clear “selected” versus “archived” label.
- **Risk:** SEO metadata exposes an unapproved employer or email. **Mitigation:** owner review of
  the final head blocks before deployment.

## Security Considerations

- Avoid publishing internal URLs, credentials, private screenshots, or identifiable participant
  information.
- Keep contact links intentional; do not add analytics or tracking pixels without a privacy decision.

## Completion note

Completed for the fresher positioning and AI Automation Specialist / Digital Transformation
Officer target roles. A résumé CTA remains omitted until the owner supplies an approved PDF.
