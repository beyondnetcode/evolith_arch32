import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { AgentRuntimeFactory } from '../../infrastructure/agent/agent-runtime.factory';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';

@Command({
  name: 'chat',
  description: 'Conversational interaction with the Evolith Agent Runtime (Evolith CLI Chat)',
})
export class ChatCommand extends BaseEvolithCommand {
  constructor(promptService: PromptService) {
    super('ChatCommand', promptService);
  }

  async executeCommand(passed: string[], options?: any): Promise<void> {
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith chat',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!json) {
      this.promptService.showInfo('Starting Evolith CLI Chat Interface...');
    }

    const message = passed.join(' ');
    if (!message) {
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', 'Message or intent required', { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        this.promptService.showError('Please provide a message or intent to the chat.');
      }
      return;
    }

    try {
      if (!json) {
        this.promptService.showInfo(`Processing intent via Agent Runtime: "${message}"`);
      }
      const result = await AgentRuntimeFactory.executeChat({
        intent: message,
        // Chat is dry_run by default, but user can override if supported.
        dry_run: options?.dryRun,
      });

      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        this.promptService.showSuccess(`Status: ${result.status}`);
        if (result.summary) {
          console.log(`Summary: ${result.summary}`);
        }
        if (result.findings.length > 0) {
          console.log(`Findings: ${result.findings.length}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        this.promptService.showError(`Agent Runtime error: ${message}`);
      }
    }
  }

  @Option({ flags: '--dry-run [boolean]', description: 'Override default dry run behavior' })
  parseDryRun(val: string): boolean {
    return val !== 'false';
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
