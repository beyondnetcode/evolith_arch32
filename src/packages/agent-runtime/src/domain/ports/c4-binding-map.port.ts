/**
 * IC4BindingMapStore — persistence seam for the VERSIONED C4↔module correspondence (GT-590).
 *
 * The map itself is a pure value produced by core-domain (`confirmC4Binding` mints version *n+1*
 * from version *n*, never mutating either). What that value needs, and what the Core deliberately
 * does not have (ADR-0101 — Core is a stateless evaluation engine), is somewhere to LIVE between
 * evaluations. That belongs to the runtime, behind this port.
 *
 * The contract is APPEND-ONLY on purpose. A confirmed correspondence is a governance decision with
 * a named human attached; a store that let version *n* be overwritten would make "who confirmed
 * this, and against which tree" unanswerable after the fact. So `append` refuses anything that is
 * not the next version of the head, and there is no `update` and no `delete`. Correcting a binding
 * is a new confirmation, which is a new version — the record of the mistake survives.
 *
 * `scopeId` is whatever the caller governs one map per: a product, a repository, a satellite. It is
 * opaque here.
 */

import type { C4BindingMap } from '@beyondnet/evolith-core-domain/application/validators/enforcement/c4-binding';

/** Raised when an append would break the append-only version chain. */
export class C4BindingMapVersionError extends Error {
  constructor(
    message: string,
    readonly scopeId: string,
    readonly expectedVersion: number,
    readonly receivedVersion: number,
  ) {
    super(message);
    this.name = 'C4BindingMapVersionError';
  }
}

export interface IC4BindingMapStore {
  /** The current (highest) version for a scope, or undefined when nothing was ever confirmed. */
  head(scopeId: string): Promise<C4BindingMap | undefined>;
  /**
   * Append the next version. MUST reject a map whose `version` is not `head.version + 1` (or 0 when
   * the scope is empty), and MUST reject a map whose `supersedes` does not name the current head's
   * `contentHash` — that mismatch means two writers confirmed from the same ancestor and one of
   * them is about to lose a decision silently.
   */
  append(scopeId: string, map: C4BindingMap): Promise<void>;
  /** Every version ever appended, oldest first. The audit trail of the correspondence. */
  history(scopeId: string): Promise<readonly C4BindingMap[]>;
}
