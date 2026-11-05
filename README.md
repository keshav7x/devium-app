# Devium

**Devium** is an interactive CLI that generates production-ready TypeScript backend projects.

Choose your stack, answer a few prompts, and get a clean project with sensible defaults, security defaults, and only the packages you selected.

## What you can build

| Layer | Options |
| --- | --- |
| Framework | Express 5 or Fastify 5 |
| Runtime | Node.js LTS or Bun |
| Package manager | npm, pnpm, yarn, or Bun |
| Database | PostgreSQL with Drizzle or Prisma |
| Optional modules | Pino logger, CORS, Zod env validation, custom error classes, request validation, Docker |

## Quick start

### Requirements

- Node.js 20+ or Bun
- PostgreSQL for the generated app
- One package manager
- Terminal/TTY for the interactive CLI

### From a checkout

```bash
git clone https://github.com/keshav7x/devium-app.git
cd devium-app
bun install
bun run build
node dist/index.js
```

For development:

```bash
bun run dev -- --skip-install
```

`--skip-install` generates the project but does not run `npm install`, `bun install`, etc.

## Example: generate a Fastify + Bun + Prisma API

Run:

```bash
node dist/index.js
```

Then choose:

```text
Project name          inventory-api
Runtime               Bun
Core engine           Fastify
Installer             Bun
Database layer        Prisma
Extra modules         Logger (Pino), CORS, Environment validation (Zod), Custom error classes
```

Devium creates:

```text
inventory-api/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── env.ts
│   ├── db/
│   │   └── index.ts
│   ├── generated/
│   └── modules/
│       └── index.ts
├── .env.example
├── package.json
├── Dockerfile
└── README.md
```

## Run the generated app

```bash
cd inventory-api
cp .env.example .env
```

Set `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/inventory"
```

Generate/apply Prisma:

```bash
bun run db:generate
bun run db:migrate
```

Start development:

```bash
bun run dev
```

Check health:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"status":"OK","message":"Server is running"}
```

## Drizzle example

Choose Drizzle instead of Prisma:

```bash
node dist/index.js
# Runtime: Node.js
# Framework: Express
# ORM: Drizzle
```

Then:

```bash
cd drizzle-app
cp .env.example .env
# edit .env and set DATABASE_URL
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

## Environment variables

Generated apps include `.env.example`. Copy it before running:

```bash
cp .env.example .env
```

Common values:

```bash
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

With env validation enabled, invalid values fail fast:

```bash
PORT=99999 node dist/server.js
# Invalid environment variables:
#   PORT: ...
```

In Docker, `HOST` defaults to `0.0.0.0`; outside Docker it defaults to `localhost`.

## Optional modules and packages

Devium installs only the packages required by your choices.

| Module / Choice | What gets installed |
| --- | --- |
| Express | `express` (+ `@types/express` dev) |
| Fastify | `fastify` |
| PostgreSQL + Drizzle | `drizzle-orm`, `postgres` (+ `drizzle-kit` dev) |
| PostgreSQL + Prisma | `@prisma/client`, `@prisma/adapter-pg`, `pg` (+ `prisma` dev) |
| Logger | `pino`, and framework transport/package (`pino-http` for Express) (+ `pino-pretty` dev) |
| CORS | `cors` for Express or `@fastify/cors` for Fastify |
| Zod env validation | `zod` |
| Request validation | `zod` |
| Custom error classes | no dependency |
| Docker | no dependency |
| Node runtime dev | `tsx` |
| Bun runtime dev | no `tsx` |

Production Docker images install only production dependencies:

- npm: `npm ci --omit=dev --ignore-scripts`
- pnpm: `pnpm install --prod --frozen-lockfile --ignore-scripts`
- yarn: `yarn install --production=true --frozen-lockfile --ignore-scripts`
- Bun: `bun install --production --frozen-lockfile --ignore-scripts`

## Docker

Generated Dockerfiles are multi-stage, non-root, and expect a lockfile.

```bash
cd my-api
bun install   # creates or uses lockfile
docker build -t my-api .
docker run --env-file .env -p 3000:3000 my-api
```

Use `npm ci`, not plain `npm install`, inside CI/Docker. If you skip installing before Docker build, Docker cannot reproduce dependencies reliably.

## Production

```bash
bun run build
bun run start
```

Or with Node/npm:

```bash
npm run build
npm run start
```

The production server compiles `src/` to `dist/`.

## CLI options

| Option | Description |
| --- | --- |
| `--skip-install` | Generate files but do not install dependencies |

Example:

```bash
node dist/index.js -- --skip-install
```

## Scripts in generated projects

Common scripts:

| Script | Purpose |
| --- | --- |
| `dev` | Start watch mode |
| `build` | Compile TypeScript |
| `start` | Run production build |
| `db:generate` | Generate Drizzle/Prisma client |
| `db:migrate` | Apply migrations |
| `db:push` | Push schema directly in dev |
| `db:studio` | Open database UI |

Bun example:

```bash
bun run dev
bun run build
bun run start
```

## Security defaults

Generated apps include:

- denied-by-default CORS unless `CORS_ORIGIN` is set
- generic 5xx error messages
- clamped 4xx/5xx status codes
- Pino redaction for auth/cookie headers
- request URL logging without query strings
- security headers: CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- HSTS in production
- non-root Docker images
- Docker containers listen on `0.0.0.0`

## Development of Devium itself

```bash
bun install        # install CLI dependencies
bun run typecheck  # tsc --noEmit
bun run test       # vitest
bun run build      # bundle CLI to dist/
```

## Repository layout

```text
src/                 CLI source (prompts, generators, utils)
templates/
  base/              shared project files (.env.example, tsconfig, README)
  express/           Express app and server entry
  fastify/           Fastify app and server entry
  orm/drizzle/       Drizzle client, schema, drizzle.config.ts
  orm/prisma/        Prisma schema, prisma.config.ts, pg adapter
  features/          optional feature files and package manifests
```

## Troubleshooting

### "An interactive terminal is required"

Run Devium in a TTY. It is intentionally interactive and does not accept every answer as a flag yet.

### "Destination directory is not empty"

Choose another project name or remove/move the existing directory first. Devium never overwrites non-empty directories.

### "DATABASE_URL is required"

Set it in `.env`. Use `postgresql://user:password@host:5432/database`.

### Docker build cannot install dependencies

Make sure a lockfile exists in the generated project. Run your package manager before `docker build`.

## How generation works

1. Validate the destination directory.
2. Copy `templates/base`.
3. Overlay the selected framework and ORM templates.
4. Overlay selected optional features.
5. Generate `src/modules/index.ts` from your choices.
6. Make `DATABASE_URL` required when an ORM is used.
7. Merge `package.json` manifests and prune runtime-incompatible dev dependencies.
8. Install dependencies unless `--skip-install` is passed.

## License

Not specified.
