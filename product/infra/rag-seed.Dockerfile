# GT-685 — one-shot seeder for the RAG knowledge store the `mcp` service answers from.
#
# `evolith-knowledge-search` was registered in every deployment and answerable in
# none: nothing provisioned `rag_chunks` and nothing populated it. This image runs
# the SAME indexer CI uses (`15-rag-index-backfill.mjs`: the whole EN `reference/`
# corpus through the one chunker + pgvector adapter) inside the deployment, in the
# LEXICAL-ONLY mode ADR-0112 §6 defines: chunk text in, `embedding = NULL`, BM25
# answers. Measured 2026-09-19, the dense alternative costs tens of CPU-hours on
# the hardware people develop on; a dense re-index is the upgrade, not the seed.
#
# Single stage on purpose: the runtime IS the build (five scripts, the corpus and
# the `pg` driver); there is no build tree to prune.
FROM node:20-alpine
WORKDIR /repo

# The only runtime dependency the indexer lazy-imports; pinned to the workspace's version.
RUN npm install --no-save --no-package-lock --no-audit --no-fund pg@8.16.3

# The indexer and the adapters it composes — copied, not vendored: these are the files.
COPY .harness/scripts/ci/15-rag-index-backfill.mjs \
     .harness/scripts/ci/rag-port.mjs \
     .harness/scripts/ci/rag-sync.mjs \
     .harness/scripts/ci/rag-pgvector.mjs \
     .harness/scripts/ci/rag-embed-qwen3.mjs \
     .harness/scripts/ci/rag-pgvector.schema.sql \
     ./.harness/scripts/ci/
# The corpus the store is built from (ADR-0090 §3: EN markdown under reference/).
COPY reference ./reference

# Live sync against the durable provider, lexical-only; the store URL comes from the compose file.
ENV EVOLITH_RAG_SYNC=true \
    EVOLITH_RAG_PROVIDER=pgvector \
    EVOLITH_RAG_MODE=lexical

CMD ["node", ".harness/scripts/ci/15-rag-index-backfill.mjs"]
