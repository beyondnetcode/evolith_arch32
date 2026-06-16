import { Test, TestingModule } from '@nestjs/testing';
import { ApiCommand } from '../src/commands/api/api.command';
import { PromptService } from '../src/infrastructure/prompts/prompt.service';

describe('ApiCommand (E2E)', () => {
  let command: ApiCommand;
  let promptService: PromptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiCommand,
        {
          provide: PromptService,
          useValue: {
            showIntro: jest.fn(),
            showInfo: jest.fn(),
            showError: jest.fn(),
            showSuccess: jest.fn(),
            showWarning: jest.fn(),
          },
        },
      ],
    }).compile();

    command = module.get<ApiCommand>(ApiCommand);
    promptService = module.get<PromptService>(PromptService);
  });

  it('should list available categories', async () => {
    await command.executeCommand([], { list: true });
    expect(promptService.showIntro).toHaveBeenCalledWith('Evolith API Surface');
  });

  it('should filter by category', async () => {
    await command.executeCommand([], { list: true, category: 'tools' });
    expect(promptService.showIntro).toHaveBeenCalled();
  });

  it('should inspect known tool', async () => {
    await command.executeCommand([], { inspect: 'gate-evaluate' });
    expect(promptService.showIntro).toHaveBeenCalledWith('Inspecting: gate-evaluate');
  });

  it('should inspect known resource', async () => {
    await command.executeCommand([], { inspect: 'evolith://rulesets' });
    expect(promptService.showIntro).toHaveBeenCalled();
  });

  it('should inspect known command', async () => {
    await command.executeCommand([], { inspect: 'init' });
    expect(promptService.showIntro).toHaveBeenCalled();
  });

  it('should handle unknown operation', async () => {
    await command.executeCommand([], { inspect: 'non-existent' });
    expect(promptService.showError).toHaveBeenCalled();
  });

  it('should show help when no options provided', async () => {
    await command.executeCommand([], {});
    expect(promptService.showIntro).toHaveBeenCalledWith('Evolith API Browser');
  });
});