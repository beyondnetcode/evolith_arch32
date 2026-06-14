import { PromptService } from '../src/infrastructure/prompts/prompt.service';
import { MockPromptService } from './mock-prompt.service';
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';

async function runCommand(instance: TestingModule, args: string[]): Promise<void> {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  try {
    await CommandTestFactory.run(instance, args);
  }  finally {
    exitSpy.mockRestore();
  }
}

describe('MCP Serve Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).overrideProvider(PromptService).useClass(MockPromptService).compile();
  });

  it('should dispatch mcp stop without crashing', async () => {
    await runCommand(commandInstance, ['mcp', 'stop']);
  });

  it('should dispatch mcp start without crashing', async () => {
    await runCommand(commandInstance, ['mcp', 'start']);
  });

  it('should dispatch mcp --help without crashing', async () => {
    await runCommand(commandInstance, ['mcp', '--help']);
  });
});
