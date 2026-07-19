import { Command } from 'nest-commander';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PatternsListCommand } from './list.command';
import { PatternsGetCommand } from './get.command';
import { PatternsForTopologyCommand } from './for-topology.command';

/**
 * `evolith patterns` — the canonical architectural pattern catalogue (PAT-NNNN).
 *
 * Parent group over {@link PatternCatalogService}: `list`, `get` and `for-topology`.
 *
 * Pure router, for the same reason as `topology`: declaring a `--format` @Option
 * here would shadow the identically-named option on the subcommands, so
 * `patterns list --format json` would bind `--format` to the parent and the
 * subcommand's parser would never fire, breaking ADR-0073 envelope parity. The
 * bare `patterns` invocation is a discovery listing, not a data operation.
 */
@Command({
  name: 'patterns',
  description: 'Canonical architectural patterns (PAT-NNNN): list, inspect, and resolve per topology',
  subCommands: [PatternsListCommand, PatternsGetCommand, PatternsForTopologyCommand],
})
export class PatternsCommand extends BaseEvolithCommand {
  constructor() {
    super('PatternsCommand');
  }

  async executeCommand(): Promise<void> {
    this.promptService.showIntro('Evolith Patterns CLI');
    this.promptService.showInfo(chalk.bold('Available subcommands:'));
    this.promptService.showInfo(`  ${chalk.cyan('list')}         - List canonical patterns (filters: --category, --kind, --topology, --enforced)`);
    this.promptService.showInfo(`  ${chalk.cyan('get')}          - Show one pattern by id (e.g. PAT-0014)`);
    this.promptService.showInfo(`  ${chalk.cyan('for-topology')} - Patterns applicable to a topology, with guidance and enforcing rules`);
    this.promptService.showOutro(chalk.gray('Run `evolith patterns list --help` for more information.'));
  }
}
