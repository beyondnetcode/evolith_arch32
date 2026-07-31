# ──────────────────────────────────────────────────────────────────────────
# Evolith CLI — monorepo Docker build.
#
# BUILD CONTEXT: the repository ROOT, exactly like its three deployable
# siblings (core-api, mcp-server, agent-runtime):
#   docker build -f src/sdk/cli/Dockerfile -t evolith-cli .
#
# This file previously used `src/sdk/cli` as its context and ran `npm ci`
# there. That could not work and never did: the monorepo has ONE
# `package-lock.json`, at the root, so `COPY package*.json ./` matched only
# `package.json` and `npm ci` refused to run. The CI job that built this image
# was retired for that reason in `645374e9`, leaving the Dockerfile itself
# broken; this repairs the artifact rather than leaving a trap in the tree.
#
# The old CMD (`node dist/main.js mcp serve --transport http`) invoked the
# `mcp` subcommand, DELETED from the CLI in `dc0b9667` — so even a fixed build
# would have produced an image that dies on start with "unknown command 'mcp'".
# That role belongs to the `evolith-mcp` image (`src/packages/mcp-server`).
# This image is the CLI: a governance tool you exec against a mounted
# satellite workspace, not a long-running server.
# ──────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /repo

COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
# Workspace packages/apps/sdk/rulesets live under src/; .harness is at the root.
COPY src ./src
COPY .harness ./.harness

RUN npm ci --legacy-peer-deps

# The CLI resolves OPA's policy.wasm out of its own bundled ruleset tree, and
# `build:policy` installs it to BOTH src/rulesets/opa and
# src/sdk/cli/rulesets/opa. Without it every OPA-backed rule fail-closes.
RUN npm run build:policy

# Build the whole workspace graph in dependency order (core-domain →
# infra-providers → agent-runtime → sdk → cli), then run the CLI's own
# packaging steps: `tsc -b` emits dist but does NOT run the npm lifecycle
# scripts that copy `rulesets/` and `templates/` into place.
RUN npx tsc -b tsconfig.json && \
    npm run copy-rulesets --workspace @beyondnet/evolith-cli && \
    npm run copy-assets --workspace @beyondnet/evolith-cli

# ── Runner ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Evolith CLI"
LABEL org.opencontainers.image.description="Evolith CLI — governance, standards validation, and AI agent integration for satellite repositories"
LABEL org.opencontainers.image.source="https://github.com/beyondnetcode/evolith_arch32"

RUN apk add --no-cache bash git

WORKDIR /repo

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
# `contracts` is a TRANSITIVE dependency, reached through infra-providers, whose
# index re-exports tracker/evaluation-ingest.client.js and its require of
# `@beyondnet/evolith-contracts/ingest`. node_modules/@beyondnet/evolith-contracts
# is a workspace SYMLINK into src/packages/contracts, so omitting the package's own
# dist leaves a dangling link and MODULE_NOT_FOUND on the first governance command.
# Guard: 56-validate-docker-workspace-closure.
COPY --from=builder /repo/src/packages/contracts/dist ./src/packages/contracts/dist
COPY --from=builder /repo/src/packages/contracts/package.json ./src/packages/contracts/package.json
COPY --from=builder /repo/src/packages/core-domain/dist ./src/packages/core-domain/dist
COPY --from=builder /repo/src/packages/core-domain/package.json ./src/packages/core-domain/package.json
COPY --from=builder /repo/src/packages/infra-providers/dist ./src/packages/infra-providers/dist
COPY --from=builder /repo/src/packages/infra-providers/package.json ./src/packages/infra-providers/package.json
COPY --from=builder /repo/src/packages/agent-runtime/dist ./src/packages/agent-runtime/dist
COPY --from=builder /repo/src/packages/agent-runtime/package.json ./src/packages/agent-runtime/package.json
COPY --from=builder /repo/src/packages/sdk-client/dist ./src/packages/sdk-client/dist
COPY --from=builder /repo/src/packages/sdk-client/package.json ./src/packages/sdk-client/package.json
COPY --from=builder /repo/src/sdk/cli/dist ./src/sdk/cli/dist
COPY --from=builder /repo/src/sdk/cli/package.json ./src/sdk/cli/package.json
# The asset trees the CLI reads at runtime, produced by copy-rulesets /
# copy-assets above. `rulesets/` carries the compiled policy.wasm, which is a
# gitignored build artifact and therefore absent from the host context.
COPY --from=builder /repo/src/sdk/cli/rulesets ./src/sdk/cli/rulesets
COPY --from=builder /repo/src/sdk/cli/shell ./src/sdk/cli/shell
COPY --from=builder /repo/src/sdk/cli/templates ./src/sdk/cli/templates

# The corpus the governance commands read: rulesets from the BUILDER stage (so
# the compiled policy.wasm is present) plus the human-readable reference tree.
COPY --from=builder /repo/src/rulesets /app/corpus/rulesets
COPY reference /app/corpus/reference

RUN addgroup -g 1001 -S evolith && \
    adduser -S evolith -u 1001 -G evolith && \
    chown -R evolith:evolith /repo /app

USER evolith

ENV NODE_ENV=production
ENV EVOLITH_CORE_PATH=/app/corpus
ENV EVOLITH_LOG_LEVEL=info

# Mount the satellite repository here and run the CLI against it:
#   docker run --rm -v "$PWD:/workspace" evolith-cli validate
WORKDIR /workspace

ENTRYPOINT ["node", "/repo/src/sdk/cli/dist/main.js"]
CMD ["--help"]
