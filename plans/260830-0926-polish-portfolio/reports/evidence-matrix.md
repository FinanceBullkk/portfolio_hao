# Portfolio evidence matrix

Status: **implementation baseline — owner verification still required for metrics, dates, and production status**
Created: 2026-08-30
Last checked: 2026-08-30
Scope: `portfolio_hao` public pages and linked demos

This file is plan-scoped and must not be copied into the GitHub Pages artifact. Use one row per
project. Keep sensitive details out of this file; record only what is safe for planning.

| Project | Audience / users | Hao's ownership | Timeframe | Production status | Access label | Canonical demo/repo | Approved outcome | Metric evidence (date / baseline / sample / method) | Data review |
|---|---|---|---|---|---|---|---|---|---|
| CertStudio | L&D coordinators and certificate recipients; exact audience scope pending owner | Solo scope/build/handover is stated in the existing case study; owner to confirm | PENDING_OWNER_EVIDENCE | Production URL is authentication-gated and refuses framing (observed 2026-08-30) | **Static walkthrough** (same-origin, synthetic data); production link is **Authenticated access** | `assets/proof/certstudio-walkthrough.html`; project repository **PENDING_OWNER_EVIDENCE** after known 404 | A guided workflow for ingest, page-level matching, review, and dispatch; no public performance guarantee | **PENDING_OWNER_EVIDENCE**. Existing time/error/FPS figures are not published as outcomes | Synthetic-only walkthrough; root mockups require owner review before release |
| L&D Event Registration | L&D operators and employees; exact scale pending owner | End-to-end data model, client, server functions, rules, and admin workflow (owner confirmation pending) | PENDING_OWNER_EVIDENCE | Internal production intent; public deployment/configuration not verified | **Static walkthrough** (same-origin, synthetic data); any production URL is **Authenticated access** | `assets/proof/registration-walkthrough.html`; `https://github.com/FinanceBullkk/Corgi77` (HTTP 200 observed 2026-08-30) | Capacity-safe registration with server-side eligibility and an auditable admin workflow | **PENDING_OWNER_EVIDENCE**. Repository test counts/findings are not presented as guarantees | Walkthrough uses `Nguyen Van A`, masked codes, and `you@example.com`; owner to approve employer references |
| TMS v2 | L&D operators, department leaders, and employees; exact audience/scale pending owner | Architecture and case-study implementation claimed; stakeholder/rollout evidence pending owner | PENDING_OWNER_EVIDENCE | Render URL redirects to login and is not an anonymous admin demo (observed 2026-08-30) | **Static walkthrough** (same-origin, synthetic data); production link is **Authenticated access** | `assets/proof/tms-walkthrough.html`; live URL retained only as access-request path | Self-service learning operations, identity-safe imports, scheduling, completion, and audit views | **PENDING_OWNER_EVIDENCE**. Remove absolute hours, rates, and throughput figures from public copy | Root mockups use synthetic records; owner to confirm every environment/domain reference |
| Recruitment Intake | Student-club/recruiting reviewers; exact audience pending owner | Workflow mapping and Zapier/Notion implementation claimed; team/rollout evidence pending owner | PENDING_OWNER_EVIDENCE | No public production system supplied | **Static walkthrough** (illustrative board, synthetic data) | `assets/proof/recruitment-walkthrough.html`; repository **PENDING_OWNER_EVIDENCE** | Form submissions become trackable records with status, ownership, and comments | **PENDING_OWNER_EVIDENCE**. Application counts and adoption claims are omitted from public outcomes | No applicant PII; board is explicitly illustrative |

## Decisions supplied for this implementation

- Audience positioning: **fresher** applying to **AI Automation Specialist** and **Digital Transformation Officer** roles.
- Public proof preference: use a public static/sanitized walkthrough when a production app requires authentication; do not weaken app security or publish credentials.
- Metrics: no project metrics currently have owner-approved evidence. Public copy uses qualitative outcomes or explicit evidence-pending labels; existing numbers are treated as test data/implementation context only.
- Résumé: no résumé file or link is shipped until the owner supplies an approved PDF.
- Scraped reference files: `temp_nghia.html`, `nghia_dom.txt`, and `scrape.js` remain untouched in the working tree because provenance is unknown. They are excluded by the publish allowlist and remain an open owner decision.

## Observed access checks (2026-08-30)

| Endpoint | Observation | Public-copy consequence |
|---|---|---|
| CertStudio Railway URL | `GET` responds, but headers include `X-Frame-Options: DENY` and `frame-ancestors 'none'`; direct app is auth-gated | Never embed or call it a public demo; use the static walkthrough and label production access |
| TMS Render URL | Cold-start/redirect path reaches `/login`; anonymous admin journey not verified | Use static walkthrough; label live link authenticated/access required |
| `github.com/FinanceBullkk/Corgi77` | HTTP 200 observed | Keep the repository link, subject to owner approval |
| `github.com/FinanceBullkk/certificate-automation` | HTTP 404 observed | Removed from public pages until a canonical repository is supplied |

## Access-label rules

- **Public demo:** incognito visitor can complete the promised path without credentials.
- **Static walkthrough:** local/static artifact demonstrates the flow with synthetic data; it is
  not presented as the production system.
- **Authenticated access:** the production URL is useful to authorized stakeholders but requires
  login or approval; provide a screenshot/video or request-access path.
- **Archived:** retained only as a case note or removed from public navigation; no live CTA.

## Metric rules

Every number used in public copy must have one of these forms:

`[value] + [what was measured] + [date] + [baseline/sample/method]`

If any element is unavailable, use a qualitative outcome or label the value as a target/estimate.
Never use “0%,” “100%,” “zero,” or “4x” as a production guarantee without an owner-approved source.
