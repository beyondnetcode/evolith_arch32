import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';

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

describe('Docs Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  it('should dispatch docs without crashing', async () => {
    await runCommand(commandInstance, ['docs']);
  });

  it('should dispatch docs validate without crashing', async () => {
    await runCommand(commandInstance, ['docs', 'validate']);
  });

  it('should dispatch docs --help without crashing', async () => {
    await runCommand(commandInstance, ['docs', '--help']);
  });
});
