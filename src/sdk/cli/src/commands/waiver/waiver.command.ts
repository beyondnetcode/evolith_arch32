import { Command, Option } from 'nest-commander';
import { resolve } from 'node:path';
import chalk from 'chalk';
import {
  approveWaiver,
  effectiveStatus,
  requestWaiver,
  reviseWaiver,
  type Waiver,
} from '@beyondnet/evolith-core-domain/domain/waiver';
import { FileWaiverStore } from '@beyondnet/evolith-infra-providers';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

interface WaiverOptions {
  ref?: string;
  fingerprint?: string;
  reason?: string;
  by?: string;
  expires?: string;
  store?: string;
  json?: boolean;
}

const DEFAULT_STORE = '.evolith/waivers.json';

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
 */
@Command({ name: 'waiver', description: 'Manage evaluation waivers (request/approve/revise/list) for waiverRef suppression' })
export class WaiverCommand extends BaseEvolithCommand {
  constructor(promptService: PromptService) {
    super('WaiverCommand', promptService);
  }

  async executeCommand(passedParam: string[], options?: WaiverOptions): Promise<void> {
    const action = (passedParam[0] ?? 'list').toLowerCase();
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
        this.emit(w, `requested waiver ${w.waiverRef}@v${w.version} (fingerprint ${w.fingerprint})`, options);
        return;
      }
      case 'approve': {
        const current = this.latestRequested(store, this.require(options?.ref, '--ref'));
        const w = approveWaiver(current, this.require(options?.by, '--by'), now);
        store.put(w);
        this.emit(w, `approved waiver ${w.waiverRef}@v${w.version} by ${w.approvedBy} (expires ${w.expiresAt})`, options);
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
        this.emit(w, `revised waiver ${w.waiverRef} → v${w.version} (supersedes v${w.supersedes})`, options);
        return;
      }
      case 'list': {
        const all = options?.fingerprint ? store.list(options.fingerprint) : store.all();
        if (options?.json) {
          console.log(JSON.stringify(all.map((w) => ({ ...w, effectiveStatus: effectiveStatus(w, now) })), null, 2));
          return;
        }
        if (all.length === 0) {
          console.log(chalk.gray('No waivers recorded.'));
          return;
        }
        console.log(chalk.bold('\n🎫 Waivers\n'));
        for (const w of all) {
          const eff = effectiveStatus(w, now);
          const icon = eff === 'approved' ? chalk.green('✓') : eff === 'expired' ? chalk.yellow('⌛') : eff === 'rejected' ? chalk.red('✗') : chalk.gray('•');
          console.log(`  ${icon} ${w.waiverRef}@v${w.version} [${eff}] fp=${w.fingerprint} exp=${w.expiresAt}`);
        }
        console.log('');
        return;
      }
      default:
        throw new Error(`Unknown waiver action "${action}". Use request | approve | revise | list.`);
    }
  }

  private require<T>(value: T | undefined, flag: string): T {
    if (value === undefined || value === null || value === '') throw new Error(`${flag} is required for this waiver action`);
    return value;
  }

  private latestForRef(store: FileWaiverStore, ref: string): Waiver {
    const versions = store.all().filter((w: Waiver) => w.waiverRef === ref);
    if (versions.length === 0) throw new Error(`No waiver found for ref "${ref}"`);
    return versions.reduce((a: Waiver, b: Waiver) => (b.version > a.version ? b : a));
  }

  private latestRequested(store: FileWaiverStore, ref: string): Waiver {
    const requested = store.all().filter((w: Waiver) => w.waiverRef === ref && w.status === 'requested');
    if (requested.length === 0) throw new Error(`No 'requested' waiver to approve for ref "${ref}"`);
    return requested.reduce((a: Waiver, b: Waiver) => (b.version > a.version ? b : a));
  }

  private emit(w: Waiver, human: string, options?: WaiverOptions): void {
    if (options?.json) console.log(JSON.stringify(w, null, 2));
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
  @Option({ flags: '--json', description: 'Output as JSON' })
  parseJson(): boolean { return true; }
}
