import { CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PromptService } from '../prompts/prompt.service';
import { ConfigService, ProfileConfig } from '../config/config.service';
import { UserCancelledError } from '@beyondnet/evolith-core-domain/domain/errors';
import { createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION, type ErrorCode } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { CLI_EXIT_CODES, carriesCliExitCode, resolveExitCode, setExitCode } from './exit-codes';

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

  /**
   * GT-580 — the ONE place a thrown error becomes an exit code.
   *
   * Every command's failure path funnels through here, so the taxonomy is
   * applied once instead of being re-decided (and re-collapsed onto `1`) by
   * each new command. A command that wants a code other than "tool failure"
   * throws a carrier error — `CliUsageError` (3), `NonInteractiveError` (3),
   * `CliBlockedError` (2) — rather than calling `process.exit` itself.
   */
  protected handleError(error: unknown, options?: Record<string, unknown>): never {
    const message = error instanceof Error ? error.message : String(error);
    const isJsonFormat = (options?.format as string | undefined) === 'json';
    const exitCode = resolveExitCode(error);

    this.logger.error(`Command execution failed: ${message}`, error instanceof Error ? error.stack : undefined);

    if (isJsonFormat) {
      const meta = {
        command: this.constructor.name,
        executedAt: new Date().toISOString(),
        durationMs: 0,
        correlationId: randomUUID(),
        schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
      };
      // Classify a missing ruleset corpus consistently across every command
      // (and with MCP/REST) instead of collapsing it to INTERNAL_ERROR. Matched
      // by name to avoid importing the infra error type into this base class.
      const code = carriesCliExitCode(error) && error.envelopeErrorCode
        ? error.envelopeErrorCode
        : error instanceof Error && error.name === 'RulesetsNotFoundError'
          ? 'RULESET_NOT_FOUND'
          : 'INTERNAL_ERROR';
      console.log(JSON.stringify(createErrorEnvelope(code as ErrorCode, message, meta), null, 2));
      // In JSON mode, emit envelope and set exit code; don't re-throw
      setExitCode(exitCode);
      return undefined as never;
    } else {
      this.promptService.stopSpinner('Command failed.');
      this.promptService.showError(`Error: ${message}`);
      this.promptService.showOutro('Failed');

      // nest-commander swallows errors thrown from a CommandRunner and still exits
      // 0, so a re-throw alone leaves CI blind. Set a non-zero exit code so the
      // failure is observable for human mode.
      setExitCode(exitCode);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  /** Re-exported on the base class so commands never hard-code a literal. */
  protected readonly exitCodes = CLI_EXIT_CODES;
}
