# Deployment

## Platform

GitHub Pages, deployed by `.github/workflows/portfolio-checks.yml` from the verified `.portfolio-dist` artifact.

## Production URL

https://financebullkk.github.io/portfolio_hao/

## Deploy Command

```powershell
git push origin main
```

The workflow installs dependencies, builds the allowlisted portfolio artifact, runs static and browser checks, uploads `.portfolio-dist`, deploys it, then probes both embedded runtime URLs.

## Environment Variables

None. The public portfolio and its demos are static, synthetic, and browser-only.

## Custom Domain

No custom domain is configured. GitHub Pages serves the repository project URL.

## Rollback

Revert the faulty commit and push the revert to `main` so the same verified workflow publishes the previous state.

```powershell
git revert <commit>
git push origin main
```

## Troubleshooting

- If a walkthrough loads but its iframe returns 404, confirm Pages uses GitHub Actions rather than legacy branch publishing.
- Confirm the workflow uploads `path: .portfolio-dist`, not the repository root.
- Run `npm run verify:portfolio` locally before pushing.
- Inspect the `Portfolio checks` workflow and its `Verify deployed demo runtimes` step for the exact failing URL.
