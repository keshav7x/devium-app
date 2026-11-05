# Devium Dockerfile — Bun runtime
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* prisma.config.ts* prisma*/ ./
RUN npm install -g bun && bun install
RUN mkdir -p src/generated

FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g bun
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/src/generated ./src/generated
RUN bun run build

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" || exit 1

CMD ["bun", "dist/server.js"]
