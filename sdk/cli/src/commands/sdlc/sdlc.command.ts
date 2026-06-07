import { Command, CommandRunner, Option } from 'nest-commander';
import chalk from 'chalk';

import { HandoffCommand } from './handoff.command';
import { GenerateDomainCommand } from './generate-domain.command';
import { GateStatusCommand } from './gate-status.command';

@Command({
  name: 'sdlc',
  description: 'Orchestrates the generation of artifacts and transitions (Handoffs) between the lifecycle phases (Discovery, Design, Construction)',
  subCommands: [HandoffCommand, GenerateDomainCommand, GateStatusCommand],
})
export class SdlcCommand extends CommandRunner {
  async run(
    passedParam: string[],
    options?: Record<string, any>,
  ): Promise<void> {
    console.log(
      chalk.blueBright('\n🚀 Evolith SDLC CLI 🚀\n')
    );
    console.log(chalk.white('Available subcommands:'));
    console.log(chalk.cyan('  handoff') + ' - Transition artifacts between phases');
    console.log(chalk.cyan('  generate') + ' - Generate code from models (e.g. domain from DDD)');
    console.log(chalk.cyan('  gate-status') + ' - Display current SDLC phase gate validation status');
    console.log(chalk.gray('\nRun `evolith sdlc <subcommand> --help` for more information.\n'));
  }
}
