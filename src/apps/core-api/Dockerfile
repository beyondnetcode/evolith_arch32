# ──────────────────────────────────────────────────────────────────────────
# Evolith CORE-API — monorepo Docker build.
#
# BUILD CONTEXT: the repository ROOT. The previous standalone build (copy only
# apps/core-api + npm ci from the registry) broke because (1) the app tsconfig
# extends ../../tsconfig.base.json, and (2) core-api imports
# `@beyondnet/evolith-core-domain/evaluation/*`, a subpath newer than the published npm
# package. This image builds the workspace packages from source instead.
#   Coolify: Dockerfile = src/apps/core-api/Dockerfile, base directory = /
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
# Workspace packages/apps/sdk/rulesets live under src/; .harness is at the root.
COPY src ./src
COPY .harness ./.harness

RUN npm ci --legacy-peer-deps

# Build the workspace deps + the app via the composite project graph. (`tsc -p`
# with the prod tsconfig fails here: composite projects — inherited from
# tsconfig.base.json — may not disable declaration/incremental emit.)
RUN npm run build:policy && \
    npx tsc -b tsconfig.json

# The build above can succeed and emit NOTHING. `tsc -b` is incremental: given a
# `.tsbuildinfo` that claims the output is current, it exits 0 without writing a
# single file. That is how this image shipped without `dist/main.js` and met
# CrashLoopBackOff with `Cannot find module '/repo/src/apps/core-api/dist/main'`
# — a runtime failure whose cause was three layers upstream.
#
# `.dockerignore` now keeps `.tsbuildinfo` out of the context, which removes the
# known trigger. This line is the assertion that does not depend on knowing the
# trigger: whatever the reason, an image without its entrypoint fails HERE.
RUN test -f src/apps/core-api/dist/main.js || { \
      echo "FATAL: tsc -b exited 0 but src/apps/core-api/dist/main.js was not emitted."; \
      echo "       An incremental build believed the output was current. Check that"; \
      echo "       .dockerignore still excludes **/*.tsbuildinfo."; \
      exit 1; }

# GT-692 — the runner receives the tree the BUILD needed, and the build needs a
# compiler. Measured on this repository: `node_modules` is 659 MB and the image it
# produced was 1.96 GB, carrying `typescript`, `eslint`, `jest` and `@types/*` —
# none of them a production dependency of `core-api`. That is not merely wasteful:
# it is what made a consumer's CI fail. The Tracker's `Deploy (kind + Helm + smoke)`
# job died importing this image into a kind node with
# `ctr: failed to extract layer … no space left on device`, on the paths that name
# the cause outright — `@types/node/quic.d.ts`, `@sinonjs/commons/…` and
# `get-intrinsic/CHANGELOG.md`, a test-double library and two declaration trees
# being unpacked into a production image.
#
# Pruned HERE and not in the runner because the runner has no npm context: it
# receives `node_modules` by COPY. `--omit=dev` walks the whole workspace, so the
# non-hoisted trees under `src/apps/*/node_modules` are pruned with it.
#
# The build artifacts are already emitted at this point, so removing the compiler
# cannot affect them. What it CAN affect is a runtime dependency mis-declared as a
# development one — which is a defect this prune exposes rather than causes, and
# `56-validate-docker-workspace-closure` plus the container's own boot are what
# catch it.
RUN npm prune --omit=dev --legacy-peer-deps

# ── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith Core API"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache curl

# GT-692 — the user is created BEFORE the copies on purpose. The image used to end
# with `chown -R evolith:evolith /repo /app`, and in Docker a recursive chown rewrites
# every file it touches into a NEW layer: measured on this image, that single RUN was
# **586 MB**, a byte-for-byte duplicate of everything copied above it. `COPY --chown`
# sets the ownership as the layer is written, so the duplicate never exists.
RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith

WORKDIR /repo

COPY --from=builder --chown=evolith:evolith /repo/node_modules ./node_modules
COPY --from=builder --chown=evolith:evolith /repo/package.json ./package.json
# The workspace closure the entrypoint requires, TRANSITIVELY. `contracts` is
# here because infra-providers/dist/tracker/evaluation-ingest.client.js requires
# `@beyondnet/evolith-contracts/ingest`, and that require is re-exported from
# infra-providers/dist/index.js — i.e. it is on the boot path, not a leaf. Its
# node_modules entry is a workspace SYMLINK into src/packages/contracts, so
# shipping node_modules without the package's own dist yields a dangling link
# and MODULE_NOT_FOUND at startup. Guard: 56-validate-docker-workspace-closure.
COPY --from=builder --chown=evolith:evolith /repo/src/packages/contracts/dist ./src/packages/contracts/dist
COPY --from=builder --chown=evolith:evolith /repo/src/packages/contracts/package.json ./src/packages/contracts/package.json
COPY --from=builder --chown=evolith:evolith /repo/src/packages/core-domain/dist ./src/packages/core-domain/dist
COPY --from=builder --chown=evolith:evolith /repo/src/packages/core-domain/package.json ./src/packages/core-domain/package.json
COPY --from=builder --chown=evolith:evolith /repo/src/packages/infra-providers/dist ./src/packages/infra-providers/dist
COPY --from=builder --chown=evolith:evolith /repo/src/packages/infra-providers/package.json ./src/packages/infra-providers/package.json
COPY --from=builder --chown=evolith:evolith /repo/src/apps/core-api/dist ./src/apps/core-api/dist
COPY --from=builder --chown=evolith:evolith /repo/src/apps/core-api/package.json ./src/apps/core-api/package.json
# Non-hoisted workspace deps (e.g. @nestjs/cache-manager) live here, not at root.
COPY --from=builder --chown=evolith:evolith /repo/src/apps/core-api/node_modules ./src/apps/core-api/node_modules

# Corpus (rulesets + generated OPA WASM + human reference) the Core reads at
# runtime. rulesets comes from the builder stage so policy.wasm is present even
# though it is a gitignored build artifact (compiled by `build:policy` above into
# src/rulesets/opa/policy.wasm).
# The runtime OpaEvaluator resolves the wasm + input schemas at
# `<corePath>/rulesets/opa/...`, where corePath = CORE_PATH (see
# WorkspaceReferenceResolverService.corePath()). CORE_PATH=/app/corpus, so the
# rulesets tree must live at /app/corpus/rulesets (NOT /app/corpus/src/rulesets)
# or OPA fail-closes on a missing policy.wasm/schema in production.
COPY --from=builder --chown=evolith:evolith /repo/src/rulesets /app/corpus/rulesets
COPY --chown=evolith:evolith reference /app/corpus/reference

USER evolith

ENV NODE_ENV=production
ENV PORT=3000
ENV WORKSPACE_ROOT=/app/corpus
ENV CORE_PATH=/app/corpus
ENV EVOLITH_LOG_LEVEL=info

WORKDIR /repo/src/apps/core-api

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
