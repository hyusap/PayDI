FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/package.json

RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS runtime
WORKDIR /app/packages/api

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/packages/api/node_modules ./node_modules
COPY packages/api/package.json ./package.json
COPY packages/api/src ./src

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "start"]
