# Devium

CLI to generate production-ready TypeScript backend projects.

**Stack choices:** Express or Fastify · Node.js or Bun · npm/pnpm/yarn/Bun · Drizzle or Prisma · PostgreSQL · optional Pino logger, CORS, Zod env validation, custom error classes, request validation, and Docker.

## Usage

```bash
# From a checkout (development)
bun install
bun run dev -- --skip-install

# After building the CLI (dist/)
node dist/index.js
```

The CLI runs an interactive flow (project name → runtime → framework → package manager → ORM → features → confirmation). Generation installs dependencies unless you pass `--skip-install`.

## Development

```bash
bun install        # install CLI dependencies
bun run typecheck  # tsc --noEmit
bun run test       # vitest
bun run build      # bundle to dist/ (bin entry)
```

## Repository layout

```
src/                 CLI source (prompts, generators, utils)
templates/
  base/              shared project files (env, config, tsconfig, README)
  express/           Express app + server entry
  fastify/           Fastify app + server entry
  orm/drizzle/       Drizzle setup (client, schema, drizzle.config.ts)
  orm/prisma/        Prisma 7 setup (schema, prisma.config.ts, pg adapter)
  features/          optional feature files + package manifests
```

## How generation works

1. Validate the destination directory (never overwrites a non-empty directory).
2. Copy `templates/base`, then the framework `src/`, then the ORM `src/` (+ `drizzle.config.ts` / `prisma/` + `prisma.config.ts`).
3. Overlay selected feature files and generate `src/modules/index.ts` (module registry: CORS, request logging, demo routes, error handler).
4. Require `DATABASE_URL` in `src/config/env.ts` when an ORM is selected; wire ORM cleanup into graceful shutdown.
5. Merge `package.json` manifests (base + framework + ORM + features) and set runtime-specific scripts.
6. Install dependencies (unless `--skip-install`) and print next steps.
