import { CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { PromptService } from '../prompts/prompt.service';
import { UserCancelledError } from '../../domain/errors';

export abstract class BaseEvolithCommand extends CommandRunner {
  protected readonly logger: Logger;
  protected readonly promptService: PromptService;

  constructor(commandName: string, promptService?: PromptService) {
    super();
    this.logger = new Logger(commandName);
    this.promptService = promptService || new PromptService();
  }

  async run(inputs: string[], options?: Record<string, any>): Promise<void> {
    try {
      await this.executeCommand(inputs, options);
    } catch (error: unknown) {
      if (error instanceof UserCancelledError) {
        this.logger.debug('Operation cancelled by user.');
        return;
      }
      this.handleError(error);
    }
  }

  abstract executeCommand(inputs: string[], options?: Record<string, any>): Promise<void>;

  protected handleError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);

    this.logger.error(`Command execution failed: ${message}`, error instanceof Error ? error.stack : undefined);

    this.promptService.stopSpinner('Command failed.');
    this.promptService.showError(`Error: ${message}`);
    this.promptService.showOutro('Failed');
    throw error instanceof Error ? error : new Error(message);
  }
}
