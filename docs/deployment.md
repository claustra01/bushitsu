# Deployment

This app deploys to Cloudflare Pages by GitHub Actions. GitHub builds the Vite app, runs TypeScript and Vitest checks, then uploads `dist` with Wrangler.

## Cloudflare Setup

1. Use the D1 database named `akikoma`.
2. Copy the database ID from the D1 database details page.
3. The `Deploy Cloudflare Pages` workflow creates the Pages project if it does not already exist.
   - Default Pages project name: `akikoma`
   - The workflow creates it as a Direct Upload project with production branch `main`.
   - If you create it manually instead, use the same name or set `CLOUDFLARE_PAGES_PROJECT_NAME`.
4. Open the Pages project after it exists, then add the D1 binding:
   - Settings > Bindings > D1 database bindings
   - Variable name: `DB`
   - D1 database: `akikoma`
5. Add the runtime secret used by Pages Functions:
   - Settings > Variables and Secrets > Add
   - Name: `TOKEN_PEPPER`
   - Value: a long random string
   - Enable encryption
   - Add it for Production. Add it for Preview too if you use preview deployments.
6. Redeploy after adding bindings or secrets.

## Cloudflare API Token

Create a custom Cloudflare API token for GitHub Actions.

Required permissions:

- Account > Cloudflare Pages > Edit
- Account > D1 > Edit, shown as D1 Write in some API docs

Limit the token to the Cloudflare account that owns this Pages project and D1 database.

## GitHub Setup

Add these repository or `production` environment secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_D1_DATABASE_ID`

Optional repository or environment variable:

- `CLOUDFLARE_PAGES_PROJECT_NAME`
  - Default: `akikoma`

## Workflows

- `CI`
  - Runs on pull requests and pushes.
  - Runs `pnpm run typecheck`, `pnpm run test`, and `pnpm run build`.
- `Deploy Cloudflare Pages`
  - Runs on pushes to `main` and manual dispatch.
  - Re-runs typecheck, tests, and build.
  - Creates the Cloudflare Pages project if it does not already exist.
  - Injects `CLOUDFLARE_D1_DATABASE_ID` into `wrangler.toml` during CI only.
  - Deploys `dist` with `wrangler pages deploy`.
- `Migrate D1`
  - Manual dispatch only.
  - Applies remote migrations with `wrangler d1 migrations apply akikoma --remote`.

## First Deployment Order

1. Add the GitHub secrets.
2. Manually run `Deploy Cloudflare Pages` once. This creates the Pages project if needed.
3. Add the `DB` binding and `TOKEN_PEPPER` secret in the Cloudflare Dashboard.
4. Run the `Migrate D1` workflow once.
5. Manually run `Deploy Cloudflare Pages` again, or push to `main`.

Keep the placeholder database ID in `wrangler.toml` when committing. The production ID belongs in GitHub Secrets, not source code.

## References

- Cloudflare Pages Direct Upload with CI: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
- Reference workflow shape: https://github.com/claustra01/my-ctf-writeups/blob/main/.github/workflows/cloudflare-pages.yml
- Cloudflare Pages Function bindings: https://developers.cloudflare.com/pages/functions/bindings/
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- GitHub Actions secrets: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
