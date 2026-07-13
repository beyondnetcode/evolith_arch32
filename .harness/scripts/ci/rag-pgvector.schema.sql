-- GT-538 / ADR-0112 — Durable pgvector schema for the RAG chunk index.
--
-- Realizes the ADR-0090 §5 "preferred self-hosted" target on the PostgreSQL
-- instance Evolith already runs (:5432). Dimension is 1024 and the ANN index
-- is cosine-distance HNSW, both fixed by ADR-0112 §2/§3. The four ADR-0090 §2
-- filter fields (source_file, adr_id, language, corpus_version) are first-class
-- columns with btree indexes so metadata filtering is a plain WHERE clause.
--
-- This file is the single source of truth for the DDL; rag-pgvector.mjs exports
-- the identical text as PGVECTOR_DDL and a unit test asserts they never drift.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks (
  id              TEXT PRIMARY KEY,
  content         TEXT,
  section_heading TEXT,
  char_start      INTEGER,
  char_end        INTEGER,
  source_file     TEXT NOT NULL,
  adr_id          TEXT,
  language        TEXT NOT NULL,
  corpus_version  TEXT NOT NULL,
  embedding       vector(1024) NOT NULL
);

-- Approximate nearest-neighbour search — cosine distance (ADR-0112 §3).
CREATE INDEX IF NOT EXISTS rag_chunks_embedding_hnsw
  ON rag_chunks USING hnsw (embedding vector_cosine_ops);

-- Metadata filter indexes (ADR-0090 §2 filter fields).
CREATE INDEX IF NOT EXISTS rag_chunks_source_file_idx    ON rag_chunks (source_file);
CREATE INDEX IF NOT EXISTS rag_chunks_adr_id_idx         ON rag_chunks (adr_id);
CREATE INDEX IF NOT EXISTS rag_chunks_language_idx       ON rag_chunks (language);
CREATE INDEX IF NOT EXISTS rag_chunks_corpus_version_idx ON rag_chunks (corpus_version);
