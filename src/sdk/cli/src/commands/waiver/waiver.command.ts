import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import chalk from 'chalk';
import {
  approveWaiver,
  effectiveStatus,
  requestWaiver,
  reviseWaiver,
  type Waiver,
} from '@beyondnet/evolith-core-domain/domain/waiver';
import {
  createErrorEnvelope,
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
  type ErrorCode,
  type OutputMeta,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { FileWaiverStore } from '@beyondnet/evolith-infra-providers';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import {
  CliUsageError,
  exitCodeForErrorCode,
  setExitCode,
} from '../../infrastructure/cli/exit-codes';

interface WaiverOptions {
  ref?: string;
  fingerprint?: string;
  reason?: string;
  by?: string;
  expires?: string;
  store?: string;
  format?: string;
  /** GT-618 — correlationId of the VERDICT this waiver suspends. */
  correlationId?: string;
  json?: boolean;
}

const DEFAULT_STORE = '.evolith/waivers.json';

/** A waiver as it appears on the wire: the stored record plus its time-derived reading. */
interface WaiverView extends Waiver {
  readonly effectiveStatus: ReturnType<typeof effectiveStatus>;
  /** The verdict this waiver suspends, when the caller supplied it. */
  readonly verdictCorrelationId?: string;
}

/**
 * GT-518 · EAG-13 — the durable waiver flow surfaced as a CLI subcommand.
 *
 *   evolith waiver request  --ref W-1 --fingerprint <fp> --reason "…" --by jdoe --expires <iso>
 *   evolith waiver approve  --ref W-1 --by lead
 *   evolith waiver revise   --ref W-1 --by jdoe --expires <iso>
 *   evolith waiver list     [--fingerprint <fp>]
 *
 * Persistence is the file-backed {@link FileWaiverStore}, so a `waiverRef` an evaluation
 * finding cites survives across CI/CLI runs. The drift gate (`evolith evaluate --format
 * drift`) consumes the SAME store to suppress an approved, unexpired waiver.
 *
 * GT-618 — this command CANCELS governance, and it was the one command outside the
 * ADR-0073 envelope: no `--format`, a raw array on stdout, no `success`, no `meta`,
 * no `correlationId`. The Tracker could ingest every decision the product makes
 * except the decision to suspend one. It now emits the same envelope as every other
 * surface, and `--correlation-id` carries the correlationId of the verdict being
 * waived into `meta.correlationId`, so the suspension joins to the decision it
 * overrides instead of floating free.
 */
@Command({ name: 'waiver', description: 'Manage evaluation waivers (request/approve/revise/list) for waiverRef suppression' })
export class WaiverCommand extends BaseEvolithCommand {
  constructor(promptService: PromptService) {
    super('WaiverCommand', promptService);
  }

  async executeCommand(passedParam: string[], options?: WaiverOptions): Promise<void> {
    const action = (passedParam[0] ?? 'list').toLowerCase();
    // `--json` is kept as a compatibility alias for `--format json`; `--format`
    // is the flag every other command documents.
    const json = options?.format === 'json' || options?.json === true;
    const startedAt = Date.now();
    const meta = (): OutputMeta => ({
      command: `evolith waiver ${action}`,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      // GT-618: when the caller names the verdict being waived, the waiver
      // inherits ITS correlationId. That is the whole point — a waiver with a
      // fresh random id cannot be joined to the decision it cancels.
      correlationId: options?.correlationId ?? randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    });

    try {
      await this.dispatch(action, options, json, meta);
    } catch (error) {
      if (!json) throw error;
      const message = error instanceof Error ? error.message : String(error);
      const code: ErrorCode = error instanceof CliUsageError ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR';
      console.log(JSON.stringify(createErrorEnvelope(code, message, meta()), null, 2));
      setExitCode(exitCodeForErrorCode(code));
    }
  }

  private async dispatch(
    action: string,
    options: WaiverOptions | undefined,
    json: boolean,
    meta: () => OutputMeta,
  ): Promise<void> {
    const store = new FileWaiverStore(resolve(process.cwd(), options?.store ?? DEFAULT_STORE));
    const now = new Date().toISOString();

    switch (action) {
      case 'request': {
        const w = requestWaiver({
          waiverRef: this.require(options?.ref, '--ref'),
          fingerprint: this.require(options?.fingerprint, '--fingerprint'),
          reason: this.require(options?.reason, '--reason'),
          requestedBy: this.require(options?.by, '--by'),
          requestedAt: now,
          expiresAt: this.require(options?.expires, '--expires'),
        });
        store.put(w);
        this.emit(w, `requested waiver ${w.waiverRef}@v${w.version} (fingerprint ${w.fingerprint})`, now, json, meta, options);
        return;
      }
      case 'approve': {
        const current = this.latestRequested(store, this.require(options?.ref, '--ref'));
        const w = approveWaiver(current, this.require(options?.by, '--by'), now);
        store.put(w);
        this.emit(w, `approved waiver ${w.waiverRef}@v${w.version} by ${w.approvedBy} (expires ${w.expiresAt})`, now, json, meta, options);
        return;
      }
      case 'revise': {
        const current = this.latestForRef(store, this.require(options?.ref, '--ref'));
        const w = reviseWaiver(current, {
          reason: options?.reason,
          requestedBy: this.require(options?.by, '--by'),
          requestedAt: now,
          expiresAt: this.require(options?.expires, '--expires'),
        });
        store.put(w);
        this.emit(w, `revised waiver ${w.waiverRef} → v${w.version} (supersedes v${w.supersedes})`, now, json, meta, options);
        return;
      }
      case 'list': {
        const all = options?.fingerprint ? store.list(options.fingerprint) : store.all();
        const views = all.map((w) => this.toView(w, now, options));
        if (json) {
          console.log(JSON.stringify(createSuccessEnvelope({ waivers: views }, meta()), null, 2));
          return;
        }
        if (all.length === 0) {
          console.log(chalk.gray('No waivers recorded.'));
          return;
        }
        console.log(chalk.bold('\n🎫 Waivers\n'));
        for (const w of views) {
          const eff = w.effectiveStatus;
          const icon = eff === 'approved' ? chalk.green('✓') : eff === 'expired' ? chalk.yellow('⌛') : eff === 'rejected' ? chalk.red('✗') : chalk.gray('•');
          console.log(`  ${icon} ${w.waiverRef}@v${w.version} [${eff}] fp=${w.fingerprint} exp=${w.expiresAt}`);
        }
        console.log('');
        return;
      }
      default:
        // An unrecognised action is a malformed INVOCATION, not a tool failure:
        // exit 3, so `evolith waiver aprove` is distinguishable from a store
        // that could not be read.
        throw new CliUsageError(`Unknown waiver action "${action}". Use request | approve | revise | list.`);
    }
  }

  private toView(w: Waiver, now: string, options?: WaiverOptions): WaiverView {
    const base: WaiverView = { ...w, effectiveStatus: effectiveStatus(w, now) };
    return options?.correlationId ? { ...base, verdictCorrelationId: options.correlationId } : base;
  }

  private require<T>(value: T | undefined, flag: string): T {
    if (value === undefined || value === null || value === '') {
      throw new CliUsageError(`${flag} is required for this waiver action`);
    }
    return value;
  }

  private latestForRef(store: FileWaiverStore, ref: string): Waiver {
    const versions = store.all().filter((w: Waiver) => w.waiverRef === ref);
    if (versions.length === 0) throw new CliUsageError(`No waiver found for ref "${ref}"`);
    return versions.reduce((a: Waiver, b: Waiver) => (b.version > a.version ? b : a));
  }

  private latestRequested(store: FileWaiverStore, ref: string): Waiver {
    const requested = store.all().filter((w: Waiver) => w.waiverRef === ref && w.status === 'requested');
    if (requested.length === 0) throw new CliUsageError(`No 'requested' waiver to approve for ref "${ref}"`);
    return requested.reduce((a: Waiver, b: Waiver) => (b.version > a.version ? b : a));
  }

  private emit(
    w: Waiver,
    human: string,
    now: string,
    json: boolean,
    meta: () => OutputMeta,
    options?: WaiverOptions,
  ): void {
    if (json) console.log(JSON.stringify(createSuccessEnvelope(this.toView(w, now, options), meta()), null, 2));
    else console.log(chalk.green(`✓ ${human}`));
  }

  @Option({ flags: '--ref [ref]', description: 'Waiver ref (waiverRef the finding cites)' })
  parseRef(v: string): string { return v; }
  @Option({ flags: '--fingerprint [fp]', description: 'Violation fingerprint the waiver suppresses' })
  parseFingerprint(v: string): string { return v; }
  @Option({ flags: '--reason [reason]', description: 'Audit reason for the waiver' })
  parseReason(v: string): string { return v; }
  @Option({ flags: '--by [who]', description: 'Requester/approver identity' })
  parseBy(v: string): string { return v; }
  @Option({ flags: '--expires [iso]', description: 'Hard expiry (ISO-8601 UTC)' })
  parseExpires(v: string): string { return v; }
  @Option({ flags: '--store [path]', description: `Waiver store path (default: ${DEFAULT_STORE})` })
  parseStore(v: string): string { return v; }
  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(v: string): string { return v; }
  @Option({
    flags: '--correlation-id [id]',
    description: 'correlationId of the verdict being waived; carried into meta.correlationId',
  })
  parseCorrelationId(v: string): string { return v; }
  @Option({ flags: '--json', description: 'Alias for --format json' })
  parseJson(): boolean { return true; }
}
