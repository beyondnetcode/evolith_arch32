#!/bin/bash
# GT-KB Fase 0 / ADR-0112 §3 — provision the RAG vector store on the PostgreSQL
# instance Evolith already runs (:5432).
#
# The index lives in its OWN database (evolith_rag) rather than inside another
# product's schema: the ADR pins the INSTANCE, not the database, and keeping the
# Core's corpus out of ums_db avoids coupling two products' lifecycles.
#
# The DDL is MOUNTED from .harness/scripts/ci/rag-pgvector.schema.sql, never
# copied: that file declares itself the single source of truth and a unit test
# asserts it never drifts from PGVECTOR_DDL in rag-pgvector.mjs. A copy here
# would be a third version guaranteed to go stale.
#
# Runs once, on first initialisation of the data volume.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE evolith_rag'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evolith_rag')\gexec
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname evolith_rag \
  -f /evolith/rag-pgvector.schema.sql

echo "[evolith] RAG vector store ready: database evolith_rag (pgvector + rag_chunks)"
