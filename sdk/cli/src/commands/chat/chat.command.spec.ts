import { ChatCommand } from './chat.command';
import { AgentRuntimeFactory } from '../../infrastructure/agent/agent-runtime.factory';
import type { PromptService } from '../../infrastructure/prompts/prompt.service';

function makePrompt(): PromptService {
  return {
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
  } as unknown as PromptService;
}

describe('ChatCommand', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates chat input through AgentRuntimeFactory.executeChat', async () => {
    const prompt = makePrompt();
    const executeChat = jest.spyOn(AgentRuntimeFactory, 'executeChat').mockResolvedValue({
      status: 'passed',
      summary: 'ok',
      findings: [],
      recommendations: [],
      missingArtifacts: [],
      trace: { executedBy: 'agent_runtime' },
      evaluatedAt: '2026-07-02T00:00:00.000Z',
    });

    await new ChatCommand(prompt).executeCommand(['validate', 'gate'], { dryRun: false });

    expect(executeChat).toHaveBeenCalledWith({ intent: 'validate gate', dry_run: false });
    expect(prompt.showSuccess).toHaveBeenCalledWith('Status: passed');
  });

  it('rejects empty chat input before reaching the runtime', async () => {
    const prompt = makePrompt();
    const executeChat = jest.spyOn(AgentRuntimeFactory, 'executeChat');

    await new ChatCommand(prompt).executeCommand([]);

    expect(executeChat).not.toHaveBeenCalled();
    expect(prompt.showError).toHaveBeenCalledWith('Please provide a message or intent to the chat.');
  });
});
