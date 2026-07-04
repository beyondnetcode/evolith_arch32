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

describe('Fixtures Command (e2e)', () => {
  let commandInstance: TestingModule;
  let fixtureDir: string;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).overrideProvider(PromptService).useClass(MockPromptService).compile();

    fixtureDir = path.join(os.tmpdir(), `evolith-fixtures-e2e-${process.pid}`);
  });

  afterAll(async () => {
    await fs.remove(fixtureDir).catch(() => {});
  });

  beforeEach(async () => {
    await fs.emptyDir(fixtureDir);
  });

  it('should seed evolith fixtures', async () => {
    await runCommand(commandInstance, ['fixtures', 'evolith', '--dir', fixtureDir]);
    const yamlPath = path.join(fixtureDir, 'evolith.yaml');
    expect(await fs.pathExists(yamlPath)).toBe(true);
  });

  it('should seed ADR fixtures', async () => {
    await runCommand(commandInstance, ['fixtures', 'adr', '--dir', fixtureDir]);
    const adrDir = path.join(fixtureDir, 'docs', 'adr');
    expect(await fs.pathExists(adrDir)).toBe(true);
    const adrFiles = await fs.readdir(adrDir);
    expect(adrFiles.length).toBeGreaterThanOrEqual(3);
  });

  it('should seed demo fixtures (evolith + adr)', async () => {
    await runCommand(commandInstance, ['fixtures', 'demo', '--dir', fixtureDir]);
    expect(await fs.pathExists(path.join(fixtureDir, 'evolith.yaml'))).toBe(true);
    expect(await fs.pathExists(path.join(fixtureDir, 'docs', 'adr', '0001-record-architecture-decisions.md'))).toBe(true);
  });

  it('should seed full fixtures (evolith + adr + ruleset)', async () => {
    await runCommand(commandInstance, ['fixtures', 'full', '--dir', fixtureDir]);
    expect(await fs.pathExists(path.join(fixtureDir, 'evolith.yaml'))).toBe(true);
    expect(await fs.pathExists(path.join(fixtureDir, 'docs', 'adr', '0001-record-architecture-decisions.md'))).toBe(true);
    expect(await fs.pathExists(path.join(fixtureDir, 'rulesets', 'architecture.yaml'))).toBe(true);
  });

  it('should not write files in dry-run mode', async () => {
    await runCommand(commandInstance, ['fixtures', 'full', '--dir', fixtureDir, '--dry-run']);
    const files = await fs.readdir(fixtureDir);
    expect(files).toHaveLength(0);
  });

  it('should handle invalid type gracefully', async () => {
    await runCommand(commandInstance, ['fixtures', 'invalid', '--dir', fixtureDir]);
    const files = await fs.readdir(fixtureDir);
    expect(files).toHaveLength(0);
  });
});
