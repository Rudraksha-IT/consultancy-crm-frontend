# syntax=docker/dockerfile:1
# Install and build with the full Node image; ship only the node binary and the standalone
# server. npm, corepack, yarn, pnpm and the build's node_modules never reach the final image.
# Keep NODE_IMAGE's Alpine release and RUNTIME_IMAGE the same: node links to its libstdc++.
ARG NODE_IMAGE=node:22-alpine3.24
ARG RUNTIME_IMAGE=alpine:3.24

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM ${NODE_IMAGE} AS node

FROM ${RUNTIME_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN apk add --no-cache libstdc++ \
    && addgroup -g 1000 -S node \
    && adduser -u 1000 -S -G node -H node
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
# Owned by root: the node user can read the server but never change it.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# The only places Next.js may write at run time: its cache, and the pages it draws again after
# their minute is up (Next.js 16.4.5 and later keep those in `server/route-cache`; without it every
# redraw logged "Failed to update prerender cache ... EACCES").
RUN mkdir -p .next/cache .next/server/route-cache \
    && chown node:node .next/cache .next/server/route-cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
