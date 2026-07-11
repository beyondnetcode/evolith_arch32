import { Command } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { RecommendCommand } from './recommend.command';
import { PhaseArtifactsCommand } from './phase-artifacts.command';
import {
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';

/**
 * `evolith topology` — advisory architecture-topology tooling (GT-431 / ADR-0104).
 *
 * Parent group for the topology subcommands: `recommend` (BR-008 parity with
 * `POST /api/v1/architecture/recommend-topology` and `evolith-topology-recommend`)
 * and `phase-artifacts` (parity with `POST /api/v1/architecture/evaluate-phase-artifacts`
 * and `evolith-phase-artifacts-evaluate`).
 *
 * This grouping command deliberately does NOT declare a `--format` @Option: a
 * commander option on the parent shadows the identically-named option on its
 * subcommands, so `topology recommend --format json` would bind `--format` to
 * the parent and the subcommand's parser would never fire (breaking ADR-0073
 * envelope parity). The bare `topology` listing reads `--format json` straight
 * from the pass-through args instead, leaving the flag free for subcommands.
 */
@Command({
  name: 'topology',
  description: 'Advisory architecture-topology tooling (recommend a composition; measure downstream phase-artifact completeness)',
  subCommands: [RecommendCommand, PhaseArtifactsCommand],
  allowUnknownOptions: true,
})
export class TopologyCommand extends BaseEvolithCommand {
  constructor() {
    super('TopologyCommand');
  }

  async executeCommand(
    passedParam: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    const json = this.wantsJson(passedParam);
    const startedAt = Date.now();
    const meta = {
      command: 'evolith topology',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    const result = {
      subcommands: [
        { name: 'recommend', description: 'Recommend a topology composition from technical signals (advisory)' },
      ],
    };

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      return;
    }

    this.promptService.showIntro('Evolith Topology CLI');
    this.promptService.showInfo(chalk.bold('Available subcommands:'));
    this.promptService.showInfo(
      `  ${chalk.cyan('recommend')} - Recommend a topology composition from technical signals (advisory)`,
    );
    this.promptService.showOutro(chalk.gray('Run `evolith topology recommend --help` for more information.'));
  }

  /**
   * Detect `--format json` for the bare `topology` listing from the pass-through
   * args. The flag is intentionally not a commander @Option (see class note),
   * so it arrives here among the unparsed arguments instead of in `options`.
   */
  private wantsJson(args: string[]): boolean {
    const i = args.findIndex((a) => a === '--format' || a === '-f');
    if (i >= 0 && args[i + 1] === 'json') return true;
    return args.includes('--format=json') || args.includes('-f=json');
  }
}
