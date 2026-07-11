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
 *
 * Pure router: it deliberately does NOT declare a `--format` @Option — a
 * commander option on the parent shadows the identically-named option on its
 * subcommands, so `topology recommend --format json` would bind `--format` to
 * the parent and the subcommand's parser would never fire (breaking ADR-0073
 * envelope parity). The bare `topology` invocation is a discovery affordance (a
 * listing), not a data operation, so it renders human-only; machine-readable
 * output lives on the leaf subcommands where the cross-surface contract needs it.
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

  async executeCommand(): Promise<void> {
    this.promptService.showIntro('Evolith Topology CLI');
    this.promptService.showInfo(chalk.bold('Available subcommands:'));
    this.promptService.showInfo(
      `  ${chalk.cyan('recommend')} - Recommend a topology composition from technical signals (advisory)`,
    );
    this.promptService.showOutro(chalk.gray('Run `evolith topology recommend --help` for more information.'));
  }
}
