/**
 * @beyondnet/evolith-repo-facts — the OUT-OF-CORE structural fact extractor (GT-589).
 *
 * Produces the canonical `RepoFacts` package that a consumer delivers INLINE on the
 * `EvaluationContext`. The stateless Core queries what it is given and never runs an
 * indexer, opens a repository, or keeps facts between evaluations (ADR-0101).
 */

export { extractTypeScriptFacts, collectSourceFiles, EXTRACTOR_ID, EXTRACTOR_VERSION, INDEXER_ID } from './typescript-fact-extractor';
export type { ExtractOptions } from './typescript-fact-extractor';
export { computeRepoFactsHash, withContentHash, REPO_FACTS_HASH_ALGORITHM } from './content-hash';
export { serializeRepoFacts } from './serialize';
export {
  FINGERPRINT_ALGORITHM,
  isFingerprintable,
  normalizedKindStream,
  structuralFingerprintOf,
} from './structural-fingerprint';
export type { StructuralFingerprint } from './structural-fingerprint';
export { scanErrorMasking } from './error-masking';
export type { MaskingScanContext } from './error-masking';
