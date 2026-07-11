import { Command } from 'nest-commander';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

import { HandoffCommand } from './handoff.command';
import { GenerateDomainCommand } from './generate-domain.command';
import { GateStatusCommand } from './gate-status.command';

// Pure router: `sdlc` only groups its subcommands. It deliberately does NOT
// declare a `--format` @Option — a commander option on the parent shadows the
// identically-named option on its subcommands, so `sdlc gate-status --format
// json` would bind `--format` to the parent and the subcommand's parser would
// never fire, silently falling back to human output (breaking ADR-0073 envelope
// parity). The bare `sdlc` invocation is a discovery affordance (a listing),
// not a data operation, so it renders human-only; machine-readable output lives
// on the leaf subcommands where the cross-surface contract needs it.
@Command({
  name: 'sdlc',
  description: 'Orchestrates the generation of artifacts and transitions (Handoffs) between the lifecycle phases (Discovery, Design, Construction)',
  subCommands: [HandoffCommand, GenerateDomainCommand, GateStatusCommand],
})
export class SdlcCommand extends BaseEvolithCommand {
  constructor() {
    super('SdlcCommand');
  }

  async executeCommand(): Promise<void> {
    this.promptService.showIntro('Evolith SDLC CLI');
    this.promptService.showInfo(chalk.bold('Available subcommands:'));
    this.promptService.showInfo(`  ${chalk.cyan('handoff')}     - Transition artifacts between phases`);
    this.promptService.showInfo(`  ${chalk.cyan('generate')}    - ${chalk.yellow('[alpha]')} Generate code from models (e.g. domain from DDD)`);
    this.promptService.showInfo(`  ${chalk.cyan('gate-status')} - Display current SDLC phase gate validation status`);
    this.promptService.showOutro(chalk.gray('Run `evolith sdlc <subcommand> --help` for more information.'));
  }
}
