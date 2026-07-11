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

# ── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith Core API"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache curl

WORKDIR /repo

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/src/packages/core-domain/dist ./src/packages/core-domain/dist
COPY --from=builder /repo/src/packages/core-domain/package.json ./src/packages/core-domain/package.json
COPY --from=builder /repo/src/packages/infra-providers/dist ./src/packages/infra-providers/dist
COPY --from=builder /repo/src/packages/infra-providers/package.json ./src/packages/infra-providers/package.json
COPY --from=builder /repo/src/apps/core-api/dist ./src/apps/core-api/dist
COPY --from=builder /repo/src/apps/core-api/package.json ./src/apps/core-api/package.json
# Non-hoisted workspace deps (e.g. @nestjs/cache-manager) live here, not at root.
COPY --from=builder /repo/src/apps/core-api/node_modules ./src/apps/core-api/node_modules

# Corpus (rulesets + generated OPA WASM + human reference) the Core reads at
# runtime. rulesets comes from the builder stage so policy.wasm is present even
# though it is a gitignored build artifact (compiled by `build:policy` above into
# src/rulesets/opa/policy.wasm).
# The runtime OpaEvaluator resolves the wasm + input schemas at
# `<corePath>/rulesets/opa/...`, where corePath = CORE_PATH (see
# WorkspaceReferenceResolverService.corePath()). CORE_PATH=/app/corpus, so the
# rulesets tree must live at /app/corpus/rulesets (NOT /app/corpus/src/rulesets)
# or OPA fail-closes on a missing policy.wasm/schema in production.
COPY --from=builder /repo/src/rulesets /app/corpus/rulesets
COPY reference /app/corpus/reference

RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith && \
    chown -R evolith:evolith /repo /app

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
