/**
 * Content hashing for a `RepoFacts` package (GT-589).
 *
 * Lives HERE and not in core-domain on purpose: hashing needs a crypto primitive,
 * and the Core's contract module is pure by construction (ADR-0101). The Core
 * treats `RepoFacts.contentHash` as opaque provenance — exactly as it treats
 * `Provenance.artifactHash` on `Evidence` (ADR-0111) — and never recomputes it.
 *
 * The digest is taken over `canonicalizeRepoFacts`, which excludes the hash itself
 * and the extraction timestamp, so two indexings of the same tree agree.
 */

import { createHash } from 'crypto';
import { canonicalizeRepoFacts } from '@beyondnet/evolith-core-domain/evaluation/contracts';
import type { RepoFacts } from '@beyondnet/evolith-core-domain/evaluation/contracts';

/** Algorithm prefix carried in the hash string so it can be migrated visibly. */
export const REPO_FACTS_HASH_ALGORITHM = 'sha256';

/** `sha256:<hex>` over the canonical form of `facts`. */
export function computeRepoFactsHash(facts: RepoFacts): string {
  const digest = createHash(REPO_FACTS_HASH_ALGORITHM)
    .update(canonicalizeRepoFacts(facts), 'utf8')
    .digest('hex');
  return REPO_FACTS_HASH_ALGORITHM + ':' + digest;
}

/** Returns `facts` with `contentHash` set to its own canonical digest. */
export function withContentHash(facts: RepoFacts): RepoFacts {
  return { ...facts, contentHash: computeRepoFactsHash(facts) };
}
