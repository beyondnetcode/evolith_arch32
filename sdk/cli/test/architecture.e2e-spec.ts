import { MockPromptService } from './mock-prompt.service';
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';
import { PromptService } from '../src/infrastructure/prompts/prompt.service';


async function runCommand(instance: TestingModule, args: string[]): Promise<void> {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  try {
    await CommandTestFactory.run(instance, args);
  }  finally {
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
