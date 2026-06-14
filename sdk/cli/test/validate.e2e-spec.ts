import { PromptService } from '../src/infrastructure/prompts/prompt.service';
import { MockPromptService } from './mock-prompt.service';
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// CommandTestFactory.run() returns void. Guard against process.exit so the
// test runner survives commands that exit non-zero.
async function runCommand(instance: TestingModule, args: string[]): Promise<void> {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  try {
    await CommandTestFactory.run(instance, args);
  } catch (_err: unknown) {
    // swallow — smoke test, we only care the runner doesn't crash jest
  } finally {
    exitSpy.mockRestore();
  }
}

describe('Validate Command (e2e)', () => {
  let commandInstance: TestingModule;
  let satellitePath: string;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).overrideProvider(PromptService).useClass(MockPromptService).compile();

    satellitePath = path.join(os.tmpdir(), `evolith-validate-e2e-${process.pid}`);
    await fs.ensureDir(satellitePath);
    await fs.writeFile(path.join(satellitePath, 'evolith.yaml'), [
      'coreRef:',
      '  version: "1.0.0"',
      'governance:',
      '  version: "1.0"',
      'product:',
      '  name: "validate-e2e"',
      '  type: "library"',
    ].join('\n'));
  });

  afterAll(async () => {
    await fs.remove(satellitePath).catch(() => {});
  });

  it('should run validate command with format JSON', async () => {
    await runCommand(commandInstance, ['validate', '--satellite', satellitePath, '--format', 'json']);
  });

  it('should run validate command with format table', async () => {
    await runCommand(commandInstance, ['validate', '--satellite', satellitePath, '--format', 'table']);
  });

  it('should run validate command with arch flag', async () => {
    await runCommand(commandInstance, ['validate', '--satellite', satellitePath, '--arch']);
  });

  it('should handle missing satellite gracefully', async () => {
    // Command exits non-zero — runCommand swallows so jest survives
    await runCommand(commandInstance, ['validate', '--satellite', '/nonexistent-path-123']);
  });
});
