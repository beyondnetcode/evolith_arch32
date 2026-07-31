/**
 * GT-588 — JSONL append-only transparency ledger.
 *
 * Same storage shape as `JsonlAuditRepository`, one deliberate behavioural
 * difference: that repository skips malformed lines so a read never aborts, which is
 * right for a best-effort log and wrong here. In a ledger whose whole purpose is
 * tamper-evidence, a line you cannot parse is a FINDING, not noise — silently
 * dropping it would let an attacker corrupt an entry into invisibility and leave the
 * remaining receipts verifying. Malformed lines are therefore surfaced as
 * `MALFORMED_ENTRY` placeholders that fail verification.
 */

import * as fs from 'fs-extra';
import * as path from 'node:path';

import type { ITransparencyLedger } from '../../domain/transparency/ports/transparency-ledger.port';
import type { TransparencyLedgerEntry } from '../../domain/transparency/transparency-statement';

export class JsonlTransparencyLedger implements ITransparencyLedger {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly logFile: string) {}

  async append(entry: TransparencyLedgerEntry): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.ensureDir(path.dirname(this.logFile));
      await fs.appendFile(this.logFile, JSON.stringify(entry) + '\n', 'utf-8');
    });
    return this.writeQueue;
  }

  async readAll(): Promise<readonly TransparencyLedgerEntry[]> {
    if (!(await fs.pathExists(this.logFile))) return [];
    const content = await fs.readFile(this.logFile, 'utf-8');
    return parseLedger(content);
  }
}

/**
 * Parse a JSONL ledger. Exported so `audit verify` can read a ledger handed to it as
 * a string (a CI artefact, stdin, a fixture) with identical semantics.
 */
export function parseLedger(content: string): TransparencyLedgerEntry[] {
  const entries: TransparencyLedgerEntry[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      entries.push(malformed(i, 'line is not valid JSON'));
      continue;
    }
    if (!isLedgerEntry(parsed)) {
      entries.push(malformed(i, 'line is not a transparency ledger entry'));
      continue;
    }
    entries.push(parsed);
  }

  return entries;
}

function isLedgerEntry(value: unknown): value is TransparencyLedgerEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  const ts = e['transparentStatement'] as Record<string, unknown> | undefined;
  if (typeof e['decision'] !== 'object' || e['decision'] === null) return false;
  if (typeof ts !== 'object' || ts === null) return false;
  const statement = ts['statement'] as Record<string, unknown> | undefined;
  const receipt = ts['receipt'] as Record<string, unknown> | undefined;
  return typeof statement?.['cose'] === 'string'
    && typeof receipt?.['cose'] === 'string'
    && typeof receipt?.['treeRoot'] === 'string'
    && typeof receipt?.['leafIndex'] === 'number'
    && typeof receipt?.['treeSize'] === 'number';
}

/**
 * A placeholder that CANNOT verify: `cose` is empty, so base64 decoding yields no
 * statement bytes and the chain verifier reports `MALFORMED_ENTRY` at this position
 * rather than pretending the line was never there.
 */
function malformed(lineIndex: number, reason: string): TransparencyLedgerEntry {
  const identity = {
    keyId: '',
    issuer: '',
    assurance: 'development' as const,
    algorithm: 0,
  };
  return {
    decision: {
      statementId: `malformed-line-${lineIndex + 1}`,
      subject: `ledger line ${lineIndex + 1}`,
      eventType: 'transparency.malformed-entry',
      occurredAt: new Date(0).toISOString(),
      payload: { reason },
    },
    transparentStatement: {
      statement: {
        statementId: `malformed-line-${lineIndex + 1}`,
        issuer: '',
        subject: '',
        cose: '!',
        statementHash: '',
        identity,
      },
      receipt: {
        statementId: `malformed-line-${lineIndex + 1}`,
        leafIndex: -1,
        treeSize: -1,
        treeRoot: '',
        cose: '!',
        identity,
      },
    },
  };
}
