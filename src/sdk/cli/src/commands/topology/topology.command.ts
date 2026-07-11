import { Command, Option } from 'nest-commander';
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
 */
@Command({
  name: 'topology',
  description: 'Advisory architecture-topology tooling (recommend a composition; measure downstream phase-artifact completeness)',
  subCommands: [RecommendCommand, PhaseArtifactsCommand],
})
export class TopologyCommand extends BaseEvolithCommand {
  constructor() {
    super('TopologyCommand');
  }

  async executeCommand(
    _passedParam: string[],
    options?: Record<string, unknown>,
  ): Promise<void> {
    const json = (options?.format as string | undefined) === 'json';
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

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
