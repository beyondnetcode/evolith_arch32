/**
 * GT-588 — SHA-256 adapter for the domain's {@link IHasher} port.
 *
 * The one place the transparency layer's hash primitive is bound to a runtime.
 * The RFC 9162 tree math that uses it stays in the domain, where it can be read.
 */

import { createHash } from 'node:crypto';

import type { IHasher } from '../../domain/transparency/ports/hasher.port';

export class NodeSha256Hasher implements IHasher {
  readonly algorithm = 'sha-256';

  hash(input: Uint8Array): Uint8Array {
    return new Uint8Array(createHash('sha256').update(input).digest());
  }
}
