import { CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PromptService } from '../prompts/prompt.service';
import { ConfigService, ProfileConfig } from '../config/config.service';
import { UserCancelledError } from '@beyondnet/evolith-core-domain/domain/errors';
import { createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain/domain/gate-evidence';

export abstract class BaseEvolithCommand extends CommandRunner {
  protected readonly logger: Logger;
  protected readonly promptService: PromptService;
  protected readonly configService: ConfigService;

  constructor(
    commandName: string,
    promptService?: PromptService,
    configService?: ConfigService,
  ) {
    super();
    this.logger = new Logger(commandName);
    this.promptService = promptService || new PromptService();
    this.configService = configService || new ConfigService();
  }

  get profile(): ProfileConfig {
    return this.configService.getProfile();
  }

  async run(inputs: string[], options?: Record<string, unknown>): Promise<void> {
    try {
      await this.executeCommand(inputs, options);
    } catch (error: unknown) {
      if (error instanceof UserCancelledError) {
        this.logger.debug('Operation cancelled by user.');
        return;
      }
      this.handleError(error, options);
    }
  }

  abstract executeCommand(inputs: string[], options?: Record<string, unknown>): Promise<void>;

  protected handleError(error: unknown, options?: Record<string, unknown>): never {
    const message = error instanceof Error ? error.message : String(error);
    const isJsonFormat = (options?.format as string | undefined) === 'json';

    this.logger.error(`Command execution failed: ${message}`, error instanceof Error ? error.stack : undefined);

    if (isJsonFormat) {
      const meta = {
        command: this.constructor.name,
        executedAt: new Date().toISOString(),
        durationMs: 0,
        correlationId: randomUUID(),
        schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
      };
      console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, meta), null, 2));
      // In JSON mode, emit envelope and set exit code; don't re-throw
      process.exitCode = 1;
      return undefined as never;
    } else {
      this.promptService.stopSpinner('Command failed.');
      this.promptService.showError(`Error: ${message}`);
      this.promptService.showOutro('Failed');

      // nest-commander swallows errors thrown from a CommandRunner and still exits
      // 0, so a re-throw alone leaves CI blind. Set a non-zero exit code so the
      // failure is observable for human mode.
      process.exitCode = 1;
      throw error instanceof Error ? error : new Error(message);
    }
  }
}
