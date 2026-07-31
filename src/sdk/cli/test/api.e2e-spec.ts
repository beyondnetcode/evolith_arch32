import { Test, TestingModule } from '@nestjs/testing';
import { ApiCommand } from '../src/commands/api/api.command';
import { PromptService } from '../src/infrastructure/prompts/prompt.service';
import { ConfigService } from '../src/infrastructure/config/config.service';

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
        {
          provide: ConfigService,
          useValue: {
            getProfile: jest.fn().mockReturnValue({}),
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

  // GT-583 — the tool is named `evolith-gate-evaluate`. This case used to pass
  // `gate-evaluate`, which was a key of the hand-written catalog and of nothing
  // else: the CLI answered from a map whose three keys named no MCP tool, so the
  // test proved the map agreed with itself and never that it agreed with the
  // server. The catalog is now generated from the capability manifest.
  it('should inspect known tool', async () => {
    await command.executeCommand([], { inspect: 'evolith-gate-evaluate' });
    expect(promptService.showIntro).toHaveBeenCalledWith('Inspecting: evolith-gate-evaluate');
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