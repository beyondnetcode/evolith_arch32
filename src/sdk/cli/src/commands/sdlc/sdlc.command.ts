import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import {
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';

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
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith sdlc',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    const result = {
      subCommands: [
        {
          name: 'handoff',
          description: 'Transition artifacts between phases',
        },
        {
          name: 'generate',
          description: 'Generate code from models (e.g. domain from DDD)',
          status: 'alpha',
        },
        {
          name: 'gate-status',
          description: 'Display current SDLC phase gate validation status',
        },
      ],
    };

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
    } else {
      this.promptService.showIntro('Evolith SDLC CLI');
      this.promptService.showInfo(chalk.bold('Available subcommands:'));
      this.promptService.showInfo(`  ${chalk.cyan('handoff')}     - Transition artifacts between phases`);
      this.promptService.showInfo(`  ${chalk.cyan('generate')}    - ${chalk.yellow('[alpha]')} Generate code from models (e.g. domain from DDD)`);
      this.promptService.showInfo(`  ${chalk.cyan('gate-status')} - Display current SDLC phase gate validation status`);
      this.promptService.showOutro(chalk.gray('Run `evolith sdlc <subcommand> --help` for more information.'));
    }
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
