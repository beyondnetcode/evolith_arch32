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

describe('Agents Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    })
      .overrideProvider(PromptService)
      .useClass(MockPromptService)
      .compile();
  });

  it('should dispatch agents install --dry-run without crashing', async () => {
    await runCommand(commandInstance, ['agents', 'install', '--dry-run']);
  });

  it('should dispatch agents list without crashing', async () => {
    await runCommand(commandInstance, ['agents', 'list']);
  });

  it('should dispatch agents --help without crashing', async () => {
    await runCommand(commandInstance, ['agents', '--help']);
  });
});
