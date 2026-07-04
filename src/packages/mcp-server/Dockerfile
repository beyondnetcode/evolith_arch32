# ──────────────────────────────────────────────────────────────────────────
# Evolith MCP Server — monorepo Docker build.
#
# BUILD CONTEXT: the repository ROOT. Like core-api, the old standalone build
# broke against the current source (tsconfig.base.json + workspace subpaths newer
# than the published npm packages). This image builds the workspace packages
# (@evolith/core-domain, @evolith/infra-providers, @evolith/core) from source.
#   Coolify: Dockerfile = packages/mcp-server/Dockerfile, base directory = /
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps
COPY sdk ./sdk

RUN npm ci --legacy-peer-deps

# Build the workspace deps + the server via the composite project graph.
RUN npx tsc -b packages/sdk-client packages/agent-runtime packages/core-domain packages/infra-providers packages/core packages/mcp-server/tsconfig.json

# ── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith MCP Server"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache curl

WORKDIR /repo

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/packages/sdk-client/dist ./packages/sdk-client/dist
COPY --from=builder /repo/packages/sdk-client/package.json ./packages/sdk-client/package.json
COPY --from=builder /repo/packages/agent-runtime/dist ./packages/agent-runtime/dist
COPY --from=builder /repo/packages/agent-runtime/package.json ./packages/agent-runtime/package.json
COPY --from=builder /repo/packages/core-domain/dist ./packages/core-domain/dist
COPY --from=builder /repo/packages/core-domain/package.json ./packages/core-domain/package.json
COPY --from=builder /repo/packages/infra-providers/dist ./packages/infra-providers/dist
COPY --from=builder /repo/packages/infra-providers/package.json ./packages/infra-providers/package.json
COPY --from=builder /repo/packages/core/dist ./packages/core/dist
COPY --from=builder /repo/packages/core/package.json ./packages/core/package.json
COPY --from=builder /repo/packages/mcp-server/dist ./packages/mcp-server/dist
COPY --from=builder /repo/packages/mcp-server/package.json ./packages/mcp-server/package.json
# Non-hoisted workspace deps (e.g. @nestjs/cache-manager) live here, not at root.
COPY --from=builder /repo/packages/mcp-server/node_modules ./packages/mcp-server/node_modules

COPY rulesets /app/corpus/rulesets

RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith && \
    chown -R evolith:evolith /repo /app

USER evolith

ENV NODE_ENV=production
ENV PORT=3000
ENV TRANSPORT=http
ENV WORKSPACE_ROOT=/app/corpus
ENV CORE_PATH=/app/corpus
ENV EVOLITH_LOG_LEVEL=info
ENV EVOLITH_MCP_ALLOW_NO_AUTH=false

WORKDIR /repo/packages/mcp-server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main", "serve", "--transport", "http", "--port", "3000"]
