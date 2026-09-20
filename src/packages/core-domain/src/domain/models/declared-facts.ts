import type { DeclaredFact, FactProvenance } from './normalized-rule';

/**
 * GT-716 AC2 — the fact vocabulary, `src/rulesets/schema/facets.json`, as the
 * loaders resolve a rule's `facts` against it.
 *
 * One resolver for both corpus readers (`DiskRulesetRepository` in production, the
 * triage's `loadCorpus` in tests), so a facet cannot resolve to one provenance in
 * the engine and another in the measurement.
 */
export type FactVocabulary = ReadonlyMap<string, { readonly provenance: FactProvenance; readonly why?: string }>;

const PROVENANCES: ReadonlySet<string> = new Set(['observed', 'supplied', 'external', 'runtime']);

/** Parse the vocabulary document; an entry with an unknown provenance is dropped and named. */
export function parseFactVocabulary(doc: unknown): { vocabulary: FactVocabulary; rejected: string[] } {
  const facets = (doc as { facets?: Record<string, { provenance?: unknown; why?: unknown }> } | null)?.facets ?? {};
  const vocabulary = new Map<string, { provenance: FactProvenance; why?: string }>();
  const rejected: string[] = [];
  for (const [facet, entry] of Object.entries(facets)) {
    const provenance = String(entry?.provenance ?? '');
    if (!PROVENANCES.has(provenance)) { rejected.push(`${facet} (${provenance || 'no provenance'})`); continue; }
    vocabulary.set(facet, { provenance: provenance as FactProvenance, ...(entry?.why ? { why: String(entry.why) } : {}) });
  }
  return { vocabulary, rejected };
}

/**
 * A rule's declared facet ids, resolved. A facet the vocabulary does not know is
 * returned with its id and NO provenance, so the caller (and the triage spec) can
 * name it instead of having it disappear — an unknown fact must never silently
 * become "observed".
 */
export function resolveDeclaredFacts(
  declared: readonly unknown[],
  vocabulary: FactVocabulary,
): { facts: DeclaredFact[]; unknown: string[] } {
  const facts: DeclaredFact[] = [];
  const unknown: string[] = [];
  for (const raw of declared) {
    const facet = String(raw);
    const entry = vocabulary.get(facet);
    if (!entry) { unknown.push(facet); continue; }
    facts.push({ facet, provenance: entry.provenance, ...(entry.why ? { why: entry.why } : {}) });
  }
  return { facts, unknown };
}
