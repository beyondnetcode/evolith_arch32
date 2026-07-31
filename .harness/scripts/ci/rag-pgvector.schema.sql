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

-- GT-592 — lexical (BM25) half of hybrid retrieval.
--
-- This corpus is queried by exact identifiers (ADR-0111, GT-569, SCHEMA_VERSION),
-- and cosine similarity over dense embeddings is the wrong instrument for that
-- traffic: every ADR heading embeds to nearly the same place, so the digits that
-- carry the whole query are lost. The lexical side needs a way to reach a chunk
-- BY ITS TERMS, which is what this generated tsvector plus its GIN index provide.
--
-- `simple` (not `english`) on purpose: no stemming, no stop-word removal. Both
-- would corrupt identifiers — an English stemmer mangles alphanumeric tokens and
-- the stop-list eats short but load-bearing pieces of ids.
--
-- TWO expressions are unioned, because PostgreSQL's parser does NOT keep
-- `ADR-0111` as a single lexeme: it emits `adr` and `-0111`, reading the tail as
-- a signed integer, which is exactly the split that destroys an identifier query.
-- So the text is indexed twice:
--
--   translate(..., '-_./', '')        -> `adr0111`  (the rare, discriminating term)
--   regexp_replace(..., '[-_./]+',' ')-> `adr`, `0111` (prose / partial matches)
--
-- These two expressions ARE the tokenizer contract. `domain/retrieval/tokenize.ts`
-- produces the identical term set, and a spec asserts the pair never drifts —
-- if they disagreed, the document frequencies read from SQL would describe
-- different terms than the ones BM25 scores and IDF would be quietly wrong.
--
-- SCORING DOES NOT HAPPEN HERE. This index is a RECALL PREFILTER only: it decides
-- which chunks are candidates, and BM25 in `domain/retrieval/bm25.ts` ranks them,
-- so the ranking a CI eval measures is byte-for-byte the ranking production runs.
-- ts_rank_cd is deliberately unused; it is not BM25 and would fork the ranking.
ALTER TABLE rag_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      translate(lower(coalesce(section_heading, '') || ' ' || coalesce(content, '')), '-_./', '')
    )
    ||
    to_tsvector(
      'simple',
      regexp_replace(lower(coalesce(section_heading, '') || ' ' || coalesce(content, '')), '[-_./]+', ' ', 'g')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS rag_chunks_content_tsv_idx ON rag_chunks USING gin (content_tsv);
