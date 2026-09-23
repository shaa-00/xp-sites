# xp-sites

Collection of the best sites to help you get around.

## Local setup

Copy `.env.example` to `.env.local` and fill in the GitHub, Gemini, and Turso
credentials. Turso must contain the schema before the app can render data:

```bash
pnpm install
pnpm db:push
pnpm db:import
pnpm dev
```

`pnpm db:import` is idempotent. It imports the existing JSON datasets and gives
bookmark records precedence when a URL also appears in GitHub stars.

The categorization pipeline uses Turso as its cache and only sends uncached
URLs to Gemini. Gemini is retried three times with strict category validation;
if it still fails, the command exits with an error and does not insert that
run's new records. Nothing is silently assigned to a fallback category:

```bash
pnpm categorize bookmarks.json
```

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the Vercel project
environment for deployments. Site data is read through a server-only query and
cached for one hour.
