import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ChatCommand } from './chat.command';
import { AgentRuntimeFactory } from '../../infrastructure/agent/agent-runtime.factory';
import { CHAT_SESSION_DIR } from './chat-session';
import type { PromptService } from '../../infrastructure/prompts/prompt.service';
import { UserCancelledError } from '@beyondnet/evolith-core-domain/domain/errors';
import { CLI_EXIT_CODES } from '../../infrastructure/cli/exit-codes';

type PromptDouble = PromptService & {
  showInfo: jest.Mock;
  showSuccess: jest.Mock;
  showError: jest.Mock;
  showIntro: jest.Mock;
  showOutro: jest.Mock;
  text: jest.Mock;
  isInteractive: jest.Mock;
};

function makePrompt(interactive = false): PromptDouble {
  return {
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showIntro: jest.fn(),
    showOutro: jest.fn(),
    text: jest.fn(),
    isInteractive: jest.fn().mockReturnValue(interactive),
  } as unknown as PromptDouble;
}

function runtimeResult(summary = 'ok', status = 'passed'): never {
  return {
    status,
    summary,
    findings: [],
    recommendations: [],
    missingArtifacts: [],
    trace: { executedBy: 'agent_runtime' },
    evaluatedAt: '2026-07-02T00:00:00.000Z',
  } as never;
}

/** History as it is handed to the runtime, for readable assertions. */
function historyOf(call: unknown): Array<{ role: string; content: string }> {
  return (call as { parameters: { history: Array<{ role: string; content: string }> } }).parameters.history;
}

