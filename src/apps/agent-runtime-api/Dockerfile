# ──────────────────────────────────────────────────────────────────────────
# Evolith Agent Runtime API — monorepo Docker build.
#
# BUILD CONTEXT: the repository ROOT (not this folder), because the service
# depends on the in-repo workspace packages `@beyondnet/evolith-agent-runtime` and
# `@beyondnet/evolith-core-domain`, which are not published to npm. The image builds them
# from source. In Coolify set:
#   Dockerfile location = src/apps/agent-runtime-api/Dockerfile
#   Build context / base directory = /  (repository root)
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /repo

# Install the full workspace graph (npm needs every workspace package.json that
# the lockfile references). .dockerignore keeps node_modules/dist out of context.
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
# Workspace packages/apps/sdk/rulesets live under src/; .harness is at the root.
COPY src ./src
COPY .harness ./.harness

RUN npm ci --legacy-peer-deps

# Build the app and its project references (agent-runtime -> core-domain).
RUN npm run build:policy && \
    npx tsc -b tsconfig.json

# ── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith Agent Runtime API"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache curl

WORKDIR /repo

# Workspace symlinks in node_modules/@beyondnet/evolith-* point at packages/*, so we ship
# the compiled dist + package.json of each needed workspace plus the hoisted
# third-party modules.
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/src/packages/core-domain/dist ./src/packages/core-domain/dist
COPY --from=builder /repo/src/packages/core-domain/package.json ./src/packages/core-domain/package.json
COPY --from=builder /repo/src/packages/agent-runtime/dist ./src/packages/agent-runtime/dist
COPY --from=builder /repo/src/packages/agent-runtime/package.json ./src/packages/agent-runtime/package.json
COPY --from=builder /repo/src/apps/agent-runtime-api/dist ./src/apps/agent-runtime-api/dist
COPY --from=builder /repo/src/apps/agent-runtime-api/package.json ./src/apps/agent-runtime-api/package.json

# Optional corpus so the real .harness / OPA adapters can be enabled by env
# (AGENT_RUNTIME_HARNESS_ROOT / AGENT_RUNTIME_OPA_*) without rebuilding. Copied
# from the builder stage so the bundled OPA binary and policy.wasm match the
# container platform, not the developer host.
COPY --from=builder /repo/.harness ./corpus/.harness
COPY --from=builder /repo/src/rulesets ./corpus/rulesets

RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith && \
    chown -R evolith:evolith /repo

USER evolith

ENV NODE_ENV=production
ENV PORT=3000
ENV AGENT_RUNTIME_WORKSPACE_ROOT=/repo/corpus

WORKDIR /repo/src/apps/agent-runtime-api

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
