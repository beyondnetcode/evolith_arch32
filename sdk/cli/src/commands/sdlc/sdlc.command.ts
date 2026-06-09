import { Command, CommandRunner, Option } from 'nest-commander';
import chalk from 'chalk';
import * as p from '@clack/prompts';

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
    p.intro(chalk.bgCyan.white.bold(' Evolith SDLC CLI '));
    p.log.info(chalk.bold('Available subcommands:'));
    p.log.info(`  ${chalk.cyan('handoff')}     - Transition artifacts between phases`);
    p.log.info(`  ${chalk.cyan('generate')}    - Generate code from models (e.g. domain from DDD)`);
    p.log.info(`  ${chalk.cyan('gate-status')} - Display current SDLC phase gate validation status`);
    p.outro(chalk.gray('Run `evolith sdlc <subcommand> --help` for more information.'));
  }
}
