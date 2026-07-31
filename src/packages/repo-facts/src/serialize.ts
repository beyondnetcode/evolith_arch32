/**
 * Deterministic on-disk form of a `RepoFacts` package (GT-589).
 *
 * Two extractions of the same tree differ in exactly one field — the extraction
 * timestamp — so the serializer emits keys in a fixed order and the caller can
 * choose to drop the timestamp when it wants BYTE-identical files rather than
 * merely equal facts. `contentHash` never covers the timestamp, so the hash agrees
 * either way; the option only controls the bytes.
 */

import type { RepoFacts } from '@beyondnet/evolith-core-domain/evaluation/contracts';

export interface SerializeOptions {
  /**
   * Omit `provenance.extractedAt`, making the file byte-reproducible. Off by
   * default: dropping a timestamp from an audit artifact should be a deliberate
   * request, not a silent convenience.
   */
  readonly omitTimestamp?: boolean;
  readonly indent?: number;
}

/** Stable JSON for a fact package. Field order is fixed by construction. */
export function serializeRepoFacts(facts: RepoFacts, options: SerializeOptions = {}): string {
  const provenance: Record<string, unknown> = {
    extractedBy: facts.provenance.extractedBy,
    extractorVersion: facts.provenance.extractorVersion,
    indexer: facts.provenance.indexer,
    indexerVersion: facts.provenance.indexerVersion,
  };
  if (!options.omitTimestamp) provenance.extractedAt = facts.provenance.extractedAt;
  if (facts.provenance.revision) provenance.revision = facts.provenance.revision;

  const ordered = {
    schemaVersion: facts.schemaVersion,
    contentHash: facts.contentHash,
    provenance,
    modules: facts.modules.map((m) => (m.layer === undefined ? { id: m.id } : { id: m.id, layer: m.layer })),
    imports: facts.imports.map((i) => ({ from: i.from, to: i.to, typeOnly: i.typeOnly })),
    symbols: facts.symbols.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      moduleId: s.moduleId,
      exported: s.exported,
    })),
    references: facts.references.map((r) => ({ fromSymbol: r.fromSymbol, toSymbol: r.toSymbol })),
  };

  return JSON.stringify(ordered, null, options.indent ?? 2) + '\n';
}
