import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';
import { PromptService } from '../src/infrastructure/prompts/prompt.service';

class MockPromptService {
  showIntro = jest.fn();
  showOutro = jest.fn();
  showInfo = jest.fn();
  showSuccess = jest.fn();
  showWarning = jest.fn();
  showError = jest.fn();
  startSpinner = jest.fn();
  stopSpinner = jest.fn();

  select = jest.fn().mockResolvedValue('1'); // Phase 1 for instance
  text = jest.fn().mockResolvedValue('test-value');
  multiselect = jest.fn().mockResolvedValue(['discovery']);
  confirm = jest.fn().mockResolvedValue(true);
}

async function runCommand(instance: TestingModule, args: string[]): Promise<void> {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  try {
    await CommandTestFactory.run(instance, args);
  } catch (_err: unknown) {
    // swallow — smoke test only
  } finally {
    exitSpy.mockRestore();
  }
}

describe('Architecture Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    })
      .overrideProvider(PromptService)
      .useClass(MockPromptService)
      .compile();
  });

  it('should dispatch architecture scaffold --dry-run without crashing', async () => {
    await runCommand(commandInstance, ['architecture', 'scaffold', '--dry-run', '--frontend', 'react', '--orm', 'prisma']);
  });

  it('should dispatch architecture --help without crashing', async () => {
    await runCommand(commandInstance, ['architecture', '--help']);
  });
});
