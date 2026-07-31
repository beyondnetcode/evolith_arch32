/**
 * GT-588 · criterion 2 — `evolith audit verify`.
 *
 * Verifies a transparency ledger OFFLINE: reads a file, checks every signature,
 * every RFC 9162 inclusion proof, and recomputes the tree head independently. No
 * network, no Core API, no log operator. That constraint is the point — an audit
 * tool that has to ask the party under audit for help is not an audit tool.
 *
 * The exit code is the GOVERNANCE VERDICT, not "did the command run": a ledger whose
 * receipts do not verify exits `2` (BLOCKED) under the CLI's published taxonomy, so
 * a CI step, a pre-commit hook and an agent harness all block on it without parsing
 * anything. That is what makes the ledger load-bearing rather than ornamental.
 */

import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {
  createErrorEnvelope,
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { verifyReceiptChain } from '@beyondnet/evolith-core-domain/domain/transparency';
import type {
  SigningIdentity,
  TransparencyLedgerEntry,
} from '@beyondnet/evolith-core-domain/domain/transparency';
import {
  Ed25519CoseVerifier,
  NodeSha256Hasher,
  parseLedger,
  type TrustAnchor,
  type TrustAnchorMode,
} from '@beyondnet/evolith-core-domain/infrastructure/transparency';
import { evaluateAuditTransparency } from '@beyondnet/evolith-core-domain/application/validators/governance';
import { Verdict } from '@beyondnet/evolith-core-domain/domain/verdict';

import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { CLI_EXIT_CODES, CliUsageError, setExitCode } from '../../infrastructure/cli/exit-codes';

interface AuditCommandOptions {
  ledger?: string;
  trustAnchors?: string;
  format?: string;
}

@Command({
  name: 'audit',
  description: 'Verify the signed transparency ledger (GT-588 · RFC 9943 / RFC 9942)',
  arguments: '<action>',
})
export class AuditCommand extends BaseEvolithCommand {
  constructor() {
    super('AuditCommand');
  }

  @Option({ flags: '--ledger <path>', description: 'Path to the JSONL transparency ledger' })
  parseLedgerPath(value: string): string {
    return value;
  }

  @Option({
    flags: '--trust-anchors <path>',
    description: 'JSON file of { keyId, publicKeySpki } trust anchors, supplied OUT OF BAND',
  })
  parseTrustAnchors(value: string): string {
    return value;
  }

  @Option({ flags: '--format <format>', description: 'Output format: text | json' })
  parseFormat(value: string): string {
    return value;
  }

  async executeCommand(inputs: string[], options?: AuditCommandOptions): Promise<void> {
    const action = inputs[0];
    if (action !== 'verify') {
      throw new CliUsageError(`Unknown audit action "${action ?? ''}". Supported actions: verify`);
    }
    await this.verify(options ?? {});
  }

  private async verify(options: AuditCommandOptions): Promise<void> {
    const json = options.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith audit verify',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    const ledgerPath = path.resolve(options.ledger ?? path.join(process.cwd(), 'logs', 'transparency.jsonl'));

    let content: string | undefined;
    try {
      content = await fs.readFile(ledgerPath, 'utf-8');
    } catch {
      content = undefined; // absent ledger is a FINDING (AUD-TRANSP-01), not a crash
    }

    const entries: TransparencyLedgerEntry[] = content === undefined ? [] : parseLedger(content);

    // Trust anchors supplied out of band are the only ones that mean anything. When
    // none are given we fall back to the keys the ledger carries about itself and
    // say so — `self-asserted` is a violation, not a quiet default.
    const supplied = options.trustAnchors ? await this.readAnchors(options.trustAnchors) : undefined;
    const mode: TrustAnchorMode = supplied ? 'anchored' : 'self-asserted';
    const anchors = supplied ?? selfAssertedAnchors(entries);

    const hasher = new NodeSha256Hasher();
    const verifier = new Ed25519CoseVerifier(anchors, mode);
    const verification = entries.length > 0 ? verifyReceiptChain(entries, { hasher, verifier }) : undefined;

    const result = evaluateAuditTransparency({
      ...(verification ? { verification } : {}),
      ledgerPath,
      issuerIdentities: distinct(entries.map((e) => e.transparentStatement.statement.identity)),
      serviceIdentities: distinct(entries.map((e) => e.transparentStatement.receipt.identity)),
      trustAnchors: mode,
    });

    const payload = {
      ledgerPath,
      entryCount: verification?.entryCount ?? 0,
      verdict: result.verdict,
      cryptographicallyIntact: result.cryptographicallyIntact,
      trustAnchors: mode,
      recomputedRoot: verification?.recomputedRoot,
      violations: result.violations.map((v) => ({
        ruleId: v.ruleId,
        line: v.line,
        severity: v.severity,
        message: v.message,
      })),
    };

    if (json) {
      console.log(JSON.stringify(
        result.verdict === Verdict.PASS
          ? createSuccessEnvelope(payload, { ...meta, durationMs: Date.now() - startedAt })
          // GT-580 taxonomy: a ledger that does not verify is a BLOCKING governance
          // verdict (`GATE_BLOCKED` → exit 2), not malformed input. `VALIDATION_FAILED`
          // maps to exit 3 and would tell an agent harness to fix its invocation
          // rather than to stop the pipeline.
          : createErrorEnvelope('GATE_BLOCKED', 'transparency ledger does not verify', {
            ...meta,
            durationMs: Date.now() - startedAt,
          }),
        null,
        2,
      ));
    } else {
      this.render(payload);
    }

    setExitCode(result.verdict === Verdict.PASS ? CLI_EXIT_CODES.OK : CLI_EXIT_CODES.BLOCKED);
  }

  private async readAnchors(anchorsPath: string): Promise<TrustAnchor[]> {
    let raw: string;
    try {
      raw = await fs.readFile(path.resolve(anchorsPath), 'utf-8');
    } catch (error) {
      throw new CliUsageError(
        `--trust-anchors: cannot read "${anchorsPath}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new CliUsageError(`--trust-anchors: "${anchorsPath}" is not valid JSON`);
    }
    if (!Array.isArray(parsed) || !parsed.every(isAnchor)) {
      throw new CliUsageError('--trust-anchors: expected an array of { keyId, publicKeySpki }');
    }
    return parsed;
  }

  private render(payload: {
    ledgerPath: string;
    entryCount: number;
    verdict: string;
    cryptographicallyIntact: boolean;
    trustAnchors: string;
    recomputedRoot?: string;
    violations: { ruleId: string; line?: number; message: string }[];
  }): void {
    this.promptService.showIntro('Evolith CLI - Transparency ledger verification');
    console.log(`${chalk.bold('Ledger')}      ${payload.ledgerPath}`);
    console.log(`${chalk.bold('Entries')}     ${payload.entryCount}`);
    console.log(`${chalk.bold('Anchors')}     ${payload.trustAnchors}`);
    if (payload.recomputedRoot) {
      console.log(`${chalk.bold('Tree head')}   ${payload.recomputedRoot}`);
    }
    console.log(
      `${chalk.bold('Receipts')}    ${payload.cryptographicallyIntact
        ? chalk.green('verify')
        : chalk.red('DO NOT VERIFY')}`,
    );
    console.log(
      `${chalk.bold('Verdict')}     ${payload.verdict === 'PASS' ? chalk.green('PASS') : chalk.red('FAIL')}\n`,
    );

    if (payload.violations.length === 0) return;
    console.log(chalk.bold('Violations'));
    for (const v of payload.violations) {
      const where = v.line ? chalk.dim(`(line ${v.line})`) : '';
      console.log(`  ${chalk.red(v.ruleId)} ${where} ${v.message}`);
    }
  }
}

function isAnchor(value: unknown): value is TrustAnchor {
  const a = value as Record<string, unknown> | null;
  return typeof a?.['keyId'] === 'string' && typeof a?.['publicKeySpki'] === 'string';
}

function distinct(identities: readonly SigningIdentity[]): SigningIdentity[] {
  const seen = new Map<string, SigningIdentity>();
  for (const identity of identities) if (!seen.has(identity.keyId)) seen.set(identity.keyId, identity);
  return [...seen.values()];
}

/**
 * Public keys taken from the ledger itself. Enough to detect corruption and edits by
 * anyone without the private key; NOT evidence of identity, which is why using them
 * raises AUD-TRANSP-04 rather than silently succeeding.
 */
function selfAssertedAnchors(entries: readonly TransparencyLedgerEntry[]): TrustAnchor[] {
  const anchors = new Map<string, TrustAnchor>();
  for (const entry of entries) {
    for (const identity of [
      entry.transparentStatement.statement.identity,
      entry.transparentStatement.receipt.identity,
    ]) {
      if (identity.publicKeySpki && !anchors.has(identity.keyId)) {
        anchors.set(identity.keyId, { keyId: identity.keyId, publicKeySpki: identity.publicKeySpki });
      }
    }
  }
  return [...anchors.values()];
}
