# {{projectName}}

Generated with Devium.

## Setup

```bash
# Install dependencies
<package-manager> install

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string

# Create the initial migration (requires a running PostgreSQL)
<package-manager> run db:migrate
```

## Development

```bash
<package-manager> run dev
```

The server listens on `HOST`/`PORT` from your environment (defaults: `localhost:3000`).

## Production

```bash
<package-manager> run build
<package-manager> run start
```

## Scripts

| Script | Description |
| ------ | ----------- |
| `dev` | Start the server in watch mode |
| `build` | Compile TypeScript to `dist/` |
| `start` | Run the compiled production server |
| `db:migrate` | Apply database migrations |
