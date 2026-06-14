import { MockPromptService } from './mock-prompt.service';
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';
import { PromptService } from '../src/infrastructure/prompts/prompt.service';


async function runCommand(instance: TestingModule, args: string[]): Promise<void> {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  try {
    await CommandTestFactory.run(instance, args);
  } finally {
    exitSpy.mockRestore();
  }
}

describe('ADR Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    })
      .overrideProvider(PromptService)
      .useClass(MockPromptService)
      .compile();
  });

  it('should dispatch adr --create --dry-run without crashing', async () => {
    await runCommand(commandInstance, ['adr', '--create', 'test-title', '--dry-run']);
  });

  it('should dispatch adr --update --dry-run without crashing', async () => {
    await runCommand(commandInstance, ['adr', '--update', 'ADR-0001', '--status', 'Accepted', '--dry-run']);
  });

  it('should dispatch adr interactive mode --dry-run without crashing', async () => {
    // Since we mock the select and text, it should be able to run the interactive mode.
    // By default, if we don't pass --create or --update, it goes interactive.
    await runCommand(commandInstance, ['adr', '--dry-run']);
  });

  it('should dispatch adr --help without crashing', async () => {
    await runCommand(commandInstance, ['adr', '--help']);
  });
});
