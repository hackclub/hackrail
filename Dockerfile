FROM node:22-alpine AS base
WORKDIR /app

COPY package.json bun.lock ./

FROM base AS prod-deps
RUN npm install -g bun
RUN apk add --no-cache python3 make g++
RUN bun install --frozen-lockfile --prod

FROM base AS build-deps
RUN npm install -g bun
RUN apk add --no-cache python3 make g++
RUN bun install --frozen-lockfile

FROM build-deps AS build
COPY . .
RUN npx astro build

FROM base AS runtime
RUN apk add --no-cache libstdc++ wget
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db/schema.ts ./src/db/schema.ts
RUN mkdir -p /app/data


ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:4321/ || exit 1

CMD ["sh", "-c", "npx drizzle-kit migrate --config=drizzle.config.ts && node dist/server/entry.mjs"]
