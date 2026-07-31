/**
 * GT-592 — In-memory {@link ILexicalIndexPort}.
 *
 * Two real jobs, not a stub:
 *
 *  - it is the lexical index the CI retrieval eval runs against, so the eval
 *    exercises the SAME BM25 code path production uses; and
 *  - it is the offline lexical index for deployments with no Postgres.
 *
 * Term counting happens once at seed time, so a query costs one pass over the
 * postings rather than a re-tokenization of the corpus. Corpus statistics are
 * maintained incrementally over the WHOLE seeded corpus — never over the
 * candidate set, which would flatten IDF and destroy the identifier advantage.
 */

import type {
  ILexicalIndexPort,
  LexicalCandidate,
  LexicalCandidateRequest,
  LexicalCandidateSet,
  LexicalFilters,
} from '../../domain/ports/lexical-index.port';
import type { KnowledgeChunk } from '../../domain/ports/knowledge.port';
import type { Bm25CorpusStats } from '../../domain/retrieval/bm25';
import { termFrequencies } from '../../domain/retrieval/tokenize';

interface Entry {
  readonly chunk: KnowledgeChunk;
  readonly terms: ReturnType<typeof termFrequencies>;
}

function matchesFilters(chunk: KnowledgeChunk, filters?: LexicalFilters): boolean {
  if (!filters) return true;
  if (filters.language && chunk.language !== filters.language) return false;
  if (filters.adrPrefix && !(chunk.adrId ?? '').startsWith(filters.adrPrefix)) return false;
  if (filters.sourcePrefix && !chunk.sourceFile.startsWith(filters.sourcePrefix)) return false;
  return true;
}

export class InMemoryLexicalIndexAdapter implements ILexicalIndexPort {
  private readonly entries = new Map<string, Entry>();
  /** term -> chunk ids containing it. Doubles as the document-frequency table. */
  private readonly postings = new Map<string, Set<string>>();
  private totalLength = 0;

  /** Index chunks. Re-seeding the same chunkId replaces its postings. */
  seed(chunks: readonly KnowledgeChunk[]): void {
    for (const chunk of chunks) {
      this.remove(chunk.chunkId);
      const terms = termFrequencies(`${chunk.sectionHeading ?? ''} ${chunk.text ?? ''}`);
      this.entries.set(chunk.chunkId, { chunk, terms });
      this.totalLength += terms.length;
      for (const term of terms.counts.keys()) {
        let posting = this.postings.get(term);
        if (!posting) {
          posting = new Set<string>();
          this.postings.set(term, posting);
        }
        posting.add(chunk.chunkId);
      }
    }
  }

  remove(chunkId: string): void {
    const existing = this.entries.get(chunkId);
    if (!existing) return;
    this.entries.delete(chunkId);
    this.totalLength -= existing.terms.length;
    for (const term of existing.terms.counts.keys()) {
      const posting = this.postings.get(term);
      if (!posting) continue;
      posting.delete(chunkId);
      if (posting.size === 0) this.postings.delete(term);
    }
  }

  clear(): void {
    this.entries.clear();
    this.postings.clear();
    this.totalLength = 0;
  }

  async corpusSize(): Promise<number> {
    return this.entries.size;
  }

  async candidates(request: LexicalCandidateRequest): Promise<LexicalCandidateSet> {
    const stats = this.stats(request.terms);

    const ids = new Set<string>();
    for (const term of request.terms) {
      const posting = this.postings.get(term);
      if (!posting) continue;
      for (const id of posting) ids.add(id);
    }

    const candidates: LexicalCandidate[] = [];
    // Iterate in stable id order so a truncated candidate set is deterministic.
    for (const id of Array.from(ids).sort((a, b) => a.localeCompare(b, 'en'))) {
      const entry = this.entries.get(id);
      if (!entry) continue;
      if (!matchesFilters(entry.chunk, request.filters)) continue;
      candidates.push({ chunk: entry.chunk, terms: entry.terms });
    }

    // `limit` is deliberately IGNORED. It exists for stores that must cap what
    // they materialize; this index already holds the whole corpus, so truncating
    // before BM25 has scored anything could only lose recall — and would lose it
    // by id order, which is not a relevance order at all. The caller truncates
    // after ranking.
    return { candidates, stats };
  }

  /** Corpus statistics over the entire seeded corpus. */
  private stats(terms: readonly string[]): Bm25CorpusStats {
    const documentFrequency = new Map<string, number>();
    for (const term of terms) {
      documentFrequency.set(term, this.postings.get(term)?.size ?? 0);
    }
    return {
      corpusSize: this.entries.size,
      averageDocumentLength: this.entries.size > 0 ? this.totalLength / this.entries.size : 0,
      documentFrequency,
    };
  }
}
