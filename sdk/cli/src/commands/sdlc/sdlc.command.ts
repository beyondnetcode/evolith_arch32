import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

import { HandoffCommand } from './handoff.command';
import { GenerateDomainCommand } from './generate-domain.command';
import { GateStatusCommand } from './gate-status.command';

@Command({
  name: 'sdlc',
  description: 'Orchestrates the generation of artifacts and transitions (Handoffs) between the lifecycle phases (Discovery, Design, Construction)',
  subCommands: [HandoffCommand, GenerateDomainCommand, GateStatusCommand],
})
export class SdlcCommand extends BaseEvolithCommand {
  constructor() {
    super('SdlcCommand');
  }

  async executeCommand(
    passedParam: string[],
    options?: Record<string, unknown>,
  ): Promise<void> {
    this.promptService.showIntro('Evolith SDLC CLI');
    this.promptService.showInfo(chalk.bold('Available subcommands:'));
    this.promptService.showInfo(`  ${chalk.cyan('handoff')}     - Transition artifacts between phases`);
    this.promptService.showInfo(`  ${chalk.cyan('generate')}    - ${chalk.yellow('[alpha]')} Generate code from models (e.g. domain from DDD)`);
    this.promptService.showInfo(`  ${chalk.cyan('gate-status')} - Display current SDLC phase gate validation status`);
    this.promptService.showOutro(chalk.gray('Run `evolith sdlc <subcommand> --help` for more information.'));
  }
}
