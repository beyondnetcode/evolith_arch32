import { Command } from 'nest-commander';
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

// This grouping command deliberately does NOT declare a `--format` @Option.
// A commander option on the parent shadows the identically-named option on its
// subcommands: with `-f, --format` here, `sdlc gate-status --format json` binds
// `--format` to the parent and the subcommand's parser never fires, so the
// subcommand silently falls back to human output (breaking ADR-0073 envelope
// parity). Instead we read `--format json` for the bare `sdlc` listing straight
// from the pass-through args, leaving the flag free for the subcommands.
@Command({
  name: 'sdlc',
  description: 'Orchestrates the generation of artifacts and transitions (Handoffs) between the lifecycle phases (Discovery, Design, Construction)',
  subCommands: [HandoffCommand, GenerateDomainCommand, GateStatusCommand],
  allowUnknownOptions: true,
})
export class SdlcCommand extends BaseEvolithCommand {
  constructor() {
    super('SdlcCommand');
  }

  async executeCommand(
    passedParam: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    const json = this.wantsJson(passedParam);
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

  /**
   * Detect `--format json` for the bare `sdlc` listing from the pass-through
   * args. The flag is intentionally not a commander @Option (see class note),
   * so it arrives here among the unparsed arguments instead of in `options`.
   */
  private wantsJson(args: string[]): boolean {
    const i = args.findIndex((a) => a === '--format' || a === '-f');
    if (i >= 0 && args[i + 1] === 'json') return true;
    return args.includes('--format=json') || args.includes('-f=json');
  }
}
