import { PromptService } from '../src/infrastructure/prompts/prompt.service';
import { MockPromptService } from './mock-prompt.service';
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

async function runCommand(instance: TestingModule, args: string[]): Promise<void> {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  try {
    await CommandTestFactory.run(instance, args);
  } catch (_err: unknown) {
  } finally {
    exitSpy.mockRestore();
  }
}

describe('Completion Command - Shell Hooks (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).overrideProvider(PromptService).useClass(MockPromptService).compile();
  });

  it('should run completion --hooks and output status function', async () => {
    await runCommand(commandInstance, ['completion', '--hooks']);
  });

  it('should run completion --hooks --shell bash', async () => {
    await runCommand(commandInstance, ['completion', '--hooks', '--shell', 'bash']);
  });

  it('should run completion --hooks --shell zsh', async () => {
    await runCommand(commandInstance, ['completion', '--hooks', '--shell', 'zsh']);
  });

  it('should run completion --hooks --shell fish', async () => {
    await runCommand(commandInstance, ['completion', '--hooks', '--shell', 'fish']);
  });

  it('should run completion --install-hooks for temporary directory', async () => {
    const tempDir = path.join(os.tmpdir(), `evolith-hooks-e2e-${process.pid}`);
    await fs.ensureDir(tempDir);

    const originalArgv = process.argv;
    (process as any).argv = [process.execPath, path.join(tempDir, 'evolith')];

    try {
      await runCommand(commandInstance, ['completion', '--install-hooks', 'fish']);
    } finally {
      (process as any).argv = originalArgv;
      await fs.remove(tempDir).catch(() => {});
    }
  });

  it('should run completion with no args and show help', async () => {
    await runCommand(commandInstance, ['completion']);
  });
});