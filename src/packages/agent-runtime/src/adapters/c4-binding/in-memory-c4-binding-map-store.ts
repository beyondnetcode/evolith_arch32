/**
 * InMemoryC4BindingMapStore — the default {@link IC4BindingMapStore} (GT-590).
 *
 * Non-durable on purpose, mirroring `InMemoryApprovalStore`: it exists so the seam has a working
 * default and so the version-chain invariants live in ONE place both implementations are held to.
 * The durable sibling is {@link FileC4BindingMapStore}; a Tracker-backed store is the same port
 * again, owned by whoever wires the Tracker.
 *
 * The append-only checks are here, not in the caller, because they are the only thing standing
 * between "a versioned governance asset" and "a mutable field that happens to have a number in it".
 */

import type { C4BindingMap } from '@beyondnet/evolith-core-domain/application/validators/enforcement/c4-binding';
import {
  C4BindingMapVersionError,
  type IC4BindingMapStore,
} from '../../domain/ports/c4-binding-map.port';

/**
 * Reject anything that is not the next link in the chain. Shared by both adapters so a durable
 * store can never be laxer than the in-memory one.
 */
export function assertAppendable(
  scopeId: string,
  head: C4BindingMap | undefined,
  next: C4BindingMap,
): void {
  const expected = head === undefined ? 0 : head.version + 1;
  if (next.version !== expected) {
    throw new C4BindingMapVersionError(
      `C4 binding map for scope '${scopeId}' is at version ${head?.version ?? -1}; ` +
        `expected the next append to be version ${expected} but received ${next.version}.`,
      scopeId,
      expected,
      next.version,
    );
  }
  if (head !== undefined && next.supersedes !== head.contentHash) {
    // Two writers confirmed from the same ancestor: appending would silently drop one decision.
    throw new C4BindingMapVersionError(
      `C4 binding map for scope '${scopeId}' version ${next.version} supersedes ` +
        `'${next.supersedes ?? 'nothing'}', but the current head is '${head.contentHash}'. ` +
        'Re-confirm against the current head instead of overwriting a decision.',
      scopeId,
      expected,
      next.version,
    );
  }
}

export class InMemoryC4BindingMapStore implements IC4BindingMapStore {
  private readonly versions = new Map<string, C4BindingMap[]>();

  async head(scopeId: string): Promise<C4BindingMap | undefined> {
    const chain = this.versions.get(scopeId);
    return chain?.[chain.length - 1];
  }

  async append(scopeId: string, map: C4BindingMap): Promise<void> {
    const chain = this.versions.get(scopeId) ?? [];
    assertAppendable(scopeId, chain[chain.length - 1], map);
    this.versions.set(scopeId, [...chain, map]);
  }

  async history(scopeId: string): Promise<readonly C4BindingMap[]> {
    return [...(this.versions.get(scopeId) ?? [])];
  }
}
