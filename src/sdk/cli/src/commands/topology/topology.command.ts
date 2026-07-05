import { Command } from 'nest-commander';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { RecommendCommand } from './recommend.command';
import { PhaseArtifactsCommand } from './phase-artifacts.command';

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
    _options?: Record<string, unknown>,
  ): Promise<void> {
    this.promptService.showIntro('Evolith Topology CLI');
    this.promptService.showInfo(chalk.bold('Available subcommands:'));
    this.promptService.showInfo(
      `  ${chalk.cyan('recommend')} - Recommend a topology composition from technical signals (advisory)`,
    );
    this.promptService.showOutro(chalk.gray('Run `evolith topology recommend --help` for more information.'));
  }
}
