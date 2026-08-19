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

# `tsc -b` is incremental and exits 0 when a `.tsbuildinfo` claims the output is
# current — emitting nothing. That shipped a core-api image with no
# `dist/main.js`, found only at runtime as CrashLoopBackOff. `.dockerignore` now
# keeps that state out of the context; this asserts the outcome regardless of
# cause, so a missing entrypoint fails the BUILD instead of a cluster.
RUN test -f src/apps/agent-runtime-api/dist/main.js || { \
      echo "FATAL: tsc -b exited 0 but src/apps/agent-runtime-api/dist/main.js was not emitted."; \
      echo "       Check that .dockerignore still excludes **/*.tsbuildinfo."; \
      exit 1; }


# GT-692 — the runner receives the tree the BUILD needed, compiler included. Pruned
# here because the runner has no npm context: it gets `node_modules` by COPY, and
# `--omit=dev` walks the whole workspace so the non-hoisted trees are pruned with it.
# Build artifacts are already emitted, so removing the compiler cannot affect them.
RUN npm prune --omit=dev --legacy-peer-deps

# ── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith Agent Runtime API"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache curl

WORKDIR /repo

# Workspace symlinks in node_modules/@beyondnet/evolith-* point at packages/*, so we ship
# the compiled dist + package.json of each needed workspace plus the hoisted
# third-party modules.
# GT-692 — the user is created BEFORE the copies so `COPY --chown` can name it. A
# recursive `chown -R` at the end rewrites every file into a NEW layer: measured on
# `core-api`, that single RUN was 586 MB, a byte-for-byte duplicate of everything
# above it.
RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith

COPY --from=builder --chown=evolith:evolith /repo/node_modules ./node_modules
COPY --from=builder --chown=evolith:evolith /repo/package.json ./package.json
COPY --from=builder --chown=evolith:evolith /repo/src/packages/core-domain/dist ./src/packages/core-domain/dist
COPY --from=builder --chown=evolith:evolith /repo/src/packages/core-domain/package.json ./src/packages/core-domain/package.json
COPY --from=builder --chown=evolith:evolith /repo/src/packages/agent-runtime/dist ./src/packages/agent-runtime/dist
COPY --from=builder --chown=evolith:evolith /repo/src/packages/agent-runtime/package.json ./src/packages/agent-runtime/package.json
COPY --from=builder --chown=evolith:evolith /repo/src/apps/agent-runtime-api/dist ./src/apps/agent-runtime-api/dist
COPY --from=builder --chown=evolith:evolith /repo/src/apps/agent-runtime-api/package.json ./src/apps/agent-runtime-api/package.json

# Optional corpus so the real .harness / OPA adapters can be enabled by env
# (AGENT_RUNTIME_HARNESS_ROOT / AGENT_RUNTIME_OPA_*) without rebuilding. Copied
# from the builder stage so the bundled OPA binary and policy.wasm match the
# container platform, not the developer host.
COPY --from=builder --chown=evolith:evolith /repo/.harness ./corpus/.harness
COPY --from=builder --chown=evolith:evolith /repo/src/rulesets ./corpus/rulesets

USER evolith

ENV NODE_ENV=production
ENV PORT=3000
ENV AGENT_RUNTIME_WORKSPACE_ROOT=/repo/corpus

WORKDIR /repo/src/apps/agent-runtime-api

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
