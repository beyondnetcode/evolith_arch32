/**
 * FileC4BindingMapStore — a DURABLE, append-only {@link IC4BindingMapStore} backed by JSONL
 * (GT-590).
 *
 * JSON Lines rather than the single-JSON-object shape `FileApprovalStore` uses, because the two
 * files mean different things. An approval file is a mutable set of records keyed by id; this file
 * IS the history — one line per version, oldest first, and a write only ever appends. That makes
 * the on-disk artifact the audit trail rather than a snapshot of it: `git diff` on it shows a
 * decision being added, never one being edited away.
 *
 * Mirrors the established adapter pattern otherwise: an injectable `fs` seam (defaults to
 * `node:fs/promises`), parent dirs created on first write, and a read that tolerates a missing file.
 * A CORRUPT line, however, is NOT tolerated — unlike an approval cache, a half-readable governance
 * ledger must not silently present itself as a shorter, valid one, because the next append would
 * then be numbered from a head that is not really the head.
 */

import { promises as nodeFs } from 'node:fs';
import * as path from 'node:path';
import type { C4BindingMap } from '@beyondnet/evolith-core-domain/application/validators/enforcement/c4-binding';
import type { IC4BindingMapStore } from '../../domain/ports/c4-binding-map.port';
import { assertAppendable } from './in-memory-c4-binding-map-store';

/** The subset of `node:fs/promises` this store needs. Injectable for tests and alternate backends. */
export interface C4BindingStoreFsLike {
  readFile(file: string, encoding: 'utf8'): Promise<string>;
  appendFile(file: string, data: string, encoding: 'utf8'): Promise<void>;
  mkdir(dir: string, options: { recursive: true }): Promise<string | undefined>;
}

/** Raised when the ledger on disk cannot be read as a version chain. */
export class C4BindingLedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'C4BindingLedgerError';
  }
}

export interface FileC4BindingMapStoreOptions {
  /** Directory holding one `<scopeId>.jsonl` ledger per governed scope. */
  readonly directory: string;
  readonly fs?: C4BindingStoreFsLike;
}

export class FileC4BindingMapStore implements IC4BindingMapStore {
  private readonly directory: string;
  private readonly fs: C4BindingStoreFsLike;

  constructor(options: FileC4BindingMapStoreOptions) {
    this.directory = options.directory;
    this.fs = options.fs ?? (nodeFs as unknown as C4BindingStoreFsLike);
  }

  async head(scopeId: string): Promise<C4BindingMap | undefined> {
    const chain = await this.history(scopeId);
    return chain[chain.length - 1];
  }

  async append(scopeId: string, map: C4BindingMap): Promise<void> {
    const chain = await this.history(scopeId);
    assertAppendable(scopeId, chain[chain.length - 1], map);
    await this.fs.mkdir(this.directory, { recursive: true });
    await this.fs.appendFile(this.ledgerPath(scopeId), `${JSON.stringify(map)}\n`, 'utf8');
  }

  async history(scopeId: string): Promise<readonly C4BindingMap[]> {
    let raw: string;
    try {
      raw = await this.fs.readFile(this.ledgerPath(scopeId), 'utf8');
    } catch {
      // No ledger yet: nothing was ever confirmed for this scope. Not an error.
      return [];
    }
    const lines = raw.split('\n').filter((line) => line.trim().length > 0);
    return lines.map((line, index) => {
      try {
        return JSON.parse(line) as C4BindingMap;
      } catch {
        throw new C4BindingLedgerError(
          `C4 binding ledger for scope '${scopeId}' is unreadable at line ${index + 1}. ` +
            'Refusing to present a truncated governance history as a complete one.',
        );
      }
    });
  }

  /** `scopeId` is opaque, so it is sanitized rather than trusted as a path segment. */
  private ledgerPath(scopeId: string): string {
    const safe = scopeId.replace(/[^A-Za-z0-9._-]+/g, '_');
    return path.join(this.directory, `${safe}.jsonl`);
  }
}
