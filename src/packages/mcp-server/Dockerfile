# ──────────────────────────────────────────────────────────────────────────
# Evolith MCP Server — monorepo Docker build.
#
# BUILD CONTEXT: the repository ROOT. Like core-api, the old standalone build
# broke against the current source (tsconfig.base.json + workspace subpaths newer
# than the published npm packages). This image builds the workspace packages
# (@beyondnet/evolith-core-domain, @beyondnet/evolith-infra-providers, @beyondnet/evolith-core) from source.
#   Coolify: Dockerfile = src/packages/mcp-server/Dockerfile, base directory = /
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
# Workspace packages/apps/sdk/rulesets live under src/.
COPY src ./src

# .harness holds the OPA wasm compiler + the OPA binary cache location.
COPY .harness ./.harness

RUN npm ci --legacy-peer-deps

# Compile the OPA policy bundle to policy.wasm BEFORE the TS build. Without this
# the ABAC/OPA layer fail-closes in production (NODE_ENV=production) and denies
# EVERY MCP tool call. build:policy downloads OPA v1.19.0 (needs network) and
# installs the wasm to src/rulesets/opa/policy.wasm + src/sdk/cli/rulesets/opa/policy.wasm.
RUN npm run build:policy

# Build the workspace graph via the root solution file (correct dependency order,
# same as `npm run build`). Building the whole graph avoids per-image ordering bugs.
RUN npx tsc -b tsconfig.json

# ── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith MCP Server"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache curl

WORKDIR /repo

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/src/packages/sdk-client/dist ./src/packages/sdk-client/dist
COPY --from=builder /repo/src/packages/sdk-client/package.json ./src/packages/sdk-client/package.json
COPY --from=builder /repo/src/packages/agent-runtime/dist ./src/packages/agent-runtime/dist
COPY --from=builder /repo/src/packages/agent-runtime/package.json ./src/packages/agent-runtime/package.json
COPY --from=builder /repo/src/packages/core-domain/dist ./src/packages/core-domain/dist
COPY --from=builder /repo/src/packages/core-domain/package.json ./src/packages/core-domain/package.json
COPY --from=builder /repo/src/packages/infra-providers/dist ./src/packages/infra-providers/dist
COPY --from=builder /repo/src/packages/infra-providers/package.json ./src/packages/infra-providers/package.json
COPY --from=builder /repo/src/packages/core/dist ./src/packages/core/dist
COPY --from=builder /repo/src/packages/core/package.json ./src/packages/core/package.json
COPY --from=builder /repo/src/packages/mcp-server/dist ./src/packages/mcp-server/dist
COPY --from=builder /repo/src/packages/mcp-server/package.json ./src/packages/mcp-server/package.json
# Non-hoisted workspace deps (e.g. @nestjs/cache-manager) live here, not at root.
COPY --from=builder /repo/src/packages/mcp-server/node_modules ./src/packages/mcp-server/node_modules

# Ruleset corpus, copied from the BUILDER stage so the compiled policy.wasm
# (a gitignored build artifact) is included — the host context does not have it.
COPY --from=builder /repo/src/rulesets /app/corpus/rulesets

# The MCP ABAC evaluator (abac-evaluator.ts) resolves the wasm at
# `<corePath>/sdk/cli/rulesets/opa/policy.wasm`, where corePath is derived in
# mcp-tool-dispatch.ts as process.cwd() climbed up two levels when cwd ends with
# `packages/mcp-server`. The runtime WORKDIR is /repo/src/packages/mcp-server, so
# corePath = /repo/src and the reader opens /repo/src/sdk/cli/rulesets/opa/policy.wasm.
# Without this the OPA layer fail-closes in production and denies every tool call.
COPY --from=builder /repo/src/sdk/cli/rulesets/opa/policy.wasm ./src/sdk/cli/rulesets/opa/policy.wasm

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

WORKDIR /repo/src/packages/mcp-server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main", "serve", "--transport", "http", "--port", "3000"]
