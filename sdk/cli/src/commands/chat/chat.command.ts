import { Command, Option } from 'nest-commander';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { AgentRuntimeFactory } from '../../infrastructure/agent/agent-runtime.factory';

@Command({
  name: 'chat',
  description: 'Conversational interaction with the Evolith Agent Runtime (Smart CLI Chat)',
})
export class ChatCommand extends BaseEvolithCommand {
  constructor(promptService: PromptService) {
    super('ChatCommand', promptService);
  }

  async executeCommand(passed: string[], options?: any): Promise<void> {
    this.promptService.showInfo('Starting Smart CLI Chat Interface...');
    
    const message = passed.join(' ');
    if (!message) {
      this.promptService.showError('Please provide a message or intent to the chat.');
      return;
    }

    const adapter = AgentRuntimeFactory.createChatAdapter();
    const runtime = AgentRuntimeFactory.createDefaultRuntime();

    // Map through the new InteractionAdapterPort
    const request = adapter.toRuntimeRequest({
      intent: message,
      // Chat is dry_run by default, but user can override if supported
      dry_run: options?.dryRun,
    });

    try {
      this.promptService.showInfo(`Processing intent via Agent Runtime: "${request.intent}"`);
      const result = await runtime.handle(request);
      
      this.promptService.showSuccess(`Status: ${result.status}`);
      if (result.summary) {
        console.log(`Summary: ${result.summary}`);
      }
      if (result.findings.length > 0) {
        console.log(`Findings: ${result.findings.length}`);
      }
    } catch (err) {
      this.promptService.showError(`Agent Runtime error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  @Option({ flags: '--dry-run [boolean]', description: 'Override default dry run behavior' })
  parseDryRun(val: string): boolean {
    return val !== 'false';
  }
}
