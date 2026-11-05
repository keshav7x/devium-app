# deviumiguess

Generated with Devium.

## Setup

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string

# Create the initial migration (requires a running PostgreSQL)
bun run db:migrate
```

## Development

```bash
bun run dev
```

The server listens on `HOST`/`PORT` from your environment (defaults: `localhost:3000`).

## Production

```bash
bun run build
bun run start
```

## Scripts

| Script | Description |
| ------ | ----------- |
| `dev` | Start the server in watch mode |
| `build` | Compile TypeScript to `dist/` |
| `start` | Run the compiled production server |
| `db:migrate` | Apply database migrations |
