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

If the Auth feature was selected, register and use JWT bearer tokens with:

```bash
curl -i -X POST http://localhost:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"a-strong-password","name":"You"}'

curl -i -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"a-strong-password"}'

curl -i http://localhost:3000/api/auth/me \
  -H 'authorization: Bearer TOKEN'
```

The auth scaffold uses bcrypt password hashing and one-hour JWT access tokens. `JWT_SECRET` must be a random string with at least 32 characters. If auth rate limiting was enabled, `REDIS_URL` is also required. Logout increments the user token version, revoking previously issued tokens.

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
