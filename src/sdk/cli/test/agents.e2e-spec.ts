import { MockPromptService } from './mock-prompt.service';
import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { PromptService } from '../src/infrastructure/prompts/prompt.service';


async function runCommand(instance: TestingModule, args: string[]): Promise<void> {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  try {
    await CommandTestFactory.run(instance, args);
  } finally {
    exitSpy.mockRestore();
  }
}

/**
 * GT-643 — this suite used to run against the repository itself, and
 * `agents install --dry-run` wrote into it: three tracked files under
 * `src/sdk/cli/rulesets/agents/` were modified on every run, and the agent the
 * prompt mock invents (`test-value`, the string it answers to every question)
 * ended up committed as if it were product data.
 *
 * Two things changed. The commands now run in a temporary working directory, so
 * a write-through defect can never edit the repository again; and the dry-run
 * case ASSERTS that nothing was written instead of only asserting that nothing
 * threw. "Did not crash" was an oracle that could not fail — it passed for as
 * long as the defect existed.
 */
describe('Agents Command (e2e)', () => {
  let commandInstance: TestingModule;
  let workDir: string;
  let originalCwd: string;

  // A FRESH command instance and a FRESH directory per test, deliberately.
  // Sharing one instance across runs leaks commander's parsed options between
  // them: with a shared module, `agents install` after `agents install
  // --dry-run` still saw dryRun=true and wrote nothing, which would have read as
  // the fix failing when it was the harness carrying state forward.
  beforeEach(async () => {
    originalCwd = process.cwd();
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-agents-e2e-'));
    process.chdir(workDir);

    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    })
      .overrideProvider(PromptService)
      .useClass(MockPromptService)
      .compile();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('agents install --dry-run writes nothing to disk', async () => {
    await runCommand(commandInstance, ['agents', 'install', '--dry-run']);

    // The whole observable contract of the flag is the ABSENCE of an effect, so
    // the assertion has to be about the disk, not about the reply.
    expect(fs.existsSync(path.join(workDir, 'rulesets', 'agents'))).toBe(false);
    expect(fs.readdirSync(workDir)).toEqual([]);
  });

  it('agents install without --dry-run does write, so the check above can fail', async () => {
    await runCommand(commandInstance, ['agents', 'install']);

    // MockPromptService answers 'test-value' to every prompt, so that is the
    // agent name. Without this case the dry-run assertion would also pass if
    // install had simply stopped working.
    const agentsDir = path.join(workDir, 'rulesets', 'agents');
    expect(fs.existsSync(path.join(agentsDir, 'test-value', 'agent.config.json'))).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'agents-registry.json'))).toBe(true);
  });

  it('should dispatch agents list without crashing', async () => {
    await runCommand(commandInstance, ['agents', 'list']);
  });

  it('should dispatch agents --help without crashing', async () => {
    await runCommand(commandInstance, ['agents', '--help']);
  });
});