describe('ChatCommand', () => {
  let workdir: string;
  let cwdSpy: jest.SpyInstance;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'evolith-chat-'));
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(workdir);
    process.exitCode = undefined;
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    jest.restoreAllMocks();
    rmSync(workdir, { recursive: true, force: true });
    process.exitCode = undefined;
  });

  it('delegates chat input through AgentRuntimeFactory.executeChat', async () => {
    const prompt = makePrompt();
    const executeChat = jest.spyOn(AgentRuntimeFactory, 'executeChat').mockResolvedValue(runtimeResult());

    await new ChatCommand(prompt).executeCommand(['validate', 'gate'], { dryRun: false });

    expect(executeChat).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'validate gate', dry_run: false }),
    );
    expect(prompt.showSuccess).toHaveBeenCalledWith('Status: passed');
  });

  it('rejects empty chat input before reaching the runtime, with exit 3', async () => {
    const prompt = makePrompt();
    const executeChat = jest.spyOn(AgentRuntimeFactory, 'executeChat');

    await new ChatCommand(prompt).executeCommand([]);

    expect(executeChat).not.toHaveBeenCalled();
    expect(prompt.showError).toHaveBeenCalledWith(expect.stringContaining('Message or intent required'));
    // GT-580: a missing argument is invalid input, not a tool failure.
    expect(process.exitCode).toBe(CLI_EXIT_CODES.INVALID_INPUT);
  });

  /**
   * GT-619 — the command was 91 lines with no loop and no session: it printed,
   * called the runtime once, printed and exited, so "chat" was a one-shot
   * request wearing a conversational name. These are the two properties that
   * make the name true, and each of them fails against the old command.
   */
  describe('GT-619 · REPL and session state', () => {
    it('opens a conversation loop and keeps talking until the user leaves', async () => {
      const prompt = makePrompt(true);
      prompt.text
        .mockResolvedValueOnce('first question')
        .mockResolvedValueOnce('second question')
        .mockResolvedValueOnce('/exit');
      const executeChat = jest
        .spyOn(AgentRuntimeFactory, 'executeChat')
        .mockResolvedValue(runtimeResult());

      await new ChatCommand(prompt).executeCommand([], {});

      // The pre-fix command called the runtime exactly once, ever.
      expect(executeChat).toHaveBeenCalledTimes(2);
      expect(prompt.showOutro).toHaveBeenCalledWith(expect.stringContaining('2 exchange(s)'));
    });

    it('sends turn 2 WITH turn 1, so the conversation has memory', async () => {
      const prompt = makePrompt(true);
      prompt.text
        .mockResolvedValueOnce('what is the gate?')
        .mockResolvedValueOnce('and why did it fail?')
        .mockResolvedValueOnce('/exit');
      const executeChat = jest
        .spyOn(AgentRuntimeFactory, 'executeChat')
        .mockResolvedValue(runtimeResult('the phase-1 gate'));

      await new ChatCommand(prompt).executeCommand([], {});

      expect(historyOf(executeChat.mock.calls[0][0])).toEqual([]);
      expect(historyOf(executeChat.mock.calls[1][0])).toEqual([
        { role: 'user', content: 'what is the gate?' },
        { role: 'agent', content: 'the phase-1 gate' },
      ]);
    });

    it('persists the transcript so --session resumes it in a LATER process', async () => {
      const prompt = makePrompt(true);
      prompt.text.mockResolvedValueOnce('remember this').mockResolvedValueOnce('/exit');
      jest.spyOn(AgentRuntimeFactory, 'executeChat').mockResolvedValue(runtimeResult('noted'));

      await new ChatCommand(prompt).executeCommand([], { session: 'audit-1' });

      const file = join(workdir, CHAT_SESSION_DIR, 'audit-1.json');
      expect(existsSync(file)).toBe(true);
      expect(JSON.parse(readFileSync(file, 'utf8')).turns).toEqual([
        expect.objectContaining({ role: 'user', content: 'remember this' }),
        expect.objectContaining({ role: 'agent', content: 'noted' }),
      ]);

      // A brand-new command instance — the process boundary the old command
      // could never cross — picks the conversation back up.
      const resumed = makePrompt(false);
      const executeChat = jest
        .spyOn(AgentRuntimeFactory, 'executeChat')
        .mockResolvedValue(runtimeResult('still here'));
      await new ChatCommand(resumed).executeCommand(['and now?'], { session: 'audit-1' });

      const lastCall = executeChat.mock.calls[executeChat.mock.calls.length - 1][0];
      expect(historyOf(lastCall)).toEqual([
        { role: 'user', content: 'remember this' },
        { role: 'agent', content: 'noted' },
      ]);
    });

    it('uses the session id as the correlation id, so every turn joins one thread', async () => {
      const prompt = makePrompt(true);
      prompt.text.mockResolvedValueOnce('hola').mockResolvedValueOnce('/exit');
      const executeChat = jest.spyOn(AgentRuntimeFactory, 'executeChat').mockResolvedValue(runtimeResult());

      await new ChatCommand(prompt).executeCommand([], { session: 'thread-9' });

      expect(executeChat).toHaveBeenCalledWith(expect.objectContaining({ correlation_id: 'thread-9' }));
    });

    it('/reset clears the conversation without ending it', async () => {
      const prompt = makePrompt(true);
      prompt.text
        .mockResolvedValueOnce('one')
        .mockResolvedValueOnce('/reset')
        .mockResolvedValueOnce('two')
        .mockResolvedValueOnce('/exit');
      const executeChat = jest.spyOn(AgentRuntimeFactory, 'executeChat').mockResolvedValue(runtimeResult());

      await new ChatCommand(prompt).executeCommand([], { session: 'r1' });

      expect(executeChat).toHaveBeenCalledTimes(2);
      expect(historyOf(executeChat.mock.calls[1][0])).toEqual([]);
    });

    it('treats Ctrl-C as leaving the conversation, not as a command failure', async () => {
      const prompt = makePrompt(true);
      prompt.text.mockRejectedValueOnce(new UserCancelledError());

      await expect(new ChatCommand(prompt).executeCommand([], {})).resolves.toBeUndefined();
      expect(process.exitCode).toBeUndefined();
    });

    /** GT-611 keeps the REPL honest: a loop nobody can answer must never open. */
    it.each([
      ['stdin is not a TTY', false, {}],
      ['--format json is a machine read', true, { format: 'json' }],
      ['--once opts out explicitly', true, { once: true }],
    ])('does not open a REPL when %s', async (_label, interactive, options) => {
      const prompt = makePrompt(interactive);
      const executeChat = jest.spyOn(AgentRuntimeFactory, 'executeChat');

      await new ChatCommand(prompt).executeCommand([], options as never);

      expect(prompt.text).not.toHaveBeenCalled();
      expect(executeChat).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(CLI_EXIT_CODES.INVALID_INPUT);
    });

    it('emits an ADR-0073 envelope and nothing else in --format json', async () => {
      const prompt = makePrompt(false);
      jest.spyOn(AgentRuntimeFactory, 'executeChat').mockResolvedValue(runtimeResult());
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      await new ChatCommand(prompt).executeCommand(['status?'], { format: 'json' });

      const printed = logSpy.mock.calls.map((c) => String(c[0]));
      expect(printed).toHaveLength(1);
      expect(JSON.parse(printed[0])).toMatchObject({
        success: true,
        data: { turns: 2 },
        meta: { command: 'evolith chat', schemaVersion: '1.0.0' },
      });
    });
  });
});
