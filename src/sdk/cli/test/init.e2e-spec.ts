import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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

describe('Init Command (e2e)', () => {
  let commandInstance: TestingModule;
  let workdir: string;
  let originalCwd: string;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).overrideProvider(PromptService).useClass(MockPromptService).compile();
  });

  // `init --name test-project` scaffolds into the CURRENT directory. Without
  // this, every run of this suite wrote a `test-project/` into the repository
  // root — which is exactly how the committed one got there, and why it kept
  // coming back after being deleted (ADR-0118). A scaffolding test must
  // scaffold somewhere disposable.
  beforeEach(() => {
    originalCwd = process.cwd();
    workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-init-e2e-'));
    process.chdir(workdir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(workdir, { recursive: true, force: true });
  });

  it('should dispatch init --dry-run without crashing', async () => {
    await runCommand(commandInstance, ['init', '--dry-run']);
  });

  it('should dispatch init --name without crashing', async () => {
    await runCommand(commandInstance, ['init', '--name', 'test-project']);
  });

  it('should dispatch init --help without crashing', async () => {
    await runCommand(commandInstance, ['init', '--help']);
  });
});
