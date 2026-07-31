/**
 * GT-592 — Identifier-aware lexical tokenizer for the architecture corpus.
 *
 * This corpus is queried by **exact identifiers** — `ADR-0111`, `GT-569`,
 * `SCHEMA_VERSION`, `EVD-01`, rule ids — not by prose paraphrase. A tokenizer
 * that splits on every non-alphanumeric character destroys exactly the signal
 * those queries carry: it turns `ADR-0111` into the pair (`adr`, `0111`), and
 * `adr` occurs in nearly every document of this corpus, so its IDF collapses to
 * noise and only half the query still discriminates.
 *
 * So each raw word is emitted at TWO granularities:
 *
 *   `ADR-0111`        -> ['adr0111', 'adr', '0111']
 *   `SCHEMA_VERSION`  -> ['schemaversion', 'schema', 'version']
 *   `kind-evaluators.ts` -> ['kindevaluatorsts', 'kind', 'evaluators', 'ts']
 *
 * The compound is rare, so BM25 gives it a high IDF and it dominates an
 * identifier query; the sub-tokens keep prose and partial matches reachable.
 *
 * ## Why the compound has its separators DELETED rather than kept
 *
 * The Postgres lexical index has to agree with this tokenizer term for term, or
 * document frequency read from SQL would not describe the terms scored here and
 * IDF would be quietly wrong. PostgreSQL's `simple` text-search parser does NOT
 * keep `adr-0111` as one lexeme — it emits `adr` and `-0111`, because it reads
 * the tail as a signed integer. Rather than fight the parser, both sides
 * normalize identically:
 *
 *   compound  = translate(lower(text), '-_./', '')      -> `adr0111`
 *   sub-tokens= regexp_replace(lower(text), '[-_./]+', ' ') -> `adr`, `0111`
 *
 * and `to_tsvector('simple', ...)` of those two expressions yields exactly the
 * term set this function produces. The DDL in `rag-pgvector.schema.sql` carries
 * the same two expressions; a spec asserts the pair stays in agreement.
 *
 * camelCase is deliberately NOT split: the Postgres parser does not split it
 * either, and a term this tokenizer emits but SQL cannot count would get a
 * document frequency of zero and therefore a spuriously enormous IDF. Alignment
 * with the index is worth more than camelCase recall on this corpus, whose
 * identifiers are hyphen- and underscore-shaped.
 *
 * Pure domain: no I/O, no store, no vendor.
 */

/**
 * Characters that hold a raw word together. Everything else is a separator.
 * `-`, `_`, `.` and `/` are kept at this stage because `ADR-0111`,
 * `SCHEMA_VERSION`, `kind-evaluators.ts` and `reference/core` are single terms
 * in the way this corpus is written and queried.
 */
const WORD_SPLIT = /[^A-Za-z0-9_\-./]+/;

/** Separators that are deleted for the compound and split for the sub-tokens. */
const SEPARATORS = /[_\-./]+/g;
const SEPARATOR_SPLIT = /[_\-./]+/;

/** Leading/trailing separators are punctuation, not part of the word. */
const TRIM_SEPARATORS = /^[_\-./]+|[_\-./]+$/g;

/** Tokens shorter than this are dropped unless they contain a digit. */
const MIN_TOKEN_LENGTH = 2;

function keep(token: string): boolean {
  if (token.length === 0) return false;
  if (token.length >= MIN_TOKEN_LENGTH) return true;
  return /[0-9]/.test(token);
}

/**
 * The compound normalization: lowercase, separators deleted.
 * Mirrors `translate(lower(x), '-_./', '')` in SQL.
 */
export function compoundForm(word: string): string {
  return word.toLowerCase().replace(SEPARATORS, '');
}

/**
 * Tokenize text into the lexical terms BM25 scores over.
 *
 * Returns terms **with repetition** — BM25 needs term frequency, so callers
 * must not deduplicate before counting. Order is not meaningful.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];

  for (const rawWord of text.split(WORD_SPLIT)) {
    const word = rawWord.replace(TRIM_SEPARATORS, '');
    if (!word) continue;

    const compound = compoundForm(word);
    if (keep(compound)) out.push(compound);

    const parts = word.split(SEPARATOR_SPLIT).filter(Boolean);
    // Only a genuinely compound word contributes sub-tokens; a plain word must
    // not be counted twice or its term frequency stops being honest.
    if (parts.length < 2) continue;
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower === compound) continue;
      if (keep(lower)) out.push(lower);
    }
  }

  return out;
}

/** Term-frequency map for one document, plus the length BM25 normalizes by. */
export interface TermFrequencies {
  readonly counts: ReadonlyMap<string, number>;
  /**
   * Document length **in characters** of the indexed text.
   *
   * Characters, not tokens, on purpose. BM25's `b` term only uses the RATIO
   * `dl / avgdl`, which is scale-invariant, and the corpus-wide average has to
   * come from the store. A Postgres `avg(length(...))` is exact and costs one
   * aggregate; an average TOKEN count would require running this tokenizer over
   * the whole corpus inside SQL, so it could only ever be estimated — and an
   * estimated denominator against an exact numerator biases long documents.
   * Measuring both ends in characters removes the estimate entirely and keeps
   * the in-memory and Postgres indexes ranking identically.
   */
  readonly length: number;
  /** Total tokens emitted. Diagnostics only; BM25 does not use it. */
  readonly tokenCount: number;
}

/** Count terms of a single document. */
export function termFrequencies(text: string): TermFrequencies {
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return { counts, length: text.length, tokenCount: tokens.length };
}

/**
 * Distinct query terms, in first-seen order.
 *
 * Deduplicated because a query term repeated by the user should not double its
 * own weight; document-side frequency is what BM25 saturates over.
 */
export function queryTerms(query: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokenize(query)) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
