// src/commands/alias/alias.command.ts
import { Command, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AliasService } from '../../config/alias.service';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { exitCodeForErrorCode } from '../../infrastructure/cli/exit-codes';

interface AliasCommandOptions {
  add?: string;
  remove?: string;
  list?: boolean;
  format?: string;
}

@Command({ name: 'alias', description: 'Manage CLI command aliases' })
@Injectable()
export class AliasCommand extends BaseEvolithCommand {
  constructor(private readonly aliasService: AliasService) {
    super('AliasCommand');
  }

  async executeCommand(_: string[], options?: AliasCommandOptions): Promise<void> {
    const json = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith alias',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
      startedAt,
    };

    try {
      if (options?.add) {
        const [alias, cmd] = options.add.split('=');
        if (!alias || !cmd) {
          const message = 'Usage: evolith alias --add <alias>=<command>';
          if (json) {
            process.exitCode = exitCodeForErrorCode('VALIDATION_FAILED');
            console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
          } else {
            this.promptService.showError(message);
          }
          return;
        }
        try {
          this.aliasService.add(alias.trim(), cmd.trim());
          if (json) {
            console.log(JSON.stringify(createSuccessEnvelope({ alias: alias.trim(), command: cmd.trim() }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
          } else {
            this.promptService.showSuccess(`Alias \"${alias}\" → \"${cmd}\" added.`);
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (json) {
            process.exitCode = 1;
            console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
          } else {
            this.promptService.showError(message);
          }
        }
      } else if (options?.remove) {
        try {
          this.aliasService.remove(options.remove);
          if (json) {
            console.log(JSON.stringify(createSuccessEnvelope({ alias: options.remove }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
          } else {
            this.promptService.showSuccess(`Alias \"${options.remove}\" removed.`);
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (json) {
            process.exitCode = 1;
            console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
          } else {
            this.promptService.showError(message);
          }
        }
      } else if (options?.list) {
        const all = this.aliasService.getAll();
        if (json) {
          console.log(JSON.stringify(createSuccessEnvelope({ aliases: all }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          if (Object.keys(all).length === 0) {
            this.promptService.showInfo('No aliases defined.');
            return;
          }
          this.promptService.showInfo('Defined aliases:');
          for (const [a, c] of Object.entries(all)) {
            this.promptService.showInfo(`  \"${a}\" → \"${c}\"`);
          }
        }
      } else {
        if (json) {
          process.exitCode = exitCodeForErrorCode('VALIDATION_FAILED');
          console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', 'Use --add, --remove, or --list', { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showInfo('Use --add, --remove, or --list.');
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  @Option({ flags: '--add <alias=command>', description: 'Add a new alias (format: alias=command)' })
  parseAdd(val: string): string {
    return val;
  }

  @Option({ flags: '--remove <alias>', description: 'Remove an existing alias' })
  parseRemove(val: string): string {
    return val;
  }

  @Option({ flags: '--list', description: 'List all aliases' })
  parseList(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --format [string]',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
