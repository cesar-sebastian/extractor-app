# Node 22 left maintenance in April 2026. The image is Node 24.
# Secrets are not build args. They arrive as environment variables at runtime.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=node:node /app/node_modules/postgres ./node_modules/postgres
COPY --chown=node:node docker/bootstrap.mjs ./bootstrap.mjs
COPY --chown=node:node docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER node
EXPOSE 3000
CMD ["./entrypoint.sh"]
